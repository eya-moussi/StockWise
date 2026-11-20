import {
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryCountsService } from './inventory-counts.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCountLineDto } from './dto/update-count-line.dto';

function draftCount(lines: any[], status = 'DRAFT') {
  return {
    id: 5,
    status,
    warehouseId: 2,
    lines,
  };
}

function createPrismaMock() {
  const transaction = {
    stockMovement: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    },
    stockLevel: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    inventoryCount: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue({
        id: 5,
        status: 'VALIDATED',
        warehouseId: 2,
        lines: [],
      }),
    },
  };

  return {
    stockLevel: {
      findMany: jest.fn(),
    },
    inventoryCount: {
      create: jest.fn().mockResolvedValue({ id: 10, status: 'DRAFT' }),
      findUnique: jest.fn(),
    },
    inventoryCountLine: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        systemQty: 0,
        inventoryCount: { status: 'DRAFT' },
      }),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve(data),
      ),
    },
    $transaction: jest.fn((callback) => callback(transaction)),
    transaction,
  };
}

describe('InventoryCountsService', () => {
  let service: InventoryCountsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryCountsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<InventoryCountsService>(InventoryCountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('saves submitted counted quantities with a positive discrepancy', async () => {
      prisma.stockLevel.findMany.mockResolvedValue([
        { productId: 1, warehouseId: 2, quantity: 10 },
        { productId: 2, warehouseId: 2, quantity: 5 },
      ]);

      await service.create({
        warehouseId: 2,
        lines: [{ productId: 1, countedQty: 13 }],
      });

      expect(prisma.stockLevel.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 2, productId: { in: [1] } },
      });
      expect(prisma.inventoryCount.create).toHaveBeenCalledWith({
        data: {
          warehouseId: 2,
          lines: {
            create: [
              {
                productId: 1,
                systemQty: 10,
                countedQty: 13,
                discrepancy: 3,
              },
            ],
          },
        },
        include: { lines: true },
      });
    });

    it('stores a negative discrepancy when the counted quantity is below system stock', async () => {
      prisma.stockLevel.findMany.mockResolvedValue([
        { productId: 1, warehouseId: 2, quantity: 10 },
      ]);

      await service.create({
        warehouseId: 2,
        lines: [{ productId: 1, countedQty: 7 }],
      });

      expect(prisma.inventoryCount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lines: {
              create: [
                {
                  productId: 1,
                  systemQty: 10,
                  countedQty: 7,
                  discrepancy: -3,
                },
              ],
            },
          }),
        }),
      );
    });

    it('keeps a zero discrepancy for a zero counted quantity', async () => {
      prisma.stockLevel.findMany.mockResolvedValue([
        { productId: 1, warehouseId: 2, quantity: 0 },
      ]);

      await service.create({
        warehouseId: 2,
        lines: [{ productId: 1, countedQty: 0 }],
      });

      expect(prisma.inventoryCount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lines: {
              create: [
                {
                  productId: 1,
                  systemQty: 0,
                  countedQty: 0,
                  discrepancy: 0,
                },
              ],
            },
          }),
        }),
      );
    });

    it('rejects duplicate product IDs before querying or writing', async () => {
      await expect(
        service.create({
          warehouseId: 2,
          lines: [
            { productId: 1, countedQty: 5 },
            { productId: 1, countedQty: 6 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.stockLevel.findMany).not.toHaveBeenCalled();
      expect(prisma.inventoryCount.create).not.toHaveBeenCalled();
    });

    it('rejects products without a stock level in the requested warehouse', async () => {
      prisma.stockLevel.findMany.mockResolvedValue([
        { productId: 1, warehouseId: 2, quantity: 10 },
      ]);

      await expect(
        service.create({
          warehouseId: 2,
          lines: [
            { productId: 1, countedQty: 11 },
            { productId: 9, countedQty: 3 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.inventoryCount.create).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    const positiveLine = {
      productId: 1,
      systemQty: 10,
      countedQty: 13,
      discrepancy: 3,
      justification: 'Verified count',
    };

    const negativeLine = {
      productId: 1,
      systemQty: 10,
      countedQty: 8,
      discrepancy: -2,
      justification: 'Verified count',
    };

    const mockCount = (count: any) => {
      prisma.inventoryCount.findUnique.mockResolvedValue(count);
      prisma.transaction.inventoryCount.findUnique.mockResolvedValue(
        count ? { ...count, status: 'VALIDATED' } : count,
      );
    };

    it('claims the count atomically, increments stock by the saved discrepancy and persists the author', async () => {
      mockCount(
        draftCount([positiveLine]),
      );

      await expect(service.validate(5, 23)).resolves.toMatchObject({
        id: 5,
        status: 'VALIDATED',
      });

      expect(prisma.transaction.inventoryCount.updateMany).toHaveBeenCalledWith({
        where: { id: 5, status: 'DRAFT' },
        data: { status: 'VALIDATED', validatedAt: expect.any(Date) },
      });
      expect(prisma.transaction.stockLevel.upsert).toHaveBeenCalledWith({
        where: {
          productId_warehouseId: { productId: 1, warehouseId: 2 },
        },
        update: { quantity: { increment: 3 } },
        create: { productId: 1, warehouseId: 2, quantity: 3 },
      });
      expect(prisma.transaction.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CORRECTION',
          quantity: 3,
          productId: 1,
          warehouseId: 2,
          createdById: 23,
        }),
      });
      expect(prisma.transaction.stockLevel.updateMany).not.toHaveBeenCalled();
    });

    it('applies a guarded decrement for a count below system stock', async () => {
      mockCount(
        draftCount([
          {
            productId: 1,
            systemQty: 10,
            countedQty: 7,
            discrepancy: -3,
            justification: 'Verified count',
          },
        ]),
      );

      await service.validate(5, 23);

      expect(prisma.transaction.stockLevel.updateMany).toHaveBeenCalledWith({
        where: {
          productId: 1,
          warehouseId: 2,
          quantity: { gte: 3 },
        },
        data: { quantity: { decrement: 3 } },
      });
      expect(prisma.transaction.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CORRECTION',
          quantity: -3,
          productId: 1,
          warehouseId: 2,
          createdById: 23,
        }),
      });
      expect(prisma.transaction.stockLevel.upsert).not.toHaveBeenCalled();

      const stockCall =
        prisma.transaction.stockLevel.updateMany.mock.invocationCallOrder[0];
      const movementCall =
        prisma.transaction.stockMovement.create.mock.invocationCallOrder[0];
      expect(stockCall).toBeLessThan(movementCall);
    });

    it('preserves a movement made after the count was created instead of assigning countedQty', async () => {
      // Count: system 10, counted 8 (delta -2). An IN movement then raises
      // stock to 15; validation must subtract 2 (-> 13), not overwrite with 8.
      mockCount(
        draftCount([negativeLine]),
      );

      await service.validate(5, 23);

      expect(prisma.transaction.stockLevel.updateMany).toHaveBeenCalledWith({
        where: {
          productId: 1,
          warehouseId: 2,
          quantity: { gte: 2 },
        },
        data: { quantity: { decrement: 2 } },
      });
      expect(prisma.transaction.stockLevel.upsert).not.toHaveBeenCalled();
      expect(prisma.transaction.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ quantity: -2 }),
      });
    });

    it('rejects insufficient stock before recording a negative correction', async () => {
      mockCount(
        draftCount([negativeLine]),
      );
      prisma.transaction.stockLevel.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.validate(5, 23)).rejects.toMatchObject({
        message: 'Insufficient stock',
      });

      expect(prisma.transaction.stockMovement.create).not.toHaveBeenCalled();
      // Only the fresh read after the claim; no final re-read on failure.
      expect(
        prisma.transaction.inventoryCount.findUnique,
      ).toHaveBeenCalledTimes(1);
    });

    it('does not create a correction movement when counted stock is unchanged', async () => {
      mockCount(
        draftCount([
          {
            productId: 1,
            systemQty: 10,
            countedQty: 10,
            discrepancy: 0,
          },
        ]),
      );

      await service.validate(5, 23);

      expect(prisma.transaction.stockMovement.create).not.toHaveBeenCalled();
      expect(prisma.transaction.stockLevel.upsert).not.toHaveBeenCalled();
      expect(prisma.transaction.stockLevel.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a missing count before starting a transaction', async () => {
      mockCount(null);

      await expect(service.validate(5, 23)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an already validated count before starting a transaction', async () => {
      mockCount(
        draftCount([positiveLine], 'VALIDATED'),
      );

      await expect(service.validate(5, 23)).rejects.toMatchObject({
        message: 'Inventory count already validated',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('allows only one of two concurrent validations to create a correction', async () => {
      mockCount(
        draftCount([positiveLine]),
      );
      prisma.transaction.inventoryCount.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      const results = await Promise.allSettled([
        service.validate(5, 23),
        service.validate(5, 24),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(
        (results[1] as PromiseRejectedResult).reason,
      ).toBeInstanceOf(BadRequestException);
      expect(prisma.transaction.stockMovement.create).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.stockLevel.upsert).toHaveBeenCalledTimes(1);
    });

    it('rejects a discrepancy without justification using the freshly fetched lines', async () => {
      mockCount(draftCount([positiveLine]));
      prisma.transaction.inventoryCount.findUnique.mockResolvedValue(
        draftCount([{ ...positiveLine, justification: undefined }]),
      );

      await expect(service.validate(5, 23)).rejects.toMatchObject({
        message: 'Missing justification',
      });
      expect(prisma.transaction.inventoryCount.updateMany).toHaveBeenCalled();
      expect(prisma.transaction.stockLevel.upsert).not.toHaveBeenCalled();
      expect(prisma.transaction.stockMovement.create).not.toHaveBeenCalled();
    });

    it('uses the freshly fetched lines for stock corrections after the claim', async () => {
      mockCount(draftCount([positiveLine]));
      const updatedLine = {
        ...positiveLine,
        countedQty: 16,
        discrepancy: 6,
        justification: 'Recounted after update',
      };
      prisma.transaction.inventoryCount.findUnique.mockResolvedValue(
        draftCount([updatedLine], 'VALIDATED'),
      );

      await service.validate(5, 23);

      expect(prisma.transaction.stockLevel.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.stockLevel.upsert).toHaveBeenCalledWith({
        where: {
          productId_warehouseId: { productId: 1, warehouseId: 2 },
        },
        update: { quantity: { increment: 6 } },
        create: { productId: 1, warehouseId: 2, quantity: 6 },
      });
      expect(prisma.transaction.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantity: 6,
          reason: 'Recounted after update',
          productId: 1,
          warehouseId: 2,
          createdById: 23,
        }),
      });

      expect(
        prisma.transaction.inventoryCount.updateMany.mock.invocationCallOrder[0],
      ).toBeLessThan(
        prisma.transaction.inventoryCount.findUnique.mock.invocationCallOrder[0],
      );
    });
  });

  describe('countedQty validation', () => {
    const validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    const validateDto = (countedQty: number) =>
      validationPipe.transform(
        { countedQty },
        {
          type: 'body',
          metatype: UpdateCountLineDto,
          data: '',
        },
      );

    it('rejects negative values in DTO validation', async () => {
      await expect(validateDto(-1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it.each([0, 5])('accepts %i in DTO validation', async (countedQty) => {
      await expect(validateDto(countedQty)).resolves.toMatchObject({
        countedQty,
      });
    });

    it('rejects negative values before querying or writing through the service', async () => {
      await expect(service.updateLine(1, -1)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.inventoryCountLine.findUnique).not.toHaveBeenCalled();
      expect(prisma.inventoryCountLine.update).not.toHaveBeenCalled();
    });

    it('accepts zero and preserves a zero discrepancy', async () => {
      await expect(service.updateLine(1, 0)).resolves.toMatchObject({
        countedQty: 0,
        discrepancy: 0,
      });

      expect(prisma.inventoryCountLine.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { inventoryCount: true },
      });
    });

    it('accepts positive quantities and keeps discrepancy behavior', async () => {
      prisma.inventoryCountLine.findUnique.mockResolvedValue({
        id: 1,
        systemQty: 3,
        inventoryCount: { status: 'DRAFT' },
      });

      await expect(
        service.updateLine(1, 5, 'Counted stock'),
      ).resolves.toMatchObject({
        countedQty: 5,
        discrepancy: 2,
        justification: 'Counted stock',
      });
    });

    it('rejects modifications to a line of a validated inventory count', async () => {
      prisma.inventoryCountLine.findUnique.mockResolvedValue({
        id: 1,
        systemQty: 10,
        inventoryCount: { status: 'VALIDATED' },
      });

      await expect(
        service.updateLine(1, 5, 'Counted stock'),
      ).rejects.toMatchObject({
        message: 'Cannot modify lines of a validated inventory count',
      });

      expect(prisma.inventoryCountLine.update).not.toHaveBeenCalled();
    });
  });
});
