import { AlertStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let prisma: {
    alert: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock<Promise<unknown>, [Prisma.AlertUpdateArgs]>;
    };
  };
  let service: AlertsService;

  beforeEach(() => {
    prisma = {
      alert: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn<Promise<unknown>, [Prisma.AlertUpdateArgs]>(),
      },
    };
    service = new AlertsService(prisma as unknown as PrismaService);
  });

  it('lists alerts with filters, product history and a default limit', async () => {
    await service.findAll({});

    expect(prisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: undefined,
          movement: {
            productId: undefined,
            createdAt: { gte: undefined, lte: undefined },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  });

  it('applies status, product and date filters', async () => {
    const from = new Date('2026-11-01T00:00:00Z');
    const to = new Date('2026-11-26T00:00:00Z');

    await service.findAll({
      status: AlertStatus.TO_VERIFY,
      productId: 4,
      from,
      to,
      limit: 25,
    });

    expect(prisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: AlertStatus.TO_VERIFY,
          movement: {
            productId: 4,
            createdAt: { gte: from, lte: to },
          },
        },
        take: 25,
      }),
    );
  });

  it('records the decision, comment, reviewer and processing date', async () => {
    prisma.alert.findUnique.mockResolvedValue({
      id: 7,
      status: AlertStatus.TO_VERIFY,
    });
    prisma.alert.update.mockResolvedValue({ id: 7 });

    await service.review(
      7,
      { status: AlertStatus.CONFIRMED, comment: 'Anomalie confirmée' },
      12,
    );

    expect(prisma.alert.update).toHaveBeenCalledTimes(1);
    const call = prisma.alert.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 7 });
    expect(call.data).toMatchObject({
      status: AlertStatus.CONFIRMED,
      comment: 'Anomalie confirmée',
      processedById: 12,
    });
    expect(call.data.processedAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown alert', async () => {
    prisma.alert.findUnique.mockResolvedValue(null);

    await expect(
      service.review(
        99,
        { status: AlertStatus.NORMAL, comment: 'Erreur modèle' },
        12,
      ),
    ).rejects.toThrow('Alert not found');
    expect(prisma.alert.update).not.toHaveBeenCalled();
  });

  it('rejects a second review', async () => {
    prisma.alert.findUnique.mockResolvedValue({
      id: 7,
      status: AlertStatus.CONFIRMED,
    });

    await expect(
      service.review(
        7,
        { status: AlertStatus.NORMAL, comment: 'Changement' },
        12,
      ),
    ).rejects.toThrow('Alert has already been reviewed');
    expect(prisma.alert.update).not.toHaveBeenCalled();
  });
});
