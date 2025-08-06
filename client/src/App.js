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
    const [gameId, setGameId] = useState(null); // Dodat gameId state
    const timerIntervalRef = useRef(null);
    const roundEndTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const isLoginPhaseRef = useRef(false);

    const words = ["jabuka", "sto", "kuća", "drvo", "lopta", "kompjuter", "telefon", "voda", "sunce"];

    const cleanupGame = useCallback(async () => {
        if (!gameId) return;
        const playersSnapshot = await get(dbRef(db, `games/${gameId}/players`));
        const playersData = playersSnapshot.val();
        if (!playersData || Object.keys(playersData).length === 0) {
            await remove(dbRef(db, `games/${gameId}`));
        }
    }, [gameId]);

    const nextRound = useCallback(async () => {
        if (!isHost || !gameId) return;
        const playersSnapshot = await get(dbRef(db, `games/${gameId}/players`));
        const playersData = playersSnapshot.val();
        if (!playersData) {
            await cleanupGame();
            return;
        }
        const playerIds = Object.keys(playersData);
        const currentRound = (await get(dbRef(db, `games/${gameId}/gameState/roundNumber`))).val() || 0;
        if (currentRound >= playerIds.length) {
            const finalScores = Object.values(playersData).sort((a, b) => b.points - a.points);
            const winner = finalScores[0];
            await update(dbRef(db, `games/${gameId}/gameState`), {
                gameStarted: false,
                inLobby: false,
                currentDrawer: null,
                roundNumber: currentRound + 1,
                winner: { name: winner.name, score: winner.points },
                finalScores: finalScores,
            });
            await remove(dbRef(db, `games/${gameId}/game`));
            return;
        }
        const currentDrawerId = (await get(dbRef(db, `games/${gameId}/gameState/currentDrawer`))).val();
        const nextDrawerIndex = (playerIds.indexOf(currentDrawerId) + 1) % playerIds.length;
        const nextDrawerId = playerIds[nextDrawerIndex];
        const newWord = words[Math.floor(Math.random() * words.length)];
        await set(dbRef(db, `games/${gameId}/game/drawingHistory`), null);
        await set(dbRef(db, `games/${gameId}/game/chatMessages`), null);
        await set(dbRef(db, `games/${gameId}/game/correctGuess`), null);
        await set(dbRef(db, `games/${gameId}/game/drawingWords`), { [nextDrawerId]: newWord });
        await update(dbRef(db, `games/${gameId}/gameState`), {
            currentDrawer: nextDrawerId,
            roundNumber: currentRound + 1,
        });
        const roundDuration = 60;
        await set(dbRef(db, `games/${gameId}/game/timeLeft`), roundDuration);
    }, [isHost, words, cleanupGame, gameId]);

    const resetClientState = () => {
        setGameState(null);
        setPlayerId(null);
        setPlayerName('');
        setCurrentScreen('login');
        setError('');
        setIsHost(false);
        setGameId(null); // Resetuj i gameId
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (roundEndTimeoutRef.current) {
            clearTimeout(roundEndTimeoutRef.current);
            roundEndTimeoutRef.current = null;
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    };

    const handleLogin = async (name, gameIdToJoin) => {
        if (!name.trim()) return;
        try {
            isLoginPhaseRef.current = true;
            let finalGameId = gameIdToJoin;
            if (!gameIdToJoin) {
                // Kreiraj novu igru ako ID nije unesen
                const newGameRef = push(dbRef(db, 'games'));
                finalGameId = newGameRef.key.substring(1, 5).toUpperCase(); // Skraćeni, čitljivi ID
                await set(dbRef(db, `games/${finalGameId}`), {
                    players: {},
                    gameState: {
                        host: null,
                        inLobby: true,
                        gameStarted: false,
                        roundNumber: 0,
                        maxRounds: 0,
                    },
                    game: {},
                });
            } else {
                const gameSnapshot = await get(dbRef(db, `games/${finalGameId}`));
                if (!gameSnapshot.exists()) {
                    setError('Igra sa tim kodom ne postoji.');
                    return;
                }
            }
            
            const playersRef = dbRef(db, `games/${finalGameId}/players`);
            const newPlayerRef = push(playersRef);
            const newPlayerId = newPlayerRef.key;
            await set(newPlayerRef, {
                name: name.trim(),
                playerId: newPlayerId,
                points: 0,
                heartbeat: Date.now(),
            });
            
            const playersSnapshot = await get(playersRef);
            const playersData = playersSnapshot.val();

            if (!playersData || Object.keys(playersData).length === 1) {
                await update(dbRef(db, `games/${finalGameId}/gameState`), { host: newPlayerId });
            }

            setPlayerId(newPlayerId);
            setPlayerName(name.trim());
            setGameId(finalGameId);
            setCurrentScreen('loading');
        } catch (error) {
            console.error('Failed to join game:', error);
            setError('Neuspešno povezivanje. Pokušajte ponovo.');
        } finally {
            isLoginPhaseRef.current = false;
        }
    };
    
    const handleStartGame = async () => {
        if (isHost && gameState?.players) {
            try {
                const playerIds = Object.keys(gameState.players);
                const firstWord = words[Math.floor(Math.random() * words.length)];
                const roundDuration = 60;
                await update(dbRef(db, `games/${gameId}/gameState`), {
                    gameStarted: true,
                    inLobby: false,
                    currentDrawer: playerIds[0],
                    roundNumber: 1,
                    maxRounds: playerIds.length,
                });
                await set(dbRef(db, `games/${gameId}/game/drawingWords`), { [playerIds[0]]: firstWord });
                await set(dbRef(db, `games/${gameId}/game/timeLeft`), roundDuration);
                await set(dbRef(db, `games/${gameId}/game/correctGuess`), null);
                await set(dbRef(db, `games/${gameId}/game/chatMessages`), null);
            } catch (error) {
                console.error('Failed to start game:', error);
                setError('Failed to start game. Please try again.');
            }
        }
    };

    const handlePlayAgain = async () => {
        if (playerId) {
            await remove(dbRef(db, `games/${gameId}/players/${playerId}`));
        }
        setPlayerId(null);
        setPlayerName('');
        setCurrentScreen('login');
        setGameState(null);
        setError('');
        setGameId(null); // Dodatno resetovanje gameId-a
        await cleanupGame();
    };

    useEffect(() => {
        if (!gameId) {
            resetClientState();
            return;
        }
        const unsubGameState = onValue(dbRef(db, `games/${gameId}/gameState`), (snapshot) => {
            const data = snapshot.val();
            setGameState(prev => ({ ...prev, gameState: data }));
        });
        const unsubGameData = onValue(dbRef(db, `games/${gameId}/game`), (snapshot) => {
            const data = snapshot.val();
            setGameState(prev => ({ ...prev, game: data }));
        });
        const unsubPlayers = onValue(dbRef(db, `games/${gameId}/players`), (snapshot) => {
            const data = snapshot.val();
            setGameState(prev => ({ ...prev, players: data }));
        });
        return () => {
            unsubGameState();
            unsubGameData();
            unsubPlayers();
        };
    }, [gameId]);

    useEffect(() => {
        if (!gameState || !gameState.players) {
            if (!isLoginPhaseRef.current) {
                if (gameState && (!gameState.players || Object.keys(gameState.players).length === 0)) {
                    cleanupGame();
                }
            }
            return;
        }
        const currentIsHost = gameState?.gameState?.host === playerId;
        setIsHost(currentIsHost);
        if (isHost && gameState.game?.correctGuess && !roundEndTimeoutRef.current) {
            roundEndTimeoutRef.current = setTimeout(() => {
                nextRound();
                clearTimeout(roundEndTimeoutRef.current);
                roundEndTimeoutRef.current = null;
            }, 5000);
        } else if (isHost && !gameState.game?.correctGuess && roundEndTimeoutRef.current) {
            clearTimeout(roundEndTimeoutRef.current);
            roundEndTimeoutRef.current = null;
        }
        if (!gameState.gameState) {
            if (!isLoginPhaseRef.current) {
                setCurrentScreen('login');
            }
        } else if (gameState.gameState.inLobby) {
            setCurrentScreen('lobby');
        } else if (gameState.gameState.gameStarted && gameState.gameState.roundNumber > (gameState.gameState.maxRounds || 0)) {
            setCurrentScreen('gameEnd');
        } else if (gameState.gameState.gameStarted && !gameState.gameState.inLobby) {
            setCurrentScreen('game');
        } else {
            if (!isLoginPhaseRef.current) {
                setCurrentScreen('login');
            }
        }
    }, [gameState, playerId, isHost, nextRound, cleanupGame]);

    useEffect(() => {
        if (!playerId || !gameId) return;
        const playerRef = dbRef(db, `games/${gameId}/players/${playerId}`);
        onDisconnect(playerRef).remove().catch(err => console.error("Failed to set onDisconnect: ", err));
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
            set(dbRef(db, `games/${gameId}/players/${playerId}/heartbeat`), Date.now());
        }, 2000);
        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            onDisconnect(playerRef).cancel();
        };
    }, [playerId, gameId]);

    useEffect(() => {
        if (!isHost || !gameId || !gameState?.gameState?.gameStarted) return;
        const timeLeftRef = dbRef(db, `games/${gameId}/game/timeLeft`);
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        timerIntervalRef.current = setInterval(async () => {
            const snapshot = await get(timeLeftRef);
            const currentLeft = snapshot.val();
            if (currentLeft > 0) {
                await set(timeLeftRef, currentLeft - 1);
            } else if (currentLeft === 0) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
                nextRound();
            }
        }, 1000);
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [isHost, gameId, gameState, nextRound]);
    
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
                    gameId={gameId} // Prosledi gameId u Lobby
                />
            );
        case 'game':
            return (
                <GameScreen
                    playerId={playerId}
                    playerName={playerName}
                    gameState={gameState}
                    nextRound={isHost ? nextRound : null}
                    gameId={gameId} // Prosledi gameId u GameScreen
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