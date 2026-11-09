import { ValidationPipe } from '@nestjs/common';
import { CreateCorrectionDto } from './create-correction.dto';
import { CreateReturnDto } from './create-return.dto';
import { CreateStockMovementDto, CreateStockMovementInputDto } from './create-stock-movement.dto';
import { CreateTransferDto } from './create-transfer.dto';

describe('Stock movement DTOs', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  function validateBody(metatype: any, value: unknown) {
    return validationPipe.transform(value, {
      type: 'body',
      metatype,
      data: '',
    });
  }

  const genericBody = {
    productId: 1,
    warehouseId: 2,
    quantity: 3,
  };

  it.each(['IN', 'OUT'])(
    'accepts generic %s movements',
    async (type) => {
      await expect(
        validateBody(CreateStockMovementDto, { ...genericBody, type }),
      ).resolves.toMatchObject({ type });
    },
  );

  it.each([undefined, 'TRANSFER', 'CORRECTION', 'RETURN_CLIENT', 'RETURN_SUPPLIER'])(
    'rejects generic movement type %s',
    async (type) => {
      const body = { ...genericBody, ...(type === undefined ? {} : { type }) };
      await expect(
        validateBody(CreateStockMovementDto, body),
      ).rejects.toThrow();
    },
  );

  it('accepts dedicated IN/OUT payloads without a type and rejects an extra type', async () => {
    await expect(
      validateBody(CreateStockMovementInputDto, genericBody),
    ).resolves.toMatchObject(genericBody);
    await expect(
      validateBody(CreateStockMovementInputDto, { ...genericBody, type: 'OUT' }),
    ).rejects.toThrow();
  });

  it('requires positive integer transfer IDs and quantity', async () => {
    const transfer = {
      productId: 1,
      fromWarehouseId: 2,
      toWarehouseId: 3,
      quantity: 4,
    };
    await expect(
      validateBody(CreateTransferDto, transfer),
    ).resolves.toMatchObject(transfer);
    await expect(
      validateBody(CreateTransferDto, { ...transfer, quantity: 1.5 }),
    ).rejects.toThrow();
    await expect(
      validateBody(CreateTransferDto, { ...transfer, fromWarehouseId: 0 }),
    ).rejects.toThrow();
  });

  it.each([-3, 5])('accepts signed correction delta %s', async (quantity) => {
    await expect(
      validateBody(CreateCorrectionDto, {
        ...genericBody,
        quantity,
        reason: 'Count discrepancy',
      }),
    ).resolves.toMatchObject({ quantity });
  });

  it.each([0, 1.5])('rejects correction delta %s', async (quantity) => {
    await expect(
      validateBody(CreateCorrectionDto, { ...genericBody, quantity }),
    ).rejects.toThrow();
  });

  it.each(['RETURN_CLIENT', 'RETURN_SUPPLIER'])(
    'accepts the existing dedicated return type %s',
    async (type) => {
      await expect(
        validateBody(CreateReturnDto, { ...genericBody, type }),
      ).resolves.toMatchObject({ type });
    },
  );
});