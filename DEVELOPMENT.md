
# Development Setup - Separated Frontend & Backend

## Project Structure
```
crypto-crash-game/
├── backend/               # Node.js Backend Server
│   ├── index.js          # Main server file (Express + Socket.IO)
│   ├── package.json      # Backend dependencies
│   ├── populate-db.js    # Database seeding script
│   ├── .env.example      # Environment variables template
│   └── public/           # Static files served by backend
├── frontend/             # React Frontend
│   ├── package.json      # Frontend dependencies
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── App.css       # Styling
│   │   ├── index.js      # React entry point
│   │   └── index.css     # Global styles
│   └── public/
│       └── index.html    # HTML template
└── ...
```

## Development Workflow

### 1. Install Backend Dependencies
```bash
cd backend && npm install
```

### 2. Install Frontend Dependencies
```bash
cd frontend && npm install
```

### 3. Start Backend Server (Port 5000)
```bash
cd backend && node index.js
```

### 4. Start Frontend Development Server (Port 3000)
```bash
cd frontend && npm start
```

### 5. Access the Application
- **Frontend**: http://localhost:3000 (React development server)
- **Backend API**: http://localhost:5000 (Express server)
- **Game**: Open http://localhost:3000 to play

## Features Maintained
- ✅ Same game logic and mechanics
- ✅ Real-time WebSocket communication
- ✅ Crypto price integration
- ✅ Player wallet system
- ✅ Responsive design
- ✅ All original styling and UI

## Key Changes
- **Separated Architecture**: Frontend (React) + Backend (Node.js API)
- **Organized File Structure**: Clear separation with `backend/` and `frontend/` folders
- **Modern React**: Hooks, functional components
- **Improved State Management**: useState, useEffect, useCallback
- **Better Error Handling**: API error handling and user feedback
- **Development Proxy**: Frontend proxies API requests to backend

## API Communication
- React frontend communicates with Node.js backend via REST API and WebSockets
- CORS enabled for cross-origin requests
- Environment-based configuration for development and production

## Environment Setup
1. Copy `backend/.env.example` to `backend/.env`
2. Configure MongoDB connection string
3. Start backend server
4. Start frontend development server
5. Access the game at http://localhost:3000
