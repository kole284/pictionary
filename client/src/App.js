import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import LoginScreen from './components/LoginScreen';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import GameEndScreen from './components/GameEndScreen';

// Automatically detect server URL for LAN play
const SOCKET_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : `http://${window.location.hostname}:5000`;

function App() {
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [error, setError] = useState('');

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setError('Disconnected from server. Please refresh the page.');
    });

    newSocket.on('gameState', (state) => {
      setGameState(state);
      if (state.gameStarted && !state.inLobby) {
        setCurrentScreen('game');
      } else if (state.inLobby) {
        setCurrentScreen('lobby');
      }
    });

    newSocket.on('gameStarted', (data) => {
      setGameState(prev => ({ ...prev, ...data }));
      setCurrentScreen('game');
    });

    newSocket.on('gameEnded', (data) => {
      setGameState(prev => ({ ...prev, ...data }));
      setCurrentScreen('gameEnd');
    });

    newSocket.on('gameStopped', (message) => {
      setError(message);
      setCurrentScreen('login');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogin = (name) => {
    if (socket && name.trim()) {
      setPlayerName(name);
      socket.emit('joinGame', name);
      setCurrentScreen('loading');
    }
  };

  const handleStartGame = () => {
    if (socket) {
      socket.emit('startGame');
    }
  };

  const handlePlayAgain = () => {
    setCurrentScreen('login');
    setGameState(null);
    setError('');
  };

  if (!socket) {
    return <div className="loading">Connecting to server...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <button className="btn" onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    );
  }

  switch (currentScreen) {
    case 'login':
      return <LoginScreen onLogin={handleLogin} />;
    case 'loading':
      return <div className="loading">Waiting for players...</div>;
    case 'lobby':
      return (
        <Lobby
          players={gameState?.players || []}
          onStartGame={handleStartGame}
          isHost={gameState?.host === socket?.id}
        />
      );
    case 'game':
      return (
        <GameScreen
          socket={socket}
          playerName={playerName}
          gameState={gameState}
        />
      );
    case 'gameEnd':
      return (
        <GameEndScreen
          gameState={gameState}
          onPlayAgain={handlePlayAgain}
        />
      );
    default:
      return <LoginScreen onLogin={handleLogin} />;
  }
}

export default App; 