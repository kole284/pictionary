# 🎨 Pictionary Multiplayer Game

A real-time multiplayer drawing game built with React, Node.js, and Socket.IO.

## 🚀 Features

- **Real-time drawing**: Draw on a shared canvas that syncs across all players
- **Word guessing**: Players guess the word being drawn by the current drawer
- **Live chat**: Communicate with other players during the game
- **Score tracking**: Points awarded for correct guesses and successful drawings
- **Timer system**: 90-second rounds with countdown timer
- **Player management**: See all players and their scores in real-time
- **Responsive design**: Works on desktop and mobile devices

## 🛠️ Technology Stack

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **CORS** - Cross-origin resource sharing

### Frontend
- **React** - UI framework
- **Socket.IO Client** - Real-time client communication
- **HTML5 Canvas** - Drawing functionality
- **CSS3** - Styling and animations

## 📋 Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## 🚀 Installation & Setup

### Za lokalnu igru (samo ti)

1. **Clone or download the project**
   ```bash
   # If you have the files locally, navigate to the project directory
   cd pictionary-multiplayer
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (server + client)
   npm run install-all
   ```

3. **Start the development servers**
   ```bash
   # Start both server and client (recommended)
   npm run dev
   ```

4. **Open your browser**
   - Open `http://localhost:3000` in your browser

### Za LAN igru (više igrača na istoj WiFi mreži)

🎮 **Automatski LAN Discovery** - Kao Minecraft!

Aplikacija automatski prepoznaje druge servere na istoj mreži i omogućava direktno povezivanje.

**Kako koristiti:**
1. Pokreni server na jednom uređaju: `npm run lan`
2. Ostali igrači otvaraju aplikaciju u browseru
3. Klikni "🌐 Find Local Games" na login ekranu
4. Aplikacija će automatski pronaći dostupne servere
5. Klikni "🎮 Join Game" da se povežeš

**Prednosti:**
- ✅ Automatsko prepoznavanje servera
- ✅ Nema potrebe za ručnim unosom IP adresa
- ✅ Radi na svim uređajima (desktop, tablet, mobilni)
- ✅ Niska latencija (lokalna mreža)
- ✅ Bezbedno (samo lokalna mreža)

## 🎮 How to Play

1. **Join the game**
   - Enter your name and click "Join Game"
   - Wait for at least 2 players to join

2. **Game rounds**
   - Each round lasts 90 seconds
   - One player is randomly selected to draw
   - The drawer receives a word to draw
   - Other players try to guess the word

3. **Drawing**
   - Use your mouse to draw on the canvas
   - Choose colors and brush sizes
   - Click "Clear" to start over

4. **Guessing**
   - Type your guesses in the chat
   - Correct guesses earn 10 points
   - The drawer gets 5 bonus points for successful drawings

5. **Scoring**
   - Correct guess: +10 points
   - Successful drawing: +5 points
   - Game ends after 5 rounds

## 🏗️ Project Structure

```
pictionary-multiplayer/
├── server/
│   └── index.js          # Main server file
├── client/
│   ├── public/
│   │   └── index.html    # HTML template
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── LoginScreen.js
│   │   │   ├── GameScreen.js
│   │   │   ├── DrawingCanvas.js
│   │   │   ├── Chat.js
│   │   │   ├── PlayerList.js
│   │   │   ├── Timer.js
│   │   │   └── GameEndScreen.js
│   │   ├── App.js        # Main React component
│   │   ├── index.js      # React entry point
│   │   └── index.css     # Global styles
│   └── package.json      # Client dependencies
├── package.json          # Server dependencies
└── README.md            # This file
```

## 🔧 Configuration

### Server Configuration
- **Port**: Default is 5000, can be changed via `PORT` environment variable
- **CORS**: Configured to allow connections from `http://localhost:3000`
- **Game settings**: 
  - Round time: 90 seconds
  - Max rounds: 5
  - Minimum players: 2

### Client Configuration
- **Server URL**: Configured to connect to `http://localhost:5000`
- **Canvas size**: 600x400 pixels
- **Responsive design**: Adapts to different screen sizes

## 🎯 Game Rules

1. **Player Limit**: Minimum 2 players, no maximum
2. **Round Duration**: 90 seconds per round
3. **Drawing**: Only the selected player can draw
4. **Guessing**: All other players can guess via chat
5. **Scoring**: 
   - Correct guess: 10 points
   - Successful drawing: 5 bonus points
6. **Game End**: After 5 rounds, player with highest score wins

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 5000
   lsof -ti:5000 | xargs kill -9
   
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Socket connection errors**
   - Check if server is running on port 5000
   - Ensure CORS is properly configured
   - Check browser console for errors

3. **Drawing not working**
   - Ensure you're the current drawer
   - Check if canvas is properly initialized
   - Try refreshing the page

4. **Players not joining**
   - Check server logs for connection errors
   - Ensure all players are on the same network
   - Verify firewall settings

### Development Tips

- Use browser developer tools to debug
- Check server console for connection logs
- Monitor Socket.IO events in browser console
- Test with multiple browser tabs/windows

## 🚀 Deployment

### Local Network
To play with friends on the same network:

1. Find your local IP address
2. Update `SOCKET_URL` in `client/src/App.js`
3. Share the local IP with friends

### Production Deployment
For production deployment:

1. Build the client:
   ```bash
   cd client
   npm run build
   ```

2. Set up environment variables:
   ```bash
   PORT=5000
   NODE_ENV=production
   ```

3. Deploy to your preferred hosting service (Heroku, Vercel, etc.)

## 🤝 Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Improving the UI/UX
- Adding new words to the game

## 📝 License

This project is open source and available under the MIT License.

## 🎉 Enjoy Playing!

Have fun playing Pictionary with your friends! 🎨✨ 