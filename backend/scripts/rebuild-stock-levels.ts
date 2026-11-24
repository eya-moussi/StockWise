import { Prisma, PrismaClient, StockMovementType } from '@prisma/client';

const prisma = new PrismaClient();

type RebuildMovement = {
  id: number;
  type: StockMovementType;
  quantity: number;
  productId: number;
  warehouseId: number;
  relatedMovementId: number | null;
};

export function getMovementDelta(movement: RebuildMovement): number {
  switch (movement.type) {
    case StockMovementType.IN:
      return movement.quantity;

    case StockMovementType.OUT:
      return -movement.quantity;

    case StockMovementType.CORRECTION:
      // Corrections are signed deltas: positive adds, negative removes.
      return movement.quantity;

    case StockMovementType.TRANSFER:
      if (movement.relatedMovementId === null) {
        throw new Error(
          `Cannot rebuild TRANSFER movement ${movement.id}: missing relatedMovementId`,
        );
      }

      if (movement.relatedMovementId === movement.id) {
        throw new Error(
          `Cannot rebuild TRANSFER movement ${movement.id}: self-linked transfer`,
        );
      }

      return movement.relatedMovementId > movement.id
        ? -movement.quantity
        : movement.quantity;

    default:
      throw new Error(
        `Cannot rebuild movement ${movement.id}: unsupported type ${movement.type}`,
      );
  }
}

export async function rebuildStockLevelsInTransaction(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.stockLevel.deleteMany();

  const movements = await tx.stockMovement.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });

  for (const movement of movements) {
    const current = await tx.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: movement.productId,
          warehouseId: movement.warehouseId,
        },
      },
    });

    const quantity = (current?.quantity ?? 0) + getMovementDelta(movement);

    await tx.stockLevel.upsert({
      where: {
        productId_warehouseId: {
          productId: movement.productId,
          warehouseId: movement.warehouseId,
        },
      },

      update: {
        quantity,
      },

      create: {
        productId: movement.productId,
        warehouseId: movement.warehouseId,
        quantity,
      },
    });
  }
}

export async function rebuildStockLevels(
  client: PrismaClient = prisma,
): Promise<void> {
  try {
    await client.$transaction((tx) => rebuildStockLevelsInTransaction(tx), {
      timeout: 60_000,
    });
  } finally {
    await client.$disconnect();
  }
}

if (require.main === module) {
  rebuildStockLevels().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
