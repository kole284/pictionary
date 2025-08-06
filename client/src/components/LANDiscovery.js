import React from 'react';

const LANDiscovery = () => (
  <div className="lan-discovery">
    <div className="vercel-info">
      <div className="info-card">
        <h4>🌐 Multiplayer (Firebase)</h4>
        <p>LAN discovery is not needed. All players automatically connect via Firebase Realtime Database.</p>
        <p>Just share the game link with your friends!</p>
        <div className="vercel-features">
          <div className="feature">✅ Works worldwide</div>
          <div className="feature">✅ No local network required</div>
          <div className="feature">✅ Real-time sync</div>
          <div className="feature">✅ Share via link</div>
        </div>
      </div>
    </div>
  </div>
);

export default LANDiscovery; 