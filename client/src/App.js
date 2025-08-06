import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const timerIntervalRef = useRef(null);

  const words = ["jabuka", "sto", "kuća", "drvo", "lopta", "kompjuter", "telefon", "voda", "sunce"];

  // Koristimo useCallback da nextRound ne kreira novu instancu u svakom renderu
  const nextRound = useCallback(async () => {
    if (!isHost) return;

    const playersSnapshot = await get(dbRef(db, 'players'));
    const playersData = playersSnapshot.val();
    if (!playersData) {
      // Nema igrača, kraj igre
      await update(dbRef(db, 'gameState'), { gameStarted: false, inLobby: false });
      return;
    }
    const playerIds = Object.keys(playersData);
    const currentRound = (await get(dbRef(db, 'gameState/roundNumber'))).val() || 0;
    const currentDrawerId = (await get(dbRef(db, 'gameState/currentDrawer'))).val();

    if (currentRound >= playerIds.length) {
      // Kraj igre
      await update(dbRef(db, 'gameState'), { gameStarted: false, inLobby: false });
      return;
    }

    const nextDrawerIndex = (playerIds.indexOf(currentDrawerId) + 1) % playerIds.length;
    const nextDrawerId = playerIds[nextDrawerIndex];
    const newWord = words[Math.floor(Math.random() * words.length)];

    await set(dbRef(db, 'game/drawingHistory'), null);
    await set(dbRef(db, 'game/chatMessages'), null);
    await set(dbRef(db, 'game/correctGuess'), null);
    await set(dbRef(db, `game/drawingWords`), { [nextDrawerId]: newWord });
    
    await update(dbRef(db, 'gameState'), {
      currentDrawer: nextDrawerId,
      roundNumber: currentRound + 1,
    });

    const roundDuration = 60;
    await set(dbRef(db, 'game/timeLeft'), roundDuration);
  }, [isHost]);
  
  useEffect(() => {
    if (isHost && currentScreen === 'game') {
      const timerRef = dbRef(db, 'game/timeLeft');
      
      const setupTimer = async () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        
        const interval = setInterval(async () => {
          const timeLeftSnapshot = await get(timerRef);
          const timeLeft = timeLeftSnapshot.val();
          
          if (timeLeft > 0) {
            await set(timerRef, timeLeft - 1);
          } else {
            clearInterval(interval);
            timerIntervalRef.current = null;
            await nextRound();
          }
        }, 1000);
        
        timerIntervalRef.current = interval;
      };
      setupTimer();
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [isHost, currentScreen, nextRound]);

  useEffect(() => {
    if (!playerId) {
      return;
    }

    const playerRef = dbRef(db, `players/${playerId}`);
    onDisconnect(playerRef).remove();

    const unsub = onValue(dbRef(db, '/'), async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGameState(data);
        setIsHost(data.gameState?.host === playerId);

        if (data.gameState && !data.gameState.inLobby && data.gameState.roundNumber > (Object.keys(data.players || {}).length)) {
          setCurrentScreen('gameEnd');
        } else if (data.gameState?.gameStarted && !data.gameState?.inLobby) {
          setCurrentScreen('game');
        } else if (data.gameState?.inLobby) {
          setCurrentScreen('lobby');
        } else {
          setCurrentScreen('login');
        }
      } else {
        setGameState(null);
        setCurrentScreen('login');
        if (playerId) {
          await remove(dbRef(db, 'gameState'));
          await remove(dbRef(db, 'game'));
        }
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
          await update(dbRef(db, 'gameState'), { host: newPlayerId, inLobby: true, gameStarted: false });
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
        const firstWord = words[Math.floor(Math.random() * words.length)];
        const roundDuration = 60;

        await update(dbRef(db, 'gameState'), {
          gameStarted: true,
          inLobby: false,
          currentDrawer: playerIds[0],
          roundNumber: 1,
          maxRounds: playerIds.length,
        });

        await set(dbRef(db, 'game/drawingWords'), { [playerIds[0]]: firstWord });
        await set(dbRef(db, 'game/timeLeft'), roundDuration);
        await set(dbRef(db, 'game/correctGuess'), null);
        await set(dbRef(db, 'game/chatMessages'), null);
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
          nextRound={isHost ? nextRound : null}
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