const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory game state (for serverless, this will reset on each function call)
let gameState = {
  players: [],
  currentDrawer: null,
  currentWord: '',
  gameStarted: false,
  roundTime: 90,
  timeLeft: 90,
  roundNumber: 0,
  maxRounds: 5,
  drawingHistory: [],
  inLobby: true,
  host: null,
  currentTimer: null
};

// Words for the game
const words = [
  'kuca', 'auto', 'drvo', 'sunce', 'mesec', 'zvezda', 'cvet', 'pas', 'macka',
  'ptica', 'riba', 'krava', 'konj', 'ovca', 'kokoška', 'patka', 'guska',
  'slon', 'lav', 'tigar', 'medved', 'vuk', 'lisica', 'zec', 'mis',
  'kornjača', 'zmija', 'žaba', 'žirafa', 'nosorog', 'hipopotam',
  'banana', 'jabuka', 'narandža', 'grožđe', 'jagoda', 'malina',
  'kruška', 'šljiva', 'kajsija', 'breskva', 'ananas', 'limun',
  'kafa', 'čaj', 'mleko', 'voda', 'sok', 'pivo', 'vino',
  'hleb', 'sir', 'meso', 'jaje', 'povrće', 'krompir',
  'telefon', 'kompjuter', 'televizor', 'radio', 'kamera', 'sat',
  'knjiga', 'olovka', 'papir', 'stolica', 'sto', 'krevet',
  'lampa', 'prozor', 'vrata', 'ogledalo', 'slika', 'tepih',
  'bicikl', 'avion', 'brod', 'voz', 'autobus', 'kamion',
  'brod', 'helikopter', 'balon', 'padobran', 'skije', 'sanke',
  'lopta', 'raket', 'mreža', 'gol', 'teren', 'tribina',
  'škola', 'bolnica', 'banka', 'prodavnica', 'restoran', 'hotel',
  'park', 'šuma', 'reka', 'more', 'planina', 'grad',
  'sneg', 'kiša', 'vetar', 'oblak', 'duga', 'munja'
];

// Reset game state function
function resetGameState() {
  console.log('Resetting game state completely');
  if (gameState.currentTimer) {
    clearInterval(gameState.currentTimer);
    gameState.currentTimer = null;
  }
  gameState.players = [];
  gameState.currentDrawer = null;
  gameState.currentWord = '';
  gameState.gameStarted = false;
  gameState.timeLeft = 90;
  gameState.roundNumber = 0;
  gameState.drawingHistory = [];
  gameState.inLobby = true;
  gameState.host = null;
  console.log('Game state reset complete');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'pictionary',
    version: '1.0.0',
    players: gameState.players.length,
    gameStarted: gameState.gameStarted,
    timestamp: Date.now()
  });
});

// REST API endpoints for game state
app.get('/api/game-state', (req, res) => {
  res.json({
    players: gameState.players,
    gameStarted: gameState.gameStarted,
    inLobby: gameState.inLobby,
    roundNumber: gameState.roundNumber,
    timeLeft: gameState.timeLeft,
    drawingHistory: gameState.drawingHistory,
    currentDrawer: gameState.currentDrawer
  });
});

app.post('/api/join-game', (req, res) => {
  const { playerName } = req.body;
  
  if (!playerName) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  // Check if player with same name already exists
  const existingPlayer = gameState.players.find(p => p.name === playerName);
  if (existingPlayer) {
    return res.status(400).json({ error: 'Player with this name already exists' });
  }

  const player = {
    id: Date.now().toString(), // Simple ID for serverless
    name: playerName,
    score: 0,
    isDrawing: false,
    lastSeen: Date.now()
  };

  gameState.players.push(player);

  // Set host if this is the first player
  if (gameState.players.length === 1) {
    gameState.host = player.id;
  }

  res.json({
    playerId: player.id,
    gameState: {
      players: gameState.players,
      gameStarted: gameState.gameStarted,
      inLobby: gameState.inLobby,
      roundNumber: gameState.roundNumber,
      timeLeft: gameState.timeLeft,
      drawingHistory: gameState.drawingHistory,
      currentDrawer: gameState.currentDrawer
    }
  });
});

// Game functions for REST API
app.post('/api/start-game', (req, res) => {
  const { playerId } = req.body;
  
  if (playerId !== gameState.host) {
    return res.status(403).json({ error: 'Only host can start the game' });
  }
  
  if (gameState.players.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players' });
  }
  
  gameState.gameStarted = true;
  gameState.inLobby = false;
  gameState.roundNumber = 1;
  
  res.json({
    success: true,
    gameState: {
      gameStarted: true,
      inLobby: false,
      roundNumber: 1
    }
  });
});

// Heartbeat endpoint to keep players active
app.post('/api/heartbeat', (req, res) => {
  const { playerId } = req.body;
  
  if (!playerId) {
    return res.status(400).json({ error: 'Player ID is required' });
  }

  const player = gameState.players.find(p => p.id === playerId);
  if (player) {
    player.lastSeen = Date.now();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

// Leave game endpoint
app.post('/api/leave-game', (req, res) => {
  const { playerId } = req.body;
  
  if (!playerId) {
    return res.status(400).json({ error: 'Player ID is required' });
  }

  // Remove player from game
  gameState.players = gameState.players.filter(p => p.id !== playerId);
  
  // If no players left, reset game
  if (gameState.players.length === 0) {
    resetGameState();
  } else {
    // Update host if needed
    if (gameState.host === playerId) {
      gameState.host = gameState.players[0].id;
    }
  }

  res.json({ success: true });
});

// Cleanup inactive players (called periodically)
app.post('/api/cleanup', (req, res) => {
  const now = Date.now();
  const inactiveThreshold = 30000; // 30 seconds
  
  // Remove inactive players
  const activePlayers = gameState.players.filter(p => 
    (now - p.lastSeen) < inactiveThreshold
  );
  
  if (activePlayers.length !== gameState.players.length) {
    gameState.players = activePlayers;
    
    // Update host if needed
    if (gameState.players.length > 0 && !gameState.players.find(p => p.id === gameState.host)) {
      gameState.host = gameState.players[0].id;
    }
    
    // Reset game if no players left
    if (gameState.players.length === 0) {
      resetGameState();
    }
  }
  
  res.json({ success: true, activePlayers: gameState.players.length });
});

// Export for Vercel
module.exports = app; 