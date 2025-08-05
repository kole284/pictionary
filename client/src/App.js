import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import LoginScreen from './components/LoginScreen';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import GameEndScreen from './components/GameEndScreen';

function App() {
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(null);

  // Automatically detect server URL for LAN play
  const getSocketUrl = () => {
    if (serverUrl) {
      return serverUrl;
    }
    
    // Check if we're on HTTPS (like Vercel)
    const isHttps = window.location.protocol === 'https:';
    const protocol = isHttps ? 'https:' : 'http:';
    
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5000';
    }
    
    // For Vercel deployment, use the same hostname but with HTTPS
    if (isHttps) {
      return `${protocol}//${window.location.hostname}`;
    }
    
    // For local network, use HTTP
    return `${protocol}//${window.location.hostname}:5000`;
  };

  useEffect(() => {
    if (!getSocketUrl()) return;
    
    const newSocket = io(getSocketUrl());
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server:', getSocketUrl());
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (name) => {
    if (socket && name.trim()) {
      setPlayerName(name);
      socket.emit('joinGame', name);
      setCurrentScreen('loading');
    }
  };

  const handleServerFound = (url) => {
    setServerUrl(url);
    // Reconnect to the new server
    if (socket) {
      socket.disconnect();
    }
    const newSocket = io(url);
    setSocket(newSocket);
    
    // Set up socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to LAN server:', url);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from LAN server');
      setError('Disconnected from LAN server. Please refresh the page.');
    });
    
    // Copy other event listeners from the main useEffect
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
      return <LoginScreen onLogin={handleLogin} onServerFound={handleServerFound} />;
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