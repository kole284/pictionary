import React, { useState, useEffect, memo } from 'react';
import DrawingCanvas from './DrawingCanvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import Timer from './Timer';
import { db } from '../firebase';
import { ref as dbRef, onValue, set, push, update, get } from 'firebase/database';

// Dodat onGameEnd u props, kako bi se signaliziralo App.js-u da je igra gotova
const GameScreen = memo(({ playerId, playerName, gameState, nextRound, gameId, onGameEnd }) => {
    const [currentWord, setCurrentWord] = useState('');
    const [messages, setMessages] = useState([]);
    const [drawingHistory, setDrawingHistory] = useState([]);
    const [correctGuess, setCorrectGuess] = useState(null);

    useEffect(() => {
        if (!gameState || !gameState.gameState || !gameState.players || !gameId) {
            return;
        }

        const drawingRef = dbRef(db, `games/${gameId}/game/drawingHistory`);
        const chatRef = dbRef(db, `games/${gameId}/game/chatMessages`);
        const correctGuessRef = dbRef(db, `games/${gameId}/game/correctGuess`);

        const unsubDrawing = onValue(drawingRef, (snapshot) => {
            const history = snapshot.val() || {};
            setDrawingHistory(Object.values(history));
        });

        const unsubChat = onValue(chatRef, (snapshot) => {
            const chatMsgs = snapshot.val() || {};
            setMessages(Object.values(chatMsgs));
        });
        
        const unsubCorrectGuess = onValue(correctGuessRef, (snapshot) => {
            const guessData = snapshot.val();
            setCorrectGuess(guessData);
        });

        let unsubWord;
        if (gameState?.gameState?.currentDrawer === playerId) {
            const wordRef = dbRef(db, `games/${gameId}/game/drawingWords/${playerId}`);
            unsubWord = onValue(wordRef, (snapshot) => {
                const word = snapshot.val();
                setCurrentWord(word || '');
            });
        }
        
        // --- LOGIKA ZA KRAJ IGRE ---
        // Provera da li je igra završena (npr. prošli su svi krugovi)
        // Ako je trenutna runda veća od maksimalnog broja rundi, igra je gotova.
        if (gameState.gameState.roundNumber > gameState.gameState.maxRounds) {
            // Poziva funkciju iz App.js da prebaci na GameEndScreen
            onGameEnd();
        }

        return () => {
            unsubDrawing();
            unsubChat();
            unsubCorrectGuess();
            if (unsubWord) {
                unsubWord();
            }
        };
    }, [playerId, gameState, gameId, onGameEnd]);

    const handleSendMessage = async (message) => {
        if (!gameId) return;
        if (message.trim()) {
            const newMessageRef = push(dbRef(db, `games/${gameId}/game/chatMessages`));
            await set(newMessageRef, {
                player: playerName,
                message: message.trim(),
                timestamp: new Date().toLocaleTimeString(),
                isSystem: false,
            });
            const currentDrawerId = gameState.gameState.currentDrawer;
            const wordSnapshot = await get(dbRef(db, `games/${gameId}/game/drawingWords/${currentDrawerId}`));
            const wordToGuess = wordSnapshot.val();
            if (message.toLowerCase() === wordToGuess.toLowerCase()) {
                const correctGuessRef = dbRef(db, `games/${gameId}/game/correctGuess`);
                const correctGuessSnapshot = await get(correctGuessRef);
                if (!correctGuessSnapshot.val()) {
                    const points = 10;
                    await update(dbRef(db, `games/${gameId}/players/${playerId}`), {
                        points: (gameState.players[playerId]?.points || 0) + points,
                    });
                    const drawingPlayerPoints = 5;
                    await update(dbRef(db, `games/${gameId}/players/${currentDrawerId}`), {
                        points: (gameState.players[currentDrawerId]?.points || 0) + drawingPlayerPoints,
                    });
                    await set(correctGuessRef, {
                        player: playerName,
                        playerId: playerId,
                        word: wordToGuess
                    });
                    const systemMessageRef = push(dbRef(db, `games/${gameId}/game/chatMessages`));
                    await set(systemMessageRef, {
                        player: '📢',
                        message: `${playerName} je pogodio! Reč je bila "${wordToGuess}".`,
                        timestamp: new Date().toLocaleTimeString(),
                        isSystem: true,
                        isCorrectGuess: true,
                    });
                }
            }
        }
    };

    const handleDraw = (data) => {
        if (!gameId) return;
        if (gameState?.gameState?.currentDrawer === playerId) {
            const newDrawingRef = push(dbRef(db, `games/${gameId}/game/drawingHistory`));
            set(newDrawingRef, data);
        }
    };

    const handleClearCanvas = () => {
        if (!gameId) return;
        if (gameState?.gameState?.currentDrawer === playerId) {
            set(dbRef(db, `games/${gameId}/game/drawingHistory`), null);
        }
    };

    if (!gameState || !gameState.gameState || !gameState.players) {
        return <div className="loading">Učitavanje igre...</div>;
    }
    
    const timeLeft = gameState?.game?.timeLeft ?? 0;
    const isDrawing = gameState.gameState.currentDrawer === playerId;

    return (
        <div className="game-screen-layout">
            <div className="main-content">
                <div className="game-info">
                    <h1 className="game-title">🎨 Pictionary</h1>
                    <p className="game-subtitle">
                        Runda {gameState.gameState.roundNumber} od {gameState.gameState.maxRounds || 5}
                    </p>
                    <p className="game-id">
                        ID igre: **{gameId}**
                    </p>
                </div>
                <div className="canvas-section">
                    <div className="canvas-header">
                        {isDrawing && currentWord && (
                            <div className="drawing-word">Crtaš: {currentWord}</div>
                        )}
                        {!isDrawing && gameState.gameState.currentDrawer && (
                            <div className="guessing-message">Pogodi reč!</div>
                        )}
                        <Timer timeLeft={timeLeft} />
                    </div>
                    <DrawingCanvas
                        isDrawing={isDrawing}
                        onDraw={handleDraw}
                        onClear={handleClearCanvas}
                        drawingHistory={drawingHistory}
                    />
                </div>
            </div>
            <div className="sidebar">
                <PlayerList 
                    players={Object.values(gameState.players || {})} 
                    currentDrawer={gameState.gameState.currentDrawer}
                    playerName={playerName}
                />
                <Chat
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isDrawing={isDrawing}
                    correctGuess={correctGuess}
                />
            </div>
        </div>
    );
});

export default GameScreen;