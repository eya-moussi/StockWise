import { Module } from '@nestjs/common';

import { InventoryCountsController } from './inventory-counts.controller';
import { InventoryCountsService } from './inventory-counts.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    InventoryCountsController,
  ],
  providers: [
    InventoryCountsService,
  ],
})
export class InventoryCountsModule {}