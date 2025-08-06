import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import GameEndScreen from './components/GameEndScreen';
import { db } from './firebase';
import { ref as dbRef, set, push, update, remove, onValue, onDisconnect } from 'firebase/database';


function App() {
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(null);

  // Glavni useEffect za praćenje stanja igre i slanje "heartbeata"
  useEffect(() => {
    if (!playerId) {
      console.log('useEffect - No playerId, skipping listener setup.');
      return;
    }
    
    console.log(`useEffect - PlayerId: ${playerId} is active. Setting up listeners.`);

    // OnValue slušač koji prati celo stanje baze
    const unsub = onValue(dbRef(db, '/'), (snapshot) => {
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
          } else {
            setCurrentScreen('login');
          }
      } else {
          setGameState(null);
          setCurrentScreen('login');
      }
    });

    // Postavljanje onDisconnect akcije za brisanje igrača
    const playerRef = dbRef(db, `players/${playerId}`);
    onDisconnect(playerRef).remove();
    console.log(`onDisconnect hook set up for player: ${playerId}`);

    // Interval za slanje heartbeata
    const sendHeartbeat = setInterval(() => {
      set(dbRef(db, `players/${playerId}/heartbeat`), Date.now());
      console.log(`Heartbeat sent for player: ${playerId}`);
    }, 2000);
    
    return () => {
      console.log(`Clearing listeners and intervals for player: ${playerId}`);
      clearInterval(sendHeartbeat);
      unsub();
      // Otkazivanje onDisconnect akcije pri isključivanju komponente
      onDisconnect(playerRef).cancel();
    };
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (name) => {
    console.log(`Attempting to log in with name: ${name}`);
    if (name.trim()) {
      try {
        const newPlayerRef = push(dbRef(db, 'players'));
        const newPlayerId = newPlayerRef.key;
        await set(newPlayerRef, { 
            name: name, 
            playerId: newPlayerId, 
            points: 0, 
            heartbeat: Date.now() 
        });
        setPlayerId(newPlayerId);
        setPlayerName(name);
        setGameState(null);
        setCurrentScreen('loading');
      } catch (error) {
        console.error('Failed to join game:', error);
        setError('Failed to connect to server. Please try again.');
      }
    }
  };

  const handleServerFound = (url) => {
    setServerUrl(url);
    setPlayerId(null);
    setPlayerName('');
    setGameState(null);
    setCurrentScreen('login');
  };

  const handleStartGame = async () => {
    if (playerId) {
      try {
        console.log('Resetting entire database for a new game.');
        // Prvo obriši sve
        await remove(dbRef(db, '/'));
        
        // Zatim postavi novo, čisto stanje
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
    if (playerId) {
      try {
        // Obriši se kao igrač
        await remove(dbRef(db, `players/${playerId}`));
      } catch (error) {
        console.error('Failed to leave game:', error);
      }
    }
    
    setPlayerId(null);
    setPlayerName('');
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