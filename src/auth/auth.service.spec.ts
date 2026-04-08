import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwt: {
    sign: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwt = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwt,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers a new user and signs an access token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      createdAt: new Date('2026-04-05T00:00:00.000Z'),
    });
    jwt.sign.mockReturnValue('signed-token');

    const result = await service.register('owner@example.com', 'password123');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'owner@example.com',
        passwordHash: expect.any(String),
      },
      select: { id: true, email: true, createdAt: true },
    });
    expect(prisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe(
      'password123',
    );
    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        createdAt: new Date('2026-04-05T00:00:00.000Z'),
      },
      accessToken: 'signed-token',
    });
  });

  it('rejects duplicate registrations', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
    });

    await expect(
      service.register('owner@example.com', 'password123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid login credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('owner@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns an access token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 4);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      passwordHash,
    });
    jwt.sign.mockReturnValue('signed-token');

    const result = await service.login('owner@example.com', 'password123');

    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'owner@example.com',
    });
    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
      },
      accessToken: 'signed-token',
    });
  });
});
