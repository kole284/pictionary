import React, { useState } from 'react';
import LANDiscovery from './LANDiscovery';

const LoginScreen = ({ onLogin, onServerFound }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState(''); // Dodato za unos ID-a igre
  const [showLANDiscovery, setShowLANDiscovery] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      onLogin(playerName.trim(), gameId.trim());
    }
  };

  return (
    <div className="container">
      <div className="game-info">
        <h1 className="game-title">🎨 Pictionary</h1>
        <p className="game-subtitle">Seminarski rad, napravili Lazar Sević 0002/2023 i Nikola Kostić 0464/2023</p>
      </div>
      
      <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
          Unesite svoje ime
        </h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="input"
            placeholder="Unesite svoje ime..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            required
            style={{ marginBottom: '10px' }}
          />

          <input
            type="text"
            className="input"
            placeholder="Unesite kod igre (opciono)..."
            value={gameId}
            onChange={(e) => setGameId(e.target.value.toUpperCase())}
            maxLength={5}
            style={{ marginBottom: '20px' }}
          />
          
          <button
            type="submit"
            className="btn"
            style={{ width: '100%' }}
            disabled={!playerName.trim()}
          >
            {gameId ? 'Pridruži se igri' : 'Napravi novu igru'}
          </button>
        </form>
        
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
          <p>🎯 Nacrtaj i pogodi reči u realnom vremenu!</p>
          <p>⏱️ Svaki krug traje 90 sekundi</p>
          <p>👥 Minimum 2 igrača potrebno</p>
        </div>
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowLANDiscovery(!showLANDiscovery)}
            style={{ marginBottom: '10px' }}
          >
            {showLANDiscovery ? '🔽 Sakrij LAN Discovery' : '🌐 Pronađi lokalne igre'}
          </button>
        </div>
      </div>
      
      {showLANDiscovery && (
        <div className="card" style={{ maxWidth: '600px', margin: '20px auto' }}>
          <LANDiscovery onServerFound={onServerFound} />
        </div>
      )}
    </div>
  );
};

export default LoginScreen;