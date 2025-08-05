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

  const player = {
    id: Date.now().toString(), // Simple ID for serverless
    name: playerName,
    score: 0,
    isDrawing: false
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

// Export for Vercel
module.exports = app; 