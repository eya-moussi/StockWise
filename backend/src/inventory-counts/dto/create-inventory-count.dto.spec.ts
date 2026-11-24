import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { CreateInventoryCountDto } from './create-inventory-count.dto';

describe('CreateInventoryCountDto', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  const validate = (value: unknown) =>
    validationPipe.transform(value, {
      type: 'body',
      metatype: CreateInventoryCountDto,
      data: '',
    });

  const validPayload = {
    warehouseId: 2,
    lines: [{ productId: 1, countedQty: 5 }],
  };

  it('accepts a valid payload', async () => {
    await expect(validate(validPayload)).resolves.toEqual(validPayload);
  });

  it('accepts a zero counted quantity', async () => {
    await expect(
      validate({ warehouseId: 2, lines: [{ productId: 1, countedQty: 0 }] }),
    ).resolves.toEqual({
      warehouseId: 2,
      lines: [{ productId: 1, countedQty: 0 }],
    });
  });

  it('rejects a negative counted quantity', async () => {
    await expect(
      validate({ warehouseId: 2, lines: [{ productId: 1, countedQty: -1 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-integer counted quantity', async () => {
    await expect(
      validate({ warehouseId: 2, lines: [{ productId: 1, countedQty: 1.5 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty lines', async () => {
    await expect(
      validate({ warehouseId: 2, lines: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing lines array', async () => {
    await expect(validate({ warehouseId: 2 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('validates nested line properties', async () => {
    await expect(
      validate({ warehouseId: 2, lines: [{ productId: '1', countedQty: 5 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown properties', async () => {
    await expect(
      validate({ ...validPayload, unexpected: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
