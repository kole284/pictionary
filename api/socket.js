const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket']
});

// Middleware
app.use(cors());
app.use(express.json());

// Game state
const gameState = {
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join game room
  socket.on('joinGame', (playerName) => {
    const player = {
      id: socket.id,
      name: playerName,
      score: 0,
      isDrawing: false
    };

    gameState.players.push(player);
    socket.join('gameRoom');

    console.log(`Player ${playerName} joined. Total players: ${gameState.players.length}`);

    // Set host if this is the first player
    if (gameState.players.length === 1) {
      gameState.host = socket.id;
    }

    // Send current game state to all players
    io.to('gameRoom').emit('gameState', {
      players: gameState.players,
      gameStarted: gameState.gameStarted,
      inLobby: gameState.inLobby,
      roundNumber: gameState.roundNumber,
      timeLeft: gameState.timeLeft,
      drawingHistory: gameState.drawingHistory,
      currentDrawer: gameState.currentDrawer
    });
  });

  // Start game
  socket.on('startGame', () => {
    if (socket.id === gameState.host && gameState.players.length >= 2) {
      startGame();
    }
  });

  // Drawing events
  socket.on('draw', (data) => {
    if (socket.id === gameState.currentDrawer) {
      gameState.drawingHistory.push(data);
      socket.to('gameRoom').emit('draw', data);
    }
  });

  // Clear canvas
  socket.on('clearCanvas', () => {
    if (socket.id === gameState.currentDrawer) {
      gameState.drawingHistory = [];
      io.to('gameRoom').emit('clearCanvas');
    }
  });

  // Chat message
  socket.on('chatMessage', (message) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const chatMessage = {
        player: player.name,
        message: message,
        timestamp: new Date().toLocaleTimeString()
      };

      io.to('gameRoom').emit('chatMessage', chatMessage);

      // Check if message is correct guess
      if (gameState.currentWord && 
          message.toLowerCase().trim() === gameState.currentWord.toLowerCase() &&
          socket.id !== gameState.currentDrawer) {
        
        // Award points
        const guesser = gameState.players.find(p => p.id === socket.id);
        const drawer = gameState.players.find(p => p.id === gameState.currentDrawer);
        
        if (guesser) guesser.score += 10;
        if (drawer) drawer.score += 5;

        // Emit correct guess event
        io.to('gameRoom').emit('correctGuess', {
          player: guesser.name,
          word: gameState.currentWord,
          scores: gameState.players.map(p => ({ name: p.name, score: p.score }))
        });

        // End round early
        if (gameState.currentTimer) {
          clearInterval(gameState.currentTimer);
          gameState.currentTimer = null;
        }
        
        setTimeout(() => {
          nextRound();
        }, 2000);
      }
    }
  });

  // Request game state
  socket.on('requestGameState', () => {
    socket.emit('gameState', {
      players: gameState.players,
      gameStarted: gameState.gameStarted,
      inLobby: gameState.inLobby,
      roundNumber: gameState.roundNumber,
      timeLeft: gameState.timeLeft,
      drawingHistory: gameState.drawingHistory,
      currentDrawer: gameState.currentDrawer
    });
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove player from game
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    
    // If no players left, reset game
    if (gameState.players.length === 0) {
      resetGameState();
    } else {
      // Update host if needed
      if (gameState.host === socket.id) {
        gameState.host = gameState.players[0].id;
      }
      
      // Update game state for remaining players
      io.to('gameRoom').emit('gameState', {
        players: gameState.players,
        gameStarted: gameState.gameStarted,
        inLobby: gameState.inLobby,
        roundNumber: gameState.roundNumber,
        timeLeft: gameState.timeLeft,
        drawingHistory: gameState.drawingHistory,
        currentDrawer: gameState.currentDrawer
      });
    }
  });
});

// Game functions
function startGame() {
  console.log('Starting game');
  gameState.gameStarted = true;
  gameState.inLobby = false;
  gameState.roundNumber = 1;
  
  io.to('gameRoom').emit('gameStarted', {
    gameStarted: true,
    inLobby: false,
    roundNumber: 1
  });
  
  startRound();
}

function startRound() {
  console.log('Starting round', gameState.roundNumber);
  
  // Select drawer
  const availablePlayers = gameState.players.filter(p => p.id !== gameState.currentDrawer);
  if (availablePlayers.length === 0) {
    availablePlayers.push(...gameState.players);
  }
  
  const randomIndex = Math.floor(Math.random() * availablePlayers.length);
  gameState.currentDrawer = availablePlayers[randomIndex].id;
  
  console.log('Selected drawer:', gameState.currentDrawer, 'Player name:', availablePlayers[randomIndex].name);

  // Select random word
  gameState.currentWord = words[Math.floor(Math.random() * words.length)];
  gameState.timeLeft = gameState.roundTime;
  gameState.drawingHistory = [];

  console.log('Selected word:', gameState.currentWord);

  // Clear canvas for all players first
  io.to('gameRoom').emit('clearCanvas');

  // Notify all players about the new round
  io.to('gameRoom').emit('newRound', {
    drawer: gameState.currentDrawer,
    roundNumber: gameState.roundNumber,
    timeLeft: gameState.timeLeft,
    players: gameState.players
  });

  // Send the word only to the drawer
  io.to(gameState.currentDrawer).emit('drawingWord', gameState.currentWord);

  console.log('Starting timer...');
  // Start timer
  startTimer();
}

function startTimer() {
  // Clear any existing timer
  if (gameState.currentTimer) {
    clearInterval(gameState.currentTimer);
  }
  
  gameState.currentTimer = setInterval(() => {
    gameState.timeLeft--;
    
    io.to('gameRoom').emit('timeUpdate', gameState.timeLeft);

    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.currentTimer);
      gameState.currentTimer = null;
      // Time's up, move to next round
      setTimeout(() => {
        nextRound();
      }, 2000);
    }
  }, 1000);
}

function nextRound() {
  // Clear current timer
  if (gameState.currentTimer) {
    clearInterval(gameState.currentTimer);
    gameState.currentTimer = null;
  }
  
  gameState.roundNumber++;
  gameState.drawingHistory = [];
  
  if (gameState.roundNumber > gameState.maxRounds) {
    endGame();
  } else {
    startRound();
  }
}

function endGame() {
  console.log('Game ended, resetting state');
  gameState.gameStarted = false;
  const winner = gameState.players.reduce((prev, current) => 
    (prev.score > current.score) ? prev : current
  );
  
  io.to('gameRoom').emit('gameEnded', {
    winner: winner,
    finalScores: gameState.players.sort((a, b) => b.score - a.score)
  });
  
  // Reset game state after a delay
  setTimeout(() => {
    console.log('Resetting game state');
    resetGameState();
  }, 5000);
}

// Export for Vercel
module.exports = app; 