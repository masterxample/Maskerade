const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /\/\/ Sync camera to peers when stream changes/g,
  `useEffect(() => {
    if (socket && gameState?.players) {
      socket.emit('media-status', { hasVideo: isCameraActive, hasAudio: !isMicMuted, isSpeaking: false });
    }
  }, [gameState?.players?.length, socket, isCameraActive, isMicMuted]);

  // Sync camera to peers when stream changes`
);

fs.writeFileSync('src/App.tsx', code);
