import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { StockMovementType } from './dto/create-stock-movement.dto';

describe('StockMovementsController', () => {
  let controller: StockMovementsController;
  let service: {
    create: jest.Mock;
    transfer: jest.Mock;
    createCorrection: jest.Mock;
    createReturn: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      transfer: jest.fn(),
      createCorrection: jest.fn(),
      createReturn: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockMovementsController],
      providers: [{ provide: StockMovementsService, useValue: service }],
    }).compile();

    controller = module.get<StockMovementsController>(StockMovementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the authenticated user ID to generic, IN, and OUT movement services', () => {
    const request = { user: { userId: '23' } };
    const body = {
      productId: 1,
      warehouseId: 2,
      quantity: 4,
    };
    const genericBody = {
      ...body,
      type: StockMovementType.IN,
    };

    controller.create(genericBody, request);
    controller.createIn(body, request);
    controller.createOut(body, request);

    expect(service.create).toHaveBeenNthCalledWith(1, genericBody, 23);
    expect(service.create).toHaveBeenNthCalledWith(
      2,
      { ...body, type: StockMovementType.IN },
      23,
    );
    expect(service.create).toHaveBeenNthCalledWith(
      3,
      { ...body, type: StockMovementType.OUT },
      23,
    );
  });

  it('passes the authenticated user ID to transfer, correction, and return services', () => {
    const request = { user: { userId: '31' } };
    const transfer = {
      productId: 1,
      fromWarehouseId: 2,
      toWarehouseId: 3,
      quantity: 4,
    };
    const correction = { productId: 1, warehouseId: 2, quantity: -1 };
    const returned = {
      productId: 1,
      warehouseId: 2,
      quantity: 1,
      type: 'RETURN_CLIENT',
    };

    controller.transfer(transfer, request);
    controller.createCorrection(correction, request);
    controller.createReturn(returned, request);

    expect(service.transfer).toHaveBeenCalledWith(transfer, 31);
    expect(service.createCorrection).toHaveBeenCalledWith(correction, 31);
    expect(service.createReturn).toHaveBeenCalledWith(returned, 31);
  });
});
