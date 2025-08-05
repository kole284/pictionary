import React, { useState, useEffect } from 'react';
import DrawingCanvas from './DrawingCanvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import Timer from './Timer';

const GameScreen = ({ socket, playerName, gameState: initialGameState }) => {
  const [localGameState, setLocalGameState] = useState(initialGameState);
  const [currentWord, setCurrentWord] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [roundNumber, setRoundNumber] = useState(0);
  const [messages, setMessages] = useState([]);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [correctGuess, setCorrectGuess] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('gameState', (state) => {
      // Update local game state with new data
      setTimeLeft(state.timeLeft || 90);
      setRoundNumber(state.roundNumber || 0);
      setIsDrawing(socket.id === state.currentDrawer);
      setDrawingHistory(state.drawingHistory || []);
      
      // Update the gameState prop with new data
      setLocalGameState(prev => ({
        ...prev,
        ...state
      }));
    });



    socket.on('newRound', (data) => {
      setRoundNumber(data.roundNumber);
      setTimeLeft(data.timeLeft);
      setIsDrawing(socket.id === data.drawer);
      setCurrentWord('');
      setDrawingHistory([]); // This will trigger canvas clear
      setCorrectGuess(null);
    });

    socket.on('drawingWord', (word) => {
      setCurrentWord(word);
    });

    socket.on('timeUpdate', (time) => {
      setTimeLeft(time);
    });

    socket.on('draw', (data) => {
      setDrawingHistory(prev => [...prev, data]);
    });

    socket.on('clearCanvas', () => {
      setDrawingHistory([]);
    });

    socket.on('chatMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('correctGuess', (data) => {
      setCorrectGuess(data.player);
      setMessages(prev => [...prev, {
        player: 'System',
        message: `🎉 ${data.player} guessed correctly: "${data.word}"!`,
        timestamp: new Date().toLocaleTimeString(),
        isSystem: true,
        isCorrect: true
      }]);
      
      // Update scores
      setLocalGameState(prev => ({
        ...prev,
        players: prev.players.map(p => {
          const newScore = data.scores.find(s => s.name === p.name);
          return newScore ? { ...p, score: newScore.score } : p;
        })
      }));
    });

    socket.on('playerJoined', (player) => {
      setMessages(prev => [...prev, {
        player: 'System',
        message: `${player.name} joined the game`,
        timestamp: new Date().toLocaleTimeString(),
        isSystem: true
      }]);
      
      // Update gameState with new player
      setLocalGameState(prev => ({
        ...prev,
        players: [...(prev?.players || []), player]
      }));
      
      // Refresh game state when player joins
      socket.emit('requestGameState');
    });

    socket.on('playerLeft', (player) => {
      setMessages(prev => [...prev, {
        player: 'System',
        message: `${player.name} left the game`,
        timestamp: new Date().toLocaleTimeString(),
        isSystem: true
      }]);
      
      // Update gameState by removing the player
      setLocalGameState(prev => ({
        ...prev,
        players: (prev?.players || []).filter(p => p.id !== player.id)
      }));
      
      // Refresh game state when player leaves
      socket.emit('requestGameState');
    });

    return () => {
      socket.off('gameState');
      socket.off('drawingWord');
      socket.off('newRound');
      socket.off('timeUpdate');
      socket.off('draw');
      socket.off('clearCanvas');
      socket.off('chatMessage');
      socket.off('correctGuess');
      socket.off('playerJoined');
      socket.off('playerLeft');
    };
  }, [socket]);

  const handleSendMessage = (message) => {
    if (socket && message.trim()) {
      socket.emit('chatMessage', message.trim());
    }
  };

  const handleDraw = (data) => {
    if (socket && isDrawing) {
      socket.emit('draw', data);
    }
  };

  const handleClearCanvas = () => {
    if (socket && isDrawing) {
      socket.emit('clearCanvas');
    }
  };

  if (!localGameState) {
    return <div className="loading">Loading game...</div>;
  }

  return (
    <div className="container">
      <div className="game-info">
        <h1 className="game-title">🎨 Pictionary</h1>
        <p className="game-subtitle">
          Round {roundNumber} of {localGameState.maxRounds || 5}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div>
          <div className="canvas-container">
            <Timer timeLeft={timeLeft} />
            
            {isDrawing && currentWord && (
              <div style={{ 
                background: 'linear-gradient(45deg, #4CAF50, #45a049)', 
                color: 'white', 
                padding: '10px', 
                borderRadius: '8px', 
                marginBottom: '15px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                Draw: {currentWord}
              </div>
            )}
            
            {!isDrawing && !currentWord && (
              <div style={{ 
                background: '#ff9800', 
                color: 'white', 
                padding: '10px', 
                borderRadius: '8px', 
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                Waiting for drawer...
              </div>
            )}
            
            {!isDrawing && currentWord && (
              <div style={{ 
                background: '#2196F3', 
                color: 'white', 
                padding: '10px', 
                borderRadius: '8px', 
                marginBottom: '15px',
                textAlign: 'center'
              }}>
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
            players={localGameState.players || []} 
            currentDrawer={localGameState.currentDrawer}
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