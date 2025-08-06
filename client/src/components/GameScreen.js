import React, { useState, useEffect } from 'react';
import DrawingCanvas from './DrawingCanvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import Timer from './Timer';
import { db } from '../firebase';
import { ref as dbRef, onValue, set, push, update, get } from 'firebase/database';

const GameScreen = ({ playerId, playerName, gameState, nextRound }) => {
    // Svi hook-ovi moraju biti na početku komponente, pre bilo kakvog return-a
    const [currentWord, setCurrentWord] = useState('');
    const [messages, setMessages] = useState([]);
    const [drawingHistory, setDrawingHistory] = useState([]);
    const [correctGuess, setCorrectGuess] = useState(null);

    // useEffect se mora pozvati uvek
    useEffect(() => {
        console.log('GameScreen useEffect running.');

        // Ograničavamo izvršavanje logike unutar hook-a
        if (!gameState || !gameState.gameState || !gameState.players) {
            console.log('useEffect: Game state not yet available. Skipping setup.');
            return;
        }

        const drawingRef = dbRef(db, 'game/drawingHistory');
        const chatRef = dbRef(db, 'game/chatMessages');
        const correctGuessRef = dbRef(db, 'game/correctGuess');

        const unsubDrawing = onValue(drawingRef, (snapshot) => {
            const history = snapshot.val() || {};
            setDrawingHistory(Object.values(history));
            console.log('Drawing history updated.');
        });

        const unsubChat = onValue(chatRef, (snapshot) => {
            const chatMsgs = snapshot.val() || {};
            setMessages(Object.values(chatMsgs));
            console.log('Chat messages updated.');
        });
        
        const unsubCorrectGuess = onValue(correctGuessRef, (snapshot) => {
            const guessData = snapshot.val();
            setCorrectGuess(guessData);
            console.log('Correct guess state updated:', guessData);
        });

        let unsubWord;
        if (gameState?.gameState?.currentDrawer === playerId) {
            console.log(`Current player is the drawer, listening for word.`);
            const wordRef = dbRef(db, `game/drawingWords/${playerId}`);
            unsubWord = onValue(wordRef, (snapshot) => {
                const word = snapshot.val();
                setCurrentWord(word || '');
                console.log(`Current word set to: ${word}`);
            });
        }

        return () => {
            console.log('GameScreen useEffect cleanup.');
            unsubDrawing();
            unsubChat();
            unsubCorrectGuess();
            if (unsubWord) {
                unsubWord();
            }
        };
    }, [playerId, gameState]); // Ukloni nextRound iz zavisnosti

    const handleSendMessage = async (message) => {
        console.log('handleSendMessage called with:', message);
        if (message.trim()) {
            const newMessageRef = push(dbRef(db, 'game/chatMessages'));
            await set(newMessageRef, {
                player: playerName,
                message: message.trim(),
                timestamp: new Date().toLocaleTimeString(),
                isSystem: false,
            });
            console.log('Message sent to chat.');

            const currentDrawerId = gameState.gameState.currentDrawer;
            const wordSnapshot = await get(dbRef(db, `game/drawingWords/${currentDrawerId}`));
            const wordToGuess = wordSnapshot.val();
            console.log(`Checking guess: "${message.toLowerCase()}" against correct word: "${wordToGuess.toLowerCase()}"`);
            
            if (message.toLowerCase() === wordToGuess.toLowerCase()) {
                console.log('Correct guess!');
                const correctGuessRef = dbRef(db, 'game/correctGuess');
                const correctGuessSnapshot = await get(correctGuessRef);

                if (!correctGuessSnapshot.val()) {
                    console.log('First correct guess, updating scores.');
                    const points = 10;
                    await update(dbRef(db, `players/${playerId}`), {
                        points: (gameState.players[playerId]?.points || 0) + points,
                    });

                    const drawingPlayerPoints = 5;
                    await update(dbRef(db, `players/${currentDrawerId}`), {
                        points: (gameState.players[currentDrawerId]?.points || 0) + drawingPlayerPoints,
                    });

                    await set(correctGuessRef, {
                        player: playerName,
                        playerId: playerId,
                        word: wordToGuess
                    });
                    console.log('Scores and correct guess data updated in database.');

                    const systemMessageRef = push(dbRef(db, 'game/chatMessages'));
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
        if (gameState?.gameState?.currentDrawer === playerId) {
            const newDrawingRef = push(dbRef(db, 'game/drawingHistory'));
            set(newDrawingRef, data);
        }
    };

    const handleClearCanvas = () => {
        if (gameState?.gameState?.currentDrawer === playerId) {
            set(dbRef(db, 'game/drawingHistory'), null);
        }
    };

    // Sada je ova provera sigurna jer se izvršava nakon svih hook-ova
    if (!gameState || !gameState.gameState || !gameState.players) {
        console.log('GameScreen: Loading state...');
        return <div className="loading">Učitavanje igre...</div>;
    }
    
    // Ostali kod ostaje isti
    const timeLeft = gameState?.game?.timeLeft ?? 0;
    console.log(`GameScreen: Render with gameState.gameStarted=${gameState.gameState.gameStarted}, gameState.inLobby=${gameState.gameState.inLobby}`);

    const isDrawing = gameState.gameState.currentDrawer === playerId;

    return (
        <div className="container">
            <div className="game-info">
                <h1 className="game-title">🎨 Pictionary</h1>
                <p className="game-subtitle">
                    Runda {gameState.gameState.roundNumber} od {gameState.gameState.maxRounds || 5}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
                <div>
                    <div className="canvas-container">
                        <Timer timeLeft={timeLeft} />
                        
                        {isDrawing && currentWord && (
                            <div style={{ background: 'linear-gradient(45deg, #4CAF50, #45a049)', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                                Crtaš: {currentWord}
                            </div>
                        )}
                        
                        {!isDrawing && gameState.gameState.currentDrawer && (
                            <div style={{ background: '#2196F3', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center' }}>
                                Pogodi reč!
                            </div>
                        )}
                        
                        <DrawingCanvas
                            isDrawing={isDrawing}
                            onDraw={handleDraw}
                            onClear={handleClearCanvas}
                            drawingHistory={drawingHistory}
                        />
                    </div>
                </div>

                <div>
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
        </div>
    );
};

export default GameScreen;