import React, { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";

const BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? window.location.origin
    : process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function App() {
  // State management
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState({
    roundId: null,
    status: "waiting",
    currentMultiplier: 1.0,
    timeElapsed: 0,
    bettingPhase: false,
  });

  const [playerData, setPlayerData] = useState({
    playerId: null,
    balances: {},
  });

  const [betData, setBetData] = useState({
    amount: "",
    currency: "BTC",
  });

  const [roundHistory, setRoundHistory] = useState([]);
  const [currentBet, setCurrentBet] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState({
    BTC: 45000,
    ETH: 2500,
    USDT: 1,
  });

  // Generate or get player ID
  const getPlayerId = useCallback(() => {
    let playerId = localStorage.getItem("crypto_crash_player_id");
    if (!playerId) {
      playerId = `player_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("crypto_crash_player_id", playerId);
    }
    return playerId;
  }, []);

  // Load player balance (MOVED HERE)
  const loadPlayerBalance = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/player/balance/${getPlayerId()}`);
      const data = await response.json();
      setPlayerBalance(data.balance);
    } catch (error) {
      console.error('Error loading player b alance:', error);
    }
  }, [getPlayerId]); // Remove BACKEND_URL from here

  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      timeout: 5000,
      forceNew: true,
    });

    newSocket.on("connect", () => {
      console.log("✅ Connected to server");
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
    });

    // Game state events
    newSocket.on("gameState", (data) => {
      console.log("📊 Game state received:", data);
      setGameState(data);
    });

    newSocket.on("roundWaiting", (data) => {
      console.log("⏳ Round waiting:", data);
      setGameState((prev) => ({
        ...prev,
        roundId: data.roundId,
        status: "waiting",
        bettingPhase: true,
        currentMultiplier: 1.0,
        timeElapsed: 0,
      }));
      setCurrentBet(null);
      setMessage(data.message || "Betting phase - Place your bets!");
    });

    newSocket.on("roundStart", (data) => {
      console.log("🚀 Round started:", data);
      setGameState((prev) => ({
        ...prev,
        roundId: data.roundId,
        status: "active",
        bettingPhase: false,
        currentMultiplier: 1.0,
        timeElapsed: 0,
      }));
      setMessage(data.message || "Round started! Multiplier rising...");
    });

    newSocket.on("multiplierUpdate", (data) => {
      setGameState((prev) => ({
        ...prev,
        currentMultiplier: data.multiplier,
        timeElapsed: data.timeElapsed,
      }));
    });

    newSocket.on("roundCrash", (data) => {
      console.log("💥 Round crashed:", data);
      setGameState((prev) => ({
        ...prev,
        status: "crashed",
        currentMultiplier: data.crashPoint,
        bettingPhase: false,
      }));
      setMessage(data.message || `Round crashed at ${data.crashPoint}x!`);

      // Add to history
      setRoundHistory((prev) => [
        { roundId: data.roundId, crashPoint: data.crashPoint },
        ...prev.slice(0, 9),
      ]);
    });

    newSocket.on("playerBet", (data) => {
      console.log("💰 Player bet:", data);
      if (data.playerId === getPlayerId()) {
        setCurrentBet({
          amount: data.usdAmount,
          currency: data.currency,
          cryptoAmount: data.cryptoAmount,
        });
        setMessage(`Bet placed: $${data.usdAmount} in ${data.currency}`);
        loadPlayerBalance();
      }
    });

    newSocket.on("playerCashout", (data) => {
      console.log("💸 Player cashout:", data);
      if (data.playerId === getPlayerId()) {
        setMessage(
          `Cashed out at ${data.multiplier}x! Won $${data.usdPayout.toFixed(2)}`
        );
        setCurrentBet(null);
        loadPlayerBalance();
      }
    });

    newSocket.on("cashoutSuccess", (data) => {
      console.log("✅ Cashout successful:", data);
      setMessage(
        `Successfully cashed out at ${
          data.multiplier
        }x! Won $${data.usdPayout.toFixed(2)}`
      );
      setCurrentBet(null);
      loadPlayerBalance();
    });

    newSocket.on("cashoutError", (data) => {
      console.error("❌ Cashout error:", data);
      setMessage(`Cashout failed: ${data.error}`);
    });

    return () => {
      newSocket.close();
    };
  }, [getPlayerId, loadPlayerBalance, BACKEND_URL]); // Ensure BACKEND_URL is also a dependency if used inside useEffect

  // Load round history
  const loadRoundHistory = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/round/history`);
      const data = await response.json();

      if (data.success) {
        setRoundHistory(data.rounds.slice(0, 10));
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }, []);

  // Load crypto prices
  const loadCryptoPrices = useCallback(async () => {
    try {
      console.log("🔄 Loading prices from:", `${BACKEND_URL}/api/prices`);
      const response = await fetch(`${BACKEND_URL}/api/prices`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.prices) {
        setCryptoPrices(data.prices);
        console.log("💰 Prices loaded:", data.prices);
      } else {
        console.warn("Price API returned unexpected format:", data);
        console.log("📊 Using fallback prices");
      }
    } catch (error) {
      console.warn("Failed to load prices:", error.message || error);
      console.log("📊 Using fallback prices");
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadPlayerBalance();
    loadRoundHistory();
    loadCryptoPrices();

    const priceInterval = setInterval(loadCryptoPrices, 30000);
    return () => clearInterval(priceInterval);
  }, [loadPlayerBalance, loadRoundHistory, loadCryptoPrices]);

  // Place bet
  const placeBet = async () => {
    if (!betData.amount || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/bet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: getPlayerId(),
          usdAmount: parseFloat(betData.amount),
          currency: betData.currency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setBetData({ ...betData, amount: "" });
        loadPlayerBalance();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      setMessage("Error placing bet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cash out
  const cashOut = () => {
    if (!socket || !currentBet) return;

    console.log("🎯 Attempting cashout...");
    socket.emit("cashout", { playerId: getPlayerId() });
  };

  // Helper functions
  const getMultiplierColor = () => {
    if (gameState.status === "crashed") return "text-red-500";
    if (gameState.status === "active") return "text-green-500 animate-pulse";
    return "text-gray-500";
  };

  const getStatusColor = () => {
    if (gameState.status === "crashed") return "text-red-400";
    if (gameState.status === "active") return "text-green-400";
    return "text-yellow-400";
  };

  const getCrashColor = (crashPoint) => {
    if (crashPoint < 2) return "text-red-500";
    if (crashPoint < 10) return "text-yellow-500";
    return "text-green-500";
  };

  const canPlaceBet = () => {
    return (
      gameState.bettingPhase && !currentBet && betData.amount && !isLoading
    );
  };

  const canCashOut = () => {
    return (
      gameState.status === "active" &&
      currentBet &&
      gameState.currentMultiplier > 1.0
    );
  };

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
              {gameState.currentMultiplier.toFixed(2)}x
            </div>

            <div className={`text-3xl font-semibold mb-4 ${getStatusColor()}`}>
              {gameState.status === "waiting" && "⏳ Waiting for next round..."}
              {gameState.status === "active" && "📈 Multiplier Rising!"}
              {gameState.status === "crashed" && "💥 Crashed!"}
            </div>

            <div className="space-y-2 text-gray-400">
              <div className="text-lg">
                Round:{" "}
                <span className="text-white font-mono">
                  {gameState.roundId?.slice(-8) || "Loading..."}
                </span>
              </div>
              {gameState.status === "active" && (
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
                  min="1"
                  max="1000"
                  value={betData.amount}
                  onChange={(e) =>
                    setBetData({ ...betData, amount: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter bet amount"
                  disabled={!gameState.bettingPhase || currentBet}
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
                  disabled={!gameState.bettingPhase || currentBet}
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
                    {currentBet.cryptoAmount.toFixed(8)} {currentBet.currency}
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
                  💰 Cash Out at {gameState.currentMultiplier.toFixed(2)}x
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
                  ${price.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balance Display */}
        {playerData.balances && Object.keys(playerData.balances).length > 0 && (
          <div className="max-w-4xl mx-auto mt-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              💰 Your Wallet
            </h3>
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
                        {balance.crypto.toFixed(8)} {currency}
                      </div>
                      <div className="text-lg font-bold text-green-400">
                        ${balance.usd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
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
                    {round.crashPoint.toFixed(2)}x
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
