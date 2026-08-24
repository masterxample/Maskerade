import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, PlayerCardState, ActionKey, RoleKey, PlayerState } from './types';
import { CardDisplay } from './components/CardDisplay';
import { PlayerCard } from './components/PlayerCard';
import { GameActionPanel } from './components/GameActionPanel';
import { PendingBanner } from './components/PendingBanner';
import { AudioController } from './components/AudioController';
import { CardSelectionModal } from './components/CardSelectionModal';
import { GameRulesDrawer } from './components/GameRulesDrawer';
import { ALL_CARD_DEFS, getCardDef } from './data/cards';
import {
  Crown,
  Users,
  Video,
  VideoOff,
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
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  // Socket Connection setup
  useEffect(() => {
    const newSocket = io({
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setMyId(newSocket.id || '');
    });

    newSocket.on('joined', ({ code, youAreHost }: { code: string; youAreHost: boolean }) => {
      setRoomCode(code);
      setIsHost(youAreHost);
      setErrorMessage('');
      setView('lobby');
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

    newSocket.on('log', (msg: string) => {
      setGameLogs(prev => [`› ${msg}`, ...prev.slice(0, 80)]);
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

    // WebRTC signaling
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
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
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
        { urls: 'stun:stun1.l.google.com:19302' }
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

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          activeSocket.emit('webrtc-signal', {
            to: peerId,
            data: { sdp: pc.localDescription }
          });
        } catch (e) {
          console.error('Offer creation error:', e);
        }
      };
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

  // Sync peers when players join
  useEffect(() => {
    if (!isCameraActive || !gameState || !socket) return;

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
  }, [gameState, isCameraActive, myId, socket, createPeerConnection]);

  // Media Toggle (Camera & Mic)
  const toggleCameraAndMic = async () => {
    if (isCameraActive) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      localStreamRef.current = null;
      setLocalStream(null);
      setIsCameraActive(false);

      Object.keys(peerConnectionsRef.current).forEach(closePeerConnection);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCameraActive(true);
      setIsMicMuted(false);

      // Add tracks to existing peer connections
      (Object.values(peerConnectionsRef.current) as RTCPeerConnection[]).forEach(pc => {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      });
    } catch (err: any) {
      console.error('Media stream error:', err);
      alert('Kamera/Mikrofon konnte nicht aktiviert werden. Bitte Berechtigungen im Browser prüfen.');
    }
  };

  const toggleMicMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
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
      socket.emit('restartGame');
    }
  };

  // Helper values
  const myPlayer = gameState?.players.find(p => p.id === myId);
  const currentTurnPlayer = gameState ? gameState.players[gameState.turnIndex] : null;
  const isMyTurn = currentTurnPlayer?.id === myId && !gameState?.pending;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#e0e0e0] flex flex-col font-sans selection:bg-[#c5a059]/30 selection:text-[#c5a059]">
      {/* Top Navigation - Sophisticated Dark */}
      <header className="w-full h-18 sm:h-20 flex items-center justify-between px-4 sm:px-8 border-b border-[#c5a05933] bg-[#0d0d0d]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#c5a059] to-[#8a6d3b] flex items-center justify-center text-black font-serif font-bold text-lg sm:text-xl shadow-[0_0_12px_rgba(197,160,89,0.3)] select-none">
            M
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl sm:text-3xl font-serif tracking-[0.2em] gold-accent font-bold">
                MASKERADE
              </h1>
              <span className="hidden md:inline text-[10px] uppercase tracking-wider opacity-40">
                Edition Royale
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-[#c5a059]/70 font-medium">
              Bluffen · Täuschen · Überleben
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {roomCode && (
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[9px] uppercase tracking-widest opacity-50">Raum-Code</span>
              <span className="font-mono gold-accent font-bold text-sm tracking-wider">#{roomCode}</span>
            </div>
          )}

          <button
            id="rules-toggle-btn"
            onClick={() => setIsRulesOpen(true)}
            className="speaker-btn px-3.5 py-2 rounded-full glass text-xs font-semibold gold-accent flex items-center gap-2 border border-[#c5a05944] hover:bg-[#c5a05915] transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#c5a059]" />
            <span className="hidden sm:inline">Regeln & Karten</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto flex-1 flex flex-col p-3 sm:p-6">
        {/* ========================================================================= */}
        {/* VIEW 1: SETUP / LOGIN (NO "Spiel betreten oder Raum erstellen" HEADING) */}
        {/* ========================================================================= */}
        {view === 'setup' && (
          <div className="max-w-md w-full mx-auto my-auto py-8">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#c5a059] uppercase tracking-[0.15em] block">
                  Dein Spielername
                </label>
                <input
                  id="player-name-input"
                  type="text"
                  placeholder="Z.B. Baron von Münchhausen"
                  maxLength={20}
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#141414] border border-[#2a2a2a] rounded-xl text-[#e0e0e0] placeholder:text-zinc-600 text-sm focus:outline-none focus:border-[#c5a059] transition-colors"
                />
              </div>

              {/* Create Room Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold gold-accent font-serif">
                  <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>Neuen Raum eröffnen</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    id="max-players-select"
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(parseInt(e.target.value, 10))}
                    className="px-3.5 py-3 bg-[#141414] border border-[#2a2a2a] rounded-xl text-xs text-[#e0e0e0] focus:outline-none focus:border-[#c5a059]"
                  >
                    <option value="2">2 Spieler</option>
                    <option value="3">3 Spieler</option>
                    <option value="4">4 Spieler</option>
                    <option value="5">5 Spieler</option>
                    <option value="6">6 Spieler</option>
                  </select>
                  <button
                    id="create-room-btn"
                    onClick={handleCreateRoom}
                    className="flex-1 py-3 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-wider text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.25)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Raum erstellen</span>
                  </button>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Oder</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* Join Room Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-zinc-300 font-serif">
                  <Users className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>Bestehendem Raum beitreten</span>
                </div>
                <div className="flex gap-2">
                  <input
                    id="room-code-input"
                    type="text"
                    placeholder="CODE (Z.B. 4X9A)"
                    maxLength={4}
                    value={joinCode}
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
                      className="flex items-center justify-between p-3.5 glass rounded-xl border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c5a059] to-[#8a6d3b] flex items-center justify-center font-bold text-xs text-black">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#e0e0e0]">
                            {p.name}
                          </span>
                          {p.id === gameState.hostId && (
                            <Crown className="w-3.5 h-3.5 text-[#c5a059]" title="Raumeröffner" />
                          )}
                          {p.id === myId && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#c5a05922] text-[#c5a059] font-bold border border-[#c5a05944]">
                              Du
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400/90 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Bereit
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audio & Speaker helper in Lobby */}
              <AudioController
                localStream={localStream}
                remoteStreams={remoteStreams}
                isMicMuted={isMicMuted}
                onToggleMic={toggleMicMute}
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

            {/* Mobile Sound & Speaker Controller */}
            <AudioController
              localStream={localStream}
              remoteStreams={remoteStreams}
              isMicMuted={isMicMuted}
              onToggleMic={toggleMicMute}
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

              {/* Right Column (1 col wide): Video Controls & Game Logs */}
              <div className="space-y-4">
                {/* Video / Camera Toggle */}
                <div className="glass-panel rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-[#c5a059]" />
                      <h3 className="font-serif text-sm font-bold text-[#e0e0e0]">
                        Video & Audio
                      </h3>
                    </div>
                  </div>

                  <button
                    id="camera-toggle-btn"
                    onClick={toggleCameraAndMic}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                      isCameraActive
                        ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                        : 'glass text-[#c5a059] border-[#c5a05944] hover:bg-[#c5a05915]'
                    }`}
                  >
                    {isCameraActive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-[#c5a059]" />}
                    <span>{isCameraActive ? 'Kamera deaktivieren' : 'Kamera / Mikrofon einschalten'}</span>
                  </button>

                  <div className="text-[10px] text-zinc-500 leading-relaxed">
                    Peer-to-peer WebRTC Direktverbindung mit Rauschunterdrückung.
                  </div>
                </div>

                {/* Live Game Log */}
                <div className="glass-panel rounded-2xl p-4 flex flex-col h-80">
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

      {/* Footer info in Sophisticated Dark style */}
      <footer className="h-12 px-4 sm:px-8 flex items-center justify-between border-t border-white/5 text-[10px] uppercase tracking-[0.25em] opacity-40 max-w-6xl mx-auto w-full">
        <span>Maskerade • Sophisticated Dark</span>
        <span>Peer Audio/Video Synchronisiert</span>
      </footer>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

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
          <div className="glass-panel border-2 border-[#c5a059] rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(197,160,89,0.3)] text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#c5a05922] border-2 border-[#c5a059] flex items-center justify-center text-[#c5a059] mx-auto shadow-[0_0_20px_rgba(197,160,89,0.4)]">
              <Crown className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-semibold">
                Siegerehrung
              </span>
              <h2 className="font-serif text-3xl font-bold text-[#e0e0e0]">
                {gameOverWinner} triumphiert!
              </h2>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Alle anderen Mitspieler haben ihren Hofeinfluss verloren. Der Maskenball hat seinen einzig wahren Herrscher gefunden.
            </p>

            {isHost ? (
              <button
                id="restart-lobby-btn"
                onClick={handleRestartGame}
                className="w-full py-3.5 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(197,160,89,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Zurück zur Lobby</span>
              </button>
            ) : (
              <div className="text-xs text-zinc-400 italic">
                Warte auf den Spielleiter für die nächste Runde …
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
