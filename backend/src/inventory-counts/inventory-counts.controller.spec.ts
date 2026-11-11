import { Test, TestingModule } from '@nestjs/testing';
import { InventoryCountsController } from './inventory-counts.controller';
import { InventoryCountsService } from './inventory-counts.service';

describe('InventoryCountsController', () => {
  let controller: InventoryCountsController;
  let service: { validate: jest.Mock };

  beforeEach(async () => {
    service = { validate: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryCountsController],
      providers: [
        {
          provide: InventoryCountsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<InventoryCountsController>(
      InventoryCountsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the authenticated user ID to inventory-count validation', () => {
    controller.validate('5', { user: { userId: '23' } });

    expect(service.validate).toHaveBeenCalledWith(5, 23);
  });
});
