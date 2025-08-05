import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import GameEndScreen from './components/GameEndScreen';

function App() {
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(null);

  // Automatically detect server URL for API calls
  const getApiUrl = () => {
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

  // Poll game state every 2 seconds
  useEffect(() => {
    if (!playerId) return;
    
    const pollGameState = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/game-state`);
        if (response.ok) {
          const state = await response.json();
          setGameState(state);
          
          if (state.gameStarted && !state.inLobby) {
            setCurrentScreen('game');
          } else if (state.inLobby) {
            setCurrentScreen('lobby');
          }
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
        setError('Failed to connect to server. Please refresh the page.');
      }
    };
    
    const interval = setInterval(pollGameState, 2000);
    return () => clearInterval(interval);
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (name) => {
    if (name.trim()) {
      try {
        const response = await fetch(`${getApiUrl()}/api/join-game`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerName: name }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlayerId(data.playerId);
          setPlayerName(name);
          setGameState(data.gameState);
          setCurrentScreen('loading');
        } else {
          setError('Failed to join game. Please try again.');
        }
      } catch (error) {
        console.error('Failed to join game:', error);
        setError('Failed to connect to server. Please try again.');
      }
    }
  };

  const handleServerFound = (url) => {
    setServerUrl(url);
    // Reset player state when connecting to new server
    setPlayerId(null);
    setPlayerName('');
    setGameState(null);
    setCurrentScreen('login');
  };

  const handleStartGame = async () => {
    if (playerId) {
      try {
        const response = await fetch(`${getApiUrl()}/api/start-game`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerId }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setGameState(prev => ({ ...prev, ...data.gameState }));
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to start game.');
        }
      } catch (error) {
        console.error('Failed to start game:', error);
        setError('Failed to start game. Please try again.');
      }
    }
  };

  const handlePlayAgain = () => {
    setCurrentScreen('login');
    setGameState(null);
    setError('');
  };

  if (!playerId && currentScreen !== 'login') {
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
          isHost={gameState?.host === playerId}
        />
      );
    case 'game':
      return (
        <GameScreen
          playerId={playerId}
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