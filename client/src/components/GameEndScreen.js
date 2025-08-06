import React, { useEffect, useState } from 'react';
import { ref as dbRef, onValue } from 'firebase/database';
import { db } from '../firebase';

// Dodat gameId kao prop
const GameEndScreen = ({ onPlayAgain, gameId }) => {
    const [players, setPlayers] = useState({});
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        if (!gameId) return;

        // Ažurirane reference ka novoj strukturi
        const gameRef = dbRef(db, `games/${gameId}/gameState`);
        const playersRef = dbRef(db, `games/${gameId}/players`);

        const unsubGame = onValue(gameRef, (snapshot) => {
            setGameState(snapshot.val());
        });
        const unsubPlayers = onValue(playersRef, (snapshot) => {
            setPlayers(snapshot.val() || {});
        });

        return () => {
            unsubGame();
            unsubPlayers();
        };
    }, [gameId]); // Zavisnost od gameId

    if (!gameState || !gameState.winner) {
        return (
            <div className="container">
                <div className="loading">Čekajte rezultate...</div>
            </div>
        );
    }
    
    // Transformacija objekta igrača u niz da bi se sortiranje i prikaz
    const finalScores = Object.values(players || {}).sort((a, b) => b.points - a.points);
    const winner = finalScores[0] || null;

    return (
        <div className="container game-end-screen">
            <div className="game-info">
                <h1 className="game-title">🏆 Kraj igre!</h1>
                <p className="game-subtitle">Rezultati</p>
            </div>

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '15px',
                    textAlign: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ marginBottom: '10px' }}>🎉 Pobednik!</h2>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {winner.name}
                    </div>
                    <div style={{ fontSize: '18px', marginTop: '5px' }}>
                        {winner.points} poena
                    </div>
                </div>

                <h3 style={{ marginBottom: '15px', color: '#333' }}>Konačni rezultati</h3>
                
                {finalScores.map((player, index) => (
                    <div
                        key={player.playerId}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: index < finalScores.length - 1 ? '1px solid #f0f0f0' : 'none',
                            background: index === 0 ? '#fff3cd' : 'transparent',
                            borderRadius: index === 0 ? '8px' : '0',
                            paddingLeft: index === 0 ? '10px' : '0',
                            paddingRight: index === 0 ? '10px' : '0'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ 
                                marginRight: '10px', 
                                fontSize: '18px',
                                color: index === 0 ? '#FFD700' : '#666'
                            }}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                            </span>
                            <span style={{ 
                                fontWeight: index === 0 ? 'bold' : 'normal',
                                color: index === 0 ? '#333' : '#666'
                            }}>
                                {player.name}
                            </span>
                        </div>
                        <span style={{ 
                            fontWeight: 'bold',
                            color: index === 0 ? '#FFD700' : '#667eea'
                        }}>
                            {player.points} pts
                        </span>
                    </div>
                ))}

                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button
                        onClick={onPlayAgain}
                        className="btn"
                        style={{ fontSize: '18px', padding: '15px 30px' }}
                    >
                        🎮 Ponovi igru
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameEndScreen;