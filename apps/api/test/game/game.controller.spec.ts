import { GameController } from '../../src/game/game.controller'
import { GameState } from '../../src/game/interfaces/game-state.interface'

function buildController(forfeitResult: any) {
  const gameService = {
    forfeitGame: jest.fn().mockResolvedValue(forfeitResult),
  }
  const gateway = { emitGameUpdate: jest.fn().mockResolvedValue(null) }
  const controller = new GameController(gameService as any, gateway as any)
  return { controller, gameService, gateway }
}

describe('GameController.forfeit', () => {
  it('completed: 以 in-memory gameState 觸發廣播(剩餘玩家要看到結算結果, 不可走 DB 重建)', async () => {
    const gameState: GameState = {
      id: 'g1',
      status: 'completed',
      players: [],
      dealerHand: [],
      pot: 0,
      currentPlayerIndex: -1,
      deckCards: [],
      results: [{ userId: 'u2', result: 'win', payout: 100 }],
    }
    const { controller, gameService, gateway } = buildController({
      success: true,
      forfeited: true,
      tableStatus: 'completed',
      voided: false,
      gameState,
    })
    const res = await controller.forfeit('g1', 'u1')
    expect(gameService.forfeitGame).toHaveBeenCalledWith('g1', 'u1')
    expect(gateway.emitGameUpdate).toHaveBeenCalledTimes(1)
    expect(gateway.emitGameUpdate).toHaveBeenCalledWith('g1', gameState)
    expect(res).toMatchObject({ success: true, tableStatus: 'completed' })
    // raw gameState(含 deckCards/暗牌)不可洩漏進 REST 回應
    expect(JSON.stringify(res)).not.toContain('deckCards')
    expect(JSON.parse(JSON.stringify(res)).gameState).toBeUndefined()
  })

  it('playing: 回傳無 gameState, 傳 undefined 由 gateway 從 Redis 重建廣播', async () => {
    const { controller, gateway } = buildController({
      success: true,
      forfeited: true,
      tableStatus: 'playing',
      voided: false,
    })
    await controller.forfeit('g2', 'u1')
    expect(gateway.emitGameUpdate).toHaveBeenCalledTimes(1)
    expect(gateway.emitGameUpdate).toHaveBeenCalledWith('g2', undefined)
  })

  it('waiting(void): 無 override 廣播, 讓同桌知道桌已回 waiting', async () => {
    const { controller, gateway } = buildController({
      success: true,
      forfeited: true,
      tableStatus: 'waiting',
      voided: true,
    })
    await controller.forfeit('g3', 'u1')
    expect(gateway.emitGameUpdate).toHaveBeenCalledTimes(1)
    expect(gateway.emitGameUpdate).toHaveBeenCalledWith('g3', undefined)
  })

  it('並行 close/settle race(tableStatus closed): 跳過廣播, 避免對終態桌誤發 waiting', async () => {
    const { controller, gateway } = buildController({
      success: true,
      forfeited: true,
      tableStatus: 'closed',
      voided: true,
    })
    await controller.forfeit('g4', 'u1')
    expect(gateway.emitGameUpdate).not.toHaveBeenCalled()
  })

  it('completed 桌退款(無 gameState): 發 DB 重建廣播, 回應帶 refunded/refundAmount', async () => {
    const { controller, gateway } = buildController({
      success: true,
      forfeited: false,
      refunded: true,
      tableStatus: 'completed',
      refundAmount: 100,
    })
    const res = await controller.forfeit('g5', 'u1')

    // 意圖: 退款情境桌維持 completed(上一輪已結算), 同桌剩餘玩家要靠
    // game:updated 看到 players 少一人 — 跳過只限 closed/unknown race, 不可連
    // completed 退款一起跳過
    expect(gateway.emitGameUpdate).toHaveBeenCalledTimes(1)
    expect(gateway.emitGameUpdate).toHaveBeenCalledWith('g5', undefined)
    expect(res).toMatchObject({
      success: true,
      forfeited: false,
      refunded: true,
      tableStatus: 'completed',
      refundAmount: 100,
    })
  })

  it('並行 settle race(completed 非退款): 維持跳過廣播(與 closed 同樣是 race 分支)', async () => {
    const { controller, gateway } = buildController({
      success: true,
      forfeited: true,
      tableStatus: 'completed',
      voided: true,
    })
    await controller.forfeit('g6', 'u1')
    expect(gateway.emitGameUpdate).not.toHaveBeenCalled()
  })
})
