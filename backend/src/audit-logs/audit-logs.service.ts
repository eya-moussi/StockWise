import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  findAll(filters?: {
    action?: string;
    entity?: string;
    userId?: number;
    from?: Date;
    to?: Date;
  }) {

    return this.prisma.auditLog.findMany({

      where: {

        ...(filters?.action && {
          action: filters.action,
        }),

        ...(filters?.entity && {
          entity: {
            contains: filters.entity,
          },
        }),

        ...(filters?.userId !== undefined && {
          userId: filters.userId,
        }),

        ...(filters?.from || filters?.to
          ? {
              createdAt: {
                ...(filters.from && {
                  gte: filters.from,
                }),
                ...(filters.to && {
                  lte: filters.to,
                }),
              },
            }
          : {}),

      },

      orderBy: {
        createdAt: 'desc',
      },

    });

  }
}