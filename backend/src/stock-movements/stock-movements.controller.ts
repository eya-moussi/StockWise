import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { StockMovementsService } from './stock-movements.service';
import {
  CreateStockMovementDto,
  CreateStockMovementInputDto,
  StockMovementType,
} from './dto/create-stock-movement.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';
import { Query } from '@nestjs/common';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';

type AuthenticatedRequest = {
  user: {
    userId: string | number;
  };
};

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
    @Req() request: AuthenticatedRequest,
  ) {

    return this.stockMovementsService.create(
      createStockMovementDto,
      Number(request.user.userId),
    );

  }
  @Post('in')
@Roles('ADMIN', 'STOCK_MANAGER')
createIn(
  @Body() dto: CreateStockMovementInputDto,
  @Req() request: AuthenticatedRequest,
) {

  return this.stockMovementsService.create({
    ...dto,
    type: StockMovementType.IN,
  }, Number(request.user.userId));

}



@Post('out')
@Roles('ADMIN', 'STOCK_MANAGER')
createOut(
  @Body() dto: CreateStockMovementInputDto,
  @Req() request: AuthenticatedRequest,
) {

  return this.stockMovementsService.create({
    ...dto,
    type: StockMovementType.OUT,
  }, Number(request.user.userId));

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
  @Req() request: AuthenticatedRequest,
) {
  return this.stockMovementsService.transfer(
    dto,
    Number(request.user.userId),
  );
}

@Post('correction')
@Roles('ADMIN', 'STOCK_MANAGER')
createCorrection(
  @Body() dto: CreateCorrectionDto,
  @Req() request: AuthenticatedRequest,
) {
  return this.stockMovementsService.createCorrection(
    dto,
    Number(request.user.userId),
  );
}

@Post('return')
@Roles('ADMIN', 'STOCK_MANAGER')
createReturn(
  @Body() dto: CreateReturnDto,
  @Req() request: AuthenticatedRequest,
) {

  return this.stockMovementsService.createReturn(
    dto,
    Number(request.user.userId),
  );

}

}