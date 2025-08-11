const Timer = ({ timeLeft }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 10) return '#ff6b6b';
    if (timeLeft <= 30) return '#ffa726';
    return '#667eea';
  };

  return (
    <div className="timer" style={{ color: getTimerColor() }}>
      ⏱️ {formatTime(timeLeft)}
    </div>
  );
};

export default Timer; 