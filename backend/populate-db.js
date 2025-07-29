
/**
 * Database Population Script
 * Populates MongoDB with sample players, wallets, and game rounds for testing
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-crash')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Define schemas (same as in index.js)
const playerSchema = new mongoose.Schema({
  playerId: { type: String, unique: true, required: true },
  wallets: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 1000 },
    USDT: { type: Number, default: 1000 }
  },
  createdAt: { type: Date, default: Date.now }
});

const gameRoundSchema = new mongoose.Schema({
  roundId: { type: String, unique: true, required: true },
  seed: { type: String, required: true },
  seedHash: { type: String, required: true },
  crashPoint: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: ['waiting', 'active', 'crashed'], default: 'crashed' }
});

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

// Helper functions
function generateCrashPoint(seed, roundNumber) {
  const hash = crypto.createHash('sha256').update(seed + roundNumber.toString()).digest('hex');
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const crashPoint = Math.max(1.01, (hashNumber % 10000) / 100 + 1);
  return Math.min(crashPoint, 120);
}

function generateTransactionHash() {
  return crypto.randomBytes(32).toString('hex');
}

async function populateDatabase() {
  try {
    console.log('🚀 Starting database population...');

    // Clear existing data
    await Player.deleteMany({});
    await GameRound.deleteMany({});
    await Bet.deleteMany({});
    await Transaction.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Create sample players with varying wallet balances
    const samplePlayers = [
      {
        playerId: 'alice_crypto_trader',
        wallets: {
          BTC: 0.05,      // ~$2,250 at $45k
          ETH: 2.5,       // ~$6,250 at $2.5k
          USDT: 5000      // $5,000 stable
        }
      },
      {
        playerId: 'bob_whale_investor',
        wallets: {
          BTC: 0.2,       // ~$9,000 at $45k
          ETH: 10.0,      // ~$25,000 at $2.5k
          USDT: 15000     // $15,000 stable
        }
      },
      {
        playerId: 'charlie_newbie',
        wallets: {
          BTC: 0.001,     // ~$45 at $45k
          ETH: 0.1,       // ~$250 at $2.5k
          USDT: 500       // $500 stable
        }
      },
      {
        playerId: 'diana_day_trader',
        wallets: {
          BTC: 0.1,       // ~$4,500 at $45k
          ETH: 5.0,       // ~$12,500 at $2.5k
          USDT: 8000      // $8,000 stable
        }
      },
      {
        playerId: 'eve_hodler',
        wallets: {
          BTC: 0.3,       // ~$13,500 at $45k
          ETH: 1.0,       // ~$2,500 at $2.5k
          USDT: 2000      // $2,000 stable
        }
      }
    ];

    // Insert players
    for (const playerData of samplePlayers) {
      const player = new Player(playerData);
      await player.save();
      console.log(`👤 Created player: ${playerData.playerId}`);
    }

    // Create historical game rounds (last 10 rounds)
    const currentTime = Date.now();
    const rounds = [];

    for (let i = 9; i >= 0; i--) {
      const roundTime = currentTime - (i * 15000); // 15 seconds apart
      const seed = crypto.randomBytes(32).toString('hex');
      const seedHash = crypto.createHash('sha256').update(seed).digest('hex');
      const roundId = roundTime.toString();
      const crashPoint = generateCrashPoint(seed, roundTime);

      const round = {
        roundId,
        seed,
        seedHash,
        crashPoint: Math.round(crashPoint * 100) / 100, // Round to 2 decimals
        startTime: new Date(roundTime),
        endTime: new Date(roundTime + 10000), // 10 second rounds
        status: 'crashed'
      };

      rounds.push(round);
      
      const gameRound = new GameRound(round);
      await gameRound.save();
      console.log(`🎮 Created round ${roundId} - Crashed at ${round.crashPoint}x`);
    }

    // Create sample bets and transactions for some rounds
    const currencies = ['BTC', 'ETH', 'USDT'];
    const prices = { BTC: 45000, ETH: 2500, USDT: 1 };
    
    // Add bets for the last 5 rounds
    for (let i = 0; i < 5; i++) {
      const round = rounds[rounds.length - 5 + i];
      const numBets = Math.floor(Math.random() * 4) + 2; // 2-5 bets per round

      for (let j = 0; j < numBets; j++) {
        const player = samplePlayers[Math.floor(Math.random() * samplePlayers.length)];
        const currency = currencies[Math.floor(Math.random() * currencies.length)];
        const usdAmount = Math.floor(Math.random() * 500) + 50; // $50-$550
        const cryptoAmount = usdAmount / prices[currency];
        const transactionHash = generateTransactionHash();
        
        // Random chance of cashing out (60% chance)
        const cashedOut = Math.random() > 0.4;
        let cashoutMultiplier = null;
        let cashoutAmount = null;

        if (cashedOut) {
          // Cash out at random point before crash
          cashoutMultiplier = Math.random() * (round.crashPoint - 1) + 1;
          cashoutAmount = cryptoAmount * cashoutMultiplier;
        }

        // Create bet
        const bet = new Bet({
          roundId: round.roundId,
          playerId: player.playerId,
          usdAmount,
          cryptoAmount,
          currency,
          priceAtTime: prices[currency],
          cashedOut,
          cashoutMultiplier,
          cashoutAmount,
          transactionHash,
          timestamp: new Date(round.startTime.getTime() - 2000) // Bet placed 2 seconds before round
        });
        await bet.save();

        // Create bet transaction
        const betTransaction = new Transaction({
          playerId: player.playerId,
          usdAmount,
          cryptoAmount,
          currency,
          transactionType: 'bet',
          transactionHash,
          priceAtTime: prices[currency],
          timestamp: bet.timestamp
        });
        await betTransaction.save();

        // Create cashout transaction if player cashed out
        if (cashedOut) {
          const cashoutTransaction = new Transaction({
            playerId: player.playerId,
            usdAmount: usdAmount * cashoutMultiplier,
            cryptoAmount: cashoutAmount,
            currency,
            transactionType: 'cashout',
            transactionHash: generateTransactionHash(),
            priceAtTime: prices[currency],
            timestamp: new Date(round.startTime.getTime() + 3000) // Cashed out 3 seconds into round
          });
          await cashoutTransaction.save();
        }

        console.log(`💰 Created bet: ${player.playerId} - $${usdAmount} ${currency} - ${cashedOut ? 'Cashed out at ' + cashoutMultiplier.toFixed(2) + 'x' : 'Lost'}`);
      }
    }

    // Add some deposit transactions to show wallet funding history
    for (const playerData of samplePlayers.slice(0, 3)) {
      const currency = currencies[Math.floor(Math.random() * currencies.length)];
      const usdAmount = Math.floor(Math.random() * 1000) + 500; // $500-$1500
      const cryptoAmount = usdAmount / prices[currency];

      const depositTransaction = new Transaction({
        playerId: playerData.playerId,
        usdAmount,
        cryptoAmount,
        currency,
        transactionType: 'deposit',
        transactionHash: generateTransactionHash(),
        priceAtTime: prices[currency],
        timestamp: new Date(currentTime - 86400000) // 1 day ago
      });
      await depositTransaction.save();
      console.log(`💎 Created deposit: ${playerData.playerId} - $${usdAmount} ${currency}`);
    }

    console.log('✅ Database population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Players created: ${samplePlayers.length}`);
    console.log(`🎮 Game rounds created: ${rounds.length}`);
    console.log(`🎯 Total bets created: ${await Bet.countDocuments()}`);
    console.log(`💳 Total transactions created: ${await Transaction.countDocuments()}`);
    
    console.log('\n🎯 You can now:');
    console.log('1. Start the server with: node index.js');
    console.log('2. Open the game in your browser');
    console.log('3. Use any of these player IDs to test:');
    samplePlayers.forEach(player => {
      console.log(`   - ${player.playerId}`);
    });

  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the population script
populateDatabase();
