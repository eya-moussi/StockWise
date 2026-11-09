import { Module } from '@nestjs/common';
import { StockLevelsController } from './stock-levels.controller';
import { StockLevelsService } from './stock-levels.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StockExportService } from './stock-export.service';
@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    StockLevelsController,
  ],
  providers: [
    StockLevelsService,
  StockExportService,
  ],
})
export class StockLevelsModule {}