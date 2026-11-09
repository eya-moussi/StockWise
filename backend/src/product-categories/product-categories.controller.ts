import { ApiBearerAuth } from '@nestjs/swagger';
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

import { ProductCategoriesService } from './product-categories.service';

import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';

@ApiBearerAuth('access-token')
@Controller('product-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  @Roles('ADMIN', 'STOCK_MANAGER')
  create(@Body() dto: CreateProductCategoryDto) {
    return this.productCategoriesService.create(dto);
  }

  @Get()
  findAll() {
    return this.productCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productCategoriesService.findOne(Number(id));
  }

  @Patch(':id')
  @Roles('ADMIN', 'STOCK_MANAGER')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.productCategoriesService.update(Number(id), dto);
  }

  @Delete(':id')
@Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.productCategoriesService.remove(Number(id));
  }
}