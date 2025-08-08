const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.database();

exports.onGuess = functions.database.ref('/chat/{msgId}').onCreate(async (snapshot) => {
  const msg = snapshot.val();
  const gameStateSnap = await db.ref('/gameState').once('value');
  const gameState = gameStateSnap.val();
  if (!gameState || !gameState.currentWord) return null;

  if (msg.message.trim().toLowerCase() === gameState.currentWord.trim().toLowerCase()) {

    const playerRef = db.ref(`/players/${msg.playerId}`);
    const playerSnap = await playerRef.once('value');
    const player = playerSnap.val();
    if (player) {
      await playerRef.update({ score: (player.score || 0) + 10 });
    }
    return db.ref('/gameState').update({ roundNumber: gameState.roundNumber + 1 });
  }
  return null;
});

exports.onRoundStart = functions.database.ref('/gameState/roundNumber').onWrite(async () => {
  const wordsSnap = await db.ref('/words').once('value');
  const words = wordsSnap.val() || [];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  await db.ref('/gameState/currentWord').set(randomWord);
  await db.ref('/gameState/timeLeft').set(90);

  await db.ref('/drawingHistory').set([]);
  await db.ref('/chat').set([]);
  return null;
});

exports.onTimerEnd = functions.database.ref('/gameState/timeLeft').onUpdate(async (change) => {
  const after = change.after.val();
  if (after === 0) {
    const gameStateSnap = await db.ref('/gameState').once('value');
    const gameState = gameStateSnap.val();
    await db.ref('/gameState/roundNumber').set((gameState.roundNumber || 0) + 1);
  }
  return null;
});
