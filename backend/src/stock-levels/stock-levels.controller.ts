import { Controller, Get, UseGuards } from '@nestjs/common';

import { StockLevelsService } from './stock-levels.service';
import { StockExportService } from './stock-export.service';
import { Res } from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('stock-levels')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockLevelsController {

  constructor(
  private readonly stockLevelsService: StockLevelsService,
  private readonly stockExportService: StockExportService,
) {}

  @Get()
  @Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
  findAll() {
    return this.stockLevelsService.findAll();
  }

  @Get("low-stock")
  @Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
findLowStock() {
  return this.stockLevelsService.findLowStock();
}
@Get('export')
@Roles('ADMIN', 'STOCK_MANAGER')
async export(@Res() res: Response) {
  const buffer = await this.stockExportService.exportCurrentStock();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=current-stock.xlsx',
  );

  res.send(buffer);
}
}