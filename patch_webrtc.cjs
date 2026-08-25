const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/const syncLocalTracksToPeers = useCallback\(\(stream: MediaStream \| null\) => \{[\s\S]*?\} catch \(err\) \{\n        console\.warn\('WebRTC track sync error:', err\);\n      \}\n    \}\);\n  \}, \[socket\]\);/, `const syncLocalTracksToPeers = useCallback((stream: MediaStream | null) => {
    const audioTrack = stream?.getAudioTracks().find(t => t.readyState === 'live') || null;
    const videoTrack = stream?.getVideoTracks().find(t => t.readyState === 'live' && t.enabled) || null;

    (Object.entries(peerConnectionsRef.current) as [string, RTCPeerConnection][]).forEach(async ([peerId, pc]) => {
      try {
        const senders = pc.getSenders();
        const audioSender = senders.find(s => s.track?.kind === 'audio');
        const videoSender = senders.find(s => s.track?.kind === 'video');

        let requiresNegotiation = false;

        if (audioTrack) {
          if (audioSender && audioSender.track !== audioTrack) {
            await audioSender.replaceTrack(audioTrack);
          } else if (!audioSender) {
            pc.addTrack(audioTrack, stream!);
            requiresNegotiation = true;
          }
        } else if (audioSender) {
          pc.removeTrack(audioSender);
          requiresNegotiation = true;
        }

        if (videoTrack) {
          if (videoSender && videoSender.track !== videoTrack) {
            await videoSender.replaceTrack(videoTrack);
          } else if (!videoSender) {
            pc.addTrack(videoTrack, stream!);
            requiresNegotiation = true;
          }
        } else if (videoSender) {
          pc.removeTrack(videoSender);
          requiresNegotiation = true;
        }

        if (requiresNegotiation && pc.signalingState === 'stable' && socket) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-signal', {
            to: peerId,
            data: { sdp: pc.localDescription }
          });
        }
      } catch (err) {
        console.warn('WebRTC track sync error:', err);
      }
    });
  }, [socket]);`);

fs.writeFileSync('src/App.tsx', code);
