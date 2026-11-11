import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateReturnDto } from './dto/create-return.dto';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto, StockMovementType } from './dto/create-stock-movement.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';
import { Query } from '@nestjs/common';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';

@Controller('stock-movements')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockMovementsController {

  constructor(
    private readonly stockMovementsService: StockMovementsService,
  ) {}



  @Post()
  @Roles('ADMIN', 'STOCK_MANAGER')
  create(
    @Body() createStockMovementDto: CreateStockMovementDto,
  ) {

    return this.stockMovementsService.create(
      createStockMovementDto,
    );

  }
  @Post('in')
@Roles('ADMIN', 'STOCK_MANAGER')
createIn(
  @Body() dto: CreateStockMovementDto,
) {

  return this.stockMovementsService.create({
    ...dto,
    type: StockMovementType.IN,
  });

}



@Post('out')
@Roles('ADMIN', 'STOCK_MANAGER')
createOut(
  @Body() dto: CreateStockMovementDto,
) {

  return this.stockMovementsService.create({
    ...dto,
    type: StockMovementType.OUT,
  });

}



  @Get()
@Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
findAll(
  @Query() query: QueryStockMovementDto,
) {
  return this.stockMovementsService.findAll(query);
}

@Post('transfer')
@Roles('ADMIN', 'STOCK_MANAGER')
transfer(
  @Body() dto: CreateTransferDto,
) {
  return this.stockMovementsService.transfer(dto);
}
@Post('return')
@Roles('ADMIN', 'STOCK_MANAGER')
createReturn(
  @Body() dto: CreateReturnDto,
) {

  return this.stockMovementsService.createReturn(dto);

}

}