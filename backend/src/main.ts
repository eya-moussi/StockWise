import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { configureApplication } from './configure-application';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prisma = app.get(PrismaService);
  configureApplication(app, prisma);

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

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);

}

bootstrap();