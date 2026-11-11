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

import { ApiBearerAuth } from '@nestjs/swagger';

import { LocationsService } from './locations.service';

import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';


@Controller('warehouses/:warehouseId/locations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {

  constructor(
    private readonly locationsService: LocationsService,
  ) {}


  @Post()
  @Roles('ADMIN', 'STOCK_MANAGER')
  create(
    @Param('warehouseId') warehouseId: string,
    @Body() createLocationDto: CreateLocationDto,
  ) {

    return this.locationsService.create(
      +warehouseId,
      createLocationDto,
    );
  }



  @Get()
  @Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
  findAll(
    @Param('warehouseId') warehouseId: string,
  ) {

    return this.locationsService.findAll(
      +warehouseId,
    );
  }




  @Get(':locationId')
  @Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
  findOne(
    @Param('warehouseId') warehouseId: string,
    @Param('locationId') locationId: string,
  ) {

    return this.locationsService.findOne(
      +warehouseId,
      +locationId,
    );
  }





  @Patch(':locationId')
  @Roles('ADMIN', 'STOCK_MANAGER')
  update(
    @Param('warehouseId') warehouseId: string,
    @Param('locationId') locationId: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {

    return this.locationsService.update(
      +warehouseId,
      +locationId,
      updateLocationDto,
    );
  }





  @Delete(':locationId')
  @Roles('ADMIN')
  remove(
    @Param('warehouseId') warehouseId: string,
    @Param('locationId') locationId: string,
  ) {

    return this.locationsService.remove(
      +warehouseId,
      +locationId,
    );
  }

}