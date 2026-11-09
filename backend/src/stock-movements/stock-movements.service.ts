import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CreateTransferDto } from './dto/create-transfer.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto, ReturnType } from './dto/create-return.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import {
  CreateStockMovementDto,
  CreateStockMovementInputDto,
  StockMovementType,
} from './dto/create-stock-movement.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';

import { StockMovementType as PrismaStockMovementType } from '@prisma/client';

type StockMovementInput = {
  productId: number;
  warehouseId: number;
  quantity: number;
  locationId?: number;
  reference?: string;
  reason?: string;
};

@Injectable()
export class StockMovementsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async create(dto: CreateStockMovementDto, createdById: number) {
    if (dto.type !== StockMovementType.IN && dto.type !== StockMovementType.OUT) {
      throw new BadRequestException('Only IN and OUT movements are allowed');
    }

    const type =
      dto.type === StockMovementType.IN
        ? PrismaStockMovementType.IN
        : PrismaStockMovementType.OUT;

    return this.createMovement(dto, type, createdById);
  }

  async createCorrection(dto: CreateCorrectionDto, createdById: number) {
    return this.createMovement(
      dto,
      PrismaStockMovementType.CORRECTION,
      createdById,
    );
  }

  async createReturn(dto: CreateReturnDto, createdById: number) {
    const type =
      dto.type === ReturnType.RETURN_CLIENT
        ? PrismaStockMovementType.IN
        : PrismaStockMovementType.OUT;

    return this.createMovement(dto, type, createdById);
  }

  private async createMovement(
    input: StockMovementInput,
    type: PrismaStockMovementType,
    createdById: number,
  ) {
    const { productId, warehouseId, locationId, quantity, reference, reason } =
      input;

    const isCorrection = type === PrismaStockMovementType.CORRECTION;
    if (
      !Number.isInteger(quantity) ||
      (isCorrection ? quantity === 0 : quantity <= 0)
    ) {
      throw new BadRequestException(
        isCorrection
          ? 'Correction quantity must be a non-zero integer'
          : 'Quantity must be a positive integer',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (locationId !== undefined) {
      const location = await this.prisma.location.findFirst({
        where: { id: locationId, warehouseId },
      });
      if (!location) {
        throw new NotFoundException('Location not found in this warehouse');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const decrementStock =
        type === PrismaStockMovementType.OUT ||
        (isCorrection && quantity < 0);
      const amount = Math.abs(quantity);

      if (decrementStock) {
        const result = await tx.stockLevel.updateMany({
          where: {
            productId,
            warehouseId,
            quantity: { gte: amount },
          },
          data: {
            quantity: { decrement: amount },
          },
        });

        if (result.count !== 1) {
          throw new BadRequestException('Insufficient stock');
        }
      } else {
        await tx.stockLevel.upsert({
          where: {
            productId_warehouseId: { productId, warehouseId },
          },
          update: {
            quantity: { increment: amount },
          },
          create: {
            productId,
            warehouseId,
            quantity: amount,
          },
        });
      }

      return tx.stockMovement.create({
        data: {
          type,
          quantity,
          productId,
          warehouseId,
          locationId,
          reference,
          reason,
          createdById,
        },
      });
    });
  }



  async transfer(dto: CreateTransferDto, createdById: number) {
    if (
      !Number.isInteger(dto.quantity) ||
      dto.quantity <= 0 ||
      !Number.isInteger(dto.fromWarehouseId) ||
      dto.fromWarehouseId <= 0 ||
      !Number.isInteger(dto.toWarehouseId) ||
      dto.toWarehouseId <= 0
    ) {
      throw new BadRequestException(
        'Transfer values must be positive integers',
      );
    }
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException(
        'Source and destination warehouses must be different',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const sourceUpdate = await tx.stockLevel.updateMany({
        where: {
          productId: dto.productId,
          warehouseId: dto.fromWarehouseId,
          quantity: { gte: dto.quantity },
        },
        data: {
          quantity: { decrement: dto.quantity },
        },
      });

      if (sourceUpdate.count !== 1) {
        throw new BadRequestException('Insufficient stock');
      }

      await tx.stockLevel.upsert({
        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.toWarehouseId,
          },
        },
        update: {
          quantity: { increment: dto.quantity },
        },
        create: {
          productId: dto.productId,
          warehouseId: dto.toWarehouseId,
          quantity: dto.quantity,
        },
      });

      const outMovement = await tx.stockMovement.create({
        data: {
          type: PrismaStockMovementType.TRANSFER,
          quantity: dto.quantity,
          productId: dto.productId,
          warehouseId: dto.fromWarehouseId,
          reference: dto.reference,
          createdById,
        },
      });

      const inMovement = await tx.stockMovement.create({
        data: {
          type: PrismaStockMovementType.TRANSFER,
          quantity: dto.quantity,
          productId: dto.productId,
          warehouseId: dto.toWarehouseId,
          reference: dto.reference,
          relatedMovementId: outMovement.id,
          createdById,
        },
      });

      await tx.stockMovement.update({
        where: { id: outMovement.id },
        data: { relatedMovementId: inMovement.id },
      });

      return { outMovement, inMovement };
    });
  }

  async findAll(query: QueryStockMovementDto) {
    const { productId, warehouseId, locationId } = query;

    return this.prisma.stockMovement.findMany({
      where: {
        ...(productId && { productId }),
        ...(warehouseId && { warehouseId }),
        ...(locationId && { locationId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: true,
        warehouse: true,
        location: true,
      },
    });
  }
}