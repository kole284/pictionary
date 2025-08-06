import React, { useEffect, useState } from 'react';
import { ref as dbRef, onValue, set, update } from 'firebase/database';
import { db } from '../firebase';

const Lobby = ({ players, onStartGame, isHost }) => {
  const minPlayers = 2;
  const canStart = players.length >= minPlayers;
  // Ne treba ti stanje za gameState i players u Lobby komponenti
  // const [gameState, setGameState] = useState(null);
  // const [playersList, setPlayers] = useState({});

  // Ne treba ti ovaj useEffect, jer App komponenta već prosleđuje podatke kao props
  // useEffect(() => {
  //  const unsubGame = onValue(dbRef(db, 'gameState'), (snapshot) => {
  //    setGameState(snapshot.val());
  //  });
  //  const unsubPlayers = onValue(dbRef(db, 'players'), (snapshot) => {
  //    setPlayers(snapshot.val() || {});
  //  });
  //  return () => { unsubGame(); unsubPlayers(); };
  // }, []);

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>🎨 Pictionary Lobby</h1>
        <p>Čekaju se igrači da se prijave...</p>
      </div>

      <div className="lobby-content">
        <div className="players-section">
          <h2>Players ({players.length}/{minPlayers})</h2>
          <div className="players-list">
            {players.map((player, index) => (
              <div key={player.id} className="player-item">
                <span className="player-number">{index + 1}</span>
                <span className="player-name">{player.name}</span>
                {index === 0 && <span className="host-badge">👑 Host</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-info">
          <div className="info-card">
            <h3>Pravila igre</h3>
            <ul>
              <li>Minimum {minPlayers} igrača potrebno da se započne</li>
              <li>Svaki igrač dobija pravo nacrta</li>
              <li>Ostali pokušavaju da pogode reč</li>
              <li>Prvi tačan pogodak dobija poene</li>
              <li>Igra se završava nakon svih krugova</li>
            </ul>
          </div>

          {canStart && isHost && (
            <button
              className="start-game-btn"
              onClick={onStartGame}
            >
              🚀 Započni igru
            </button>
          )}

          {!canStart && (
            <div className="waiting-message">
              <p>Potrebno još {minPlayers - players.length} igrača{minPlayers - players.length !== 1 ? 'a' : ''} da se započne</p>
            </div>
          )}

          {canStart && !isHost && (
            <div className="waiting-message">
              <p>Čekaju se ostali igrači da se prijave...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;