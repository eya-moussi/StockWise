import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AnomalyDetectionService } from './anomaly-detection.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AnomalyDetectionService],
  exports: [AnomalyDetectionService],
})
export class AnomalyDetectionModule {}
