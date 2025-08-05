const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

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

// Reset game state function
function resetGameState() {
  console.log('Resetting game state completely');
  // Clear current timer if exists
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

    // Send current game state to the new player
    socket.emit('gameState', {
      players: gameState.players,
      currentDrawer: gameState.currentDrawer,
      gameStarted: gameState.gameStarted,
      timeLeft: gameState.timeLeft,
      roundNumber: gameState.roundNumber,
      maxRounds: gameState.maxRounds,
      drawingHistory: gameState.drawingHistory,
      inLobby: gameState.inLobby,
      host: gameState.host
    });

    // Notify all players about the new player
    io.to('gameRoom').emit('playerJoined', player);

    // Update all players with new game state
    io.to('gameRoom').emit('gameState', {
      players: gameState.players,
      currentDrawer: gameState.currentDrawer,
      gameStarted: gameState.gameStarted,
      timeLeft: gameState.timeLeft,
      roundNumber: gameState.roundNumber,
      maxRounds: gameState.maxRounds,
      drawingHistory: gameState.drawingHistory,
      inLobby: gameState.inLobby,
      host: gameState.host
    });
  });

  // Handle drawing coordinates
  socket.on('draw', (data) => {
    if (socket.id === gameState.currentDrawer) {
      // Broadcast drawing data to all other players
      socket.to('gameRoom').emit('draw', data);
      gameState.drawingHistory.push(data);
    }
  });

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      const chatData = {
        player: player.name,
        message: message,
        timestamp: new Date().toLocaleTimeString()
      };

      // Check if the message is a correct guess
      if (message.toLowerCase() === gameState.currentWord.toLowerCase() && 
          socket.id !== gameState.currentDrawer) {
        // Player guessed correctly
        player.score += 10;
        const drawer = gameState.players.find(p => p.id === gameState.currentDrawer);
        if (drawer) {
          drawer.score += 5; // Bonus for the drawer
        }

        chatData.isCorrectGuess = true;
        io.to('gameRoom').emit('correctGuess', {
          player: player.name,
          word: gameState.currentWord,
          scores: gameState.players.map(p => ({ name: p.name, score: p.score }))
        });

        // Clear current timer
        if (gameState.currentTimer) {
          clearInterval(gameState.currentTimer);
          gameState.currentTimer = null;
        }
        
        // End current round
        setTimeout(() => {
          nextRound();
        }, 3000);
      }

      io.to('gameRoom').emit('chatMessage', chatData);
    }
  });

  // Handle clear canvas
  socket.on('clearCanvas', () => {
    if (socket.id === gameState.currentDrawer) {
      gameState.drawingHistory = [];
      io.to('gameRoom').emit('clearCanvas');
    }
  });

  // Handle start game request
  socket.on('startGame', () => {
    if (socket.id === gameState.host && gameState.players.length >= 2 && gameState.inLobby) {
      console.log('Host started the game');
      gameState.inLobby = false;
      gameState.gameStarted = true;
      startGame();
    }
  });

  // Handle game state request
  socket.on('requestGameState', () => {
    socket.emit('gameState', {
      players: gameState.players,
      currentDrawer: gameState.currentDrawer,
      gameStarted: gameState.gameStarted,
      timeLeft: gameState.timeLeft,
      roundNumber: gameState.roundNumber,
      maxRounds: gameState.maxRounds,
      drawingHistory: gameState.drawingHistory,
      inLobby: gameState.inLobby,
      host: gameState.host
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const player = gameState.players[playerIndex];
      gameState.players.splice(playerIndex, 1);
      io.to('gameRoom').emit('playerLeft', player);

      // If the current drawer disconnected, move to next round
      if (socket.id === gameState.currentDrawer) {
        nextRound();
      }

      // If not enough players, stop the game
      if (gameState.players.length < 2) {
        console.log('Not enough players, stopping game');
        gameState.gameStarted = false;
        gameState.inLobby = true;
        io.to('gameRoom').emit('gameStopped', 'Not enough players');
        
        // Set new host if needed
        if (gameState.players.length > 0 && !gameState.host) {
          gameState.host = gameState.players[0].id;
        }
        
        // Update all players with new game state
        io.to('gameRoom').emit('gameState', {
          players: gameState.players,
          currentDrawer: gameState.currentDrawer,
          gameStarted: gameState.gameStarted,
          timeLeft: gameState.timeLeft,
          roundNumber: gameState.roundNumber,
          maxRounds: gameState.maxRounds,
          drawingHistory: gameState.drawingHistory,
          inLobby: gameState.inLobby,
          host: gameState.host
        });
      }
    }
  });
});

// Game functions
function startGame() {
  console.log('startGame() called');
  gameState.gameStarted = true;
  gameState.roundNumber = 1;
  io.to('gameRoom').emit('gameStarted', {
    players: gameState.players,
    roundNumber: gameState.roundNumber
  });
  console.log('Game started, calling startRound()');
  startRound();
}

function startRound() {
  console.log('startRound() called, round:', gameState.roundNumber);
  
  if (gameState.roundNumber > gameState.maxRounds) {
    endGame();
    return;
  }

  // Select random drawer
  const availablePlayers = gameState.players.filter(p => p.id !== gameState.currentDrawer);
  console.log('Available players for drawing:', availablePlayers.map(p => p.name));
  
  if (availablePlayers.length === 0) {
    availablePlayers.push(...gameState.players);
    console.log('No available players, using all players');
  }
  
  // Check if we have any players at all
  if (availablePlayers.length === 0) {
    console.log('No players available, ending game');
    endGame();
    return;
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

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 