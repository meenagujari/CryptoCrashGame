# 🚀 Crypto Crash Game

A real-time multiplayer cryptocurrency crash game built with Node.js, WebSockets, and MongoDB. Players bet in USD (converted to crypto using real-time prices) and watch a multiplier increase in real-time, deciding when to cash out before the game "crashes."

## 🎮 Game Features

- **Real-time Multiplayer**: WebSocket-powered live gameplay with multiple players
- **Cryptocurrency Integration**: Real-time BTC, ETH, and USDT price fetching from CoinGecko API
- **Provably Fair System**: Cryptographically secure crash point generation
- **10-Second Rounds**: Fast-paced gameplay with automatic round cycling
- **Wallet System**: Simulated crypto wallets with USD equivalents
- **Transaction Logging**: Complete audit trail of all bets and cashouts
- **Responsive Frontend**: Clean, modern interface with real-time updates

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: MongoDB with Mongoose ODM
- **API Integration**: CoinGecko cryptocurrency API
- **Frontend**: React.js with WebSocket client
- **Security**: Crypto module for provably fair algorithms

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- VS Code with recommended extensions

## 💻 Development Setup

### Setup Steps

1. **Clone the Repository**

```bash
git clone https://github.com/meenagujari/CrashGame.git
cd crypto-crash-game
```

2. **Install Backend Dependencies**

```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**

```bash
cd ../frontend
npm install
```

4. **Environment Configuration**

```bash
# Copy environment template in backend folder
cd ../backend
cp .env.example .env
# Edit .env with your MongoDB connection string
```

5. **Database Setup (Optional)**

```bash
# Populate database with sample data
node populate-db.js
```

6. **Start Development Servers**

**Option 1: Two Terminal Windows**

```bash
# Terminal 1 - Backend (from project root)
cd backend && node index.js

# Terminal 2 - Frontend (from project root)
cd frontend && npm start
```

**Option 2: VS Code Tasks (Recommended)**

- Use `Ctrl+Shift+P` → "Tasks: Run Task"
- Select "Start Backend Server" or "Start Frontend Server"
- Or use the built-in terminal to run both commands

7. **Access the Application**

- **Game Interface**: http://localhost:3000
- **Backend API**: http://localhost:5000

### VS Code Recommended Extensions

- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- MongoDB for VS Code
- REST Client (for API testing)
- Live Server (if needed)

### VS Code Workspace Configuration

Create a `.vscode/settings.json` file in your project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

### Debugging in VS Code

Create a `.vscode/launch.json` file for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/index.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# MongoDB Connection (required)
MONGODB_URI=mongodb://localhost:27017/crypto-crash

# Server Port (optional - defaults to 5000)
PORT=5000

# Optional: Add your own API keys if needed
# COINGECKO_API_KEY=your_api_key_here
```

### Cryptocurrency API Setup

The game uses the **CoinGecko API** for real-time cryptocurrency prices:

#### Free Tier (Default)

- **No API key required** for basic usage
- **Rate limit**: 30 calls/minute
- **Supported coins**: BTC, ETH, USDT
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price`

The application includes intelligent rate limiting and caching:

- Prices cached for 10 seconds to avoid rate limits
- Automatic fallback to cached prices if API fails
- Graceful handling of rate limit errors

#### Pro Tier (Optional)

If you need higher rate limits:

1. Sign up at [CoinGecko Pro](https://pro.coingecko.com/)
2. Get your API key
3. Add it to your `.env` file
4. Modify the API headers in `index.js` to include authentication

### MongoDB Setup Options

#### Option 1: Local MongoDB

```bash
# Install MongoDB locally
# Ubuntu/Debian:
sudo apt-get install mongodb

# macOS with Homebrew:
brew install mongodb/brew/mongodb-community

# Start MongoDB service
sudo systemctl start mongodb  # Linux
brew services start mongodb-community  # macOS
```

#### Option 2: MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

Example Atlas connection string:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crypto-crash?retryWrites=true&w=majority
```

## 📦 Installation & Setup

### Local Development

1. **Clone the repository**

```bash
git clone <repository-url>
cd crypto-crash-game
```

2. **Install backend dependencies**

```bash
cd backend
npm install
```

3. **Install frontend dependencies**

```bash
cd ../frontend
npm install
```

4. **Configure environment**

```bash
cd ../backend
cp .env.example .env
# Edit .env with your MongoDB configuration
```

5. **Start both servers**

```bash
# Terminal 1 - Backend
cd backend && node index.js

# Terminal 2 - Frontend
cd frontend && npm start
```

6. **Access the game**

- Game Interface: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## 🎯 How to Play

1. **Connect**: Open the game in your browser
2. **Check Balance**: View your crypto wallet balances (BTC, ETH, USDT)
3. **Place Bet**:
   - Enter USD amount to bet
   - Select cryptocurrency (BTC, ETH, or USDT)
   - Click "Place Bet" during betting phase
4. **Watch Multiplier**: Multiplier starts at 1.00x and increases over time
5. **Cash Out**: Click "Cash Out" before the crash to win!
6. **Crash**: If you don't cash out in time, you lose your bet

### Game Mechanics

- **Betting Phase**: 3 seconds to place bets at round start
- **Active Phase**: Up to 7 seconds of multiplier growth
- **Crash Point**: Randomly determined (1.01x to 120x)
- **Round Duration**: Exactly 10 seconds total
- **Real-time Updates**: Multiplier updates every 100ms

## 🔧 API Endpoints

### Player Management

- `GET /api/player/:playerId/balance` - Get player wallet balances
- `POST /api/wallet/add` - Add funds to wallet (demo)

### Game Actions

- `POST /api/bet` - Place a bet for current/next round
- `POST /api/cashout` - Cash out during active round
- `GET /api/round/current` - Get current round information
- `GET /api/round/history` - Get recent round history

### Market Data

- `GET /api/prices` - Get current cryptocurrency prices

## 🔌 WebSocket Events

### Client → Server

- `cashout` - Request cashout during round

### Server → Client

- `roundWaiting` - Betting phase started
- `roundStart` - Round active, multiplier rising
- `multiplierUpdate` - Real-time multiplier updates
- `roundCrash` - Round ended, crash point revealed
- `playerBet` - Player placed a bet
- `playerCashout` - Player cashed out
- `gameState` - Current game state (on connect)

## 🛡️ Security Features

- **Provably Fair**: Cryptographically secure crash point generation
- **Input Validation**: All API endpoints validate user input
- **Rate Limiting**: Protection against API abuse
- **Transaction Integrity**: Atomic database operations
- **WebSocket Security**: Validated cashout requests

## 📊 Database Schema

### Collections

- **players**: Player information and wallet balances
- **gamerounds**: Round data and crash points
- **bets**: Individual player bets
- **transactions**: Complete transaction audit log

### Key Fields

- All USD amounts and crypto equivalents stored
- Transaction hashes for audit trails
- Timestamps for all operations
- Provably fair seeds and hashes

## 🔍 Troubleshooting

### Common Issues

**MongoDB Connection Failed**

- Check MONGODB_URI in environment variables
- Ensure MongoDB service is running
- Verify network connectivity for Atlas

**Cryptocurrency Prices Not Updating**

- Check internet connection
- Verify CoinGecko API is accessible
- Rate limiting: Wait 30 seconds and try again

**WebSocket Connection Issues**

- Ensure port 5000 is accessible
- Check firewall settings
- Verify server is running

**Game Not Starting**

- Check server console for errors
- Verify MongoDB connection
- Ensure all dependencies are installed

**Port Already in Use**

- Kill existing processes with `lsof -ti:3000` or `lsof -ti:5000`
- Frontend Not Connecting to Backend: Verify proxy setting in `frontend/package.json`
- Environment Variables Not Loading: Ensure `.env` file is in the `backend/` directory
- React Build Issues: Clear node_modules: `rm -rf frontend/node_modules && cd frontend && npm install`

### Debug Mode

```bash
DEBUG=crypto-crash:* node backend/index.js
```

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📡 API Documentation

### REST Endpoints

#### Player Management

**GET /api/player/:playerId/balance**

- **Description**: Retrieve player wallet balances in crypto and USD equivalent
- **Method**: GET
- **URL**: `/api/player/{playerId}/balance`
- **Parameters**:
  - `playerId` (string): Unique player identifier
- **Response Format**:

```json
{
  "success": true,
  "balances": {
    "BTC": { "crypto": 0.001, "usd": 45.0 },
    "ETH": { "crypto": 0.5, "usd": 1250.0 },
    "USDT": { "crypto": 1000, "usd": 1000.0 }
  }
}
```

**POST /api/wallet/add**

- **Description**: Add funds to player wallet (demo functionality)
- **Method**: POST
- **URL**: `/api/wallet/add`
- **Request Format**:

```json
{
  "playerId": "string",
  "usdAmount": 100.0,
  "currency": "BTC|ETH|USDT"
}
```

- **Response Format**:

```json
{
  "success": true,
  "cryptoAmount": 0.002,
  "newBalance": 0.003,
  "transactionHash": "64-char-hex-string",
  "message": "Added $100 worth of BTC to wallet"
}
```

#### Game Actions

**POST /api/bet**

- **Description**: Place a bet for current or next round
- **Method**: POST
- **URL**: `/api/bet`
- **Request Format**:

```json
{
  "playerId": "string",
  "usdAmount": 10.0,
  "currency": "BTC|ETH|USDT"
}
```

- **Response Format**:

```json
{
  "success": true,
  "transactionHash": "64-char-hex-string",
  "cryptoAmount": 0.0002,
  "newBalance": 0.0008,
  "roundId": "1753607922751",
  "message": "Bet placed for current round"
}
```

**POST /api/cashout**

- **Description**: Cash out during active round
- **Method**: POST
- **URL**: `/api/cashout`
- **Request Format**:

```json
{
  "playerId": "string"
}
```

- **Response Format**:

```json
{
  "success": true,
  "multiplier": 2.45,
  "cryptoPayout": 0.00049,
  "usdPayout": 24.5,
  "transactionHash": "64-char-hex-string"
}
```

#### Game Information

**GET /api/round/current**

- **Description**: Get current round information and game state
- **Method**: GET
- **URL**: `/api/round/current`
- **Response Format**:

```json
{
  "roundId": "1753607922751",
  "status": "active|waiting|crashed",
  "bettingPhase": false,
  "crashPoint": 15.47,
  "currentMultiplier": 2.15,
  "timeElapsed": 2150,
  "nextRoundId": "1753607932751"
}
```

**GET /api/round/history**

- **Description**: Get recent round history
- **Method**: GET
- **URL**: `/api/round/history`
- **Response Format**:

```json
{
  "success": true,
  "rounds": [
    {
      "roundId": "1753607922751",
      "crashPoint": 15.47,
      "startTime": "2024-01-26T10:30:00Z",
      "endTime": "2024-01-26T10:30:10Z",
      "status": "crashed"
    }
  ]
}
```

**GET /api/prices**

- **Description**: Get current cryptocurrency prices
- **Method**: GET
- **URL**: `/api/prices`
- **Response Format**:

```json
{
  "BTC": 45000,
  "ETH": 2500,
  "USDT": 1,
  "lastUpdate": 1753607936107
}
```

## 🔌 WebSocket Events

### Client → Server Events

**cashout**

- **Description**: Request cashout during active round
- **Event Name**: `cashout`
- **Payload**:

```json
{
  "playerId": "string"
}
```

### Server → Client Events

**gameState**

- **Description**: Current game state sent on connection
- **Event Name**: `gameState`
- **Payload**:

```json
{
  "roundId": "1753607922751",
  "status": "active",
  "currentMultiplier": 1.25,
  "timeElapsed": 1250
}
```

**roundWaiting**

- **Description**: Betting phase started (3 seconds)
- **Event Name**: `roundWaiting`
- **Payload**:

```json
{
  "roundId": "1753607932751",
  "seedHash": "abc123...",
  "timeUntilStart": 3000,
  "message": "Betting phase - Place your bets!"
}
```

**roundStart**

- **Description**: Round active, multiplier rising
- **Event Name**: `roundStart`
- **Payload**:

```json
{
  "roundId": "1753607932751",
  "seedHash": "abc123...",
  "message": "Round started! Multiplier rising..."
}
```

**multiplierUpdate**

- **Description**: Real-time multiplier updates (every 100ms)
- **Event Name**: `multiplierUpdate`
- **Payload**:

```json
{
  "multiplier": 1.87,
  "timeElapsed": 1870
}
```

**roundCrash**

- **Description**: Round ended, crash point revealed
- **Event Name**: `roundCrash`
- **Payload**:

```json
{
  "roundId": "1753607932751",
  "crashPoint": 15.47,
  "seed": "original-seed-for-verification",
  "message": "Round crashed at 15.47x! Next round starting soon..."
}
```

**playerBet**

- **Description**: Player placed a bet
- **Event Name**: `playerBet`
- **Payload**:

```json
{
  "playerId": "alice_crypto_trader",
  "usdAmount": 10.0,
  "cryptoAmount": 0.0002,
  "currency": "BTC",
  "transactionHash": "abc123...",
  "roundId": "1753607932751",
  "message": "Bet placed for current round"
}
```

**playerCashout**

- **Description**: Player cashed out
- **Event Name**: `playerCashout`
- **Payload**:

```json
{
  "playerId": "alice_crypto_trader",
  "multiplier": 2.45,
  "cryptoPayout": 0.00049,
  "usdPayout": 24.5,
  "currency": "BTC"
}
```

**cashoutSuccess**

- **Description**: Confirmation of successful cashout to requesting client
- **Event Name**: `cashoutSuccess`
- **Payload**:

```json
{
  "multiplier": 2.45,
  "cryptoPayout": 0.00049,
  "usdPayout": 24.5,
  "transactionHash": "abc123..."
}
```

**cashoutError**

- **Description**: Error during cashout attempt
- **Event Name**: `cashoutError`
- **Payload**:

```json
{
  "error": "Round already crashed"
}
```

## 🎲 Provably Fair Algorithm

### How It Ensures Fairness

The game uses a **provably fair system** that allows players to verify the randomness and integrity of each crash point:

#### 1. **Cryptographic Seed Generation**

```javascript
const seed = crypto.randomBytes(32).toString("hex"); // 256-bit random seed
const seedHash = crypto.createHash("sha256").update(seed).digest("hex");
```

- Each round uses a cryptographically secure 256-bit random seed
- The SHA-256 hash of the seed is published **before** the round starts
- Players can see the seed hash but not the actual seed

#### 2. **Deterministic Crash Point Calculation**

```javascript
function generateCrashPoint(seed, roundNumber) {
  const hash = crypto
    .createHash("sha256")
    .update(seed + roundNumber.toString())
    .digest("hex");
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const crashPoint = Math.max(1.01, (hashNumber % 10000) / 100 + 1);
  return Math.min(crashPoint, 120); // Cap at 120x
}
```

#### 3. **Verification Process**

- **Before Round**: Players see the seed hash (`seedHash`)
- **After Crash**: The original seed is revealed
- **Player Verification**: Players can verify the crash point using:
  1. The revealed seed
  2. The round number
  3. The same algorithm used by the server

#### 4. **Why It's Fair**

- **Unpredictable**: Impossible to predict crash point from seed hash
- **Verifiable**: Players can verify authenticity after each round
- **Tamper-proof**: Cannot be manipulated without changing the published seed hash
- **Transparent**: Algorithm is open and auditable

### Example Verification

```javascript
// Players can verify with:
const revealedSeed = "abc123..."; // Revealed after crash
const roundNumber = 1753607932751;
const calculatedCrash = generateCrashPoint(revealedSeed, roundNumber);
// Should match the actual crash point that occurred
```

## 💱 USD-to-Crypto Conversion Logic

### Real-time Price Fetching

#### 1. **CoinGecko API Integration**

```javascript
const response = await axios.get(
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd"
);
```

#### 2. **Intelligent Caching System**

- **Cache Duration**: 10 seconds to balance freshness vs. API limits
- **Rate Limit Protection**: Handles 429 errors gracefully
- **Fallback Prices**: Safe defaults if API is unavailable
  - BTC: $45,000 USD
  - ETH: $2,500 USD
  - USDT: $1.00 USD (stable coin)

#### 3. **Conversion Logic**

```javascript
function getCurrentPrice(currency) {
  const price = priceCache[currency];
  return price || fallbackPrices[currency];
}

// Convert USD to crypto
const cryptoAmount = usdAmount / getCurrentPrice(currency);

// Convert crypto to USD
const usdEquivalent = cryptoAmount * getCurrentPrice(currency);
```

#### 4. **Price Consistency**

- **Bet Placement**: Locks in price at time of bet
- **Cashout Calculation**: Uses original bet price for USD calculations
- **Balance Display**: Shows current market rates for portfolio view

#### 5. **Error Handling**

- **API Failures**: Falls back to cached prices
- **Rate Limiting**: Waits 30 seconds before retry
- **Invalid Prices**: Uses validated fallback values
- **Network Issues**: Continues with last known prices

## 🛠️ Technical Architecture Overview

### Game Logic Approach

#### **10-Second Round Cycle**

- **3 seconds**: Betting phase (players place bets)
- **Up to 7 seconds**: Active phase (multiplier rises, cashouts allowed)
- **Automatic**: Force end at 10 seconds to maintain consistent timing

#### **Multiplier Calculation**

```javascript
const multiplier = Math.max(1, 1 + timeElapsed * 0.1); // 0.1 growth per second
const cappedMultiplier = Math.min(multiplier, crashPoint); // Never exceed crash point
```

#### **State Management**

- **Global State**: Current round, betting phase, active status
- **Atomic Operations**: Database transactions prevent race conditions
- **Real-time Updates**: 100ms intervals for smooth multiplier display

### Cryptocurrency Integration

#### **Multi-Currency Support**

- **BTC**: Bitcoin with real-time pricing
- **ETH**: Ethereum with real-time pricing
- **USDT**: Tether (stable coin, always $1.00)

#### **Wallet Management**

- **Starting Balances**: Demo amounts for new players
- **Atomic Updates**: Transaction-safe balance modifications
- **USD Equivalents**: Real-time conversion for display

#### **Transaction Auditing**

- **Complete Logs**: Every bet, cashout, and deposit
- **Mock Hashes**: 64-character hex strings for audit trails
- **Price Snapshots**: Historical price data with each transaction

### WebSocket Implementation

#### **Real-time Features**

- **Multiplier Updates**: Broadcast every 100ms during active rounds
- **Player Actions**: Live bet and cashout notifications
- **Game State**: Immediate round status updates

#### **Security Measures**

- **Rate Limiting**: Prevent spam cashout attempts
- **Input Validation**: Sanitize all WebSocket messages
- **Connection Tracking**: Monitor for suspicious behavior
- **Atomic Cashouts**: Prevent double-cashout exploits

#### **Connection Management**

- **Auto-reconnect**: Client handles connection drops
- **State Sync**: Game state sent on every connection
- **Error Handling**: Graceful degradation for network issues

### Database Design

#### **Collections**

- **players**: User accounts and wallet balances
- **gamerounds**: Round history with crash points and seeds
- **bets**: Individual player bets with outcomes
- **transactions**: Complete audit trail of all financial activity

#### **Atomicity**

- **MongoDB Sessions**: Ensure transaction consistency
- **Optimistic Locking**: Prevent concurrent modification issues
- **Rollback Support**: Automatic rollback on transaction failures

## 📞 Support

For issues and questions:

- Check the troubleshooting section
- Review server console logs
- Ensure all environment variables are set correctly
- Verify MongoDB and API connectivity

---

**Happy Gaming! 🎮🚀**
