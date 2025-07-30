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
- Git
- npm (Node Package Manager)

## 💻 Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/meenagujari/CryptoCrashGame.git
cd CryptoCrashGame
```

### 2. Install Dependencies

Navigate to the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

Then, navigate to the `frontend` directory and install dependencies:

```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

Copy the example environment file in the `backend` directory:

```bash
cd ../backend
cp .env.example .env
```

Edit the newly created `.env` file with your MongoDB connection string. If you are using MongoDB Atlas, ensure your connection string is correct and your IP address is whitelisted.

```env
# .env file in backend directory

# MongoDB Connection (required)
MONGODB_URI=mongodb://localhost:27017/crypto-crash

# Server Port (optional - defaults to 5000)
PORT=5000

# Optional: Add your CoinGecko Pro API key if you have one
# COINGECKO_API_KEY=your_api_key_here
```

### 4. Database Setup (Optional)

To populate the database with sample player data, run the following command from the `backend` directory:

```bash
node populate-db.js
```

### 5. Start Development Servers

**Option 1: Using Two Terminal Windows**

Open two separate terminal windows. From the project root directory:

**Terminal 1 (Backend):**

```bash
cd backend
node index.js
```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm start
```

**Option 2: Using VS Code Tasks (Recommended)**

If you are using VS Code, you can leverage its task runner:

- Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
- Type `Tasks: Run Task` and select it.
- Choose `Start Backend Server` to start the backend.
- Repeat the process and choose `Start Frontend Server` to start the frontend.

### 6. Access the Application

Once both servers are running:

- **Game Interface**: <mcurl name="http://localhost:3000" url="http://localhost:3000"></mcurl>
- **Backend API**: <mcurl name="http://localhost:5000" url="http://localhost:5000"></mcurl>

## ⚙️ Configuration

### Cryptocurrency API Setup

The game uses the **CoinGecko API** for real-time cryptocurrency prices. By default, it uses the free tier.

#### Free Tier (Default)

- **No API key required** for basic usage.
- **Rate limit**: 30 calls/minute.
- **Supported coins**: BTC, ETH, USDT.
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price`.

The application includes intelligent rate limiting and caching:

- Prices are cached for 10 seconds to avoid hitting rate limits.
- Automatic fallback to cached prices if the API fails.
- Graceful handling of rate limit errors.

#### Pro Tier (Optional)

If you require higher rate limits for CoinGecko, you can use their Pro API:

1. Sign up and obtain an API key from <mcurl name="CoinGecko Pro" url="https://pro.coingecko.com/"></mcurl>.
2. Add your API key to the `.env` file in the `backend` directory (as shown in the Environment Configuration section).
3. You might need to modify the API request headers in <mcfile name="index.js" path="backend/index.js"></mcfile> to include the authentication for the Pro API, depending on CoinGecko's current requirements.

### MongoDB Setup Options

#### Option 1: Local MongoDB

If you prefer to run MongoDB locally, follow the installation instructions for your operating system:

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS with Homebrew:**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Option 2: MongoDB Atlas (Cloud)

For a cloud-hosted MongoDB solution:

1. Create an account at <mcurl name="MongoDB Atlas" url="https://www.mongodb.com/atlas"></mcurl>.
2. Create a free tier cluster.
3. Obtain your connection string and update the `MONGODB_URI` variable in your `backend/.env` file.
4. Ensure you whitelist your IP address in the MongoDB Atlas network access settings.

## 🚀 Usage

Once the application is running, open your browser to <mcurl name="http://localhost:3000" url="http://localhost:3000"></mcurl>. You can:

- Observe the real-time multiplier.
- Place bets using BTC, ETH, or USDT (simulated balances).
- Cash out before the crash point to multiply your winnings.
- View your wallet balances and transaction history.
- See the history of past game rounds.
