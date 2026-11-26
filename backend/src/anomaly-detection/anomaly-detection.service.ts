import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

export type DetectedMovement = {
  id: number;
  type: string;
  quantity: number;
  productId: number;
  warehouseId: number;
  createdAt: Date;
};

type PredictionResponse = {
  score: number;
  threshold: number;
  is_anomaly: boolean;
  model_version: string;
};

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiServiceUrl =
      this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';
  }

  async detectAndRecord(movement: DetectedMovement): Promise<void> {
    try {
      const history = await this.prisma.stockMovement.findMany({
        where: {
          productId: movement.productId,
          warehouseId: movement.warehouseId,
          createdAt: { lt: movement.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          type: true,
          quantity: true,
          productId: true,
          warehouseId: true,
          createdAt: true,
        },
      });

      const response = await fetch(`${this.aiServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movement: {
            id: movement.id,
            type: movement.type,
            quantity: movement.quantity,
            product_id: String(movement.productId),
            warehouse_id: String(movement.warehouseId),
            timestamp: movement.createdAt.toISOString(),
          },
          history: history.reverse().map((item) => ({
            type: item.type,
            quantity: item.quantity,
            product_id: String(item.productId),
            warehouse_id: String(item.warehouseId),
            timestamp: item.createdAt.toISOString(),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with status ${response.status}`);
      }

      const prediction = (await response.json()) as PredictionResponse;
      if (!prediction.is_anomaly) {
        return;
      }

      await this.prisma.alert.upsert({
        where: { movementId: movement.id },
        create: {
          movementId: movement.id,
          score: prediction.score,
          threshold: prediction.threshold,
          modelVersion: prediction.model_version,
          isAnomaly: true,
        },
        update: {
          score: prediction.score,
          threshold: prediction.threshold,
          modelVersion: prediction.model_version,
          isAnomaly: true,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Anomaly detection skipped for movement ${movement.id}: ${message}`,
      );
    }
  }
}
