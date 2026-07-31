import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../gateway/app.gateway';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: PrismaService,
          useValue: {
            game: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            playerGame: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            gameHistory: {
              create: jest.fn(),
            }
          }
        },
        {
          provide: AppGateway,
          useValue: {
            notifyUser: jest.fn(),
            notifyRole: jest.fn(),
            broadcast: jest.fn(),
          }
        }
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a game', async () => {
    const mockGame = {
      id: 'test-id',
      type: 'blackjack',
      status: 'waiting',
      maxPlayers: 4,
      buyIn: 100,
      pot: 0,
    };

    const prismaMock = jest.mocked(service['prisma']);
    prismaMock.game.create.mockResolvedValue(mockGame);

    const result = await service.createGame('blackjack', 4, 100);

    expect(result).toEqual(mockGame);
    expect(prismaMock.game.create).toHaveBeenCalled();
  });

  it('should draw a card for simulation', () => {
    // Test that our drawCard function works
    const card = service['drawCard']();
    expect(typeof card).toBe('string');
    expect(card.length).toBeGreaterThan(0);
  });
});