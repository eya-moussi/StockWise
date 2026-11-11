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
    inventoryCount: {
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
