import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdateCountLineDto } from './dto/update-count-line.dto';
import { InventoryCountsService } from './inventory-counts.service';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';

type AuthenticatedRequest = {
  user: {
    userId: string | number;
  };
};


@ApiBearerAuth('access-token')
@Controller('inventory-counts')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class InventoryCountsController {

  constructor(
    private readonly inventoryCountsService: InventoryCountsService,
  ) {}


  @Post()
  create(
    @Body() dto: CreateInventoryCountDto,
  ) {
    return this.inventoryCountsService.create(dto);
  }


  @Get()
  findAll() {
    return this.inventoryCountsService.findAll();
  }


  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.inventoryCountsService.findOne(+id);
  }
 @Patch('line/:lineId')
updateLine(
  @Param('lineId') lineId: string,
  @Body() dto: UpdateCountLineDto,
) {
 return this.inventoryCountsService.updateLine(
  +lineId,
  dto.countedQty,
  dto.justification,
);
}
@Patch(':id/validate')
@Roles(
  'ADMIN',
  'STOCK_MANAGER',
)
validate(
  @Param('id') id: string,
  @Req() request: AuthenticatedRequest,
) {
  return this.inventoryCountsService.validate(
    +id,
    Number(request.user.userId),
  );
}

}