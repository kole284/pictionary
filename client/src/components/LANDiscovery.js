import React, { useState, useEffect, useRef } from 'react';

const LANDiscovery = ({ onServerFound }) => {
  const [discoveredServers, setDiscoveredServers] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    startDiscovery();
    return () => {
      stopDiscovery();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startDiscovery = () => {
    try {
      // Create a simple UDP-like discovery using WebRTC or WebSocket fallback
      // Since browsers can't do UDP directly, we'll use a different approach
      
      setIsScanning(true);
      setError('');
      
      // Scan common local network addresses
      scanLocalNetwork();
      
      // Set up periodic scanning
      scanIntervalRef.current = setInterval(() => {
        scanLocalNetwork();
      }, 10000); // Scan every 10 seconds
      
    } catch (error) {
      console.error('LAN Discovery error:', error);
      setError('Failed to start LAN discovery');
      setIsScanning(false);
    }
  };

  const stopDiscovery = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  const scanLocalNetwork = async () => {
    const commonPorts = [5000, 3000, 8080];
    const localIPs = getLocalIPRanges();
    
    for (const ipRange of localIPs) {
      for (let i = 1; i <= 254; i++) {
        const ip = `${ipRange}${i}`;
        
        for (const port of commonPorts) {
          try {
            const response = await checkServer(ip, port);
            if (response) {
              addDiscoveredServer(ip, port, response);
            }
          } catch (error) {
            // Server not found or not responding
          }
        }
      }
    }
  };

  const getLocalIPRanges = () => {
    // Common local network ranges
    return [
      '192.168.1.',
      '192.168.0.',
      '10.0.0.',
      '10.0.1.',
      '172.16.0.',
      '172.17.0.',
      '172.18.0.',
      '172.19.0.',
      '172.20.0.',
      '172.21.0.',
      '172.22.0.',
      '172.23.0.',
      '172.24.0.',
      '172.25.0.',
      '172.26.0.',
      '172.27.0.',
      '172.28.0.',
      '172.29.0.',
      '172.30.0.',
      '172.31.0.'
    ];
  };

  const checkServer = async (ip, port) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 1000);

      fetch(`http://${ip}:${port}/api/health`, {
        method: 'GET',
        mode: 'no-cors'
      })
      .then(() => {
        clearTimeout(timeout);
        resolve({ ip, port, status: 'online' });
      })
      .catch(() => {
        clearTimeout(timeout);
        reject(new Error('Server not found'));
      });
    });
  };

  const addDiscoveredServer = (ip, port, info) => {
    setDiscoveredServers(prev => {
      const serverId = `${ip}:${port}`;
      const existing = prev.find(s => s.id === serverId);
      
      if (!existing) {
        const newServer = {
          id: serverId,
          ip,
          port,
          name: `Pictionary Server (${ip})`,
          lastSeen: Date.now(),
          ...info
        };
        
        return [...prev, newServer];
      } else {
        // Update last seen
        return prev.map(s => 
          s.id === serverId 
            ? { ...s, lastSeen: Date.now() }
            : s
        );
      }
    });
  };

  const connectToServer = (server) => {
    if (onServerFound) {
      onServerFound(`http://${server.ip}:${server.port}`);
    }
  };

  const refreshScan = () => {
    setDiscoveredServers([]);
    scanLocalNetwork();
  };

  return (
    <div className="lan-discovery">
      <div className="discovery-header">
        <h3>🌐 LAN Discovery</h3>
        <div className="discovery-controls">
          <button 
            className={`btn ${isScanning ? 'btn-secondary' : 'btn-primary'}`}
            onClick={isScanning ? stopDiscovery : startDiscovery}
          >
            {isScanning ? '🛑 Stop Scanning' : '🔍 Start Scanning'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={refreshScan}
            disabled={!isScanning}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {isScanning && (
        <div className="scanning-status">
          🔍 Scanning local network for Pictionary servers...
        </div>
      )}

      <div className="discovered-servers">
        {discoveredServers.length === 0 ? (
          <div className="no-servers">
            {isScanning ? (
              <p>🔍 Scanning for servers on your local network...</p>
            ) : (
              <p>📡 No servers found. Start scanning to discover local games.</p>
            )}
          </div>
        ) : (
          <>
            <h4>🎮 Available Servers ({discoveredServers.length})</h4>
            <div className="server-list">
              {discoveredServers.map(server => (
                <div key={server.id} className="server-item">
                  <div className="server-info">
                    <div className="server-name">{server.name}</div>
                    <div className="server-address">{server.ip}:{server.port}</div>
                    <div className="server-status">
                      🟢 Online (last seen: {new Date(server.lastSeen).toLocaleTimeString()})
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => connectToServer(server)}
                  >
                    🎮 Join Game
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="discovery-info">
        <p>
          <strong>💡 How it works:</strong> This feature automatically scans your local network 
          for other Pictionary servers. Make sure all devices are connected to the same WiFi network.
        </p>
      </div>
    </div>
  );
};

export default LANDiscovery; 