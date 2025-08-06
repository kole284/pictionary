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

  const nextRound = useCallback(async () => {
    console.log('nextRound: Starting next round logic.');
    if (!isHost) {
      console.log('nextRound: Not host, exiting.');
      return;
    }

    const playersSnapshot = await get(dbRef(db, 'players'));
    const playersData = playersSnapshot.val();
    if (!playersData) {
      console.log('nextRound: No players found, ending game.');
      await update(dbRef(db, 'gameState'), { gameStarted: false, inLobby: false });
      return;
    }
    const playerIds = Object.keys(playersData);
    const currentRound = (await get(dbRef(db, 'gameState/roundNumber'))).val() || 0;
    const currentDrawerId = (await get(dbRef(db, 'gameState/currentDrawer'))).val();
    console.log(`nextRound: Current round is ${currentRound}, total players ${playerIds.length}`);

    if (currentRound >= playerIds.length) {
      console.log('nextRound: Max rounds reached, ending game.');
      await update(dbRef(db, 'gameState'), { gameStarted: false, inLobby: false });
      return;
    }

    const nextDrawerIndex = (playerIds.indexOf(currentDrawerId) + 1) % playerIds.length;
    const nextDrawerId = playerIds[nextDrawerIndex];
    const newWord = words[Math.floor(Math.random() * words.length)];
    console.log(`nextRound: New drawer is ${nextDrawerId}, new word is ${newWord}`);

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
    console.log('nextRound: Round state updated in database.');
  }, [isHost]);
  
  useEffect(() => {
    console.log('App useEffect [isHost, currentScreen] running.');
    if (isHost && currentScreen === 'game') {
      console.log('Host is in game screen, setting up timer.');
      const timerRef = dbRef(db, 'game/timeLeft');
      
      const setupTimer = async () => {
        if (timerIntervalRef.current) {
          console.log('Clearing previous timer interval.');
          clearInterval(timerIntervalRef.current);
        }
        
        const interval = setInterval(async () => {
          const timeLeftSnapshot = await get(timerRef);
          const timeLeft = timeLeftSnapshot.val();
          console.log(`Timer: ${timeLeft} seconds left.`);
          
          if (timeLeft > 0) {
            await set(timerRef, timeLeft - 1);
          } else {
            console.log('Timer expired, calling nextRound.');
            clearInterval(interval);
            timerIntervalRef.current = null;
            await nextRound();
          }
        }, 1000);
        
        timerIntervalRef.current = interval;
      };
      setupTimer();
      
      return () => {
        console.log('Cleanup for timer useEffect.');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [isHost, currentScreen, nextRound]);

  useEffect(() => {
    console.log('App useEffect [playerId] running.');
    if (!playerId) {
      console.log('useEffect [playerId] - No playerId, skipping listener setup.');
      return;
    }
    console.log(`useEffect [playerId] - Player ID is ${playerId}. Setting up listeners.`);

    const playerRef = dbRef(db, `players/${playerId}`);
    onDisconnect(playerRef).remove();

    const unsub = onValue(dbRef(db, '/'), async (snapshot) => {
      const data = snapshot.val();
      console.log('Firebase data received:', data);
      if (data) {
        setGameState(data);
        setIsHost(data.gameState?.host === playerId);

        if (data.gameState && !data.gameState.inLobby && data.gameState.roundNumber > (Object.keys(data.players || {}).length)) {
          console.log('Detected end of game, switching to gameEnd screen.');
          setCurrentScreen('gameEnd');
        } else if (data.gameState?.gameStarted && !data.gameState?.inLobby) {
          console.log('Game has started, switching to game screen.');
          setCurrentScreen('game');
        } else if (data.gameState?.inLobby) {
          console.log('In lobby, switching to lobby screen.');
          setCurrentScreen('lobby');
        } else {
          console.log('Game not started, switching to login screen.');
          setCurrentScreen('login');
        }
      } else {
        console.log('No game state found, resetting everything.');
        setGameState(null);
        setCurrentScreen('login');
        if (playerId) {
          console.log('Cleaning up old game data from database.');
          await remove(dbRef(db, 'gameState'));
          await remove(dbRef(db, 'game'));
        }
      }
    });

    const sendHeartbeat = setInterval(() => {
      set(dbRef(db, `players/${playerId}/heartbeat`), Date.now());
    }, 2000);

    return () => {
      console.log('Cleanup for [playerId] useEffect.');
      clearInterval(sendHeartbeat);
      unsub();
      onDisconnect(playerRef).cancel();
    };
  }, [playerId]);

  const handleLogin = async (name) => {
    console.log('handleLogin called with name:', name);
    if (name.trim()) {
      try {
        const playersRef = dbRef(db, 'players');
        const newPlayerRef = push(playersRef);
        const newPlayerId = newPlayerRef.key;
        console.log('New player ID generated:', newPlayerId);

        await set(newPlayerRef, {
          name: name,
          playerId: newPlayerId,
          points: 0,
          heartbeat: Date.now(),
        });

        const playersSnapshot = await get(playersRef);
        const playersData = playersSnapshot.val();

        if (!playersData || Object.keys(playersData).length === 1) {
          console.log('First player logged in, setting as host and entering lobby.');
          await update(dbRef(db, 'gameState'), { host: newPlayerId, inLobby: true, gameStarted: false });
        }

        setPlayerId(newPlayerId);
        setPlayerName(name);
        setCurrentScreen('loading');
        console.log('Player state updated, waiting for game state from database.');
      } catch (error) {
        console.error('Failed to join game:', error);
        setError('Failed to connect to server. Please try again.');
      }
    }
  };

  const handleStartGame = async () => {
    console.log('handleStartGame called by host.');
    if (isHost && gameState?.players) {
      try {
        const playerIds = Object.keys(gameState.players);
        const firstWord = words[Math.floor(Math.random() * words.length)];
        const roundDuration = 60;
        console.log('Starting game with players:', playerIds);

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
        console.log('Game state initialized in database.');
      } catch (error) {
        console.error('Failed to start game:', error);
        setError('Failed to start game. Please try again.');
      }
    }
  };

  const handlePlayAgain = async () => {
    console.log('handlePlayAgain called.');
    if (playerId) {
      await remove(dbRef(db, `players/${playerId}`));
    }
    setPlayerId(null);
    setPlayerName('');
    setCurrentScreen('login');
    setGameState(null);
    setError('');
    console.log('Player state reset.');
  };

  console.log(`Current state: playerId=${playerId}, screen=${currentScreen}`);

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