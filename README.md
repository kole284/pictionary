# 🎨 Pictionary Multiplayer Game (Firebase Edition)

A real-time multiplayer drawing game built with React and Firebase Realtime Database.

## 🚀 Features
- Real-time drawing and chat using Firebase
- Player management and scoring in Firebase
- Game state and rounds managed in Firebase
- Cloud Functions for game logic (guessing, round start, timer)

## 🛠️ Technology Stack
- **Frontend:** React + Firebase SDK
- **Backend:** Firebase Realtime Database + Cloud Functions

## 📋 Prerequisites
- Node.js (v14+)
- npm
- Firebase project (with Realtime Database enabled)

## 🚀 Installation & Setup
1. Clone/download the project
2. Run `npm install` in the root and `client` folder
3. Add your Firebase config to `client/src/firebase.js`
4. Deploy Cloud Functions: `cd functions && npm install && firebase deploy --only functions`
5. Start the client: `cd client && npm start`

## 🔗 Firebase Database Structure
```
/gameState: { currentDrawer, currentWord, roundNumber, timeLeft, ... }
/players: { [playerId]: { name, score, isDrawing, ... } }
/drawingHistory: [ { x, y, ... } ]
/chat: [ { playerId, message, timestamp } ]
/words: [ "banana", "auto", ... ]
```

## 🎮 How to Play
- Enter your name and join the game
- Draw or guess the word in real-time
- All actions are synced via Firebase

## 🧑‍💻 Development
- All game state is managed in Firebase
- Cloud Functions handle round logic and scoring

## 📝 License
MIT 