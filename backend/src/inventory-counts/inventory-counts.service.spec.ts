import { Test, TestingModule } from '@nestjs/testing';
import { InventoryCountsService } from './inventory-counts.service';
import { PrismaService } from '../prisma/prisma.service';
describe('InventoryCountsService', () => {
  let service: InventoryCountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
  InventoryCountsService,
  {
    provide: PrismaService,
    useValue: {},
  },
],
    }).compile();

    service = module.get<InventoryCountsService>(InventoryCountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
