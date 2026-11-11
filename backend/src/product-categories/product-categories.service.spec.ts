/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoriesService } from './product-categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductCategoriesService', () => {
  let service: ProductCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoriesService,
        {
          provide: PrismaService,
          useValue: {
            productCategory: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductCategoriesService>(ProductCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});