import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';


describe('Stock Movements concurrency', () => {

  let app: INestApplication;
  let token: string;


  beforeAll(async () => {

    const moduleRef =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();


    app =
      moduleRef.createNestApplication();

    await app.init();


    const login =
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ad@test.com',
          password: 'Admin123',
        });


    token = login.body.access_token;

  });


  afterAll(async () => {
    await app.close();
  });



  it('should prevent negative stock with concurrent OUT', async () => {


    const movement = {
      type: 'OUT',
      quantity: 80,
      productId: 1,
      warehouseId: 3,
      reference: 'concurrent test',
    };


    const results =
      await Promise.all([
        request(app.getHttpServer())
          .post('/stock-movements')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .send(movement),


        request(app.getHttpServer())
          .post('/stock-movements')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .send(movement),
      ]);


    const success =
      results.filter(
        r => r.status === 201,
      );


    const failed =
      results.filter(
        r => r.status === 400,
      );


    expect(success.length)
      .toBe(1);


    expect(failed.length)
      .toBe(1);

  });

});