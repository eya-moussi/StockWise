import { AlertStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { ReviewAlertDto } from './dto/review-alert.dto';

describe('AlertsController', () => {
  let controller: AlertsController;
  let service: {
    findAll: jest.Mock;
    review: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      review: jest.fn().mockResolvedValue({ id: 3 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [{ provide: AlertsService, useValue: service }],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards list filters to the service', async () => {
    const query: QueryAlertsDto = {
      status: AlertStatus.TO_VERIFY,
      productId: 5,
    };

    await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('passes the authenticated reviewer id to the service', async () => {
    const dto: ReviewAlertDto = {
      status: AlertStatus.NORMAL,
      comment: 'Mouvement normal',
    };

    await controller.review(3, dto, { user: { userId: '21' } });

    expect(service.review).toHaveBeenCalledWith(3, dto, 21);
  });
});
