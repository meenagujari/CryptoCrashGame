import React, { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";

export const BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? window.location.origin
    : process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [betData, setBetData] = useState({
    betAmount: '',
    currency: 'USD',
    cashOutMultiplier: '',
  });
  const [playerBalance, setPlayerBalance] = useState(0);
  const [roundHistory, setRoundHistory] = useState([]);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositData, setDepositData] = useState({
    amount: '',
    currency: 'USDT',
    walletAddress: '',
  });
  const [currentBet, setCurrentBet] = useState(null);
  const [roundHistory, setRoundHistory] = useState([]);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositData, setDepositData] = useState({ amount: "", currency: "BTC" });
  const [isDepositing, setIsDepositing] = useState(false);

  // Helper function to get player ID (assuming it's stored in localStorage)
  const getPlayerId = () => {
    let playerId = localStorage.getItem("playerId");
    if (!playerId) {
      playerId = "player_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("playerId", playerId);
    }
    return playerId;
  };

  const loadPlayerBalance = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/player/balance/${getPlayerId()}`);
      const data = await response.json();
      if (data.success) {
        setPlayerBalance(data.balance);
      } else {
        console.error("Failed to load player balance:", data.error);
      }
    } catch (error) {
      console.error("Error loading player balance:", error);
    }
  }, []);

  // Add Funds function
  const addFunds = async () => {
    setIsDepositing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/player/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: getPlayerId(),
          amount: parseFloat(depositData.amount),
          currency: depositData.currency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Funds added successfully!");
        setShowDepositModal(false);
        setDepositData({ amount: "", currency: "BTC" });
        loadPlayerBalance(); // Refresh balance after deposit
      } else {
        setMessage(`Error adding funds: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding funds:", error);
      setMessage("Error adding funds. Please try again.");
    } finally {
      setIsDepositing(false);
    }
  };

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket');
    });

    newSocket.on('gameStateUpdate', (state) => {
      setGameState(state);
      // console.log('Game state updated:', state);
    });

    newSocket.on('playerData', (data) => {
      setPlayerData(data);
      // console.log('Player data received:', data);
    });

    newSocket.on('balanceUpdate', (balance) => {
      setPlayerBalance(balance);
      console.log('Balance updated:', balance);
    });

    newSocket.on('betPlaced', (bet) => {
      console.log('Bet placed:', bet);
      setCurrentBet(bet); // Set current bet when a bet is placed
    });

    newSocket.on('cashOutSuccess', (data) => {
      console.log('Cash out successful:', data);
      setCurrentBet(null); // Clear current bet on cash out
    });

    newSocket.on('error', (message) => {
      console.error('WebSocket error:', message);
    });

    // Load player balance when connected or on initial load
    if (isConnected) {
      loadPlayerBalance();
    }

    return () => {
      newSocket.disconnect();
    };
  }, [isConnected, loadPlayerBalance, setPlayerData, setPlayerBalance, setGameState, setCurrentBet]);

  // Initial data load
  useEffect(() => {
    loadPlayerBalance();
    loadRoundHistory();
    loadCryptoPrices();

    const priceInterval = setInterval(loadCryptoPrices, 30000);
    return () => clearInterval(priceInterval);
  }, [loadPlayerBalance, loadRoundHistory, loadCryptoPrices]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Connection Status */}
      <div
        className={`fixed top-4 right-4 px-4 py-2 rounded-full text-sm font-medium z-50 ${
          isConnected
            ? "bg-green-500/20 text-green-300 border border-green-500/30"
            : "bg-red-500/20 text-red-300 border border-red-500/30"
        }`}
      >
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-400" : "bg-red-400"
            }`}
          ></div>
          <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🚀 Crypto Crash
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Real-time multiplayer crash game with cryptocurrency betting
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`max-w-4xl mx-auto mb-8 p-4 rounded-lg border backdrop-blur-sm ${
              message.includes("Error") || message.includes("failed")
                ? "bg-red-500/10 text-red-300 border-red-500/30"
                : "bg-green-500/10 text-green-300 border-green-500/30"
            }`}
          >
            <p className="text-center font-medium">{message}</p>
          </div>
        )}

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Multiplier Display */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 text-center">
            <div
              className={`text-8xl font-bold mb-6 transition-all duration-300 ${getMultiplierColor()}`}
            >
              {gameState?.currentMultiplier?.toFixed(2)}x
            </div>

            <div className={`text-3xl font-semibold mb-4 ${getStatusColor()}`}>
              {gameState?.status === "waiting" && "⏳ Waiting for next round..."}
              {gameState?.status === "active" && "📈 Multiplier Rising!"}
              {gameState?.status === "crashed" && "💥 Crashed!"}
            </div>

            <div className="space-y-2 text-gray-400">
              <div className="text-lg">
                Round:{" "}
                <span className="text-white font-mono">
                  {gameState?.roundId?.slice(-8) || "Loading..."}
                </span>
              </div>
              {gameState?.status === "active" && (
                <div className="text-sm">
                  Time: {(gameState.timeElapsed / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          </div>

          {/* Betting Panel */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Place Your Bet
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="1000"
                  value={betData.amount}
                  onChange={(e) =>
                    setBetData({ ...betData, amount: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter bet amount"
                  disabled={!gameState?.bettingPhase || currentBet}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={betData.currency}
                  onChange={(e) =>
                    setBetData({ ...betData, currency: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={!gameState?.bettingPhase || currentBet}
                >
                  <option value="BTC" className="bg-gray-800">
                    ₿ Bitcoin (BTC)
                  </option>
                  <option value="ETH" className="bg-gray-800">
                    Ξ Ethereum (ETH)
                  </option>
                  <option value="USDT" className="bg-gray-800">
                    ₮ Tether (USDT)
                  </option>
                </select>
              </div>

              {/* Current Bet Display */}
              {currentBet && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
                  <div className="text-sm font-medium text-blue-300 mb-1">
                    Current Bet
                  </div>
                  <div className="text-lg font-bold text-blue-100">
                    ${currentBet.amount} in {currentBet.currency}
                  </div>
                  <div className="text-xs text-blue-300">
                    {currentBet.cryptoAmount?.toFixed(8)} {currentBet.currency}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!currentBet ? (
                <button
                  onClick={placeBet}
                  disabled={!canPlaceBet()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Placing Bet...
                    </div>
                  ) : (
                    `🎯 Place Bet - $${betData.amount || "0"}`
                  )}
                </button>
              ) : (
                <button
                  onClick={cashOut}
                  disabled={!canCashOut()}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 shadow-lg animate-pulse"
                >
                  💰 Cash Out at {gameState?.currentMultiplier?.toFixed(2)}x
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Crypto Prices Display */}
        <div className="max-w-4xl mx-auto mt-12 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            📈 Current Prices
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(cryptoPrices).map(([currency, price]) => (
              <div
                key={currency}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold text-white mb-1">
                  {currency}
                </div>
                <div className="text-lg text-gray-300">
                  ${price?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balance Display */}
        {playerData?.balances && Object.keys(playerData.balances).length > 0 && (
          <div className="max-w-4xl mx-auto mt-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">💰 Your Wallet</h3>
              <button
                onClick={() => setShowDepositModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
              >
                ➕ Add Funds
              </button>
            </div>
            <div className="space-y-4">
              {Object.entries(playerData.balances).map(
                ([currency, balance]) => (
                  <div
                    key={currency}
                    className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl p-4"
                  >
                    <div className="font-medium text-gray-300">
                      {currency} Balance
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        {balance.crypto?.toFixed(8)} {currency}
                      </div>
                      <div className="text-lg font-bold text-green-400">
                        ${balance.usd?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Empty Wallet Prompt */}
        {(!playerData?.balances ||
          Object.keys(playerData.balances).length === 0) && (
          <div className="max-w-4xl mx-auto mt-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              💰 Your Wallet
            </h3>
            <p className="text-gray-400 mb-6">
              Your wallet is empty. Add funds to start playing!
            </p>
            <button
              onClick={() => setShowDepositModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
            >
              💰 Add Funds
            </button>
          </div>
        )}

        {/* Round History */}
        {roundHistory.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              📊 Recent Rounds
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {roundHistory.map((round, index) => (
                <div
                  key={round.roundId || index}
                  className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl p-3"
                >
                  <div className="text-gray-400 font-mono text-sm">
                    Round {round.roundId ? round.roundId.slice(-6) : index}
                  </div>
                  <div
                    className={`font-bold text-lg ${getCrashColor(
                      round.crashPoint
                    )}`}
                  >
                    {round.crashPoint?.toFixed(2)}x
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              💰 Add Funds to Wallet
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="50000"
                  value={depositData.amount}
                  onChange={(e) =>
                    setDepositData({ ...depositData, amount: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Enter amount in USD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cryptocurrency
                </label>
                <select
                  value={depositData.currency}
                  onChange={(e) =>
                    setDepositData({ ...depositData, currency: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="BTC" className="bg-gray-800">
                    ₿ Bitcoin (BTC)
                  </option>
                  <option value="ETH" className="bg-gray-800">
                    Ξ Ethereum (ETH)
                  </option>
                  <option value="USDT" className="bg-gray-800">
                    ₮ Tether (USDT)
                  </option>
                </select>
              </div>

              {depositData.amount && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-sm text-gray-300 mb-1">
                    You'll receive:
                  </div>
                  <div className="text-lg font-bold text-green-400">
                    {(
                      parseFloat(depositData.amount) /
                      cryptoPrices[depositData.currency]
                    ).toFixed(8)}{" "}
                    {depositData.currency}
                  </div>
                  <div className="text-xs text-gray-400">
                    at ${cryptoPrices[depositData.currency].toLocaleString()}{" "}
                    per {depositData.currency}
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositData({ amount: "", currency: "BTC" });
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={addFunds}
                  disabled={
                    isDepositing ||
                    !depositData.amount ||
                    isNaN(parseFloat(depositData.amount)) ||
                    parseFloat(depositData.amount) < 0.01 ||
                    parseFloat(depositData.amount) > 50000
                  }
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50"
                >
                  {isDepositing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    "Add Funds"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
