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
    const [gameId, setGameId] = useState(null);
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
        const maxRounds = (await get(dbRef(db, `games/${gameId}/gameState/maxRounds`))).val() || 0;

        if (currentRound >= maxRounds) {
            const finalScores = Object.values(playersData).sort((a, b) => b.points - a.points);
            const winner = finalScores[0];
            await update(dbRef(db, `games/${gameId}/gameState`), {
                gameStarted: false,
                inLobby: false,
                currentDrawer: null,
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
        setGameId(null);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (roundEndTimeoutRef.current) clearTimeout(roundEndTimeoutRef.current);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };

    const handleLogin = async (name, gameIdToJoin) => {
        if (!name.trim()) return;
        try {
            isLoginPhaseRef.current = true;
            let finalGameId = gameIdToJoin;
            let isNewGame = false;
            
            if (!gameIdToJoin) {
                const newGameRef = push(dbRef(db, 'games'));
                finalGameId = newGameRef.key.substring(1, 5).toUpperCase();
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
                isNewGame = true;
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

            if (isNewGame) {
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
                if (playerIds.length < 2) {
                    setError('Potrebna su najmanje 2 igrača za početak igre.');
                    return;
                }
                const firstWord = words[Math.floor(Math.random() * words.length)];
                const roundDuration = 60;
                await update(dbRef(db, `games/${gameId}/gameState`), {
                    gameStarted: true,
                    inLobby: false,
                    currentDrawer: playerIds[0],
                    roundNumber: 1,
                    maxRounds: playerIds.length * 2,
                });
                await set(dbRef(db, `games/${gameId}/game/drawingWords`), { [playerIds[0]]: firstWord });
                await set(dbRef(db, `games/${gameId}/game/timeLeft`), roundDuration);
                await set(dbRef(db, `games/${gameId}/game/correctGuess`), null);
                await set(dbRef(db, `games/${gameId}/game/chatMessages`), null);
            } catch (error) {
                console.error('Failed to start game:', error);
                setError('Neuspešno pokretanje igre. Pokušajte ponovo.');
            }
        }
    };

    const handlePlayAgain = async () => {
        if (playerId) {
            await remove(dbRef(db, `games/${gameId}/players/${playerId}`));
        }
        await cleanupGame();
        resetClientState();
    };

    useEffect(() => {
        if (!gameId) {
            resetClientState();
            return;
        }
        const unsubGameState = onValue(dbRef(db, `games/${gameId}`), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameState(data);
            } else {
                resetClientState();
            }
        });
        return () => {
            unsubGameState();
        };
    }, [gameId]);

    useEffect(() => {
        if (!gameState) {
            if (!isLoginPhaseRef.current) {
                setCurrentScreen('login');
            }
            return;
        }

        const currentIsHost = gameState?.gameState?.host === playerId;
        setIsHost(currentIsHost);

        // ISPRAVLJENA LOGIKA ZA KRAJ IGRE
        if (gameState.gameState?.winner) {
            setCurrentScreen('gameEnd');
        } else if (gameState.gameState?.inLobby) {
            setCurrentScreen('lobby');
        } else if (gameState.gameState?.gameStarted) {
            setCurrentScreen('game');
        } else if (!isLoginPhaseRef.current) {
            setCurrentScreen('login');
        }
        
        if (isHost && gameState?.gameState?.gameStarted && gameState?.game?.timeLeft === 0) {
            nextRound();
        }

        if (isHost && gameState?.game?.correctGuess && !roundEndTimeoutRef.current) {
            roundEndTimeoutRef.current = setTimeout(() => {
                nextRound();
                clearTimeout(roundEndTimeoutRef.current);
                roundEndTimeoutRef.current = null;
            }, 5000);
        } else if (isHost && !gameState?.game?.correctGuess && roundEndTimeoutRef.current) {
            clearTimeout(roundEndTimeoutRef.current);
            roundEndTimeoutRef.current = null;
        }
    }, [gameState, playerId, isHost, nextRound]);

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
        if (!isHost || !gameId || !gameState?.gameState?.gameStarted || gameState.gameState.winner) return;

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
            return <div className="loading">Učitavanje...</div>;
        case 'lobby':
            return (
                <Lobby
                    players={gameState?.players ? Object.values(gameState.players) : []}
                    onStartGame={handleStartGame}
                    isHost={isHost}
                    gameId={gameId}
                />
            );
        case 'game':
            return (
                <GameScreen
                    playerId={playerId}
                    playerName={playerName}
                    gameState={gameState}
                    nextRound={isHost ? nextRound : null}
                    gameId={gameId}
                    onGameEnd={() => setCurrentScreen('gameEnd')}
                />
            );
       case 'gameEnd':
            return (
                <GameEndScreen
                    gameState={gameState} // DODATO: Prosleđujemo celo stanje igre
                    onPlayAgain={handlePlayAgain}
                    gameId={gameId} // Dodato i gameId
                />
    );
        default:
            return <LoginScreen onLogin={handleLogin} />;
    }
}

export default App;