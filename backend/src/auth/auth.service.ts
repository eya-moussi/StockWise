import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        role: {
          connect: {
            name: 'VIEWER',
          },
        },
      },
      include: {
        role: true,
      },
    });

    return this.signToken(
      String(user.id),
      user.email,
      user.role.name,
    );
  }

  async login(dto: LoginDto) {

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        role: true,
      },
    });


    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );


    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(
      String(user.id),
      user.email,
      user.role.name,
    );
  }

  private signToken(
    userId: string,
    email: string,
    role: string,
  ) {
    const payload = {
      sub: userId,
      email,
      role,
    };

    return {
      access_token: this.jwt.sign(payload),
    };
  }
}