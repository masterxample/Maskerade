const fs = require('fs');

['src/components/PlayerCard.tsx', 'src/components/LobbyVideoTile.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(
    /const isVideoAvailable = isSelf \? \(hasVideo \|\| !!videoTrack\) : \(!!videoTrack \|\| hasVideo\);/g,
    `const isVideoAvailable = isSelf ? (hasVideo || !!videoTrack) : (hasVideo && !!videoTrack);`
  );
  fs.writeFileSync(file, code);
});
