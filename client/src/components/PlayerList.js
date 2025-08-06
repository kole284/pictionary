import React, { useEffect, useState } from 'react';
import { ref as dbRef, onValue } from 'firebase/database';
import { db } from '../firebase';

const PlayerList = ({ players, currentDrawer, playerName }) => {
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="player-list">
      <h3 style={{ marginBottom: '15px', color: '#333' }}>👥 Igrači</h3>
      
      {sortedPlayers.map((player) => (
        <div key={player.playerId} className="player-item">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="player-name">
              {player.name}
              {player.name === playerName && ' (Ti)'}
            </span>
            {player.playerId === currentDrawer && (
              <span className="current-drawer">🎨 Crta</span>
            )}
          </div>
          <span className="player-score">{player.points || 0} poena</span>
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
        <div>🎯 Tačan pogodak: +10 poena</div>
        <div>🎨 Uspešno crtanje: +5 poena</div>
        <div>⏱️ 60 sekundi po krugu</div>
      </div>
    </div>
  );
};

export default PlayerList;