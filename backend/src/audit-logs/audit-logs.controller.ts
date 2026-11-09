import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuditLogsService } from './audit-logs.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorators';
@ApiBearerAuth('access-token')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {

  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @Roles('ADMIN')
  findAll(
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {

    return this.auditLogsService.findAll({

      action,
      entity,

      userId:
        userId !== undefined
          ? Number(userId)
          : undefined,

      from:
        from
          ? new Date(from)
          : undefined,

      to:
        to
          ? new Date(to)
          : undefined,

    });

  }
}