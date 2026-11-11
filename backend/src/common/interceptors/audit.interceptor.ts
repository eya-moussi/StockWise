import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Observable, tap } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {

  constructor(
    private prisma: PrismaService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
  tap(async (result) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return;
    }

    const user = request.user;

    await this.prisma.auditLog.create({
      data: {
        action: request.method,
        entity: request.route.path,
        entityId: result?.id,
        userId: user?.userId ? Number(user.userId) : null,
        userEmail: user?.email,
      },
    });
  }),
);

  }

}