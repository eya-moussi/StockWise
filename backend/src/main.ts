import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api/v1');
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://erp-project-ll-ec69.vercel.app',
  ],
  credentials: true,
});

  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
);
  app.useGlobalFilters(
  new HttpExceptionFilter(),
  );
  const prisma = app.get(PrismaService);

app.useGlobalInterceptors(
  new LoggingInterceptor(),
  new AuditInterceptor(prisma),
);

  const config = new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription('ERP Backend API')
    .setVersion('1.0')
    .addBearerAuth(
  {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
  'access-token',
)
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3001);
  
}

bootstrap();