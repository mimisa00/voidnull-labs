import { NotFoundException, BadRequestException } from '@nestjs/common'
import { WalletService } from '../../src/wallet/wallet.service'
import { Decimal } from '@prisma/client/runtime/library'

describe('WalletService', () => {
  let service: WalletService
  let mockPrisma: any

  beforeEach(() => {
    // 建立 mock PrismaService
    mockPrisma = {
      wallet: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    }

    // 直接實例化 WalletService，傳入 mock
    service = new WalletService(mockPrisma)
  })

  describe('getBalance', () => {
    it('should return wallet when it exists', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('1000'),
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet)

      const result = await service.getBalance('user-1')

      expect(result).toEqual(mockWallet)
      expect(mockPrisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
    })

    it('should throw NotFoundException when wallet does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null)

      await expect(service.getBalance('user-1')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('placeBet', () => {
    it('should deduct bet amount and create transaction when balance is sufficient', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('1000'),
      }

      const updatedWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('900'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(updatedWallet),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      const result = await service.placeBet('user-1', 'game-1', 100)

      expect(result).toEqual(updatedWallet)
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { balance: new Decimal('900') },
      })
      expect(mockTx.transaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'bet',
          amount: new Decimal('-100'),
          balanceBefore: new Decimal('1000'),
          balanceAfter: new Decimal('900'),
          gameId: 'game-1',
        },
      })
    })

    it('should throw BadRequestException when balance is insufficient', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('50'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn(),
        },
        transaction: {
          create: jest.fn(),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      await expect(service.placeBet('user-1', 'game-1', 100)).rejects.toThrow(
        BadRequestException,
      )

      expect(mockTx.wallet.update).not.toHaveBeenCalled()
      expect(mockTx.transaction.create).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when wallet does not exist', async () => {
      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        transaction: {
          create: jest.fn(),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      await expect(service.placeBet('user-1', 'game-1', 100)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('payoutWin', () => {
    it('should increase balance and create win transaction', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('900'),
      }

      const updatedWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('1100'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(updatedWallet),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      const result = await service.payoutWin('user-1', 'game-1', 200)

      expect(result).toEqual(updatedWallet)
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { balance: new Decimal('1100') },
      })
      expect(mockTx.transaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'win',
          amount: new Decimal('200'),
          balanceBefore: new Decimal('900'),
          balanceAfter: new Decimal('1100'),
          gameId: 'game-1',
        },
      })
    })

    it('should throw NotFoundException when wallet does not exist', async () => {
      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        transaction: {
          create: jest.fn(),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      await expect(service.payoutWin('user-1', 'game-1', 200)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('payoutGameResults', () => {
    it('should update wallet and create transaction for win result', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'player-1',
        balance: new Decimal('900'),
      }

      const updatedWallet = {
        id: 'wallet-1',
        userId: 'player-1',
        balance: new Decimal('1100'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(updatedWallet),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      const results = [
        {
          playerId: 'player-1',
          result: 'win' as const,
          payout: 200,
        },
      ]

      const outcome = await service.payoutGameResults('game-1', results)

      expect(outcome).toHaveLength(1)
      expect(outcome[0]).toEqual({
        playerId: 'player-1',
        result: 'win',
        payout: 200,
        newBalance: new Decimal('1100'),
      })
      expect(mockTx.transaction.create).toHaveBeenCalled()
    })

    it('should update wallet but not create transaction for loss result (payout=0)', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'player-1',
        balance: new Decimal('900'),
      }

      const updatedWallet = {
        id: 'wallet-1',
        userId: 'player-1',
        balance: new Decimal('900'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(updatedWallet),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      const results = [
        {
          playerId: 'player-1',
          result: 'loss' as const,
          payout: 0,
        },
      ]

      const outcome = await service.payoutGameResults('game-1', results)

      expect(outcome).toHaveLength(1)
      expect(outcome[0]).toEqual({
        playerId: 'player-1',
        result: 'loss',
        payout: 0,
        newBalance: new Decimal('900'),
      })
      // wallet.update should still be called even for loss
      expect(mockTx.wallet.update).toHaveBeenCalled()
      // but transaction.create should not be called for loss
      expect(mockTx.transaction.create).not.toHaveBeenCalled()
    })

    it('should create refund transaction for push result with payout', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'player-1',
        balance: new Decimal('900'),
      }

      const updatedWallet = {
        id: 'wallet-1',
        userId: 'player-1',
        balance: new Decimal('1000'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(updatedWallet),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      const results = [
        {
          playerId: 'player-1',
          result: 'push' as const,
          payout: 100,
        },
      ]

      const outcome = await service.payoutGameResults('game-1', results)

      expect(outcome).toHaveLength(1)
      expect(mockTx.transaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'refund',
          amount: new Decimal('100'),
          balanceBefore: new Decimal('900'),
          balanceAfter: new Decimal('1000'),
          gameId: 'game-1',
        },
      })
    })

    it('should handle multiple results with mixed outcomes', async () => {
      const mockWallet1 = {
        id: 'wallet-1',
        userId: 'player-1',
        balance: new Decimal('900'),
      }

      const mockWallet2 = {
        id: 'wallet-2',
        userId: 'player-2',
        balance: new Decimal('800'),
      }

      const updatedWallet1 = {
        id: 'wallet-1',
        userId: 'player-1',
        balance: new Decimal('1100'),
      }

      const updatedWallet2 = {
        id: 'wallet-2',
        userId: 'player-2',
        balance: new Decimal('800'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(mockWallet1)
            .mockResolvedValueOnce(mockWallet2),
          update: jest
            .fn()
            .mockResolvedValueOnce(updatedWallet1)
            .mockResolvedValueOnce(updatedWallet2),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      const results = [
        {
          playerId: 'player-1',
          result: 'win' as const,
          payout: 200,
        },
        {
          playerId: 'player-2',
          result: 'loss' as const,
          payout: 0,
        },
      ]

      const outcome = await service.payoutGameResults('game-1', results)

      expect(outcome).toHaveLength(2)
      expect(mockTx.wallet.update).toHaveBeenCalledTimes(2)
      // Only one transaction.create call for the win
      expect(mockTx.transaction.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('deposit', () => {
    it('should increase balance and create deposit transaction', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('1000'),
      }

      const updatedWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('1500'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(updatedWallet),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      const result = await service.deposit('user-1', 500, 'Bank transfer')

      expect(result).toEqual(updatedWallet)
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { balance: new Decimal('1500') },
      })
      expect(mockTx.transaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'deposit',
          amount: new Decimal('500'),
          balanceBefore: new Decimal('1000'),
          balanceAfter: new Decimal('1500'),
          description: 'Bank transfer',
        },
      })
    })

    it('should throw NotFoundException when wallet does not exist', async () => {
      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        transaction: {
          create: jest.fn(),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      await expect(service.deposit('user-1', 500)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('withdraw', () => {
    it('should decrease balance and create withdrawal transaction', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('1000'),
      }

      const updatedWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('500'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(updatedWallet),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      const result = await service.withdraw('user-1', 500, 'Withdrawal')

      expect(result).toEqual(updatedWallet)
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { balance: new Decimal('500') },
      })
      expect(mockTx.transaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'withdrawal',
          amount: new Decimal('-500'),
          balanceBefore: new Decimal('1000'),
          balanceAfter: new Decimal('500'),
          description: 'Withdrawal',
        },
      })
    })

    it('should throw BadRequestException when balance is insufficient', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Decimal('300'),
      }

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn(),
        },
        transaction: {
          create: jest.fn(),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      await expect(service.withdraw('user-1', 500)).rejects.toThrow(
        BadRequestException,
      )

      expect(mockTx.wallet.update).not.toHaveBeenCalled()
      expect(mockTx.transaction.create).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when wallet does not exist', async () => {
      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        transaction: {
          create: jest.fn(),
        },
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockTx))

      await expect(service.withdraw('user-1', 500)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
