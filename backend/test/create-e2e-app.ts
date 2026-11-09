import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { configureApplication } from '../src/configure-application';
import { PrismaService } from '../src/prisma/prisma.service';

export async function createE2eApp(
  moduleRef: TestingModule,
): Promise<INestApplication> {
  const app = moduleRef.createNestApplication();
  configureApplication(app, moduleRef.get(PrismaService));
  await app.init();
  return app;
}