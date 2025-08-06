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
    const roundEndTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);

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
            console.log('cleanupGame: Players still exist. Deleting old game state if it exists, to avoid inconsistency.');
            await remove(dbRef(db, 'game'));
        }
    }, []);

    const resetClientState = () => {
        setGameState(null);
        setPlayerId(null);
        setPlayerName('');
        setCurrentScreen('login');
        setError('');
        setIsHost(false);
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
        console.log('Client state has been reset to default.');
    };
    
    useEffect(() => {
        const initialCleanup = async () => {
            console.log('Initial check: Cleaning up old game state if necessary.');
            await cleanupGame();
        };
        initialCleanup();
    }, [cleanupGame]);

    const nextRound = useCallback(async () => {
        if (!isHost) return;
        
        const currentGameStateSnapshot = await get(dbRef(db, 'gameState'));
        if (!currentGameStateSnapshot.exists()) {
            console.log('nextRound: Game state no longer exists. Aborting.');
            return;
        }
        
        console.log('nextRound: Executing new round logic.');
        
        const playersSnapshot = await get(dbRef(db, 'players'));
        const playersData = playersSnapshot.val();
        if (!playersData) {
            await cleanupGame();
            return;
        }
        
        const playerIds = Object.keys(playersData);
        const currentRound = (await get(dbRef(db, 'gameState/roundNumber'))).val() || 0;
        
        if (currentRound >= playerIds.length) {
            console.log('nextRound: Max rounds reached. Game Over!');
            const finalScores = Object.values(playersData).sort((a, b) => b.points - a.points);
            const winner = finalScores[0];

            await update(dbRef(db, 'gameState'), {
                gameStarted: false,
                inLobby: false,
                currentDrawer: null,
                roundNumber: currentRound + 1,
                winner: { name: winner.name, score: winner.points },
                finalScores: finalScores,
            });
            await remove(dbRef(db, 'game'));
            return;
        }

        const currentDrawerId = (await get(dbRef(db, 'gameState/currentDrawer'))).val();
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
        console.log(`nextRound: Started round ${currentRound + 1} with drawer ${playersData[nextDrawerId]?.name}.`);
    }, [isHost, words, cleanupGame]);

    useEffect(() => {
        if (isHost && gameState?.gameState?.gameStarted) {
            const timeLeftRef = dbRef(db, 'game/timeLeft');
            
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
                    if (isHost) {
                        console.log('Timer expired, calling nextRound.');
                        nextRound();
                    }
                }
            }, 1000);
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [isHost, gameState, nextRound]);

    // Use a single useEffect for player-related actions and state
    useEffect(() => {
        if (!playerId) {
            console.log('useEffect [playerId]: No playerId, returning.');
            return;
        }
    
        console.log(`useEffect [playerId]: Player ID is ${playerId}. Setting up listeners.`);
        const playerRef = dbRef(db, `players/${playerId}`);
        
        // Setup onDisconnect
        onDisconnect(playerRef).remove().catch(err => {
            console.error("Failed to set onDisconnect: ", err);
        });

        // Set up heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
            set(dbRef(db, `players/${playerId}/heartbeat`), Date.now());
        }, 2000);
    
        const unsub = onValue(dbRef(db, 'players'), (snapshot) => {
            const playersData = snapshot.val();
            if (!playersData) {
                console.log('No players data received. Cleaning up game.');
                cleanupGame();
                return;
            }
            
            const currentIsHost = playersData && playersData[Object.keys(playersData)[0]]?.playerId === playerId;
            setIsHost(currentIsHost);
    
            if (currentIsHost) {
                const now = Date.now();
                const gameRef = dbRef(db, 'game');
                
                get(gameRef).then(gameSnapshot => {
                    const gameData = gameSnapshot.val();
                    if (!gameData?.correctGuess) {
                        for (const id in playersData) {
                            if (now - playersData[id].heartbeat > 15000) {
                                console.log(`Player ${playersData[id].name} (${id}) is inactive. Removing.`);
                                remove(dbRef(db, `players/${id}`));
                            }
                        }
                    }
                });
            }
        });
    
        return () => {
            console.log('Cleanup for [playerId] useEffect. Player ID:', playerId);
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            unsub();
            onDisconnect(playerRef).cancel();
            
            get(dbRef(db, 'players')).then(snapshot => {
                if (!snapshot.exists()) {
                    cleanupGame();
                }
            });
        };
    }, [playerId, cleanupGame, nextRound]);
    
    // Use a separate useEffect for global game state listener
    useEffect(() => {
        const unsub = onValue(dbRef(db, '/'), (snapshot) => {
            const data = snapshot.val();
            console.log('Firebase data received:', data);
            
            if (!data || !data.players) {
                console.log('No players or no data received. Resetting client state.');
                resetClientState();
                return;
            }
            
            setGameState(data);
            
            if (isHost && data.game?.correctGuess && !roundEndTimeoutRef.current) {
                console.log('Host detected correct guess, scheduling next round in 5 seconds.');
                roundEndTimeoutRef.current = setTimeout(() => {
                    console.log('Timeout finished, calling nextRound.');
                    nextRound();
                    if (roundEndTimeoutRef.current) {
                       clearTimeout(roundEndTimeoutRef.current);
                       roundEndTimeoutRef.current = null;
                    }
                }, 5000);
            } else if (isHost && !data.game?.correctGuess && roundEndTimeoutRef.current) {
                console.log('Correct guess state cleared. Cancelling scheduled next round.');
                clearTimeout(roundEndTimeoutRef.current);
                roundEndTimeoutRef.current = null;
            }

            if (!data.gameState) {
                setCurrentScreen('login');
            } else if (data.gameState.inLobby) {
                setCurrentScreen('lobby');
            } else if (data.gameState.gameStarted && data.gameState.roundNumber > (data.gameState.maxRounds || 0)) {
                setCurrentScreen('gameEnd');
            } else if (data.gameState.gameStarted && !data.gameState.inLobby) {
                setCurrentScreen('game');
            } else {
                setCurrentScreen('login');
            }
        });
        
        return () => unsub();
    }, [isHost, nextRound, resetClientState]);

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
                    console.log('First player logged in, creating gameState.');
                    await set(dbRef(db, 'gameState'), { host: newPlayerId, inLobby: true, gameStarted: false, roundNumber: 0, maxRounds: 0 });
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
        await cleanupGame();
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