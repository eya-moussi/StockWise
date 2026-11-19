import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryCountsService } from './inventory-counts.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCountLineDto } from './dto/update-count-line.dto';

function createPrismaMock() {
  const transaction = {
    stockMovement: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    },
    stockLevel: {
      update: jest.fn().mockResolvedValue({}),
    },
    inventoryCount: {
      update: jest.fn().mockResolvedValue({ id: 1, status: 'VALIDATED' }),
    },
  };

  return {
    stockLevel: {
      findMany: jest.fn(),
    },
    inventoryCount: {
      create: jest.fn().mockResolvedValue({ id: 10, status: 'DRAFT' }),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventoryCountLine: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, systemQty: 0 }),
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

  it('persists the authenticated author on inventory-count correction movements', async () => {
    prisma.inventoryCount.findUnique.mockResolvedValue({
      id: 5,
      status: 'DRAFT',
      warehouseId: 2,
      lines: [
        {
          productId: 1,
          systemQty: 10,
          countedQty: 13,
          discrepancy: 3,
          justification: 'Verified count',
        },
      ],
    });

    await service.validate(5, 23);

    expect(prisma.transaction.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CORRECTION',
        quantity: 3,
        productId: 1,
        warehouseId: 2,
        createdById: 23,
      }),
    });
    expect(prisma.transaction.stockLevel.update).toHaveBeenCalledWith({
      where: {
        productId_warehouseId: { productId: 1, warehouseId: 2 },
      },
      data: { quantity: 13 },
    });
  });

  it('records a negative correction for a count below system stock', async () => {
    prisma.inventoryCount.findUnique.mockResolvedValue({
      id: 5,
      status: 'DRAFT',
      warehouseId: 2,
      lines: [
        {
          productId: 1,
          systemQty: 10,
          countedQty: 7,
          discrepancy: -3,
          justification: 'Verified count',
        },
      ],
    });

    await service.validate(5, 23);

    expect(prisma.transaction.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CORRECTION',
        quantity: -3,
        productId: 1,
        warehouseId: 2,
        createdById: 23,
      }),
    });
    expect(prisma.transaction.stockLevel.update).toHaveBeenCalledWith({
      where: {
        productId_warehouseId: { productId: 1, warehouseId: 2 },
      },
      data: { quantity: 7 },
    });
  });

  it('does not create a correction movement when counted stock is unchanged', async () => {
    prisma.inventoryCount.findUnique.mockResolvedValue({
      id: 5,
      status: 'DRAFT',
      warehouseId: 2,
      lines: [
        {
          productId: 1,
          systemQty: 10,
          countedQty: 10,
          discrepancy: 0,
        },
      ],
    });

    await service.validate(5, 23);

    expect(prisma.transaction.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.transaction.stockLevel.update).not.toHaveBeenCalled();
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
    });

    it('accepts positive quantities and keeps discrepancy behavior', async () => {
      prisma.inventoryCountLine.findUnique.mockResolvedValue({
        id: 1,
        systemQty: 3,
      });

      await expect(
        service.updateLine(1, 5, 'Counted stock'),
      ).resolves.toMatchObject({
        countedQty: 5,
        discrepancy: 2,
        justification: 'Counted stock',
      });
    });
  });
});
