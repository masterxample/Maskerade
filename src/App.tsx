import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, PlayerCardState, ActionKey, RoleKey, PlayerState, CardRevealEvent } from './types';
import { CardDisplay } from './components/CardDisplay';
import { PlayerCard } from './components/PlayerCard';
import { GameActionPanel } from './components/GameActionPanel';
import { PendingBanner } from './components/PendingBanner';
import { AudioController } from './components/AudioController';
import { CardSelectionModal } from './components/CardSelectionModal';
import { CardRevealModal } from './components/CardRevealModal';
import { TurnTimerBar } from './components/TurnTimerBar';
import { GameRulesDrawer } from './components/GameRulesDrawer';
import { ALL_CARD_DEFS, getCardDef } from './data/cards';
import {
  Crown,
  Users,
  UserMinus,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  BookOpen,
  Scroll,
  Sparkles,
  ArrowRight,
  LogOut,
  Play,
  RotateCcw,
  ShieldAlert,
  Info
} from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Game states
  const [view, setView] = useState<'setup' | 'lobby' | 'game'>('setup');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myHand, setMyHand] = useState<PlayerCardState[]>([]);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [gameOverWinner, setGameOverWinner] = useState<string | null>(null);
  const [revealedCardEvent, setRevealedCardEvent] = useState<CardRevealEvent | null>(null);

  // Modal states
  const [loseCardModalList, setLoseCardModalList] = useState<PlayerCardState[] | null>(null);
  const [exchangeModalData, setExchangeModalData] = useState<{
    cards: PlayerCardState[];
    keepCount: number;
  } | null>(null);
  const [inspectCard, setInspectCard] = useState<PlayerCardState | { isHidden: boolean; index?: number } | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);

  // Media (WebRTC Video & Audio)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [speakerEnabled, setSpeakerEnabled] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  // Socket Connection setup
  useEffect(() => {
    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10
    });

    newSocket.on('connect', () => {
      setMyId(newSocket.id || '');
    });

    newSocket.on('joined', ({ code, youAreHost }: { code: string; youAreHost: boolean }) => {
      setRoomCode(code);
      setIsHost(youAreHost);
      setView('lobby');
      setErrorMessage('');
    });

    newSocket.on('errorMsg', (msg: string) => {
      setErrorMessage(msg);
    });

    newSocket.on('roomUpdate', (s: GameState) => {
      setGameState(s);
      setIsHost(s.hostId === newSocket.id);
    });

    newSocket.on('gameStarted', (s: GameState) => {
      setGameState(s);
      setView('game');
      setGameOverWinner(null);
      setGameLogs(prev => ['› Maskerade beginnt! Möge der beste Stratege triumphieren.', ...prev]);
    });

    newSocket.on('gameState', (s: GameState) => {
      setGameState(s);
    });

    newSocket.on('yourHand', (cards: PlayerCardState[]) => {
      setMyHand(cards);
    });

    newSocket.on('cardRevealed', (event: CardRevealEvent) => {
      setRevealedCardEvent(event);
    });

    newSocket.on('log', (msg: string) => {
      setGameLogs(prev => [`› ${msg}`, ...prev.slice(0, 80)]);
    });

    newSocket.on('kickedFromRoom', ({ reason }: { reason: string }) => {
      setView('setup');
      setRoomCode('');
      setGameState(null);
      setMyHand([]);
      setGameLogs([]);
      setErrorMessage(reason || 'Du wurdest vom Spielleiter aus der Lobby entfernt.');
    });

    newSocket.on('gameOver', ({ winnerName }: { winnerName: string | null }) => {
      setGameOverWinner(winnerName || 'Niemand');
    });

    newSocket.on('backToLobby', (s: GameState) => {
      setGameState(s);
      setView('lobby');
      setGameOverWinner(null);
      setMyHand([]);
      setGameLogs([]);
      setLoseCardModalList(null);
      setExchangeModalData(null);
      setRevealedCardEvent(null);
    });

    newSocket.on('chooseLoseCard', (aliveCards: PlayerCardState[]) => {
      setLoseCardModalList(aliveCards);
    });

    newSocket.on('chooseExchange', ({ current, drawn, keepCount }: {
      current: PlayerCardState[];
      drawn: PlayerCardState[];
      keepCount: number;
    }) => {
      setExchangeModalData({
        cards: current.concat(drawn),
        keepCount
      });
    });

    // WebRTC signaling with candidate queueing
    newSocket.on('webrtc-signal', async ({ from, data }: { from: string; data: any }) => {
      let pc = peerConnectionsRef.current[from];
      if (!pc) {
        pc = createPeerConnection(from, false, newSocket);
      }

      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          newSocket.emit('webrtc-signal', { to: from, data: { sdp: pc.localDescription } });
        }
        // Process any queued ICE candidates
        if (pendingCandidatesRef.current[from]) {
          for (const cand of pendingCandidatesRef.current[from]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.error('Queued candidate error:', e);
            }
          }
          delete pendingCandidatesRef.current[from];
        }
      } else if (data.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
          }
        } else {
          if (!pendingCandidatesRef.current[from]) {
            pendingCandidatesRef.current[from] = [];
          }
          pendingCandidatesRef.current[from].push(data.candidate);
        }
      }
    });

    newSocket.on('peerLeft', (peerId: string) => {
      closePeerConnection(peerId);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // WebRTC Peer connection helper
  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean, activeSocket: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    peerConnectionsRef.current[peerId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: remoteStream
        }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        activeSocket.emit('webrtc-signal', {
          to: peerId,
          data: { candidate: event.candidate }
        });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        activeSocket.emit('webrtc-signal', {
          to: peerId,
          data: { sdp: pc.localDescription }
        });
      } catch (e) {
        console.error('Offer creation error:', e);
      }
    };

    if (isInitiator) {
      setTimeout(async () => {
        try {
          if (pc.signalingState === 'stable') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            activeSocket.emit('webrtc-signal', {
              to: peerId,
              data: { sdp: pc.localDescription }
            });
          }
        } catch (e) {
          console.error('Initial offer error:', e);
        }
      }, 100);
    }

    return pc;
  }, []);

  const closePeerConnection = (peerId: string) => {
    const pc = peerConnectionsRef.current[peerId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[peerId];
    }
    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  };

  // Sync peers when players join in lobby or game
  useEffect(() => {
    if (!gameState || !socket) return;

    gameState.players.forEach(p => {
      if (p.id === myId || p.eliminated) return;
      if (!peerConnectionsRef.current[p.id]) {
        if (myId < p.id) {
          createPeerConnection(p.id, true, socket);
        } else {
          createPeerConnection(p.id, false, socket);
        }
      }
    });
  }, [gameState, myId, socket, createPeerConnection]);

  // Push local track updates to all active peers
  const syncLocalTracksToPeers = useCallback((stream: MediaStream | null) => {
    (Object.values(peerConnectionsRef.current) as RTCPeerConnection[]).forEach(pc => {
      const senders = pc.getSenders();
      if (!stream) {
        senders.forEach(sender => pc.removeTrack(sender));
        return;
      }

      // Sync Audio Tracks
      const audioTrack = stream.getAudioTracks()[0] || null;
      const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
      if (audioSender) {
        if (audioTrack) audioSender.replaceTrack(audioTrack);
        else pc.removeTrack(audioSender);
      } else if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      }

      // Sync Video Tracks
      const videoTrack = stream.getVideoTracks()[0] || null;
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        if (videoTrack) videoSender.replaceTrack(videoTrack);
        else pc.removeTrack(videoSender);
      } else if (videoTrack) {
        pc.addTrack(videoTrack, stream);
      }
    });
  }, []);

  // Independent Video / Camera Toggle
  const toggleCamera = async () => {
    if (isCameraActive) {
      // Turn camera OFF
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach(t => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
        const remainingTracks = localStreamRef.current.getTracks();
        if (remainingTracks.length === 0) {
          localStreamRef.current = null;
          setLocalStream(null);
        } else {
          const updated = new MediaStream(remainingTracks);
          localStreamRef.current = updated;
          setLocalStream(updated);
        }
        syncLocalTracksToPeers(localStreamRef.current);
      }
      setIsCameraActive(false);
      return;
    }

    // Turn camera ON
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: false
      });

      const newVideoTrack = videoStream.getVideoTracks()[0];
      if (newVideoTrack) {
        let stream = localStreamRef.current;
        if (!stream) {
          stream = new MediaStream([newVideoTrack]);
        } else {
          stream.addTrack(newVideoTrack);
          stream = new MediaStream(stream.getTracks());
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCameraActive(true);
        syncLocalTracksToPeers(stream);
      }
    } catch (err) {
      console.warn('Video access error, fallback to basic constraints:', err);
      try {
        const videoStreamFallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const newVideoTrack = videoStreamFallback.getVideoTracks()[0];
        if (newVideoTrack) {
          let stream = localStreamRef.current;
          if (!stream) {
            stream = new MediaStream([newVideoTrack]);
          } else {
            stream.addTrack(newVideoTrack);
            stream = new MediaStream(stream.getTracks());
          }
          localStreamRef.current = stream;
          setLocalStream(stream);
          setIsCameraActive(true);
          syncLocalTracksToPeers(stream);
        }
      } catch (err2) {
        console.error('Camera permission denied:', err2);
        alert('Kamera konnte nicht aktiviert werden. Bitte erlaube den Kamera-Zugriff in deinen Browser-Einstellungen.');
      }
    }
  };

  // Independent Microphone Toggle
  const toggleMic = async () => {
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
      return;
    }

    // Microphone not yet requested - get audio stream only
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      const newAudioTrack = audioStream.getAudioTracks()[0];
      if (newAudioTrack) {
        let stream = localStreamRef.current;
        if (!stream) {
          stream = new MediaStream([newAudioTrack]);
        } else {
          stream.addTrack(newAudioTrack);
          stream = new MediaStream(stream.getTracks());
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsMicMuted(false);
        syncLocalTracksToPeers(stream);
      }
    } catch (err) {
      console.error('Microphone permission error:', err);
      alert('Mikrofon konnte nicht aktiviert werden. Bitte erlaube den Mikrofon-Zugriff in deinen Browser-Einstellungen.');
    }
  };

  // Master Speaker Toggle (Lautsprecher an/aus)
  const toggleSpeaker = () => {
    setSpeakerEnabled(prev => !prev);
  };

  // Flip camera front/back on mobile
  const switchFacingMode = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    if (isCameraActive && localStreamRef.current) {
      try {
        const oldVideoTracks = localStreamRef.current.getVideoTracks();
        oldVideoTracks.forEach(t => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: nextFacing }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        const newVideoTrack = newStream.getVideoTracks()[0];

        if (newVideoTrack) {
          localStreamRef.current.addTrack(newVideoTrack);
          const updated = new MediaStream(localStreamRef.current.getTracks());
          localStreamRef.current = updated;
          setLocalStream(updated);
          syncLocalTracksToPeers(updated);
        }
      } catch (e) {
        console.error('Failed to switch camera facing mode:', e);
      }
    }
  };

  // User Actions
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    const name = playerName.trim() || 'Spieler';
    socket.emit('createRoom', { name, maxPlayers });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    const name = playerName.trim() || 'Spieler';
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Bitte gib einen 4-stelligen Raum-Code ein.');
      return;
    }
    socket.emit('joinRoom', { name, code });
  };

  const handleUpdateMaxPlayers = (newMax: number) => {
    if (socket && isHost) {
      socket.emit('updateMaxPlayers', { maxPlayers: newMax });
    }
  };

  const handleKickPlayer = (playerId: string) => {
    if (socket && isHost) {
      socket.emit('kickPlayer', { playerId });
    }
  };

  const handleStartGame = () => {
    if (socket && isHost) {
      socket.emit('startGame');
    }
  };

  const handleDeclareAction = (actionKey: ActionKey, targetId?: string) => {
    if (socket) {
      socket.emit('declareAction', { actionKey, targetId });
    }
  };

  const handlePass = () => socket?.emit('respondPass');
  const handleChallenge = () => socket?.emit('respondChallenge');
  const handleBlock = (role: RoleKey) => socket?.emit('respondBlock', { role });
  const handleBlockPass = () => socket?.emit('blockRespondPass');
  const handleBlockChallenge = () => socket?.emit('blockRespondChallenge');

  const handleConfirmLoseCard = (cardId: string) => {
    if (socket) {
      socket.emit('confirmLoseCard', { cardId });
      setLoseCardModalList(null);
    }
  };

  const handleConfirmExchange = (keepCardIds: string[]) => {
    if (socket) {
      socket.emit('confirmExchange', { keepCardIds });
      setExchangeModalData(null);
    }
  };

  const handleRestartGame = () => {
    if (socket && isHost) {
      socket.emit('returnToLobby');
    }
  };

  const handleStartRematch = () => {
    if (socket && isHost) {
      socket.emit('startRematch');
    }
  };

  // Helper variables for game view
  const myPlayer = gameState?.players.find(p => p.id === myId);
  const currentTurnPlayer = gameState?.started ? gameState.players[gameState.turnIndex] : null;
  const isMyTurn = currentTurnPlayer?.id === myId;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-[#e0e0e0] relative select-none">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#c5a0590c] blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[450px] h-[300px] bg-[#4a3b1d0a] blur-[120px] rounded-full" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 h-16 border-b border-white/5 bg-[#0e0e11]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c5a059] to-[#8a6d3b] flex items-center justify-center shadow-[0_0_12px_rgba(197,160,89,0.3)]">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="font-serif text-lg sm:text-xl font-bold tracking-wider gold-accent flex items-center gap-1.5">
              MASKERADE
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              Spiel der Täuschung & Hofintrigen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Rules / Codex Button */}
          <button
            id="open-rules-btn"
            onClick={() => setIsRulesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer border border-white/10"
            title="Spielregeln & Hofkarten-Übersicht"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" />
            <span className="hidden sm:inline">Codex & Rollen</span>
          </button>

          {/* Room Code Badge */}
          {roomCode && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#c5a05915] border border-[#c5a05944]">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">Raum:</span>
              <span className="font-mono font-bold text-xs gold-accent tracking-widest">{roomCode}</span>
            </div>
          )}

          {/* Leave Button */}
          {view !== 'setup' && (
            <button
              id="leave-room-btn"
              onClick={() => {
                socket?.disconnect();
                window.location.reload();
              }}
              className="p-2 rounded-xl glass hover:bg-red-500/20 hover:text-red-300 text-zinc-400 transition-all cursor-pointer"
              title="Raum verlassen"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ========================================================================= */}
        {/* VIEW 1: SETUP (Create / Join Room) */}
        {/* ========================================================================= */}
        {view === 'setup' && (
          <div className="max-w-md w-full mx-auto my-auto py-8 space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-semibold">
                  Hofprotokoll
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#e0e0e0]">
                  Betrete den Hofstaat
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Wähle deinen Namen für den Maskenball und erstelle einen neuen Salon oder trete einer bestehenden Runde bei.
                </p>
              </div>

              {/* Name input */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Dein Name / Titel
                </label>
                <input
                  id="player-name-input"
                  type="text"
                  placeholder="z. B. Graf Dorian oder Lady Elena"
                  value={playerName}
                  maxLength={20}
                  onChange={e => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#141414] border border-[#2a2a2a] rounded-xl text-[#e0e0e0] placeholder:text-zinc-600 text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
                />
              </div>

              {/* Create Room Box */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-serif font-bold text-sm text-[#e0e0e0]">
                      Neuen Salon eröffnen
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Erstelle einen Raum und lade Mitspieler ein
                    </p>
                  </div>
                  <Users className="w-5 h-5 text-[#c5a059]" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Spieleranzahl</span>
                    <span className="font-mono text-[#c5a059] font-bold">{maxPlayers} Spieler</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={6}
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(parseInt(e.target.value, 10))}
                    className="w-full accent-[#c5a059] cursor-pointer"
                  />
                </div>

                <button
                  id="create-room-btn"
                  onClick={handleCreateRoom}
                  className="w-full py-3.5 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(197,160,89,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Crown className="w-4 h-4" />
                  <span>Salon Erstellen</span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-zinc-600 uppercase tracking-widest font-mono">
                <div className="flex-1 h-px bg-white/10"></div>
                <span>Oder</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              {/* Join Room Box */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Raum-Code (4 Zeichen)
                </label>
                <div className="flex gap-2">
                  <input
                    id="join-code-input"
                    type="text"
                    placeholder="ABCD"
                    value={joinCode}
                    maxLength={4}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2.5 bg-[#141414] border border-[#2a2a2a] rounded-xl text-[#e0e0e0] placeholder:text-zinc-600 text-sm uppercase tracking-widest font-mono focus:outline-none focus:border-[#c5a059] transition-colors"
                  />
                  <button
                    id="join-room-btn"
                    onClick={handleJoinRoom}
                    className="px-5 py-2.5 glass bg-white/5 hover:bg-[#c5a05922] text-[#e0e0e0] hover:text-[#c5a059] font-bold text-xs sm:text-sm rounded-xl border border-[#c5a05944] shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Beitreten</span>
                    <ArrowRight className="w-4 h-4 text-[#c5a059]" />
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: LOBBY */}
        {/* ========================================================================= */}
        {view === 'lobby' && gameState && (
          <div className="max-w-xl w-full mx-auto my-auto py-6 space-y-5">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-semibold">
                  Versammlungssaal
                </span>
                <h2 className="font-serif text-3xl font-bold text-[#e0e0e0]">
                  Lobby
                </h2>
                <p className="text-xs text-zinc-400">
                  Teile diesen Einladungscode mit deinen Hofdamen & Rittern:
                </p>
                <div className="inline-block my-3 px-8 py-3 bg-[#141414] border-2 border-[#c5a059] rounded-2xl shadow-[0_0_16px_rgba(197,160,89,0.25)]">
                  <span className="font-mono text-3xl sm:text-4xl font-bold tracking-[0.2em] gold-accent">
                    {roomCode}
                  </span>
                </div>
              </div>

              {/* Lobby Host: Player Count Adjustment */}
              {isHost && (
                <div className="flex items-center justify-between p-3.5 glass rounded-xl border border-[#c5a05933] bg-[#c5a05908]">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-[#c5a059] flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold text-[#e0e0e0]">Maximale Spieleranzahl</div>
                      <div className="text-[10px] text-zinc-400">Option nur für den Spielleiter</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="decrease-max-players-btn"
                      onClick={() => handleUpdateMaxPlayers(gameState.maxPlayers - 1)}
                      disabled={gameState.maxPlayers <= Math.max(2, gameState.players.length)}
                      className="w-8 h-8 rounded-lg glass border border-[#c5a05944] text-[#c5a059] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#c5a05922] flex items-center justify-center font-bold text-base cursor-pointer active:scale-95 transition-all"
                      title="Spieleranzahl verringern"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#e0e0e0] px-1.5 whitespace-nowrap">
                      {gameState.maxPlayers} Spieler
                    </span>
                    <button
                      id="increase-max-players-btn"
                      onClick={() => handleUpdateMaxPlayers(gameState.maxPlayers + 1)}
                      disabled={gameState.maxPlayers >= 6}
                      className="w-8 h-8 rounded-lg glass border border-[#c5a05944] text-[#c5a059] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#c5a05922] flex items-center justify-center font-bold text-base cursor-pointer active:scale-95 transition-all"
                      title="Spieleranzahl erhöhen"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Player list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-semibold px-2">
                  <span>Anwesende ({gameState.players.length}/{gameState.maxPlayers})</span>
                  <span>Status</span>
                </div>

                <div className="space-y-2">
                  {gameState.players.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3.5 glass rounded-xl border border-white/5 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c5a059] to-[#8a6d3b] flex items-center justify-center font-bold text-xs text-black flex-shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm text-[#e0e0e0] truncate">
                            {p.name}
                          </span>
                          {p.id === gameState.hostId && (
                            <Crown className="w-3.5 h-3.5 text-[#c5a059] flex-shrink-0" title="Spielleiter" />
                          )}
                          {p.id === myId && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#c5a05922] text-[#c5a059] font-bold border border-[#c5a05944] flex-shrink-0">
                              Du
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-emerald-400/90 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Bereit
                        </span>

                        {/* Kick Button for Host (shown for other players) */}
                        {isHost && p.id !== myId && (
                          <button
                            id={`kick-player-${p.id}-btn`}
                            onClick={() => handleKickPlayer(p.id)}
                            className="p-1.5 rounded-lg glass hover:bg-red-500/20 hover:text-red-300 text-zinc-400 border border-red-500/20 hover:border-red-500/50 transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-[11px]"
                            title={`${p.name} aus der Lobby entfernen`}
                          >
                            <UserMinus className="w-3.5 h-3.5 text-red-400" />
                            <span className="hidden sm:inline text-red-400 font-medium">Entfernen</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audio & Video Controller in Lobby */}
              <AudioController
                localStream={localStream}
                remoteStreams={remoteStreams}
                isCameraActive={isCameraActive}
                isMicMuted={isMicMuted}
                speakerEnabled={speakerEnabled}
                onToggleCamera={toggleCamera}
                onToggleMic={toggleMic}
                onToggleSpeaker={toggleSpeaker}
                onSwitchFacingMode={switchFacingMode}
                facingMode={facingMode}
                players={gameState.players}
                myId={myId}
              />

              {/* Host actions */}
              <div className="pt-2">
                {isHost ? (
                  <button
                    id="start-game-btn"
                    onClick={handleStartGame}
                    disabled={gameState.players.length < 2}
                    className="w-full py-4 bg-[#c5a059] hover:bg-[#d4b980] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold uppercase tracking-widest text-sm rounded-xl shadow-[0_0_20px_rgba(197,160,89,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Spiel starten ({gameState.players.length} Spieler)</span>
                  </button>
                ) : (
                  <div className="text-center p-3.5 glass rounded-xl text-xs text-zinc-400 italic">
                    Warten auf den Spielleiter zum Starten des Hofspiels …
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: RUNNING GAME */}
        {/* ========================================================================= */}
        {view === 'game' && gameState && (
          <div className="space-y-4">
            {/* Status Bar */}
            <div className="glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="text-zinc-400">Du:</span>
                  <strong className="text-[#e0e0e0] font-semibold">{myPlayer?.name}</strong>
                  {myPlayer?.position && (
                    <span className="text-[11px] text-[#c5a059] font-mono">
                      [#{myPlayer.position}]
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs font-bold gold-accent bg-[#c5a05915] border border-[#c5a05944] px-3 py-1 rounded-full shadow-[0_0_8px_rgba(197,160,89,0.15)]">
                  💰 {myPlayer?.coins} {myPlayer?.coins === 1 ? 'Münze' : 'Münzen'}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-zinc-400">Am Zug:</span>
                <span className="font-bold gold-accent font-serif tracking-wide">
                  {currentTurnPlayer ? `Nr. ${currentTurnPlayer.position}: ${currentTurnPlayer.name}${currentTurnPlayer.id === myId ? ' (Du)' : ''}` : '-'}
                </span>
              </div>
            </div>

            {/* Turn & Action Countdown Timer (30s auto-pass / einkommen) */}
            <TurnTimerBar
              turnDeadline={gameState.turnDeadline}
              totalSeconds={30}
              label={
                gameState.pending
                  ? 'Reaktionszeit (Stillschweigen bei Ablauf)'
                  : isMyTurn
                  ? 'Deine Zugzeit (Autom. Einkommen bei 0s)'
                  : `Zugzeit von ${currentTurnPlayer?.name}`
              }
            />

            {/* Sound & Video Controller */}
            <AudioController
              localStream={localStream}
              remoteStreams={remoteStreams}
              isCameraActive={isCameraActive}
              isMicMuted={isMicMuted}
              speakerEnabled={speakerEnabled}
              onToggleCamera={toggleCamera}
              onToggleMic={toggleMic}
              onToggleSpeaker={toggleSpeaker}
              onSwitchFacingMode={switchFacingMode}
              facingMode={facingMode}
              players={gameState.players}
              myId={myId}
            />

            {/* Pending Phase (Claims, Challenges, Blocks) */}
            {gameState.pending && (
              <PendingBanner
                id="pending-banner"
                pending={gameState.pending}
                players={gameState.players}
                myId={myId}
                onPass={handlePass}
                onChallenge={handleChallenge}
                onBlock={handleBlock}
                onBlockPass={handleBlockPass}
                onBlockChallenge={handleBlockChallenge}
              />
            )}

            {/* Main Game Grid: Left Game Area, Right Logs & Quick Reference */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column (2 cols wide): Actions and Player Seats */}
              <div className="lg:col-span-2 space-y-4">
                {/* Actions Panel */}
                <GameActionPanel
                  id="action-panel"
                  myCoins={myPlayer?.coins || 0}
                  myHand={myHand}
                  players={gameState.players}
                  myId={myId}
                  isMyTurn={isMyTurn}
                  isPending={!!gameState.pending}
                  onDeclareAction={handleDeclareAction}
                />

                {/* Players Grid with embedded cards */}
                <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#c5a059]" />
                      <h2 className="font-serif text-base font-bold text-[#e0e0e0]">
                        Mitwirkende & Hofeinfluss
                      </h2>
                    </div>
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                      Tippe auf eine Karte für Details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {gameState.players.map(p => (
                      <PlayerCard
                        key={p.id}
                        id={`player-card-${p.id}`}
                        player={p}
                        isSelf={p.id === myId}
                        isCurrentTurn={currentTurnPlayer?.id === p.id}
                        myHand={p.id === myId ? myHand : undefined}
                        stream={p.id === myId ? localStream : remoteStreams[p.id]}
                        isHost={p.id === gameState.hostId}
                        onCardClick={(card) => setInspectCard(card as any)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column (1 col wide): Game Logs & Info */}
              <div className="space-y-4">
                {/* Live Game Log */}
                <div className="glass-panel rounded-2xl p-4 flex flex-col h-96">
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/5">
                    <Scroll className="w-4 h-4 text-[#c5a059]" />
                    <h3 className="font-serif text-sm font-bold text-[#e0e0e0]">
                      Spielprotokoll
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] text-zinc-400 pr-1">
                    {gameLogs.map((log, i) => (
                      <div key={i} className="leading-snug">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-12 px-4 sm:px-8 flex items-center justify-between border-t border-white/5 text-[10px] uppercase tracking-[0.25em] opacity-40 max-w-6xl mx-auto w-full">
        <span>Maskerade • Sophisticated Dark</span>
        <span>Peer Audio/Video Synchronisiert</span>
      </footer>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Card Reveal Announcement Modal (Broadcasting revealed/lost cards to all players) */}
      <CardRevealModal
        revealEvent={revealedCardEvent}
        onClose={() => setRevealedCardEvent(null)}
      />

      {/* Lose Influence Modal */}
      {loseCardModalList && (
        <CardSelectionModal
          type="loseInfluence"
          cards={loseCardModalList}
          onConfirmLoseCard={handleConfirmLoseCard}
        />
      )}

      {/* Exchange Cards Modal */}
      {exchangeModalData && (
        <CardSelectionModal
          type="exchange"
          cards={exchangeModalData.cards}
          keepCount={exchangeModalData.keepCount}
          onConfirmExchange={handleConfirmExchange}
        />
      )}

      {/* Card Inspection Modal */}
      {inspectCard && (
        <CardSelectionModal
          type="inspect"
          inspectCard={inspectCard}
          onCloseInspect={() => setInspectCard(null)}
        />
      )}

      {/* Game Rules & Cards Reference Drawer */}
      <GameRulesDrawer
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Game Over Modal */}
      {gameOverWinner && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border-2 border-[#c5a059] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(197,160,89,0.3)] text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#c5a05922] border-2 border-[#c5a059] flex items-center justify-center text-[#c5a059] mx-auto shadow-[0_0_20px_rgba(197,160,89,0.4)]">
              <Crown className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-semibold">
                Siegerehrung
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#e0e0e0]">
                {gameOverWinner} triumphiert!
              </h2>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Alle anderen Mitspieler haben ihren Hofeinfluss verloren. Der Maskenball hat seinen einzig wahren Herrscher gefunden.
            </p>

            {/* End of Game Options: Option 1 (Zurück zur Lobby) & Option 2 (Direkt erneutes Spiel starten) */}
            {isHost ? (
              <div className="space-y-2.5 pt-2">
                {/* Option 2: Direkt erneutes Spiel starten */}
                <button
                  id="direct-rematch-btn"
                  onClick={handleStartRematch}
                  className="w-full py-3.5 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-[0_0_25px_rgba(197,160,89,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer border border-[#e5c985]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Direkt erneutes Spiel starten</span>
                </button>

                {/* Option 1: Zurück in die Lobby */}
                <button
                  id="restart-lobby-btn"
                  onClick={handleRestartGame}
                  className="w-full py-3 glass border border-[#c5a05955] text-[#c5a059] hover:bg-[#c5a05918] hover:text-[#d4b980] font-semibold uppercase tracking-wider text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Zurück in die Lobby</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-[#c5a05912] border border-[#c5a05933] text-xs text-[#c5a059] flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4 animate-spin flex-shrink-0" style={{ animationDuration: '4s' }} />
                  <span>Warte auf den Spielleiter (Neues Spiel oder Lobby) …</span>
                </div>
                <button
                  id="leave-gameover-btn"
                  onClick={() => {
                    socket?.disconnect();
                    window.location.reload();
                  }}
                  className="w-full py-2.5 glass text-zinc-400 hover:text-white border border-white/10 text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Hauptmenü / Spiel verlassen</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
