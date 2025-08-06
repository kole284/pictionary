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
    
    // Postavi onValue slušaoc van intervala da ne bi bilo ponavljanja
    const unsub = onValue(dbRef(db, '/'), (snapshot) => {
      const data = snapshot.val();
      console.log('Received new state from root:', data);
      
      if (data) {
          setGameState(data);

          // Provera stanja i prelazak na odgovarajući ekran
          if (data.gameState?.gameStarted && !data.gameState?.inLobby) {
            console.log('GameState indicates game has started. Changing screen to game.');
            setCurrentScreen('game');
          } else if (data.gameState?.inLobby) {
            console.log('GameState indicates game is in lobby. Changing screen to lobby.');
            setCurrentScreen('lobby');
          } else {
            // Ako nije u lobiju ili igri, vrati na login
            setCurrentScreen('login');
          }
      } else {
          // Ako je baza prazna, resetuj na login
          setGameState(null);
          setCurrentScreen('login');
      }
    });

    const sendHeartbeat = setInterval(() => {
        set(dbRef(db, `players/${playerId}/heartbeat`), Date.now());
        console.log(`Heartbeat sent for player: ${playerId}`);
    }, 2000);
    
    return () => {
        console.log(`Clearing polling interval and onValue listener for player: ${playerId}`);
        clearInterval(sendHeartbeat);
        unsub(); // Ukloni slušaoca
    };
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
        console.log('Resetting entire database for a new game.');
        await set(dbRef(db, '/'), {
          gameState: {
            gameStarted: true,
            inLobby: false,
            roundNumber: 1,
            host: playerId
          },
          players: {
            [playerId]: {
                name: playerName,
                playerId: playerId,
                points: 0,
                heartbeat: Date.now()
            }
          }
        });
        console.log('Game state reset successfully.');
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