import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { createE2eApp } from './create-e2e-app';


describe('Products API (e2e)', () => {

  let app: INestApplication;
  let token: string;


  beforeAll(async () => {

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();


    app = await createE2eApp(moduleFixture);


    // Login to get JWT
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'ad@test.com',
        password: 'Admin123',
      });


    token = loginResponse.body.access_token;

  });



  afterAll(async () => {

    await app.close();

  });



  it('GET /products should return products', async () => {

    const response = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(200);


    expect(Array.isArray(response.body))
      .toBe(true);

  });



  it('POST /products should create product', async () => {

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        reference: `TEST-${Date.now()}`,
        name: 'Test Product',
        minStock: 10,
        categoryId: 1,
      })
      .expect(201);


    expect(response.body.name)
      .toBe('Test Product');

  });


});