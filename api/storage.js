const fs = require('fs');
const path = require('path');

const LOBBY_PATH = '/tmp/lobby.json';

function readLobby() {
  try {
    if (!fs.existsSync(LOBBY_PATH)) return { players: [], game: null };
    const data = fs.readFileSync(LOBBY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { players: [], game: null };
  }
}

function writeLobby(lobby) {
  fs.writeFileSync(LOBBY_PATH, JSON.stringify(lobby, null, 2));
}

module.exports = { readLobby, writeLobby };