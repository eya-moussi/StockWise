import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';


describe('Warehouses API (e2e)', () => {

  let app: INestApplication;
  let token: string;


  beforeAll(async () => {

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();


    app = moduleFixture.createNestApplication();

    await app.init();


    const loginResponse =
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ad@test.com',
          password: 'Admin123',
        });


    token = loginResponse.body.access_token;

  });



  afterAll(async () => {

    await app.close();

  });



  it('GET /warehouses should return warehouses', async () => {

    const response =
      await request(app.getHttpServer())
        .get('/warehouses')
        .set(
          'Authorization',
          `Bearer ${token}`,
        )
        .expect(200);


    expect(Array.isArray(response.body))
      .toBe(true);

  });



  it('POST /warehouses should create warehouse', async () => {

    const response =
      await request(app.getHttpServer())
        .post('/warehouses')
        .set(
          'Authorization',
          `Bearer ${token}`,
        )
        .send({

          name: `Test Warehouse ${Date.now()}`,

          type: "PRINCIPAL",

          description:
            "Created from e2e test",

        })
        .expect(201);


    expect(response.body.type)
      .toBe("PRINCIPAL");

  });


});