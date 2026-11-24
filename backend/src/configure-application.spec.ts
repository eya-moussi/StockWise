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

describe('configureApplication CORS origins', () => {
  const originalCorsOrigins = process.env.CORS_ORIGINS;
  const prisma = {
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  } as unknown as PrismaService;

  afterEach(() => {
    if (originalCorsOrigins === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = originalCorsOrigins;
    }
  });

  const createAppMock = () => {
    const enableCors = jest.fn();
    const app = {
      setGlobalPrefix: jest.fn(),
      enableCors,
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      useGlobalInterceptors: jest.fn(),
    } as unknown as INestApplication;
    return { app, enableCors };
  };

  it('keeps the existing origins when CORS_ORIGINS is unset', () => {
    delete process.env.CORS_ORIGINS;
    const { app, enableCors } = createAppMock();

    configureApplication(app, prisma);

    expect(enableCors).toHaveBeenCalledWith({
      origin: [
        'http://localhost:3000',
        'https://erp-project-ll-ec69.vercel.app',
      ],
      credentials: true,
    });
  });

  it('parses trimmed comma-separated CORS_ORIGINS values', () => {
    process.env.CORS_ORIGINS =
      ' https://one.example.com , https://two.example.com ';
    const { app, enableCors } = createAppMock();

    configureApplication(app, prisma);

    expect(enableCors).toHaveBeenCalledWith({
      origin: ['https://one.example.com', 'https://two.example.com'],
      credentials: true,
    });
  });

  it('ignores empty comma-separated values', () => {
    process.env.CORS_ORIGINS = ' https://one.example.com ,, ';
    const { app, enableCors } = createAppMock();

    configureApplication(app, prisma);

    expect(enableCors).toHaveBeenCalledWith({
      origin: ['https://one.example.com'],
      credentials: true,
    });
  });

  it('falls back to defaults when no usable origins are configured', () => {
    process.env.CORS_ORIGINS = ' , , ';
    const { app, enableCors } = createAppMock();

    configureApplication(app, prisma);

    expect(enableCors).toHaveBeenCalledWith({
      origin: [
        'http://localhost:3000',
        'https://erp-project-ll-ec69.vercel.app',
      ],
      credentials: true,
    });
  });
});