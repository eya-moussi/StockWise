import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

describe('JwtStrategy', () => {
  let findUnique: jest.Mock;
  let strategy: JwtStrategy;

  beforeEach(() => {
    findUnique = jest.fn();

    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    const prisma = {
      user: { findUnique },
    } as unknown as PrismaService;

    strategy = new JwtStrategy(configService, prisma);
  });

  it('uses the current database role when the token claims ADMIN', async () => {
    findUnique.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      role: { name: 'VIEWER' },
    });

    await expect(
      strategy.validate({
        sub: '7',
        email: 'user@example.com',
        role: 'ADMIN',
      }),
    ).resolves.toEqual({
      userId: 7,
      email: 'user@example.com',
      role: 'VIEWER',
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      include: { role: true },
    });
  });

  it('uses the current database role when the token claims VIEWER', async () => {
    findUnique.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      role: { name: 'ADMIN' },
    });

    await expect(
      strategy.validate({
        sub: '7',
        email: 'user@example.com',
        role: 'VIEWER',
      }),
    ).resolves.toEqual({
      userId: 7,
      email: 'user@example.com',
      role: 'ADMIN',
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      include: { role: true },
    });
  });

  it('rejects a token whose user no longer exists', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: '7', email: 'user@example.com', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      include: { role: true },
    });
  });

  it('rejects a token with no subject without querying the database', async () => {
    await expect(strategy.validate({})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each(['', 'abc', '1.5', 0, -1])(
    'rejects invalid subject %p without querying the database',
    async (subject) => {
      await expect(strategy.validate({ sub: subject })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(findUnique).not.toHaveBeenCalled();
    },
  );
});
