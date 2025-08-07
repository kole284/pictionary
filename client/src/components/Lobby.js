import React from 'react';

const Lobby = ({ players, onStartGame, isHost, gameId }) => {
  const minPlayers = 2;
  const playersCount = players ? players.length : 0;
  const canStart = playersCount >= minPlayers;

  return (
    <div className="lobby">
   

      <div className="lobby-content">   
      
        <div className="players-section">  
          <div className="lobby-header">
            <h1>🎨 Pictionary Lobby</h1>
            <p>Čekaju se igrači da se prijave...</p>
          </div>
          <h2>Igrači ({playersCount}/{minPlayers})</h2>
          <div className="players-list-lobby">
            {players && players.map((player, index) => (
              <div key={player.playerId} className="player-item">
                <span className="player-number">{index + 1}</span>
                <span className="player-name">{player.name}</span>
                {/* Prikazati ikonicu za hosta samo ako je igrač host */}
                {isHost && index === 0 && <span className="host-badge">👑 Host</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-info">
          {/* Nova sekcija za prikaz ID-a igre */}
          <div className="info-card">
            <h3>Kod za ulazak u igru</h3>
            <p>Podelite ovaj kod sa prijateljima da bi se pridružili igri:</p>
            <div className="game-id-display">
              <strong>{gameId}</strong>
            </div>
          </div>
          
          {/* Postojeći deo sa pravilima */}
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