import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CreateTransferDto } from './dto/create-transfer.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';

import { StockMovementType } from '@prisma/client';

@Injectable()
export class StockMovementsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async create(
    createStockMovementDto: CreateStockMovementDto,
  ) {
    const {
      productId,
      warehouseId,
      locationId,
      quantity,
      reference,
    } = createStockMovementDto;


    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }


    const warehouse = await this.prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Warehouse not found',
      );
    }


    if (locationId) {
      const location =
        await this.prisma.location.findFirst({
          where: {
            id: locationId,
            warehouseId,
          },
        });

      if (!location) {
        throw new NotFoundException(
          'Location not found in this warehouse',
        );
      }
    }


    return this.prisma.$transaction(async (tx) => {

      const currentLevel =
        await tx.stockLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
        });


      const currentQuantity =
        currentLevel?.quantity ?? 0;


      let newQuantity = currentQuantity;


      switch (createStockMovementDto.type) {

        case 'IN':
          newQuantity += quantity;
          break;


        case 'OUT':
          newQuantity -= quantity;
          break;


        case 'CORRECTION':
          newQuantity = quantity;
          break;


        case 'TRANSFER':
          newQuantity -= quantity;
          break;

      }


      if (newQuantity < 0) {
        throw new BadRequestException(
          'Insufficient stock',
        );
      }


      await tx.stockLevel.upsert({

        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },

        update: {
          quantity: newQuantity,
        },

        create: {
          productId,
          warehouseId,
          quantity: newQuantity,
        },

      });


      return tx.stockMovement.create({

        data: {

          type:
            createStockMovementDto.type as StockMovementType,

          quantity,

          productId,

          warehouseId,

          locationId,

          reference,

        },

      });

    });
  }



  async transfer(dto: CreateTransferDto) {

    return this.prisma.$transaction(async (tx) => {


      const sourceLevel =
        await tx.stockLevel.findUnique({

          where: {
            productId_warehouseId: {
              productId: dto.productId,
              warehouseId: dto.fromWarehouseId,
            },
          },

        });


      const sourceQuantity =
        sourceLevel?.quantity ?? 0;


      if (sourceQuantity < dto.quantity) {

        throw new BadRequestException(
          'Insufficient stock',
        );

      }



      await tx.stockLevel.upsert({

        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.fromWarehouseId,
          },
        },

        update: {
          quantity:
            sourceQuantity - dto.quantity,
        },

        create: {
          productId: dto.productId,
          warehouseId: dto.fromWarehouseId,
          quantity: 0,
        },

      });



      const destinationLevel =
        await tx.stockLevel.findUnique({

          where: {
            productId_warehouseId: {
              productId: dto.productId,
              warehouseId: dto.toWarehouseId,
            },
          },

        });



      await tx.stockLevel.upsert({

        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.toWarehouseId,
          },
        },

        update: {

          quantity:
            (destinationLevel?.quantity ?? 0)
            + dto.quantity,

        },

        create: {

          productId: dto.productId,

          warehouseId: dto.toWarehouseId,

          quantity: dto.quantity,

        },

      });



      const outMovement =
        await tx.stockMovement.create({

          data: {

            type: StockMovementType.TRANSFER,

            quantity: dto.quantity,

            productId: dto.productId,

            warehouseId: dto.fromWarehouseId,

            reference: dto.reference,

          },

        });



      const inMovement =
        await tx.stockMovement.create({

          data: {

            type: StockMovementType.TRANSFER,

            quantity: dto.quantity,

            productId: dto.productId,

            warehouseId: dto.toWarehouseId,

            reference: dto.reference,

            relatedMovementId: outMovement.id,

          },

        });



      await tx.stockMovement.update({

        where: {
          id: outMovement.id,
        },

        data: {

          relatedMovementId: inMovement.id,

        },

      });



      return {
        outMovement,
        inMovement,
      };

    });

  }



  async createReturn(dto: CreateReturnDto) {

    const movementType =
      dto.type === 'RETURN_CLIENT'
        ? StockMovementType.IN
        : StockMovementType.OUT;


    return this.create({

      type: movementType as any,

      quantity: dto.quantity,

      productId: dto.productId,

      warehouseId: dto.warehouseId,

      reference: dto.reference,

    });

  }



  async findAll(
    query: QueryStockMovementDto,
  ) {

    const {
      productId,
      warehouseId,
      locationId,
    } = query;


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