# API Testing Commands

## 🚀 Quick Start

Set the base URL for your API:
```bash
# For local development
export BASE_URL="http://localhost:5000"

# For production (replace with your Replit URL)
export BASE_URL="https://your-repl-name.your-username.repl.co"
```

## 📋 Core API Endpoints

### Check Player Balance
```bash
curl -X GET "${BASE_URL}/api/player/alice_crypto_trader/balance" \
  -H "Content-Type: application/json"
```

### Get Current Crypto Prices
```bash
curl -X GET "${BASE_URL}/api/prices" \
  -H "Content-Type: application/json"
```

### Get Game State
```bash
curl -X GET "${BASE_URL}/api/game/state" \
  -H "Content-Type: application/json"
```

### Get Round History
```bash
curl -X GET "${BASE_URL}/api/game/history" \
  -H "Content-Type: application/json"
```

## 🎮 Game Actions

### Place Bet (Bitcoin)
```bash
curl -X POST "${BASE_URL}/api/bet" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "alice_crypto_trader",
    "usdAmount": 10,
    "currency": "BTC"
  }'
```

### Place Bet with Multiple Currencies
```bash
# Ethereum bet
curl -X POST "${BASE_URL}/api/bet" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "alice_crypto_trader",
    "usdAmount": 25,
    "currency": "ETH"
  }'

# USDT bet
curl -X POST "${BASE_URL}/api/bet" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "alice_crypto_trader",
    "usdAmount": 50,
    "currency": "USDT"
  }'
```

### Cash Out (During Active Round)
```bash
curl -X POST "${BASE_URL}/api/cashout" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "alice_crypto_trader"
  }'
```

## 🧪 Advanced Testing Scenarios

### Test Multiple Players
```bash
# Player 1 bets
curl -X POST "${BASE_URL}/api/bet" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player_1",
    "usdAmount": 15,
    "currency": "BTC"
  }'

# Player 2 bets
curl -X POST "${BASE_URL}/api/bet" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player_2",
    "usdAmount": 30,
    "currency": "ETH"
  }'
```

### Test Error Scenarios
```bash
# Invalid player ID
curl -X GET "${BASE_URL}/api/player/nonexistent_player/balance" \
  -H "Content-Type: application/json"

# Invalid bet amount (negative)
curl -X POST "${BASE_URL}/api/bet" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "alice_crypto_trader",
    "usdAmount": -10,
    "currency": "BTC"
  }'
```

## 🔄 Live Game Testing

### Monitor Game State in Real-time
```bash
# Watch game state changes every 2 seconds
while true; do
  echo "=== Game State $(date) ==="
  curl -s "${BASE_URL}/api/game/state" | jq '.currentMultiplier, .status, .timeElapsed'
  sleep 2
done
```

## 📝 Notes

- **Player ID**: Use `alice_crypto_trader` or any string for testing
- **Timing**: Rounds last exactly 10 seconds (3s betting + 7s active)
- **Currencies**: Supported: `BTC`, `ETH`, `USDT`
- **Amounts**: USD amounts are converted to crypto automatically
- **Rate Limiting**: CoinGecko API has rate limits, cached for 10 seconds

## 🔍 Response Formats

All successful responses include:
- `success: true/false`
- Relevant data fields
- Error messages when applicable

Example successful bet response:
```json
{
  "success": true,
  "transactionHash": "abc123...",
  "cryptoAmount": 0.0002,
  "newBalance": 0.0008,
  "roundId": "1753615292753"
}