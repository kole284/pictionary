import React from 'react';

const PlayerList = ({ players, currentDrawer, playerName }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="player-list">
      <h3 style={{ marginBottom: '15px', color: '#333' }}>👥 Igrači</h3>
      
      {sortedPlayers.map((player) => (
        <div key={player.id} className="player-item">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="player-name">
              {player.name}
              {player.name === playerName && ' (You)'}
            </span>
            {player.id === currentDrawer && (
              <span className="current-drawer">🎨 Crta</span>
            )}
          </div>
          <span className="player-score">{player.score} pts</span>
        </div>
      ))}
      
      {players.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          Još nema igrača...
        </div>
      )}
      
      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <div>🎯 Pogodite tačno: +10 poena</div>
        <div>🎨 Nacrtajte uspešno: +5 poena</div>
        <div>⏱️ 90 sekundi po krugu</div>
      </div>
    </div>
  );
};

export default PlayerList; 