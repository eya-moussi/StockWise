import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCountLineDto } from './dto/update-count-line.dto';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';

@Injectable()
export class InventoryCountsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async lockInventoryCount(
    tx: Prisma.TransactionClient,
    id: number,
  ): Promise<{ id: number; status: string }> {
    const rows = await tx.$queryRaw<Array<{ id: number; status: string }>>`
      SELECT id, status
      FROM "InventoryCount"
      WHERE id = ${id}
      FOR UPDATE
    `;

    if (rows.length === 0) {
      throw new NotFoundException('Inventory count not found');
    }

    return rows[0];
  }

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

  return this.prisma.$transaction(async (tx) => {
    const line = await tx.inventoryCountLine.findUnique({
      where: {
        id: lineId,
      },
      include: {
        inventoryCount: true,
      },
    });

    if (!line) {
      throw new NotFoundException('Inventory count line not found');
    }

    const lockedCount =
      await this.lockInventoryCount(tx, line.inventoryCountId);

    if (lockedCount.status !== 'DRAFT') {
      throw new BadRequestException(
        'Cannot modify lines of a validated inventory count',
      );
    }

    const freshLine =
      await tx.inventoryCountLine.findUnique({
        where: {
          id: lineId,
        },
      });

    if (!freshLine) {
      throw new NotFoundException('Inventory count line not found');
    }

    const discrepancy = countedQty - freshLine.systemQty;

    if (discrepancy !== 0 && !justification) {
      throw new BadRequestException(
        'Justification is required for discrepancy',
      );
    }

    return tx.inventoryCountLine.update({
      where: {
        id: lineId,
      },
      data: {
        countedQty,
        discrepancy,
        justification,
      },
    });
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



  return this.prisma.$transaction(async (tx) => {

    const lockedCount = await this.lockInventoryCount(tx, id);

    if (lockedCount.status !== 'DRAFT') {
      throw new BadRequestException('Inventory count already validated');
    }

    const claim =
      await tx.inventoryCount.updateMany({

        where: {
          id,
          status: 'DRAFT',
        },

        data: {
          status: 'VALIDATED',
          validatedAt: new Date(),
        },

      });

    if (claim.count !== 1) {
      throw new BadRequestException(
        'Inventory count already validated',
      );
    }

    const freshCount =
      await tx.inventoryCount.findUnique({

        where: {
          id,
        },

        include: {
          lines: true,
        },

      });

    if (!freshCount) {
      throw new NotFoundException(
        'Inventory count not found',
      );
    }

    for (const line of freshCount.lines) {

      if (
        line.discrepancy !== 0 &&
        !line.justification
      ) {
        throw new BadRequestException(
          'Missing justification',
        );
      }

    }

    for (const line of freshCount.lines) {

      if (line.discrepancy === 0) {
        continue;
      }

      if (line.discrepancy > 0) {
        await tx.stockLevel.upsert({

          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: freshCount.warehouseId,
            },
          },

          update: {
            quantity: { increment: line.discrepancy },
          },

          create: {
            productId: line.productId,
            warehouseId: freshCount.warehouseId,
            quantity: line.discrepancy,
          },

        });
      } else {

        const amount = -line.discrepancy;

        const adjusted =
          await tx.stockLevel.updateMany({

            where: {
              productId: line.productId,
              warehouseId: freshCount.warehouseId,
              quantity: { gte: amount },
            },

            data: {
              quantity: { decrement: amount },
            },

          });

        if (adjusted.count !== 1) {
          throw new BadRequestException('Insufficient stock');
        }
      }

      await tx.stockMovement.create({

        data: {

          type: 'CORRECTION',

          quantity: line.discrepancy,

          reference: `Inventory count #${id}`,

          reason: line.justification,

          productId: line.productId,

          warehouseId: freshCount.warehouseId,

          createdById,

        },

      });

    }

    return tx.inventoryCount.findUnique({

      where: {
        id,
      },

      include: {
        lines: true,
      },

    });

  });

}
}