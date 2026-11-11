import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';

import { WarehousesService } from './warehouses.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';

@Controller('warehouses')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @Roles('ADMIN', 'STOCK_MANAGER')
  create(@Body() createWarehouseDto: CreateWarehouseDto) {
    return this.warehousesService.create(createWarehouseDto);
  }

  @Get()
  @Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
  findAll() {
    return this.warehousesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STOCK_MANAGER')
  update(
    @Param('id') id: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(+id, updateWarehouseDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.warehousesService.remove(+id);
  }
}