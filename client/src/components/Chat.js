import React, { useState, useEffect, useRef } from 'react';
import { ref as dbRef, push, onChildAdded } from 'firebase/database';
import { db } from '../firebase';

const Chat = ({ messages, onSendMessage, isDrawing, correctGuess }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isDrawing) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const formatTime = (timeString) => {
    try {
      return new Date(`2000-01-01 ${timeString}`).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  return (
    <div className="chat-container">
      <h3 style={{ marginBottom: '15px', color: '#333' }}>💬 Chat</h3>
      
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.isCorrectGuess ? 'correct' : ''}`}
            style={{
              background: msg.isSystem ? '#f0f0f0' : msg.isCorrectGuess ? undefined : 'white',
              color: msg.isSystem ? '#666' : undefined
            }}
          >
            <div className="message-header">
              <span className="message-player">
                {msg.isSystem ? '📢' : msg.player}
              </span>
              <span className="message-time">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <div className="message-text">
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input-container">
        <input
          type="text"
          className="input chat-input"
          placeholder={isDrawing ? "Ti crtaš!" : "Unesite svoju reč..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isDrawing || correctGuess !== null} // Onemogući chat nakon tačnog pogotka
          maxLength={50}
        />
        <button
          type="submit"
          className="btn"
          disabled={isDrawing || !message.trim() || correctGuess !== null}
          style={{ padding: '12px 16px' }}
        >
          Send
        </button>
      </form>
      
      {correctGuess && (
        <div style={{
          background: 'linear-gradient(45deg, #4CAF50, #45a049)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          marginTop: '10px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          🎉 {correctGuess.player} je pogodio tačno!
        </div>
      )}
    </div>
  );
};

export default Chat;