import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';


@Injectable()
export class LocationsService {

  constructor(
    private prisma: PrismaService,
  ) {}


  async create(
    warehouseId: number,
    createLocationDto: CreateLocationDto,
  ) {

    // Check warehouse exists
    const warehouse = await this.prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
    });


    if (!warehouse) {
      throw new NotFoundException(
        'Warehouse not found',
      );
    }


    return this.prisma.location.create({
      data: {
        ...createLocationDto,
        warehouseId,
      },
    });
  }



  async findAll(
    warehouseId: number,
  ) {

    return this.prisma.location.findMany({
      where: {
        warehouseId,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }




  async findOne(
    warehouseId: number,
    locationId: number,
  ) {


    const location =
      await this.prisma.location.findFirst({
        where: {
          id: locationId,
          warehouseId,
        },
      });


    if (!location) {
      throw new NotFoundException(
        'Location not found',
      );
    }


    return location;
  }




  async update(
    warehouseId: number,
    locationId: number,
    updateLocationDto: UpdateLocationDto,
  ) {


    await this.findOne(
      warehouseId,
      locationId,
    );


    return this.prisma.location.update({
      where: {
        id: locationId,
      },
      data: updateLocationDto,
    });
  }




  async remove(
    warehouseId: number,
    locationId: number,
  ) {


    await this.findOne(
      warehouseId,
      locationId,
    );


    return this.prisma.location.delete({
      where: {
        id: locationId,
      },
    });
  }

}