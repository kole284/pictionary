import React from 'react';

const Lobby = ({ players, onStartGame, isHost }) => {
  const minPlayers = 2;
  const playersCount = players ? players.length : 0;
  const canStart = playersCount >= minPlayers;

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>🎨 Pictionary Lobby</h1>
        <p>Čekaju se igrači da se prijave...</p>
      </div>

      <div className="lobby-content">
        <div className="players-section">
          <h2>Players ({playersCount}/{minPlayers})</h2>
          <div className="players-list">
            {players && players.map((player, index) => (
              <div key={player.playerId} className="player-item">
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

          {isHost && (
            <button
              className="start-game-btn"
              onClick={onStartGame}
              disabled={!canStart}
            >
              🚀 Započni igru
            </button>
          )}

          {!isHost && (
            <div className="waiting-message">
              {canStart ? (
                <p>Čekaju se ostali igrači da se prijave...</p>
              ) : (
                <p>Potrebno još {minPlayers - playersCount} igrača da se započne</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;