# Gaming Technical Specification

## Project Overview
This document provides detailed technical specifications for implementing gaming capabilities in the voidnull-labs platform, with a focus on Blackjack as the initial game implementation.

## Technical Stack & Architecture

### Backend (API Layer)
- **Framework**: NestJS (already established)
- **Database**: PostgreSQL with Prisma ORM (already established)
- **Real-time**: Socket.io (already established)
- **Authentication**: JWT + Refresh tokens (already established)
- **Caching**: Redis (already established)
- **Security**: Passport.js strategies, RBAC system

### Frontend (Web Layer)
- **Framework**: Next.js 14 (already established)
- **UI Library**: Tailwind CSS with custom components
- **State Management**: React hooks + Context API
- **Real-time Communication**: Socket.io client
- **TypeScript**: Full type safety

## Detailed Use Cases

### 1. User Authentication & Session Management
**Actor**: Registered User
**Preconditions**: User has valid account
**Main Flow**:
1. User logs in via existing authentication system
2. JWT token is issued and stored
3. User can access game lobby and play games
4. Session maintained through refresh tokens

**Alternative Flows**:
- Token expiration → use refresh token to get new access token
- Invalid token → redirect to login page

### 2. Game Creation & Lobby Management
**Actor**: Player
**Preconditions**: User authenticated
**Main Flow**:
1. Player navigates to game lobby
2. Player selects Blackjack game
3. System creates new game room with unique ID
4. Player joins game room
5. Game waits for minimum players

**Alternative Flows**:
- Insufficient players → wait timer or cancel game
- Player leaves during setup → remove from waiting list

### 3. Blackjack Gameplay
**Actor**: Player
**Preconditions**: Game room has minimum players (2)
**Main Flow**:
1. Dealer deals initial cards (2 per player, 1 face up for dealer)
2. Players take turns (hit/stand/double down/split)
3. Dealer plays according to house rules
4. Hand evaluation and payout calculation
5. Game ends with results displayed

### 4. Multiplayer Interaction
**Actor**: Multiple Players
**Preconditions**: Game room has players
**Main Flow**:
1. Players take turns in sequence
2. Player actions broadcasted to all participants
3. Real-time updates of game state
4. All players see same game progression

## Detailed API Specifications

### Game Management Endpoints
```
POST /games/blackjack
- Request: { maxPlayers: number, buyIn: number }
- Response: { gameId: string, status: 'waiting', players: [] }

GET /games/blackjack/{id}
- Response: { 
    gameId: string, 
    status: 'waiting' | 'active' | 'completed',
    players: [{ id: string, name: string, balance: number, hand: [] }],
    dealerHand: [],
    pot: number,
    currentTurn: string
  }

POST /games/blackjack/{id}/join
- Request: { playerId: string }
- Response: { success: true, playerPosition: number }

POST /games/blackjack/{id}/action
- Request: { 
    action: 'hit' | 'stand' | 'double' | 'split',
    playerId: string,
    betAmount?: number
  }
- Response: { 
    success: true,
    newHand: [],
    status: 'active' | 'completed',
    result?: {
        winner: string,
        payout: number,
        message: string
    }
  }
```

### WebSocket Events
```
Client → Server:
- game:create: { gameType: 'blackjack', maxPlayers: number, buyIn: number }
- game:join: { gameId: string, playerId: string }
- game:action: { gameId: string, action: string, playerId: string, data?: object }

Server → Client:
- game:created: { gameId: string, status: 'waiting', players: [] }
- game:joined: { gameId: string, playerPosition: number }
- game:updated: { 
    gameId: string, 
    gameState: object,
    currentTurn: string,
    players: []
  }
- game:ended: { 
    gameId: string,
    results: [{ playerId: string, hand: [], result: string, payout: number }],
    winner: string
  }
```

## Database Schema

### Game Model
```prisma
model Game {
  id           String   @id @default(cuid())
  type         String   // 'blackjack'
  status       String   // 'waiting', 'active', 'completed'
  maxPlayers   Int
  buyIn        Int
  pot          Int
  players      PlayerGame[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### PlayerGame Model
```prisma
model PlayerGame {
  id         String   @id @default(cuid())
  playerId   String
  gameId     String
  balance    Int
  hand       Json
  status     String   // 'waiting', 'playing', 'finished'
  position   Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  game       Game     @relation(fields: [gameId], references: [id])
  user       User     @relation(fields: [playerId], references: [id])
}
```

### GameHistory Model
```prisma
model GameHistory {
  id         String   @id @default(cuid())
  gameId     String
  winnerId   String?
  payout     Int
  timestamp  DateTime @default(now())
  
  game       Game     @relation(fields: [gameId], references: [id])
  winner     User     @relation(fields: [winnerId], references: [id])
}
```

## Frontend Component Structure

### Core Components
1. **GameLobby** - Displays available games, join buttons
2. **GameTable** - Main gameplay interface with cards, hands, controls
3. **PlayerHand** - Individual player card display
4. **DealerHand** - Dealer's card display
5. **GameControls** - Action buttons (Hit, Stand, Double Down, Split)
6. **GameStatus** - Game information and messages
7. **Leaderboard** - Player rankings and statistics

### State Management
- **GameContext**: Manages current game state
- **PlayerContext**: Manages player data and session
- **SocketContext**: Handles WebSocket connections and events

## Security Requirements

1. **Fair Play**: 
   - Cryptographically secure random number generation for card shuffling
   - Server-side validation of all game actions
   - No client-side manipulation of game state

2. **Transaction Safety**:
   - All betting transactions verified server-side
   - Balance updates atomic and consistent
   - Prevent duplicate actions

3. **Authentication**:
   - JWT token verification for all game operations
   - Session management with proper expiration
   - Rate limiting to prevent abuse

## Performance Requirements

1. **Real-time Response**: 
   - Game state updates within 200ms
   - WebSocket connection stability
   - Concurrent game support (minimum 50 games)

2. **Scalability**:
   - Horizontal scaling capability
   - Database query optimization
   - Caching for frequently accessed data

## Testing Strategy

### Unit Tests
- Game logic validation (hand evaluation, payout calculation)
- API endpoint testing
- Database model validation

### Integration Tests
- WebSocket communication flow
- Real-time game state updates
- Multiplayer interaction scenarios

### End-to-end Tests
- Complete game flow from lobby to completion
- User authentication and session management
- Error handling scenarios

## Implementation Timeline (Detailed)

### Phase 1: Infrastructure Setup (2 days)
- Create game module structure
- Extend Socket.io gateway
- Database schema migration
- Authentication integration

### Phase 2: Core Blackjack Game (3 days)
- Card deck implementation with shuffling
- Game rules engine
- Player action handling
- Win/loss determination

### Phase 3: UI Components (2 days)
- Game table interface
- Player hand display
- Betting controls
- Game status messages

### Phase 4: Advanced Features (2 days)
- Leaderboards system
- Player statistics
- Tournament functionality
- Chat integration

### Phase 5: Testing & Documentation (1 day)
- Unit and integration tests
- End-to-end testing
- API documentation
- User guides

```