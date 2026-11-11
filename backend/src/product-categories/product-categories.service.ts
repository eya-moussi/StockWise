import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductCategoryDto) {
    const existing = await this.prisma.productCategory.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Category already exists');
    }

    return this.prisma.productCategory.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.productCategory.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.productCategory.findUnique({
      where: {
        id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    id: number,
    dto: UpdateProductCategoryDto,
  ) {
    await this.findOne(id);

    return this.prisma.productCategory.update({
      where: {
        id,
      },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.productCategory.delete({
      where: {
        id,
      },
    });
  }
}