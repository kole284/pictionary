// App.js
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

  const cleanupGame = useCallback(async () => {
    console.log('cleanupGame: Checking if game state needs cleanup...');
    const playersSnapshot = await get(dbRef(db, 'players'));
    const playersData = playersSnapshot.val();

    if (!playersData || Object.keys(playersData).length === 0) {
      console.log('cleanupGame: No players left. Deleting game state from database.');
      await remove(dbRef(db, 'gameState'));
      await remove(dbRef(db, 'game'));
    } else {
      console.log('cleanupGame: Players still exist. Skipping cleanup.');
    }
  }, []);

  const nextRound = useCallback(async () => {
    if (!isHost) return;

    const playersSnapshot = await get(dbRef(db, 'players'));
    const playersData = playersSnapshot.val();
    if (!playersData) {
      await cleanupGame(); // Pozivamo čišćenje ako nema igrača
      return;
    }
    const playerIds = Object.keys(playersData);
    const currentRound = (await get(dbRef(db, 'gameState/roundNumber'))).val() || 0;
    const currentDrawerId = (await get(dbRef(db, 'gameState/currentDrawer'))).val();

    if (currentRound >= playerIds.length) {
      console.log('nextRound: Max rounds reached, calling cleanup.');
      await cleanupGame(); // Pozivamo čišćenje na kraju igre
      return;
    }
    
    // ... (ostala logika za sledeću rundu)
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
  }, [isHost, words, cleanupGame]);
  
  useEffect(() => {
    if (!playerId) {
      console.log('useEffect [playerId]: No playerId, returning.');
      return;
    }
    console.log(`useEffect [playerId]: Player ID is ${playerId}. Setting up listeners.`);

    const playerRef = dbRef(db, `players/${playerId}`);
    onDisconnect(playerRef).remove();

    const unsub = onValue(dbRef(db, '/'), async (snapshot) => {
      const data = snapshot.val();
      console.log('Firebase data received:', data);
      
      // Dodatna provera: ako se stanje igre briše u bazi, i tvoj klijent to detektuje
      if (!data) {
        console.log('No data received from Firebase. Game state is probably deleted. Resetting client state.');
        setGameState(null);
        setPlayerId(null);
        setPlayerName('');
        setCurrentScreen('login');
        return;
      }
      
      setGameState(data);
      setIsHost(data.gameState?.host === playerId);
      
      const players = data.players || {};
      const numPlayers = Object.keys(players).length;

      // Logika za prelazak na kraj igre
      if (data.gameState?.gameStarted && data.gameState?.roundNumber > (data.gameState?.maxRounds || numPlayers)) {
        console.log('Detected game end conditions, switching to game end screen.');
        setCurrentScreen('gameEnd');
      } else if (data.gameState?.gameStarted && !data.gameState?.inLobby) {
        console.log('Game has started, switching to game screen.');
        setCurrentScreen('game');
      } else if (data.gameState?.inLobby) {
        console.log('In lobby, switching to lobby screen.');
        setCurrentScreen('lobby');
      } else {
        console.log('Defaulting to login screen because no game state is active.');
        setCurrentScreen('login');
      }
    });

    const sendHeartbeat = setInterval(() => {
      set(dbRef(db, `players/${playerId}/heartbeat`), Date.now());
    }, 2000);

    return () => {
      console.log('Cleanup for [playerId] useEffect. Player ID:', playerId);
      clearInterval(sendHeartbeat);
      unsub();
      onDisconnect(playerRef).cancel();
      // Pozivamo cleanup funkciju pri odjavljivanju
      cleanupGame();
    };
  }, [playerId, cleanupGame]);

  const handleLogin = async (name) => {
    if (name.trim()) {
      try {
        // ... (isti kod za prijavu)
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
          await update(dbRef(db, 'gameState'), { host: newPlayerId, inLobby: true, gameStarted: false, roundNumber: 0, maxRounds: 0 });
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
    // Osiguravamo čišćenje i na "Play Again"
    await cleanupGame(); 
  };

  if (error) {
    // ... (isti kod za greške)
    return (
      <div className="container">
        <div className="error">{error}</div>
        <button className="btn" onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    );
  }

  // ... (switch deo ostaje isti)
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