import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import  request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Auth E2E', () => {

  let app: INestApplication;


  beforeAll(async () => {

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();


    app = moduleFixture.createNestApplication();

    await app.init();

  });



  afterAll(async () => {

    await app.close();

  });



  it('should login with valid credentials', () => {

    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ad@test.com',
        password: 'Admin123',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.access_token).toBeDefined();
      });

  });



  it('should fail with invalid credentials', () => {

    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ad@test.com',
        password: 'wrong',
      })
      .expect(401);

  });

});