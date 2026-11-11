import { BadRequestException } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { CreateReturnDto, ReturnType } from './dto/create-return.dto';
import {
  CreateStockMovementDto,
  StockMovementType,
} from './dto/create-stock-movement.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';

describe('StockMovementsService', () => {
  let service: StockMovementsService;
  let prisma: any;
  let transaction: any;
  let movementId: number;

  beforeEach(async () => {
    movementId = 0;
    transaction = {
      stockLevel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      stockMovement: {
        create: jest.fn(async ({ data }) => ({ id: ++movementId, ...data })),
        update: jest.fn(async ({ where, data }) => ({ ...where, ...data })),
      },
    };
    prisma = {
      product: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      warehouse: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      location: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    service = new StockMovementsService(prisma as PrismaService);
  });

  const movement: CreateStockMovementDto = {
    type: StockMovementType.IN,
    productId: 1,
    warehouseId: 2,
    quantity: 5,
    reference: 'test',
  };

  it('creates IN stock from an absent stock-level row as zero', async () => {
    await service.create(movement, 7);

    expect(transaction.stockLevel.upsert).toHaveBeenCalledWith({
      where: {
        productId_warehouseId: { productId: 1, warehouseId: 2 },
      },
      update: { quantity: { increment: 5 } },
      create: { productId: 1, warehouseId: 2, quantity: 5 },
    });
    expect(transaction.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'IN',
        quantity: 5,
        createdById: 7,
      }),
    });
  });

  it('rejects generic movement types other than IN and OUT', async () => {
    await expect(
      service.create({ ...movement, type: 'TRANSFER' } as any, 7),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects OUT when no stock-level row has sufficient quantity', async () => {
    transaction.stockLevel.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create({
        ...movement,
        type: StockMovementType.OUT,
        quantity: 1,
      }, 7),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transaction.stockMovement.create).not.toHaveBeenCalled();
  });

  it('applies OUT with an atomic conditional decrement', async () => {
    await service.create({
      ...movement,
      type: StockMovementType.OUT,
      quantity: 2,
    }, 7);

    expect(transaction.stockLevel.updateMany).toHaveBeenCalledWith({
      where: {
        productId: 1,
        warehouseId: 2,
        quantity: { gte: 2 },
      },
      data: { quantity: { decrement: 2 } },
    });
    expect(transaction.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'OUT',
        quantity: 2,
        createdById: 7,
      }),
    });
  });

  it('applies negative corrections as guarded decrements and records the signed delta', async () => {
    const correction: CreateCorrectionDto = {
      productId: 1,
      warehouseId: 2,
      quantity: -3,
      reason: 'Count discrepancy',
    };

    await service.createCorrection(correction, 7);

    expect(transaction.stockLevel.updateMany).toHaveBeenCalledWith({
      where: {
        productId: 1,
        warehouseId: 2,
        quantity: { gte: 3 },
      },
      data: { quantity: { decrement: 3 } },
    });
    expect(transaction.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CORRECTION',
        quantity: -3,
        reason: 'Count discrepancy',
        createdById: 7,
      }),
    });
  });

  it('applies positive corrections as increments from zero', async () => {
    await service.createCorrection({
      productId: 1,
      warehouseId: 2,
      quantity: 4,
    }, 7);

    expect(transaction.stockLevel.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { quantity: { increment: 4 } },
        create: { productId: 1, warehouseId: 2, quantity: 4 },
      }),
    );
  });

  it('rejects zero corrections', async () => {
    await expect(
      service.createCorrection({
        productId: 1,
        warehouseId: 2,
        quantity: 0,
      }, 7),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a negative correction when the missing/available stock is insufficient', async () => {
    transaction.stockLevel.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.createCorrection({
        productId: 1,
        warehouseId: 2,
        quantity: -1,
      }, 7),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transaction.stockMovement.create).not.toHaveBeenCalled();
  });

  it('rejects a transfer to the same warehouse before starting a transaction', async () => {
    const transfer: CreateTransferDto = {
      productId: 1,
      fromWarehouseId: 2,
      toWarehouseId: 2,
      quantity: 1,
    };

    await expect(service.transfer(transfer)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates both transfer stock levels and links both movements in one transaction', async () => {
    const transfer: CreateTransferDto = {
      productId: 1,
      fromWarehouseId: 2,
      toWarehouseId: 3,
      quantity: 4,
      reference: 'transfer-test',
    };

    await service.transfer(transfer, 7);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.stockLevel.updateMany).toHaveBeenCalledWith({
      where: {
        productId: 1,
        warehouseId: 2,
        quantity: { gte: 4 },
      },
      data: { quantity: { decrement: 4 } },
    });
    expect(transaction.stockLevel.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          productId_warehouseId: { productId: 1, warehouseId: 3 },
        },
        update: { quantity: { increment: 4 } },
      }),
    );
    expect(transaction.stockMovement.create).toHaveBeenCalledTimes(2);
    expect(transaction.stockMovement.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 7 }),
      }),
    );
    expect(transaction.stockMovement.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 7 }),
      }),
    );
    expect(transaction.stockMovement.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { relatedMovementId: 2 },
    });
  });

  it.each([
    [ReturnType.RETURN_CLIENT, 'IN'],
    [ReturnType.RETURN_SUPPLIER, 'OUT'],
  ] as const)('preserves existing %s stock effect', async (type, expectedType) => {
    const returned: CreateReturnDto = {
      type,
      productId: 1,
      warehouseId: 2,
      quantity: 2,
    };

    await service.createReturn(returned, 7);

    expect(transaction.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: expectedType,
        quantity: 2,
        createdById: 7,
      }),
    });
    if (expectedType === 'IN') {
      expect(transaction.stockLevel.upsert).toHaveBeenCalled();
    } else {
      expect(transaction.stockLevel.updateMany).toHaveBeenCalled();
    }
  });
});
