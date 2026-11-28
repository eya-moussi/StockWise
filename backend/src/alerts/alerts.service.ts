import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlertStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { ReviewAlertDto } from './dto/review-alert.dto';

@Injectable()
export class AlertsService {
  private readonly alertInclude: Prisma.AlertInclude = {
    movement: {
      include: {
        product: {
          include: {
            stockMovements: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              include: {
                warehouse: { select: { name: true } },
              },
            },
          },
        },
        warehouse: { select: { id: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    },
    processedBy: { select: { id: true, fullName: true, email: true } },
  };

  constructor(private readonly prisma: PrismaService) {}

  findAll(query: QueryAlertsDto) {
    const where: Prisma.AlertWhereInput = {
      status: query.status,
      movement: {
        productId: query.productId,
        createdAt: {
          gte: query.from,
          lte: query.to,
        },
      },
    };

    return this.prisma.alert.findMany({
      where,
      include: this.alertInclude,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 100,
    });
  }

  async review(id: number, dto: ReviewAlertDto, processedById: number) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.status !== AlertStatus.TO_VERIFY) {
      throw new BadRequestException('Alert has already been reviewed');
    }

    return this.prisma.alert.update({
      where: { id },
      data: {
        status: dto.status,
        comment: dto.comment,
        processedById,
        processedAt: new Date(),
      },
      include: this.alertInclude,
    });
  }
}
