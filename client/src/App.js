// App.js
import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import GameEndScreen from './components/GameEndScreen';
import { db } from './firebase';
import { ref as dbRef, set, push, update, remove, onValue } from 'firebase/database';


function App() {
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(null);

  // Poll game state and send heartbeat every 2 seconds
  useEffect(() => {
    if (!playerId) {
      console.log('useEffect - No playerId, skipping polling.');
      return;
    }
    
    console.log(`useEffect - PlayerId: ${playerId} is active. Starting polling.`);

    const pollGameState = async () => {
      try {
        console.log(`Polling started for player: ${playerId}`);
        // Send heartbeat
        await set(dbRef(db, `players/${playerId}/heartbeat`), Date.now());
        console.log(`Heartbeat sent for player: ${playerId}`);
        
        onValue(dbRef(db, '/'), (snapshot) => {
          const data = snapshot.val();
          console.log('Received new state from root:', data);
          
          if (data) {
              setGameState(data);

              if (data.gameState?.gameStarted && !data.gameState?.inLobby) {
                console.log('GameState indicates game has started. Changing screen to game.');
                setCurrentScreen('game');
              } else if (data.gameState?.inLobby) {
                console.log('GameState indicates game is in lobby. Changing screen to lobby.');
                setCurrentScreen('lobby');
              }
          }
        });
      } catch (error) {
        console.error('Failed to fetch game state:', error);
        setError('Failed to connect to server. Please refresh the page.');
      }
    };
    
    const interval = setInterval(pollGameState, 2000);
    return () => {
      console.log(`Clearing polling interval for player: ${playerId}`);
      clearInterval(interval);
    };
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup inactive players every 10 seconds
  // Ovaj deo koda je već u redu
  useEffect(() => {
    if (!playerId) return;
    
    const cleanup = async () => {
      try {
        await set(dbRef(db, `players/${playerId}/heartbeat`), Date.now());
        console.log(`Cleanup heartbeat sent for player: ${playerId}`);
      } catch (error) {
        console.error('Failed to cleanup:', error);
      }
    };
    
    const interval = setInterval(cleanup, 10000);
    return () => clearInterval(interval);
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerId) {
        console.log(`Player ${playerId} is leaving. Removing from database.`);
        remove(dbRef(db, `players/${playerId}`));
      }
    };
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (name) => {
    console.log(`Attempting to log in with name: ${name}`);
    if (name.trim()) {
      try {
        console.log('Name is valid. Pushing new player to database.');
        const newPlayerRef = push(dbRef(db, 'players'));
        const playerId = newPlayerRef.key;
        console.log(`Generated new playerId: ${playerId}`);
        await set(newPlayerRef, { name: name, playerId: playerId, points: 0 });
        console.log(`Player data saved to database for playerId: ${playerId}`);
        setPlayerId(playerId);
        setPlayerName(name);
        setGameState(null);
        setCurrentScreen('loading');
        console.log('Login successful. Current screen: loading.');
      } catch (error) {
        console.error('Failed to join game:', error);
        setError('Failed to connect to server. Please try again.');
      }
    } else {
      console.log('Invalid name provided.');
    }
  };

  const handleServerFound = (url) => {
    console.log(`Server found: ${url}. Resetting state.`);
    setServerUrl(url);
    setPlayerId(null);
    setPlayerName('');
    setGameState(null);
    setCurrentScreen('login');
  };

  const handleStartGame = async () => {
    console.log(`Player ${playerId} attempting to start game.`);
    if (playerId) {
      try {
        console.log('Updating gameState to start game and removing old players.');
        // Čišćenje pre započinjanja nove igre
        await update(dbRef(db, '/'), {
          gameState: {
            gameStarted: true, 
            inLobby: false,
            roundNumber: 1,
            host: playerId
          },
          // Brisanje svih prethodnih igrača i pokretanje nove sesije
          players: {} 
        });
        console.log('Game start request sent.');
      } catch (error) {
        console.error('Failed to start game:', error);
        setError('Failed to start game. Please try again.');
      }
    }
  };

  const handlePlayAgain = async () => {
    console.log(`Player ${playerId} wants to play again.`);
    if (playerId) {
      try {
        console.log(`Removing player ${playerId} from database.`);
        remove(dbRef(db, `players/${playerId}`));
      } catch (error) {
        console.error('Failed to leave game:', error);
      }
    }
    
    // Reset state
    setPlayerId(null);
    setPlayerName('');
    setCurrentScreen('login');
    setGameState(null);
    setError('');
    console.log('State reset. Returning to login screen.');
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
          players={gameState?.players ? Object.values(gameState.players) : []}
          onStartGame={handleStartGame}
          isHost={gameState?.gameState?.host === playerId}
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