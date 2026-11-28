import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';
import { AlertsService } from './alerts.service';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { ReviewAlertDto } from './dto/review-alert.dto';

type AuthenticatedRequest = {
  user: {
    userId: string | number;
  };
};

@Controller('alerts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @Roles('ADMIN', 'STOCK_MANAGER', 'VIEWER')
  findAll(@Query() query: QueryAlertsDto) {
    return this.alertsService.findAll(query);
  }

  @Patch(':id/review')
  @Roles('ADMIN', 'STOCK_MANAGER')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewAlertDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.alertsService.review(id, dto, Number(request.user.userId));
  }
}
