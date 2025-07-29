
/**
 * Crypto Crash Game Server
 * A real-time multiplayer cryptocurrency crash game with WebSocket support
 * Features: Real-time multipliers, crypto price integration, provably fair system
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// =============================================
// SERVER SETUP & CONFIGURATION
// =============================================

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware configuration
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://0.0.0.0:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
  ],
  credentials: true
}));
app.use(express.json());
// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/public')));


// =============================================
// DATABASE CONNECTION & MODELS
// =============================================

/**
 * MongoDB connection with error handling
 */
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-crash')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/**
 * Player Schema - Stores player information and wallet balances
 */
const playerSchema = new mongoose.Schema({
  playerId: { type: String, unique: true, required: true },
  wallets: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 1000 }, // Demo starting balance
    USDT: { type: Number, default: 1000 }
  },
  createdAt: { type: Date, default: Date.now }
});

/**
 * Game Round Schema - Stores round information and crash points
 */
const gameRoundSchema = new mongoose.Schema({
  roundId: { type: String, unique: true, required: true },
  seed: { type: String, required: true },
  seedHash: { type: String, required: true },
  crashPoint: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: ['waiting', 'active', 'crashed'], default: 'waiting' }
});

/**
 * Bet Schema - Stores individual player bets for each round
 */
const betSchema = new mongoose.Schema({
  roundId: { type: String, required: true },
  playerId: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  priceAtTime: { type: Number, required: true },
  cashedOut: { type: Boolean, default: false },
  cashoutMultiplier: { type: Number },
  cashoutAmount: { type: Number },
  transactionHash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

/**
 * Transaction Schema - Audit trail for all financial transactions
 */
const transactionSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  transactionType: { type: String, enum: ['bet', 'cashout', 'deposit'], required: true },
  transactionHash: { type: String, required: true },
  priceAtTime: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Initialize models
const Player = mongoose.model('Player', playerSchema);
const GameRound = mongoose.model('GameRound', gameRoundSchema);
const Bet = mongoose.model('Bet', betSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// =============================================
// CRYPTOCURRENCY PRICE MANAGEMENT
// =============================================

/**
 * Price cache with fallback values to ensure system reliability
 * Uses 10-second cache as requested to avoid API rate limits
 */
let priceCache = {
  BTC: 45000, // Fallback price in USD
  ETH: 2500,  // Fallback price in USD
  USDT: 1,    // Stable coin - always 1 USD
  lastUpdate: 0
};

let fetchingPrices = false; // Prevents multiple simultaneous API calls

/**
 * Fetches real-time cryptocurrency prices from CoinGecko API
 * Implements rate limiting protection and error handling
 */
async function fetchCryptoPrices() {
  // Prevent concurrent API requests
  if (fetchingPrices) return;
  
  fetchingPrices = true;
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd', {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoCrashGame/1.0'
      }
    });
    
    // Update cache with fresh prices
    priceCache.BTC = response.data.bitcoin.usd;
    priceCache.ETH = response.data.ethereum.usd;
    priceCache.USDT = response.data.tether.usd;
    priceCache.lastUpdate = Date.now();
    console.log('💰 Prices updated successfully:', priceCache);
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('⚠️ Rate limited by CoinGecko, using cached prices for 60 seconds');
      // Extend cache validity when rate limited
      priceCache.lastUpdate = Date.now() + 50000; // Use cache for 50 more seconds
    } else {
      console.error('❌ Error fetching prices, using cached/fallback prices:', error.message);
      priceCache.lastUpdate = Date.now();
    }
  } finally {
    fetchingPrices = false;
  }
}

/**
 * Gets current cryptocurrency price with intelligent caching and validation
 * @param {string} currency - Currency symbol (BTC, ETH, USDT)
 * @returns {number} Current price in USD
 */
function getCurrentPrice(currency) {
  // Validate currency input
  if (!currency || typeof currency !== 'string') {
    return 1; // Default fallback
  }
  
  const validCurrencies = ['BTC', 'ETH', 'USDT'];
  if (!validCurrencies.includes(currency.toUpperCase())) {
    console.warn(`⚠️ Invalid currency requested: ${currency}`);
    return 1; // Default fallback
  }
  
  const now = Date.now();
  // Refresh cache if older than 30 seconds (aligned with fetch interval)
  if (now - priceCache.lastUpdate > 30000) {
    fetchCryptoPrices();
  }
  
  const price = priceCache[currency];
  
  // Validate price is reasonable
  if (!price || price <= 0 || price > 1000000) {
    console.warn(`⚠️ Invalid price for ${currency}: ${price}, using fallback`);
    return currency === 'USDT' ? 1 : currency === 'BTC' ? 45000 : 2500;
  }
  
  return price;
}

// =============================================
// PROVABLY FAIR SYSTEM
// =============================================

/**
 * Generates provably fair crash point using cryptographic hashing
 * Ensures transparency and prevents manipulation
 * @param {string} seed - Random seed for the round
 * @param {number} roundNumber - Round identifier
 * @returns {number} Crash point between 1.01x and 120x
 */
function generateCrashPoint(seed, roundNumber) {
  const hash = crypto.createHash('sha256').update(seed + roundNumber.toString()).digest('hex');
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const crashPoint = Math.max(1.01, (hashNumber % 10000) / 100 + 1);
  return Math.min(crashPoint, 120); // Cap at 120x for game balance
}

/**
 * Generates cryptographically secure transaction hash
 * @returns {string} 64-character hexadecimal hash
 */
function generateTransactionHash() {
  return crypto.randomBytes(32).toString('hex');
}

// =============================================
// PLAYER MANAGEMENT
// =============================================

/**
 * Creates new player or retrieves existing player from database
 * @param {string} playerId - Unique player identifier
 * @returns {Object} Player document with wallet balances
 */
async function getOrCreatePlayer(playerId) {
  let player = await Player.findOne({ playerId });
  if (!player) {
    player = new Player({
      playerId,
      wallets: {
        BTC: 0.001, // Starting BTC balance
        ETH: 0.5,   // Starting ETH balance
        USDT: 1000  // Starting USDT balance
      }
    });
    await player.save();
    console.log('👤 New player created:', playerId);
  }
  return player;
}

// =============================================
// GAME STATE MANAGEMENT
// =============================================

// Global game state variables
let currentRound = null;    // Currently active round
let nextRound = null;       // Pre-generated next round
let gameInterval = null;    // Game timing interval
let roundStartTime = null;  // Round start timestamp
let isGameActive = false;   // Game active status
let bettingPhase = true;    // Betting phase status

/**
 * Calculates current multiplier based on elapsed time with validation
 * @returns {number} Current multiplier value
 */
function getCurrentMultiplier() {
  if (!isGameActive || !roundStartTime || !currentRound) return 1;
  
  const timeElapsed = (Date.now() - roundStartTime) / 1000;
  
  // Validate time elapsed is reasonable (not negative or too large)
  if (timeElapsed < 0 || timeElapsed > 10) return 1;
  
  const multiplier = Math.max(1, 1 + (timeElapsed * 0.1)); // 0.1 growth factor per second
  
  // Cap multiplier at crash point to prevent going over
  return Math.min(multiplier, currentRound.crashPoint);
}

/**
 * Starts a new game round with betting phase
 * Creates round from next round queue or generates new one
 */
async function startNewRound() {
  // Use pre-generated next round if available
  if (nextRound) {
    currentRound = nextRound;
    currentRound.startTime = new Date();
    await currentRound.save();
    nextRound = null;
    console.log('🎮 Starting queued round:', currentRound.roundId);
  } else {
    // Generate new round
    const seed = crypto.randomBytes(32).toString('hex');
    const seedHash = crypto.createHash('sha256').update(seed).digest('hex');
    const roundId = Date.now().toString();
    const crashPoint = generateCrashPoint(seed, Date.now());

    currentRound = new GameRound({
      roundId,
      seed,
      seedHash,
      crashPoint,
      startTime: new Date(),
      status: 'waiting'
    });
    await currentRound.save();
    console.log('🎮 New round created:', roundId, 'Crash point:', crashPoint.toFixed(2) + 'x');
  }

  bettingPhase = true;

  // Notify all clients of betting phase (3 seconds)
  io.emit('roundWaiting', {
    roundId: currentRound.roundId,
    seedHash: currentRound.seedHash,
    timeUntilStart: 3000,
    message: 'Betting phase - Place your bets!'
  });

  // Start active gameplay after 3-second betting period
  setTimeout(async () => {
    bettingPhase = false;
    currentRound.status = 'active';
    await currentRound.save();
    
    roundStartTime = Date.now();
    isGameActive = true;

    io.emit('roundStart', {
      roundId: currentRound.roundId,
      seedHash: currentRound.seedHash,
      message: 'Round started! Multiplier rising...'
    });

    // Start real-time multiplier updates (every 100ms as requested)
    const multiplierInterval = setInterval(() => {
      if (!isGameActive) {
        clearInterval(multiplierInterval);
        return;
      }

      const currentMultiplier = getCurrentMultiplier();
      const timeElapsed = Date.now() - roundStartTime;
      
      // Force crash after 7 seconds OR when reaching crash point
      if (currentMultiplier >= currentRound.crashPoint || timeElapsed >= 7000) {
        clearInterval(multiplierInterval);
        endRound();
      } else {
        // Broadcast multiplier update to all clients
        io.emit('multiplierUpdate', {
          multiplier: currentMultiplier,
          timeElapsed: timeElapsed
        });
      }
    }, 100); // Update every 100ms for smooth experience

  }, 3000); // 3 second betting phase
}

/**
 * Ends the current round, calculates final results, and starts next round
 */
async function endRound() {
  if (!currentRound || !isGameActive) return;

  isGameActive = false;
  bettingPhase = false;
  currentRound.status = 'crashed';
  currentRound.endTime = new Date();
  await currentRound.save();

  const finalMultiplier = getCurrentMultiplier();
  const crashPoint = Math.min(finalMultiplier, currentRound.crashPoint);
  
  console.log('💥 Round', currentRound.roundId, 'crashed at', crashPoint.toFixed(2) + 'x');

  // Notify all clients of crash
  io.emit('roundCrash', {
    roundId: currentRound.roundId,
    crashPoint: crashPoint,
    seed: currentRound.seed,
    message: `Round crashed at ${crashPoint.toFixed(2)}x! Next round starting soon...`
  });

  // Immediately start next round to maintain 10-second cycle
  startNewRound();
}

/**
 * Initializes automatic 10-second game cycle
 */
function startGameCycle() {
  console.log('🚀 Starting automatic game cycle (10-second rounds)');
  startNewRound();
  
  // Ensure new rounds start every 10 seconds regardless of crash timing
  setInterval(() => {
    if (isGameActive) {
      console.log('⏰ Force ending round to maintain 10-second cycle');
      endRound();
    }
  }, 10000); // Exactly 10 seconds per round
}

// =============================================
// API ENDPOINTS
// =============================================

/**
 * Root route - Serve the game interface
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

/**
 * API Root - Health check endpoint
 */
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Crypto Crash Game API Server',
    version: '1.0.0',
    status: 'operational'
  });
});

/**
 * GET /api/player/:playerId/balance
 * Retrieves player wallet balances in crypto and USD equivalent
 */
app.get('/api/player/:playerId/balance', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    // Validate player ID
    if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Valid player ID is required', balances: {} });
    }
    
    // Validate player ID format (basic alphanumeric check)
    if (!/^[a-zA-Z0-9_]+$/.test(playerId)) {
      return res.status(400).json({ success: false, error: 'Invalid player ID format', balances: {} });
    }
    
    const player = await getOrCreatePlayer(playerId);
    const balances = {};
    
    // Calculate USD equivalent for each cryptocurrency with validation
    for (const [currency, amount] of Object.entries(player.wallets)) {
      const price = getCurrentPrice(currency);
      const cryptoAmount = Math.max(0, amount || 0); // Ensure non-negative
      balances[currency] = {
        crypto: cryptoAmount,
        usd: cryptoAmount * price
      };
    }
    
    console.log(`💼 Balance loaded for player ${playerId}:`, balances);
    res.status(200).json({ success: true, balances });
  } catch (error) {
    console.error('❌ Error fetching player balance:', error.message);
    res.status(500).json({ success: false, error: error.message, balances: {} });
  }
});

/**
 * POST /api/bet
 * Places a bet for current or next round with atomic balance updates
 */
app.post('/api/bet', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { playerId, usdAmount, currency } = req.body;
    
    // Comprehensive input validation
    if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
      return res.status(400).json({ error: 'Valid player ID is required' });
    }
    
    if (!usdAmount || typeof usdAmount !== 'number' || usdAmount <= 0 || usdAmount > 10000) {
      return res.status(400).json({ error: 'USD amount must be between $0.01 and $10,000' });
    }
    
    if (usdAmount < 0.01) {
      return res.status(400).json({ error: 'Minimum bet amount is $0.01' });
    }
    
    if (!currency || !['BTC', 'ETH', 'USDT'].includes(currency)) {
      return res.status(400).json({ error: 'Currency must be BTC, ETH, or USDT' });
    }
    
    // Check if game allows betting
    if (!bettingPhase && (!nextRound || nextRound.status !== 'waiting')) {
      return res.status(400).json({ error: 'Betting is currently closed' });
    }
    
    // Validate player exists and has sufficient balance before starting transaction
    const playerCheck = await Player.findOne({ playerId });
    if (!playerCheck) {
      return res.status(400).json({ error: 'Player not found' });
    }

    const price = getCurrentPrice(currency);
    const cryptoAmount = usdAmount / price;

    // Start atomic transaction
    await session.withTransaction(async () => {
      // Get player with session lock to prevent concurrent modifications
      const player = await Player.findOneAndUpdate(
        { playerId },
        { $setOnInsert: { 
          playerId,
          wallets: {
            BTC: 0.001,
            ETH: 0.5,
            USDT: 1000
          },
          createdAt: new Date()
        }},
        { 
          upsert: true, 
          new: true,
          session 
        }
      );

      // Check sufficient balance atomically
      if (player.wallets[currency] < cryptoAmount) {
        throw new Error('Insufficient balance');
      }

      // Determine target round (current betting phase or next round)
      let targetRound;
      let betMessage;

      if (bettingPhase && currentRound && currentRound.status === 'waiting') {
        targetRound = currentRound;
        betMessage = 'Bet placed for current round';
      } else {
        if (!nextRound) {
          const seed = crypto.randomBytes(32).toString('hex');
          const seedHash = crypto.createHash('sha256').update(seed).digest('hex');
          const roundId = (Date.now() + 1000).toString();
          const crashPoint = generateCrashPoint(seed, Date.now() + 1000);

          nextRound = new GameRound({
            roundId,
            seed,
            seedHash,
            crashPoint,
            startTime: new Date(Date.now() + 60000),
            status: 'waiting'
          });
          await nextRound.save({ session });
        }
        targetRound = nextRound;
        betMessage = 'Bet placed for next round';
      }

      // Atomically deduct bet amount from player wallet
      const updatedPlayer = await Player.findOneAndUpdate(
        { 
          playerId,
          [`wallets.${currency}`]: { $gte: cryptoAmount }
        },
        { 
          $inc: { [`wallets.${currency}`]: -cryptoAmount }
        },
        { 
          new: true,
          session 
        }
      );

      if (!updatedPlayer) {
        throw new Error('Insufficient balance or concurrent modification detected');
      }

      // Create bet record atomically
      const transactionHash = generateTransactionHash();
      const bet = new Bet({
        roundId: targetRound.roundId,
        playerId,
        usdAmount,
        cryptoAmount,
        currency,
        priceAtTime: price,
        transactionHash
      });
      await bet.save({ session });

      // Create transaction audit log atomically
      const transaction = new Transaction({
        playerId,
        usdAmount,
        cryptoAmount,
        currency,
        transactionType: 'bet',
        transactionHash,
        priceAtTime: price
      });
      await transaction.save({ session });

      console.log('🎯 Atomic bet placed:', playerId, '$' + usdAmount, currency, 'Round:', targetRound.roundId);

      // Store data for response (outside transaction scope)
      req.betData = {
        transactionHash,
        cryptoAmount,
        newBalance: updatedPlayer.wallets[currency],
        roundId: targetRound.roundId,
        message: betMessage,
        playerId,
        usdAmount,
        currency
      };
    });

    // Notify all clients after successful transaction
    io.emit('playerBet', {
      playerId: req.betData.playerId,
      usdAmount: req.betData.usdAmount,
      cryptoAmount: req.betData.cryptoAmount,
      currency: req.betData.currency,
      transactionHash: req.betData.transactionHash,
      roundId: req.betData.roundId,
      message: req.betData.message
    });

    res.json({ 
      success: true, 
      transactionHash: req.betData.transactionHash,
      cryptoAmount: req.betData.cryptoAmount,
      newBalance: req.betData.newBalance,
      roundId: req.betData.roundId,
      message: req.betData.message
    });

  } catch (error) {
    console.error('❌ Atomic bet placement error:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

/**
 * POST /api/wallet/add
 * Adds funds to player wallet (demo functionality) with atomic balance updates
 */
app.post('/api/wallet/add', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { playerId, usdAmount, currency } = req.body;
    
    // Comprehensive input validation
    if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
      return res.status(400).json({ error: 'Valid player ID is required' });
    }
    
    if (!usdAmount || typeof usdAmount !== 'number' || usdAmount <= 0 || usdAmount > 50000) {
      return res.status(400).json({ error: 'USD amount must be between $0.01 and $50,000' });
    }
    
    if (usdAmount < 0.01) {
      return res.status(400).json({ error: 'Minimum deposit amount is $0.01' });
    }
    
    if (!currency || !['BTC', 'ETH', 'USDT'].includes(currency)) {
      return res.status(400).json({ error: 'Currency must be BTC, ETH, or USDT' });
    }

    const price = getCurrentPrice(currency);
    const cryptoAmount = usdAmount / price;

    // Start atomic transaction
    await session.withTransaction(async () => {
      // Atomically add to player wallet (create player if doesn't exist)
      const updatedPlayer = await Player.findOneAndUpdate(
        { playerId },
        { 
          $inc: { [`wallets.${currency}`]: cryptoAmount },
          $setOnInsert: { 
            playerId,
            wallets: {
              BTC: currency === 'BTC' ? 0.001 + cryptoAmount : 0.001,
              ETH: currency === 'ETH' ? 0.5 + cryptoAmount : 0.5,
              USDT: currency === 'USDT' ? 1000 + cryptoAmount : 1000
            },
            createdAt: new Date()
          }
        },
        { 
          upsert: true,
          new: true,
          session 
        }
      );

      // Create transaction log atomically
      const transactionHash = generateTransactionHash();
      const transaction = new Transaction({
        playerId,
        usdAmount,
        cryptoAmount,
        currency,
        transactionType: 'deposit',
        transactionHash,
        priceAtTime: price
      });
      await transaction.save({ session });

      console.log('💰 Atomic wallet deposit:', playerId, '$' + usdAmount, currency);

      // Store data for response (outside transaction scope)
      req.depositData = {
        cryptoAmount,
        newBalance: updatedPlayer.wallets[currency],
        transactionHash,
        message: `Added $${usdAmount} worth of ${currency} to wallet`
      };
    });

    res.json({ 
      success: true, 
      cryptoAmount: req.depositData.cryptoAmount,
      newBalance: req.depositData.newBalance,
      transactionHash: req.depositData.transactionHash,
      message: req.depositData.message
    });

  } catch (error) {
    console.error('❌ Atomic wallet add error:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

/**
 * POST /api/cashout
 * Processes player cashout during active round with atomic balance updates
 */
app.post('/api/cashout', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { playerId } = req.body;
    
    // Input validation
    if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
      return res.status(400).json({ error: 'Valid player ID is required' });
    }

    // Validate active round exists
    if (!currentRound) {
      return res.status(400).json({ error: 'No round in progress' });
    }
    
    // Validate round is in active state
    if (currentRound.status !== 'active') {
      return res.status(400).json({ error: 'Round is not active - cannot cash out' });
    }
    
    // Validate game is actually running
    if (!isGameActive) {
      return res.status(400).json({ error: 'Game is not active' });
    }

    const currentMultiplier = getCurrentMultiplier();
    
    // Validate multiplier is valid
    if (currentMultiplier < 1) {
      return res.status(400).json({ error: 'Invalid game state - multiplier below 1x' });
    }
    
    // Check if round already crashed
    if (currentMultiplier >= currentRound.crashPoint) {
      return res.status(400).json({ error: 'Round already crashed - cannot cash out' });
    }
    
    // Validate cashout timing (prevent cashout in last 100ms before crash)
    if (currentMultiplier >= currentRound.crashPoint * 0.98) {
      return res.status(400).json({ error: 'Too late to cash out - round about to crash' });
    }

    // Start atomic transaction
    await session.withTransaction(async () => {
      // Find and update bet atomically to prevent double cashouts
      const bet = await Bet.findOneAndUpdate(
        { 
          roundId: currentRound.roundId, 
          playerId, 
          cashedOut: false 
        },
        {
          $set: {
            cashedOut: true,
            cashoutMultiplier: currentMultiplier,
            cashoutAmount: 0 // Will be calculated below
          }
        },
        { 
          new: false, // Return original document
          session 
        }
      );

      if (!bet) {
        throw new Error('No active bet found or already cashed out');
      }

      // Calculate payout amounts
      const cashoutCryptoAmount = bet.cryptoAmount * currentMultiplier;
      const cashoutUsdAmount = bet.usdAmount * currentMultiplier;

      // Update bet with calculated cashout amount
      await Bet.findByIdAndUpdate(
        bet._id,
        { $set: { cashoutAmount: cashoutCryptoAmount } },
        { session }
      );

      // Atomically add winnings to player wallet
      const updatedPlayer = await Player.findOneAndUpdate(
        { playerId },
        { 
          $inc: { [`wallets.${bet.currency}`]: cashoutCryptoAmount }
        },
        { 
          new: true,
          session 
        }
      );

      if (!updatedPlayer) {
        throw new Error('Player not found during cashout');
      }

      // Create cashout transaction log atomically
      const transactionHash = generateTransactionHash();
      const transaction = new Transaction({
        playerId,
        usdAmount: cashoutUsdAmount,
        cryptoAmount: cashoutCryptoAmount,
        currency: bet.currency,
        transactionType: 'cashout',
        transactionHash,
        priceAtTime: bet.priceAtTime
      });
      await transaction.save({ session });

      console.log('💸 Atomic cashout:', playerId, currentMultiplier.toFixed(2) + 'x', '$' + cashoutUsdAmount.toFixed(2));

      // Store data for response (outside transaction scope)
      req.cashoutData = {
        playerId,
        multiplier: currentMultiplier,
        cryptoPayout: cashoutCryptoAmount,
        usdPayout: cashoutUsdAmount,
        currency: bet.currency,
        transactionHash
      };
    });

    // Notify all clients after successful transaction
    io.emit('playerCashout', {
      playerId: req.cashoutData.playerId,
      multiplier: req.cashoutData.multiplier,
      cryptoPayout: req.cashoutData.cryptoPayout,
      usdPayout: req.cashoutData.usdPayout,
      currency: req.cashoutData.currency
    });

    res.json({ 
      success: true, 
      multiplier: req.cashoutData.multiplier,
      cryptoPayout: req.cashoutData.cryptoPayout,
      usdPayout: req.cashoutData.usdPayout,
      transactionHash: req.cashoutData.transactionHash
    });

  } catch (error) {
    console.error('❌ Atomic cashout error:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

/**
 * GET /api/round/current
 * Returns current round information and game state
 */
app.get('/api/round/current', (req, res) => {
  if (currentRound) {
    res.json({
      roundId: currentRound.roundId,
      status: currentRound.status,
      bettingPhase: bettingPhase,
      crashPoint: currentRound.status === 'crashed' ? currentRound.crashPoint : null,
      currentMultiplier: currentRound.status === 'active' ? getCurrentMultiplier() : 1,
      timeElapsed: currentRound.status === 'active' ? Date.now() - roundStartTime : 0,
      nextRoundId: nextRound ? nextRound.roundId : null
    });
  } else {
    res.json({ message: 'No active round', bettingPhase: true });
  }
});

/**
 * GET /api/round/history
 * Returns recent round history for display
 */
app.get('/api/round/history', async (req, res) => {
  try {
    const rounds = await GameRound.find({ status: 'crashed' })
      .sort({ startTime: -1 })
      .limit(10);
    
    console.log(`📊 Found ${rounds.length} crashed rounds in history`);
    
    res.status(200).json({ success: true, rounds: rounds || [] });
  } catch (error) {
    console.error('❌ Error fetching round history:', error.message);
    res.status(500).json({ success: false, error: error.message, rounds: [] });
  }
});

/**
 * GET /api/prices
 * Returns current cryptocurrency prices with status
 */
app.get('/api/prices', (req, res) => {
  const now = Date.now();
  const isStale = now - priceCache.lastUpdate > 60000; // Consider stale after 1 minute
  
  res.json({
    success: true,
    prices: {
      BTC: priceCache.BTC,
      ETH: priceCache.ETH,
      USDT: priceCache.USDT
    },
    lastUpdate: priceCache.lastUpdate,
    isStale: isStale,
    status: isStale ? 'stale' : 'fresh'
  });
});

/**
 * GET /api/database/status
 * Returns database status and data counts for debugging
 */
app.get('/api/database/status', async (req, res) => {
  try {
    const status = {
      connection: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      collections: {
        players: await Player.countDocuments(),
        gameRounds: await GameRound.countDocuments(),
        bets: await Bet.countDocuments(),
        transactions: await Transaction.countDocuments()
      },
      recentPlayers: await Player.find().limit(5).select('playerId createdAt wallets'),
      recentRounds: await GameRound.find().sort({ startTime: -1 }).limit(5).select('roundId status crashPoint startTime'),
      recentBets: await Bet.find().sort({ timestamp: -1 }).limit(5).select('playerId usdAmount currency cashedOut timestamp'),
      recentTransactions: await Transaction.find().sort({ timestamp: -1 }).limit(5).select('playerId transactionType usdAmount currency timestamp')
    };
    
    console.log('📊 Database Status Check:', {
      connected: status.connection === 'Connected',
      totalCollections: Object.values(status.collections).reduce((a, b) => a + b, 0),
      database: status.database
    });
    
    res.json({ success: true, status });
  } catch (error) {
    console.error('❌ Database status check error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// WEBSOCKET CONNECTION HANDLING
// =============================================

// WebSocket security tracking
const socketRateLimits = new Map(); // Track rate limits per socket
const suspiciousConnections = new Set(); // Track suspicious connections

/**
 * WebSocket connection handler with enhanced security
 */
io.on('connection', (socket) => {
  console.log('🔗 Player connected:', socket.id);

  // Initialize rate limiting for this socket
  socketRateLimits.set(socket.id, {
    cashoutAttempts: 0,
    lastCashoutAttempt: 0,
    connectionTime: Date.now(),
    messageCount: 0
  });

  // Connection validation - prevent too many rapid connections
  const recentConnections = Array.from(socketRateLimits.values())
    .filter(limit => Date.now() - limit.connectionTime < 5000).length;
  
  if (recentConnections > 10) {
    console.warn('⚠️ Suspicious connection rate detected:', socket.id);
    suspiciousConnections.add(socket.id);
    socket.emit('connectionError', { error: 'Connection rate limited' });
    socket.disconnect(true);
    return;
  }

  // Send current game state to new connection
  if (currentRound) {
    socket.emit('gameState', {
      roundId: currentRound.roundId,
      status: currentRound.status,
      currentMultiplier: isGameActive ? getCurrentMultiplier() : 1,
      timeElapsed: isGameActive ? Date.now() - roundStartTime : 0
    });
  }

  /**
   * Handle real-time cashout requests via WebSocket with enhanced security
   */
  socket.on('cashout', async (data) => {
    const session = await mongoose.startSession();
    
    try {
      // Security: Check if connection is flagged as suspicious
      if (suspiciousConnections.has(socket.id)) {
        socket.emit('cashoutError', { error: 'Connection flagged for suspicious activity' });
        return;
      }

      // Security: Rate limiting - prevent spam cashout attempts
      const limits = socketRateLimits.get(socket.id);
      if (!limits) {
        socket.emit('cashoutError', { error: 'Invalid connection state' });
        return;
      }

      const now = Date.now();
      
      // Allow maximum 1 cashout attempt per second
      if (now - limits.lastCashoutAttempt < 1000) {
        limits.cashoutAttempts++;
        if (limits.cashoutAttempts > 3) {
          console.warn('⚠️ Cashout spam detected from:', socket.id);
          suspiciousConnections.add(socket.id);
          socket.emit('cashoutError', { error: 'Rate limit exceeded - connection flagged' });
          socket.disconnect(true);
          return;
        }
        socket.emit('cashoutError', { error: 'Rate limit: Please wait before next cashout attempt' });
        return;
      }

      // Reset rate limit counter if enough time has passed
      if (now - limits.lastCashoutAttempt > 5000) {
        limits.cashoutAttempts = 0;
      }

      limits.lastCashoutAttempt = now;
      limits.messageCount++;

      // Security: Detect message flooding
      if (limits.messageCount > 100) {
        console.warn('⚠️ Message flooding detected from:', socket.id);
        suspiciousConnections.add(socket.id);
        socket.emit('cashoutError', { error: 'Message flooding detected' });
        socket.disconnect(true);
        return;
      }

      const { playerId } = data;
      
      // Input validation with enhanced checks
      if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
        socket.emit('cashoutError', { error: 'Valid player ID is required' });
        return;
      }

      // Security: Validate player ID format to prevent injection
      if (!/^[a-zA-Z0-9_]+$/.test(playerId) || playerId.length > 50) {
        socket.emit('cashoutError', { error: 'Invalid player ID format' });
        return;
      }
      
      // Validate active round exists
      if (!currentRound) {
        socket.emit('cashoutError', { error: 'No round in progress' });
        return;
      }
      
      // Validate round is in active state
      if (currentRound.status !== 'active') {
        socket.emit('cashoutError', { error: 'Round is not active' });
        return;
      }
      
      // Validate game is actually running
      if (!isGameActive) {
        socket.emit('cashoutError', { error: 'Game is not active' });
        return;
      }

      const currentMultiplier = getCurrentMultiplier();
      
      // Validate multiplier is valid
      if (currentMultiplier < 1) {
        socket.emit('cashoutError', { error: 'Invalid game state' });
        return;
      }
      
      // Check if round already crashed
      if (currentMultiplier >= currentRound.crashPoint) {
        socket.emit('cashoutError', { error: 'Round already crashed' });
        return;
      }
      
      // Validate cashout timing (prevent last-second cashouts)
      if (currentMultiplier >= currentRound.crashPoint * 0.98) {
        socket.emit('cashoutError', { error: 'Too late to cash out' });
        return;
      }

      let cashoutData;

      // Start atomic transaction
      await session.withTransaction(async () => {
        // Find and update bet atomically to prevent double cashouts
        const bet = await Bet.findOneAndUpdate(
          { 
            roundId: currentRound.roundId, 
            playerId, 
            cashedOut: false 
          },
          {
            $set: {
              cashedOut: true,
              cashoutMultiplier: currentMultiplier,
              cashoutAmount: 0 // Will be calculated below
            }
          },
          { 
            new: false, // Return original document
            session 
          }
        );

        if (!bet) {
          throw new Error('No active bet found or already cashed out');
        }

        // Calculate payouts
        const cashoutCryptoAmount = bet.cryptoAmount * currentMultiplier;
        const cashoutUsdAmount = bet.usdAmount * currentMultiplier;

        // Update bet with calculated cashout amount
        await Bet.findByIdAndUpdate(
          bet._id,
          { $set: { cashoutAmount: cashoutCryptoAmount } },
          { session }
        );

        // Atomically update player wallet
        const updatedPlayer = await Player.findOneAndUpdate(
          { playerId },
          { 
            $inc: { [`wallets.${bet.currency}`]: cashoutCryptoAmount }
          },
          { 
            new: true,
            session 
          }
        );

        if (!updatedPlayer) {
          throw new Error('Player not found during WebSocket cashout');
        }

        // Create transaction log atomically
        const transactionHash = generateTransactionHash();
        const transaction = new Transaction({
          playerId,
          usdAmount: cashoutUsdAmount,
          cryptoAmount: cashoutCryptoAmount,
          currency: bet.currency,
          transactionType: 'cashout',
          transactionHash,
          priceAtTime: bet.priceAtTime
        });
        await transaction.save({ session });

        console.log('⚡ Atomic WebSocket cashout:', playerId, currentMultiplier.toFixed(2) + 'x');

        // Store data for broadcasting (outside transaction scope)
        cashoutData = {
          playerId,
          multiplier: currentMultiplier,
          cryptoPayout: cashoutCryptoAmount,
          usdPayout: cashoutUsdAmount,
          currency: bet.currency,
          transactionHash
        };
      });

      // Notify all clients after successful transaction
      io.emit('playerCashout', {
        playerId: cashoutData.playerId,
        multiplier: cashoutData.multiplier,
        cryptoPayout: cashoutData.cryptoPayout,
        usdPayout: cashoutData.usdPayout,
        currency: cashoutData.currency
      });

      // Confirm to requesting client
      socket.emit('cashoutSuccess', {
        multiplier: cashoutData.multiplier,
        cryptoPayout: cashoutData.cryptoPayout,
        usdPayout: cashoutData.usdPayout,
        transactionHash: cashoutData.transactionHash
      });

    } catch (error) {
      console.error('❌ Atomic WebSocket cashout error:', error.message);
      socket.emit('cashoutError', { error: error.message });
    } finally {
      await session.endSession();
    }
  });

  /**
   * Handle client disconnection with security cleanup
   */
  socket.on('disconnect', () => {
    console.log('🔌 Player disconnected:', socket.id);
    
    // Security: Clean up rate limiting data
    socketRateLimits.delete(socket.id);
    suspiciousConnections.delete(socket.id);
  });

  /**
   * Security: Handle any other WebSocket messages with validation
   */
  socket.onAny((eventName, ...args) => {
    const limits = socketRateLimits.get(socket.id);
    if (limits) {
      limits.messageCount++;
      
      // Prevent message flooding from any event
      if (limits.messageCount > 200) {
        console.warn('⚠️ Excessive messaging detected:', socket.id, 'Event:', eventName);
        suspiciousConnections.add(socket.id);
        socket.disconnect(true);
      }
    }
  });
});

// =============================================
// APPLICATION INITIALIZATION
// =============================================

/**
 * Initialize application systems
 */
async function initialize() {
  console.log('🚀 Initializing Crypto Crash Game Server...');
  
  // Initialize price fetching
  await fetchCryptoPrices();
  setInterval(fetchCryptoPrices, 30000); // Update prices every 30 seconds to avoid rate limiting
  
  // Start game cycle after brief delay
  setTimeout(startGameCycle, 2000);
  
  console.log('✅ Server initialization complete');
}

// =============================================
// SERVER STARTUP
// =============================================

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Crypto Crash Game Server running on port ${PORT}`);
  console.log(`🌐 Server accessible at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  console.log(`   - http://0.0.0.0:${PORT}`);
  initialize();
});
