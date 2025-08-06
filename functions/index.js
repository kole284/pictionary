/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.database();

// 1. onGuess - kada neko pošalje poruku u chat
exports.onGuess = functions.database.ref('/chat/{msgId}').onCreate(async (snapshot, context) => {
  const msg = snapshot.val();
  const gameStateSnap = await db.ref('/gameState').once('value');
  const gameState = gameStateSnap.val();
  if (!gameState || !gameState.currentWord) return null;

  if (msg.message.trim().toLowerCase() === gameState.currentWord.trim().toLowerCase()) {
    // Tačan odgovor!
    // Povećaj poene
    const playerRef = db.ref(`/players/${msg.playerId}`);
    const playerSnap = await playerRef.once('value');
    const player = playerSnap.val();
    if (player) {
      await playerRef.update({ score: (player.score || 0) + 10 });
    }
    // Sledeća runda
    return db.ref('/gameState').update({ roundNumber: gameState.roundNumber + 1 });
  }
  return null;
});

// 2. onRoundStart - pokreće se kada se roundNumber promeni
exports.onRoundStart = functions.database.ref('/gameState/roundNumber').onWrite(async (change, context) => {
  const wordsSnap = await db.ref('/words').once('value');
  const words = wordsSnap.val() || [];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  await db.ref('/gameState/currentWord').set(randomWord);
  await db.ref('/gameState/timeLeft').set(90);
  // Očisti drawingHistory i chat
  await db.ref('/drawingHistory').set([]);
  await db.ref('/chat').set([]);
  return null;
});

// 3. onTimerEnd - pokreće se kada timeLeft dođe do 0
exports.onTimerEnd = functions.database.ref('/gameState/timeLeft').onUpdate(async (change, context) => {
  const after = change.after.val();
  if (after === 0) {
    // Sledeća runda
    const gameStateSnap = await db.ref('/gameState').once('value');
    const gameState = gameStateSnap.val();
    await db.ref('/gameState/roundNumber').set((gameState.roundNumber || 0) + 1);
  }
  return null;
});
