import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from './configure-application';
import { PrismaService } from './prisma/prisma.service';

class ProbeDto {
  @IsInt()
  @Min(0)
  countedQty!: number;
}

@Controller('bootstrap-probe')
class BootstrapProbeController {
  @Get()
  get() {
    return { ready: true };
  }

  @Post()
  post(@Body() dto: ProbeDto) {
    return dto;
  }
}

describe('configureApplication', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BootstrapProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    const prisma = {
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;

    configureApplication(app, prisma);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('applies the production API prefix', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/bootstrap-probe')
      .expect(200, { ready: true });

    await request(app.getHttpServer())
      .get('/bootstrap-probe')
      .expect(404);
  });

  it('applies global DTO validation and the configured exception filter', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bootstrap-probe')
      .send({ countedQty: -1 })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
    });
  });

  it('rejects unknown DTO properties like the production ValidationPipe', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/bootstrap-probe')
      .send({ countedQty: 1, unexpected: true })
      .expect(400);
  });
});