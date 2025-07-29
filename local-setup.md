
# Local Development Setup

## Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

## 🚀 Quick Setup

### 1. Clone/Download the Project
```bash
git clone <your-repo-url>
cd crypto-crash-game
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env file with your MongoDB connection
# MONGODB_URI=mongodb://localhost:27017/crypto-crash
# PORT=5000
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

### 4. Database Setup (Optional)
```bash
# If you want to populate the database with sample data
cd backend
node populate-db.js
```

## 🏃‍♂️ Running the Application

### Option 1: Run Both Servers Separately

**Terminal 1 - Backend Server:**
```bash
cd backend
node index.js
```
Backend will run on http://localhost:5000

**Terminal 2 - Frontend Server:**
```bash
cd frontend
npm start
```
Frontend will run on http://localhost:3000

### Option 2: Using Package Scripts (if available)
```bash
# From project root
npm run dev          # Start both frontend and backend
npm run backend      # Start only backend
npm run frontend     # Start only frontend
```

## 🌐 Accessing the Application

- **Game Interface**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: Check `api-test-commands.md` for testing endpoints

## 🔧 Configuration

### Environment Variables (backend/.env)
```env
# MongoDB Connection (required)
MONGODB_URI=mongodb://localhost:27017/crypto-crash

# Server Port (optional - defaults to 5000)
PORT=5000

# Optional: CoinGecko API key for higher rate limits
# COINGECKO_API_KEY=your_api_key_here
```

### MongoDB Setup Options

**Option 1: Local MongoDB**
```bash
# Install MongoDB locally
brew install mongodb/brew/mongodb-community  # macOS
sudo apt-get install mongodb                 # Ubuntu

# Start MongoDB service
brew services start mongodb/brew/mongodb-community  # macOS
sudo service mongodb start                          # Ubuntu

# Use connection string
MONGODB_URI=mongodb://localhost:27017/crypto-crash
```

**Option 2: MongoDB Atlas (Cloud)**
```bash
# Sign up at https://cloud.mongodb.com
# Create a cluster and get connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crypto-crash
```

## 🎮 Game Features

- **Real-time multiplayer crash game**
- **Cryptocurrency betting** (BTC, ETH, USDT)
- **Live crypto price integration**
- **Player wallet system**
- **Round history and statistics**
- **Responsive web interface**

## 🛠️ Development Notes

- Backend serves both API endpoints and WebSocket connections
- Frontend uses React with Socket.IO client for real-time updates
- CORS is enabled for cross-origin development
- Hot reloading is available in development mode
- MongoDB sessions ensure transaction atomicity

## 📋 Troubleshooting

**Connection Issues:**
- Ensure MongoDB is running
- Check network connectivity for crypto price API
- Verify port 5000 and 3000 are available

**Build Issues:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility

**Game Issues:**
- Check browser console for JavaScript errors
- Verify WebSocket connection in Network tab
- Ensure backend is running and accessible

## 🚀 Production Deployment

For production deployment:
1. Build the React frontend: `cd frontend && npm run build`
2. Configure production environment variables
3. Use a process manager like PM2 for the backend
4. Set up reverse proxy (nginx) if needed
5. Configure MongoDB for production use
