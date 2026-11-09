import { Controller, Get, UseGuards } from '@nestjs/common';

import { StockLevelsService } from './stock-levels.service';
import { StockExportService } from './stock-export.service';
import { Res } from '@nestjs/common';
import type { Response } from 'express';


@Controller('stock-levels')
export class StockLevelsController {

  constructor(
  private readonly stockLevelsService: StockLevelsService,
  private readonly stockExportService: StockExportService,
) {}

  @Get()
  findAll() {
    return this.stockLevelsService.findAll();
  }

  @Get("low-stock")
findLowStock() {
  return this.stockLevelsService.findLowStock();
}
@Get('export')
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