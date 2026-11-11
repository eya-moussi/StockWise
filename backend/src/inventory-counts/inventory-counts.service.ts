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

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: {
        warehouseId: dto.warehouseId,
      },
    });


    const inventoryCount =
      await this.prisma.inventoryCount.create({

        data: {
          warehouseId: dto.warehouseId,

          lines: {
            create: stockLevels.map((stock) => ({
              
              productId: stock.productId,

              systemQty: stock.quantity,

              // first count starts equal to system
              countedQty: stock.quantity,

              discrepancy: 0,

            })),
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
async validate(id: number) {

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
              Math.abs(line.discrepancy),

            reference:
              `Inventory count #${id}`,

            reason:
              line.justification,


            productId:
              line.productId,


            warehouseId:
              count.warehouseId,

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