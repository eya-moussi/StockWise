import { Prisma, PrismaClient, StockMovementType } from '@prisma/client';
import {
  getMovementDelta,
  rebuildStockLevels,
  rebuildStockLevelsInTransaction,
} from '../../scripts/rebuild-stock-levels';

type RebuildTestMovement = {
  id: number;
  type: StockMovementType;
  quantity: number;
  productId: number;
  warehouseId: number;
  relatedMovementId: number | null;
};

type LevelWhere = {
  productId_warehouseId: { productId: number; warehouseId: number };
};

type FindUniqueArgs = { where: LevelWhere };

type UpsertArgs = {
  where: LevelWhere;
  create: { productId: number; warehouseId: number; quantity: number };
  update: { quantity: number };
};

function movement(
  input: Omit<RebuildTestMovement, 'relatedMovementId'> & {
    relatedMovementId?: number | null;
  },
): RebuildTestMovement {
  return { relatedMovementId: null, ...input };
}

const levelKey = (productId: number, warehouseId: number) =>
  `${productId}:${warehouseId}`;

function createFakeTransaction(movements: RebuildTestMovement[]) {
  const levels = new Map<string, number>();

  const tx = {
    stockLevel: {
      deleteMany: jest.fn(() => {
        const count = levels.size;
        levels.clear();
        return Promise.resolve({ count });
      }),
      findUnique: jest.fn(({ where }: FindUniqueArgs) => {
        const { productId, warehouseId } = where.productId_warehouseId;
        const key = levelKey(productId, warehouseId);
        return Promise.resolve(
          levels.has(key) ? { quantity: levels.get(key)! } : null,
        );
      }),
      upsert: jest.fn(({ where, create, update }: UpsertArgs) => {
        const { productId, warehouseId } = where.productId_warehouseId;
        const key = levelKey(productId, warehouseId);
        levels.set(key, update.quantity ?? create.quantity);
        return Promise.resolve({
          id: 1,
          productId,
          warehouseId,
          quantity: levels.get(key)!,
        });
      }),
    },
    stockMovement: {
      findMany: jest.fn(() => Promise.resolve(movements)),
    },
  };

  return {
    tx: tx as unknown as Prisma.TransactionClient,
    txMock: tx,
    levels,
  };
}

function createFakeClient(
  movements: RebuildTestMovement[],
  initialLevels: Record<string, number>,
) {
  const { tx, levels } = createFakeTransaction(movements);
  for (const [key, quantity] of Object.entries(initialLevels)) {
    levels.set(key, quantity);
  }

  const client = {
    $transaction: jest.fn(
      (callback: (transaction: Prisma.TransactionClient) => Promise<void>) => {
        // Simulate Prisma's rollback: discard all writes made by the callback.
        const snapshot = new Map(levels);
        return callback(tx).catch((error) => {
          levels.clear();
          snapshot.forEach((quantity, key) => levels.set(key, quantity));
          throw error;
        });
      },
    ),
    $disconnect: jest.fn(() => Promise.resolve(undefined)),
  };

  return {
    client: client as unknown as PrismaClient,
    clientMock: client,
    levels,
  };
}

describe('rebuild-stock-levels', () => {
  describe('getMovementDelta', () => {
    it('applies IN as a positive delta', () => {
      expect(
        getMovementDelta(
          movement({
            id: 1,
            type: StockMovementType.IN,
            quantity: 5,
            productId: 1,
            warehouseId: 10,
          }),
        ),
      ).toBe(5);
    });

    it('applies OUT as a negative delta', () => {
      expect(
        getMovementDelta(
          movement({
            id: 1,
            type: StockMovementType.OUT,
            quantity: 3,
            productId: 1,
            warehouseId: 10,
          }),
        ),
      ).toBe(-3);
    });

    it('applies a positive CORRECTION without changing its sign', () => {
      expect(
        getMovementDelta(
          movement({
            id: 1,
            type: StockMovementType.CORRECTION,
            quantity: 4,
            productId: 1,
            warehouseId: 10,
          }),
        ),
      ).toBe(4);
    });

    it('applies a negative CORRECTION without using Math.abs', () => {
      expect(
        getMovementDelta(
          movement({
            id: 1,
            type: StockMovementType.CORRECTION,
            quantity: -2,
            productId: 1,
            warehouseId: 10,
          }),
        ),
      ).toBe(-2);
    });

    it('subtracts the source side of a linked TRANSFER', () => {
      expect(
        getMovementDelta(
          movement({
            id: 1,
            type: StockMovementType.TRANSFER,
            quantity: 5,
            productId: 1,
            warehouseId: 10,
            relatedMovementId: 2,
          }),
        ),
      ).toBe(-5);
    });

    it('adds the destination side of a linked TRANSFER', () => {
      expect(
        getMovementDelta(
          movement({
            id: 2,
            type: StockMovementType.TRANSFER,
            quantity: 5,
            productId: 1,
            warehouseId: 20,
            relatedMovementId: 1,
          }),
        ),
      ).toBe(5);
    });

    it('fails clearly for an unlinked TRANSFER', () => {
      expect(() =>
        getMovementDelta(
          movement({
            id: 1,
            type: StockMovementType.TRANSFER,
            quantity: 5,
            productId: 1,
            warehouseId: 10,
            relatedMovementId: null,
          }),
        ),
      ).toThrow(/missing relatedMovementId/);
    });

    it('fails clearly for a self-linked TRANSFER', () => {
      expect(() =>
        getMovementDelta(
          movement({
            id: 1,
            type: StockMovementType.TRANSFER,
            quantity: 5,
            productId: 1,
            warehouseId: 10,
            relatedMovementId: 1,
          }),
        ),
      ).toThrow(/self-linked transfer/);
    });

    it('fails clearly for an unsupported movement type', () => {
      expect(() =>
        getMovementDelta(
          movement({
            id: 1,
            type: 'ADJUSTMENT' as StockMovementType,
            quantity: 5,
            productId: 1,
            warehouseId: 10,
          }),
        ),
      ).toThrow(/unsupported type/);
    });
  });

  describe('rebuildStockLevelsInTransaction', () => {
    it('reconstructs all supported movement types and removes stale levels', async () => {
      const movements = [
        movement({
          id: 1,
          type: StockMovementType.IN,
          quantity: 10,
          productId: 1,
          warehouseId: 10,
        }),
        movement({
          id: 2,
          type: StockMovementType.OUT,
          quantity: 3,
          productId: 1,
          warehouseId: 10,
        }),
        movement({
          id: 3,
          type: StockMovementType.CORRECTION,
          quantity: 4,
          productId: 1,
          warehouseId: 10,
        }),
        movement({
          id: 4,
          type: StockMovementType.CORRECTION,
          quantity: -2,
          productId: 1,
          warehouseId: 10,
        }),
        movement({
          id: 5,
          type: StockMovementType.TRANSFER,
          quantity: 5,
          productId: 1,
          warehouseId: 10,
          relatedMovementId: 6,
        }),
        movement({
          id: 6,
          type: StockMovementType.TRANSFER,
          quantity: 5,
          productId: 1,
          warehouseId: 20,
          relatedMovementId: 5,
        }),
      ];
      const { tx, txMock, levels } = createFakeTransaction(movements);
      levels.set(levelKey(1, 10), 999);

      await rebuildStockLevelsInTransaction(tx);

      expect(txMock.stockLevel.deleteMany).toHaveBeenCalledTimes(1);
      expect(txMock.stockMovement.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'asc' },
      });
      expect([...levels.entries()]).toEqual([
        [levelKey(1, 10), 4],
        [levelKey(1, 20), 5],
      ]);
    });

    it('fails before writing a level for an unlinked TRANSFER', async () => {
      const { tx, txMock } = createFakeTransaction([
        movement({
          id: 1,
          type: StockMovementType.TRANSFER,
          quantity: 5,
          productId: 1,
          warehouseId: 10,
          relatedMovementId: null,
        }),
      ]);

      await expect(rebuildStockLevelsInTransaction(tx)).rejects.toThrow(
        /missing relatedMovementId/,
      );
      expect(txMock.stockLevel.upsert).not.toHaveBeenCalled();
    });
  });

  describe('rebuildStockLevels', () => {
    it('rolls back partial work and disconnects when reconstruction fails', async () => {
      const initialLevels = { [levelKey(1, 10)]: 10 };
      const { client, clientMock, levels } = createFakeClient(
        [
          movement({
            id: 1,
            type: StockMovementType.IN,
            quantity: 5,
            productId: 1,
            warehouseId: 10,
          }),
          movement({
            id: 2,
            type: StockMovementType.TRANSFER,
            quantity: 1,
            productId: 1,
            warehouseId: 10,
            relatedMovementId: null,
          }),
        ],
        initialLevels,
      );

      await expect(rebuildStockLevels(client)).rejects.toThrow(
        /missing relatedMovementId/,
      );

      expect(clientMock.$transaction).toHaveBeenCalledTimes(1);
      expect(Object.fromEntries(levels)).toEqual(initialLevels);
      expect(clientMock.$disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
