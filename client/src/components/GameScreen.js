import React, { useState, useEffect } from 'react';
import DrawingCanvas from './DrawingCanvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import Timer from './Timer';
import { db } from '../firebase';
import { ref as dbRef, onValue, set, push } from 'firebase/database';

const GameScreen = ({ playerId, playerName, gameState }) => {
  const [currentWord, setCurrentWord] = useState('');
  const [messages, setMessages] = useState([]);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [correctGuess, setCorrectGuess] = useState(null);

  useEffect(() => {
    const drawingRef = dbRef(db, 'game/drawingHistory');
    const chatRef = dbRef(db, 'game/chatMessages');
    const timerRef = dbRef(db, 'game/timeLeft');
    const unsubTimers = onValue(timerRef, (snapshot) => {
      const timeLeft = snapshot.val();
      if (timeLeft === 0 && gameState?.gameState?.host === playerId) {
        // Logika za prelazak na sledećeg crtača kada istekne tajmer
      }
    });

    const unsubDrawing = onValue(drawingRef, (snapshot) => {
      const history = snapshot.val() || [];
      setDrawingHistory(Object.values(history));
    });

    const unsubChat = onValue(chatRef, (snapshot) => {
      const chatMsgs = snapshot.val() || [];
      setMessages(Object.values(chatMsgs));
    });

    let unsubWord;
    if (gameState?.gameState?.currentDrawer === playerId) {
      const wordRef = dbRef(db, `game/drawingWords/${playerId}`);
      unsubWord = onValue(wordRef, (snapshot) => {
        const word = snapshot.val();
        setCurrentWord(word || '');
      });
    }

    return () => {
      unsubDrawing();
      unsubChat();
      unsubTimers();
      if (unsubWord) {
        unsubWord();
      }
    };
  }, [playerId, gameState?.gameState?.currentDrawer, gameState?.gameState?.host]);

  const handleSendMessage = (message) => {
    if (message.trim()) {
      const newMessageRef = push(dbRef(db, 'game/chatMessages'));
      set(newMessageRef, {
        player: playerName,
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString(),
        isSystem: false,
      });
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

  if (!gameState || !gameState.gameState) {
    return <div className="loading">Loading game...</div>;
  }

  const isDrawing = gameState.gameState.currentDrawer === playerId;

  return (
    <div className="container">
      <div className="game-info">
        <h1 className="game-title">🎨 Pictionary</h1>
        <p className="game-subtitle">
          Round {gameState.gameState.roundNumber} of {gameState.gameState.maxRounds || 5}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div>
          <div className="canvas-container">
            <Timer timeLeft={gameState.game?.timeLeft} />
            
            {isDrawing && currentWord && (
              <div style={{ background: 'linear-gradient(45deg, #4CAF50, #45a049)', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                Draw: {currentWord}
              </div>
            )}
            
            {!isDrawing && gameState.gameState.currentDrawer && (
              <div style={{ background: '#2196F3', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center' }}>
                Guess the word!
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