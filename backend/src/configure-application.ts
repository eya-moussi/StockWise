import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'https://erp-project-ll-ec69.vercel.app',
];

function getCorsOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGINS;

  if (!configuredOrigins) {
    return [...DEFAULT_CORS_ORIGINS];
  }

  const origins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : [...DEFAULT_CORS_ORIGINS];
}

export function configureApplication(
  app: INestApplication,
  prisma: PrismaService,
): void {
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new AuditInterceptor(prisma),
  );
}