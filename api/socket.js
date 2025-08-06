const express = require('express');
const cors = require('cors');
const { readLobby, writeLobby } = require('./storage');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

function getDefaultLobby() {
  return {
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
}

function resetLobby() {
  writeLobby(getDefaultLobby());
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'pictionary', version: '1.0.0', timestamp: Date.now() });
});

// Get game state
app.get('/api/game-state', (req, res) => {
  const lobby = readLobby();
  res.json({
    players: lobby.players,
    gameStarted: lobby.gameStarted,
    inLobby: lobby.inLobby,
    roundNumber: lobby.roundNumber,
    timeLeft: lobby.timeLeft,
    drawingHistory: lobby.drawingHistory,
    currentDrawer: lobby.currentDrawer,
    host: lobby.host
  });
});

// Join game
app.post('/api/join-game', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).json({ error: 'Player name is required' });
  const lobby = readLobby();
  if (lobby.players.find(p => p.name === playerName)) {
    return res.status(400).json({ error: 'Player with this name already exists' });
  }
  const player = {
    id: Date.now().toString(),
    name: playerName,
    score: 0,
    isDrawing: false,
    lastSeen: Date.now()
  };
  lobby.players.push(player);
  if (lobby.players.length === 1) lobby.host = player.id;
  writeLobby(lobby);
  res.json({ playerId: player.id, gameState: lobby });
});

// Start game
app.post('/api/start-game', (req, res) => {
  const { playerId } = req.body;
  const lobby = readLobby();
  if (playerId !== lobby.host) return res.status(403).json({ error: 'Only host can start the game' });
  if (lobby.players.length < 2) return res.status(400).json({ error: 'Need at least 2 players' });
  lobby.gameStarted = true;
  lobby.inLobby = false;
  lobby.roundNumber = 1;
  writeLobby(lobby);
  res.json({ success: true, gameState: lobby });
});

// Heartbeat
app.post('/api/heartbeat', (req, res) => {
  const { playerId } = req.body;
  const lobby = readLobby();
  const player = lobby.players.find(p => p.id === playerId);
  if (player) {
    player.lastSeen = Date.now();
    writeLobby(lobby);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

// Leave game
app.post('/api/leave-game', (req, res) => {
  const { playerId } = req.body;
  const lobby = readLobby();
  lobby.players = lobby.players.filter(p => p.id !== playerId);
  if (lobby.players.length === 0) {
    resetLobby();
  } else {
    if (lobby.host === playerId) lobby.host = lobby.players[0].id;
    writeLobby(lobby);
  }
  res.json({ success: true });
});

// Cleanup inactive players
app.post('/api/cleanup', (req, res) => {
  const now = Date.now();
  const inactiveThreshold = 30000;
  const lobby = readLobby();
  const activePlayers = lobby.players.filter(p => (now - p.lastSeen) < inactiveThreshold);
  if (activePlayers.length !== lobby.players.length) {
    lobby.players = activePlayers;
    if (lobby.players.length > 0 && !lobby.players.find(p => p.id === lobby.host)) {
      lobby.host = lobby.players[0].id;
    }
    if (lobby.players.length === 0) resetLobby();
    else writeLobby(lobby);
  }
  res.json({ success: true, activePlayers: lobby.players.length });
});

// Reset endpoint (for testing)
app.post('/api/reset', (req, res) => {
  resetLobby();
  res.json({ success: true });
});

module.exports = app; 