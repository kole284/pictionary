import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import GameEndScreen from './components/GameEndScreen';
import { db } from './firebase';
import { ref as dbRef, set, push, update, remove, onValue, onDisconnect, get } from 'firebase/database';

function App() {
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!playerId) {
      console.log('useEffect - No playerId, skipping listener setup.');
      return;
    }

    const playerRef = dbRef(db, `players/${playerId}`);
    onDisconnect(playerRef).remove();

    const unsub = onValue(dbRef(db, '/'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGameState(data);
        setIsHost(data.gameState?.host === playerId);

        if (data.gameState?.gameStarted && !data.gameState?.inLobby) {
          setCurrentScreen('game');
        } else if (data.gameState?.inLobby) {
          setCurrentScreen('lobby');
        } else {
          setCurrentScreen('login');
        }
      } else {
        setGameState(null);
        setCurrentScreen('login');
      }
    });

    const sendHeartbeat = setInterval(() => {
      set(dbRef(db, `players/${playerId}/heartbeat`), Date.now());
    }, 2000);

    return () => {
      clearInterval(sendHeartbeat);
      unsub();
      onDisconnect(playerRef).cancel();
    };
  }, [playerId]);

  const handleLogin = async (name) => {
    if (name.trim()) {
      try {
        const playersRef = dbRef(db, 'players');
        const newPlayerRef = push(playersRef);
        const newPlayerId = newPlayerRef.key;

        await set(newPlayerRef, {
          name: name,
          playerId: newPlayerId,
          points: 0,
          heartbeat: Date.now(),
        });

        const playersSnapshot = await get(playersRef);
        const playersData = playersSnapshot.val();

        if (!playersData || Object.keys(playersData).length === 1) {
          await update(dbRef(db, 'gameState'), { host: newPlayerId, inLobby: true });
        }

        setPlayerId(newPlayerId);
        setPlayerName(name);
        setCurrentScreen('loading');
      } catch (error) {
        console.error('Failed to join game:', error);
        setError('Failed to connect to server. Please try again.');
      }
    }
  };

  const handleStartGame = async () => {
    if (isHost && gameState?.players) {
      try {
        const playerIds = Object.keys(gameState.players);
        const words = ["jabuka", "sto", "kuća", "drvo", "lopta", "kompjuter", "telefon", "voda", "sunce"];
        
        await update(dbRef(db, 'gameState'), {
          gameStarted: true,
          inLobby: false,
          currentDrawer: playerIds[0],
          roundNumber: 1,
          maxRounds: playerIds.length,
        });

        const firstWord = words[Math.floor(Math.random() * words.length)];
        await set(dbRef(db, 'game/drawingWords'), { [playerIds[0]]: firstWord });

        const roundDuration = 60; // 60 sekundi
        await set(dbRef(db, 'game/timeLeft'), roundDuration);

        // Odbrojavanje tajmera
        const timerRef = dbRef(db, 'game/timeLeft');
        const timerInterval = setInterval(async () => {
          const timeLeftSnapshot = await get(timerRef);
          const timeLeft = timeLeftSnapshot.val();
          if (timeLeft > 0) {
            await set(timerRef, timeLeft - 1);
          } else {
            clearInterval(timerInterval);
            // Logika za prelazak na sledeću rundu
          }
        }, 1000);

      } catch (error) {
        console.error('Failed to start game:', error);
        setError('Failed to start game. Please try again.');
      }
    }
  };

  const handlePlayAgain = async () => {
    if (playerId) {
      await remove(dbRef(db, `players/${playerId}`));
    }
    setPlayerId(null);
    setPlayerName('');
    setCurrentScreen('login');
    setGameState(null);
    setError('');
  };

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
          players={gameState?.players ? Object.values(gameState.players) : []}
          onStartGame={handleStartGame}
          isHost={isHost}
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