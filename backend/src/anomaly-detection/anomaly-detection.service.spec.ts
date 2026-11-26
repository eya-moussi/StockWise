import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import type { DetectedMovement } from './anomaly-detection.service';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let prisma: {
    stockMovement: { findMany: jest.Mock };
    alert: { upsert: jest.Mock };
  };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  const movement: DetectedMovement = {
    id: 15,
    type: 'IN',
    quantity: 300,
    productId: 1,
    warehouseId: 1,
    createdAt: new Date('2026-11-25T12:00:00Z'),
  };

  const history = [
    {
      type: 'IN',
      quantity: 30,
      productId: 1,
      warehouseId: 1,
      createdAt: new Date('2026-11-24T10:00:00Z'),
    },
  ];

  beforeEach(async () => {
    prisma = {
      stockMovement: {
        findMany: jest.fn().mockResolvedValue(history),
      },
      alert: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnomalyDetectionService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://ai.test'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AnomalyDetectionService);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records an alert when the AI service flags the movement', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          score: 0.0375,
          threshold: 0.0187,
          is_anomaly: true,
          model_version: 'v3',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await service.detectAndRecord(movement);

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://ai.test/predict',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(prisma.alert.upsert).toHaveBeenCalledWith({
      where: { movementId: 15 },
      create: {
        movementId: 15,
        score: 0.0375,
        threshold: 0.0187,
        modelVersion: 'v3',
        isAnomaly: true,
      },
      update: {
        score: 0.0375,
        threshold: 0.0187,
        modelVersion: 'v3',
        isAnomaly: true,
      },
    });
  });

  it('does not record an alert when the movement is normal', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          score: 0.001,
          threshold: 0.0187,
          is_anomaly: false,
          model_version: 'v3',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await service.detectAndRecord(movement);

    expect(prisma.alert.upsert).not.toHaveBeenCalled();
  });

  it('does not fail movement creation when the AI service is unavailable', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.detectAndRecord(movement)).resolves.toBeUndefined();

    expect(prisma.alert.upsert).not.toHaveBeenCalled();
  });
});
