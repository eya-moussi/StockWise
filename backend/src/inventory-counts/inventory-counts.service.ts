import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateCountLineDto } from './dto/update-count-line.dto';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';

@Injectable()
export class InventoryCountsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async create(dto: CreateInventoryCountDto) {

    const productIds = dto.lines.map((line) => line.productId);

    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException(
        'Duplicate product IDs are not allowed in inventory count lines',
      );
    }

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: {
        warehouseId: dto.warehouseId,
        productId: { in: productIds },
      },
    });

    const systemQtyByProductId = new Map<number, number>(
      stockLevels.map(
        (stock): [number, number] => [stock.productId, stock.quantity],
      ),
    );

    const missingProductIds = productIds.filter(
      (productId) => !systemQtyByProductId.has(productId),
    );

    if (missingProductIds.length > 0) {
      throw new BadRequestException(
        `No stock level found for product(s) ${missingProductIds.join(', ')} in warehouse ${dto.warehouseId}`,
      );
    }

    const inventoryCount =
      await this.prisma.inventoryCount.create({

        data: {
          warehouseId: dto.warehouseId,

          lines: {
            create: dto.lines.map((line) => {

              const systemQty = systemQtyByProductId.get(line.productId)!;

              return {
                productId: line.productId,

                systemQty,

                countedQty: line.countedQty,

                discrepancy: line.countedQty - systemQty,

              };
            }),
          },
        },

        include: {
          lines: true,
        },

      });


    return inventoryCount;
  }
  async findAll() {

  return this.prisma.inventoryCount.findMany({

    include: {
      warehouse: true,
      lines: true,
    },

    orderBy: {
      createdAt: 'desc',
    },

  });

}



async findOne(id: number) {

  return this.prisma.inventoryCount.findUnique({

    where: {
      id,
    },

    include: {
      warehouse: true,

      lines: {
        include: {
          product: true,
        },
      },
    },

  });

}
async updateLine(
  lineId: number,
  countedQty: number,
  justification?: string,
) {
  if (!Number.isInteger(countedQty) || countedQty < 0) {
    throw new BadRequestException(
      'Counted quantity must be a nonnegative integer',
    );
  }

  const line =
    await this.prisma.inventoryCountLine.findUnique({
      where: {
        id: lineId,
      },
    });


  if (!line) {
    throw new NotFoundException(
  'Inventory count line not found'
);
  }


  const discrepancy =
    countedQty - line.systemQty;


  if (discrepancy !== 0 && !justification) {
    throw new BadRequestException(
  'Justification is required for discrepancy'
);
  }


  return this.prisma.inventoryCountLine.update({

    where: {
      id: lineId,
    },

    data: {
      countedQty,
      discrepancy,
      justification,
    },

  });

}
async validate(id: number, createdById: number) {

  const count =
    await this.prisma.inventoryCount.findUnique({

      where:{
        id,
      },

      include:{
        lines:true,
      },

    });


  if(!count){
    throw new NotFoundException(
  "Inventory count not found"
);
  }


  if(count.status !== "DRAFT"){
    throw new BadRequestException(
  "Inventory count already validated"
);
  }



  for(const line of count.lines){

    if(
      line.discrepancy !== 0 &&
      !line.justification
    ){
      throw new BadRequestException(
  "Missing justification"
);
    }

  }



  return this.prisma.$transaction(async(tx)=>{


    for(const line of count.lines){


      if(line.discrepancy !== 0){


        await tx.stockMovement.create({

          data:{

            type:"CORRECTION",

            quantity:
              line.discrepancy,

            reference:
              `Inventory count #${id}`,

            reason:
              line.justification,


            productId:
              line.productId,


            warehouseId:
              count.warehouseId,

            createdById,

          },

        });



        await tx.stockLevel.update({

          where:{
            productId_warehouseId:{
              productId:
                line.productId,

              warehouseId:
                count.warehouseId,
            },
          },


          data:{
            quantity:
              line.countedQty,
          },

        });


      }

    }



    return tx.inventoryCount.update({

      where:{
        id,
      },

      data:{
        status:"VALIDATED",
        validatedAt:new Date(),
      },

      include:{
        lines:true,
      },

    });


  });

}
}