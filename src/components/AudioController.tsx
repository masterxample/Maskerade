import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Smartphone,
  BellRing,
  Radio,
  SwitchCamera,
  Camera
} from 'lucide-react';
import { PlayerState } from '../types';

interface AudioControllerProps {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  isCameraActive: boolean;
  isMicMuted: boolean;
  speakerEnabled: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onSwitchFacingMode?: () => void;
  facingMode?: 'user' | 'environment';
  players?: PlayerState[];
  myId?: string;
}

export const AudioController: React.FC<AudioControllerProps> = ({
  localStream,
  remoteStreams,
  isCameraActive,
  isMicMuted,
  speakerEnabled,
  onToggleCamera,
  onToggleMic,
  onToggleSpeaker,
  onSwitchFacingMode,
  facingMode = 'user',
  players = [],
  myId = ''
}) => {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [testTonePlaying, setTestTonePlaying] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const peerAudioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Detect mobile device reliably
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileCheck = /android|ipad|iphone|ipod|windows phone/i.test(userAgent.toLowerCase()) || 
      (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 1024);
    setIsMobile(mobileCheck);
  }, []);

  // Initialize or resume AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Global Audio Unlock handler on user interaction
  const unlockAudio = useCallback(async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Update all remote audio elements
    (Object.values(peerAudioElementsRef.current) as HTMLAudioElement[]).forEach(audioEl => {
      audioEl.muted = !speakerEnabled;
      audioEl.volume = speakerEnabled ? 1 : 0;
      const playPromise = audioEl.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {});
      }
    });

    setIsAudioUnlocked(true);
  }, [getAudioContext, speakerEnabled]);

  // Listen to any touch / click to automatically unlock audio on mobile
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
    };

    window.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
    window.addEventListener('click', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [unlockAudio]);

  // Sync remote streams to dedicated <audio> elements for crystal-clear playback
  useEffect(() => {
    const activePeerIds = Object.keys(remoteStreams);

    activePeerIds.forEach(peerId => {
      const stream = remoteStreams[peerId];
      if (!stream) return;

      // Only mount audio element if stream has audio tracks
      if (stream.getAudioTracks().length === 0) return;

      let audioEl = peerAudioElementsRef.current[peerId];
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `peer-audio-${peerId}`;
        audioEl.autoplay = true;
        audioEl.setAttribute('playsinline', 'true');
        audioEl.setAttribute('webkit-playsinline', 'true');
        document.body.appendChild(audioEl);
        peerAudioElementsRef.current[peerId] = audioEl;
      }

      audioEl.srcObject = stream;
      audioEl.muted = !speakerEnabled;
      audioEl.volume = speakerEnabled ? 1 : 0;

      const playPromise = audioEl.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {
          setIsAudioUnlocked(false);
        });
      }
    });

    // Cleanup disconnected peers
    Object.keys(peerAudioElementsRef.current).forEach(peerId => {
      if (!remoteStreams[peerId]) {
        const el = peerAudioElementsRef.current[peerId];
        if (el) {
          el.srcObject = null;
          el.remove();
        }
        delete peerAudioElementsRef.current[peerId];
      }
    });
  }, [remoteStreams, speakerEnabled]);

  // Mute/unmute all peer audio elements whenever speakerEnabled changes
  useEffect(() => {
    (Object.values(peerAudioElementsRef.current) as HTMLAudioElement[]).forEach(audioEl => {
      audioEl.muted = !speakerEnabled;
      audioEl.volume = speakerEnabled ? 1 : 0;
      if (speakerEnabled) {
        audioEl.play().catch(() => {});
      }
    });
  }, [speakerEnabled]);

  // Play test chime to confirm sound output
  const playSoundTest = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    unlockAudio();

    setTestTonePlaying(true);
    const now = ctx.currentTime;

    // Harmonic chords
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.65);
    });

    setTimeout(() => setTestTonePlaying(false), 900);
  };

  const remoteCount = Object.keys(remoteStreams).length;

  // Collect video feeds (local + remote)
  const activeVideoFeeds: { id: string; name: string; isSelf: boolean; stream: MediaStream }[] = [];
  if (localStream && localStream.getVideoTracks().length > 0 && isCameraActive) {
    const selfPlayer = players.find(p => p.id === myId);
    activeVideoFeeds.push({
      id: myId || 'self',
      name: (selfPlayer?.name || 'Du') + ' (Du)',
      isSelf: true,
      stream: localStream
    });
  }

  (Object.entries(remoteStreams) as [string, MediaStream][]).forEach(([peerId, stream]) => {
    if (stream && stream.getVideoTracks().length > 0) {
      const p = players.find(player => player.id === peerId);
      activeVideoFeeds.push({
        id: peerId,
        name: p?.name || 'Mitspieler',
        isSelf: false,
        stream
      });
    }
  });

  return (
    <div className="glass rounded-2xl p-3.5 space-y-3 border border-[#c5a05933] shadow-lg">
      {/* Mobile Audio / Video Unlock Banner (Only shown on Mobile if audio isn't unlocked yet) */}
      {isMobile && !isAudioUnlocked && (
        <div className="w-full bg-[#c5a05915] border border-[#c5a05966] rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-[#c5a059]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#c5a059] flex-shrink-0 animate-pulse" />
            <span>
              <strong>Handy-Audio & Video:</strong> Tippe hier, um Ton & Mikrofon auf deinem Smartphone freizugeben!
            </span>
          </div>
          <button
            id="mobile-audio-unlock-btn"
            onClick={unlockAudio}
            className="px-3.5 py-1.5 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-wider rounded-lg text-xs shadow-[0_0_10px_rgba(197,160,89,0.3)] active:scale-95 transition-all flex-shrink-0 cursor-pointer"
          >
            Aktivieren
          </button>
        </div>
      )}

      {/* Main Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Media Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Webcam Toggle Button (Independent Video) */}
          <button
            id="webcam-toggle-btn"
            onClick={onToggleCamera}
            className={`speaker-btn flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
              isCameraActive
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'glass text-[#c5a059] border-[#c5a05944] hover:bg-[#c5a05915]'
            }`}
            title={isCameraActive ? 'Kamera ist an' : 'Webcam aktivieren'}
          >
            {isCameraActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-[#c5a059]" />}
            <span>{isCameraActive ? 'Kamera: AN' : 'Kamera: AUS'}</span>
          </button>

          {/* Flip Camera Switch on Mobile ONLY (Hidden on Desktop/PC) */}
          {isMobile && isCameraActive && onSwitchFacingMode && (
            <button
              id="switch-camera-btn"
              onClick={onSwitchFacingMode}
              className="speaker-btn flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-[#c5a059] border border-[#c5a05944] hover:bg-[#c5a05915] text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              title={`Kamera wechseln (aktuell: ${facingMode === 'user' ? 'Frontkamera' : 'Rückkamera'})`}
            >
              <SwitchCamera className="w-4 h-4 text-[#c5a059]" />
              <span>{facingMode === 'user' ? 'Frontkamera' : 'Rückkamera'}</span>
            </button>
          )}

          {/* Microphone Toggle (Independent Audio) */}
          <button
            id="mic-toggle-btn"
            onClick={onToggleMic}
            className={`speaker-btn flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
              localStream && !isMicMuted
                ? 'bg-[#c5a05922] text-[#c5a059] border-[#c5a05966] hover:bg-[#c5a05933] shadow-[0_0_10px_rgba(197,160,89,0.2)]'
                : isMicMuted
                ? 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
                : 'glass text-zinc-400 border-white/10 hover:text-white'
            }`}
            title={isMicMuted ? 'Mikrofon ist stumm' : 'Mikrofon ist aktiv'}
          >
            {localStream && !isMicMuted ? <Mic className="w-4 h-4 text-[#c5a059]" /> : <MicOff className="w-4 h-4 text-red-400" />}
            <span>{isMicMuted ? 'Mikro: STUMM' : 'Mikro: AN'}</span>
          </button>

          {/* Master Speaker Toggle (Lautsprecher an/aus - Nur auf Mobilgeräten/Smartphones sichtbar) */}
          {isMobile && (
            <button
              id="master-speaker-toggle-btn"
              onClick={onToggleSpeaker}
              className={`speaker-btn flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
                speakerEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
              }`}
              title={speakerEnabled ? 'Handy-Lautsprecher ist aktiv' : 'Handy-Lautsprecher ist stummgeschaltet'}
            >
              {speakerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{speakerEnabled ? 'Lautsprecher: AN' : 'Lautsprecher: AUS'}</span>
            </button>
          )}

          {/* Sound Test Button */}
          <button
            id="sound-test-btn"
            onClick={playSoundTest}
            disabled={testTonePlaying}
            className="speaker-btn flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            title="Prüft die Tonausgabe über die Lautsprecher"
          >
            <BellRing className={`w-3.5 h-3.5 ${testTonePlaying ? 'animate-bounce text-[#c5a059]' : 'text-[#c5a059]'}`} />
            <span className="hidden sm:inline">{testTonePlaying ? 'Testet...' : 'Ton-Test'}</span>
          </button>
        </div>

        {/* Right: Peers Status Badge */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>
            {remoteCount > 0
              ? `${remoteCount} Mitspieler im Stream`
              : 'Warte auf Mitspieler...'}
          </span>
        </div>
      </div>

      {/* Live Video Tiles Strip (Local & Remote Webcams) */}
      {activeVideoFeeds.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#c5a059] font-bold flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Live Webcam-Übertragung ({activeVideoFeeds.length})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {activeVideoFeeds.map(feed => (
              <div
                key={feed.id}
                className="relative aspect-video rounded-xl overflow-hidden bg-black/90 border border-[#c5a05944] shadow-md group"
              >
                <video
                  ref={el => {
                    if (el && el.srcObject !== feed.stream) {
                      el.srcObject = feed.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  muted={feed.isSelf}
                  className="w-full h-full object-cover"
                />
                {/* Overlay Name Tag */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-semibold bg-black/80 text-[#e0e0e0] px-2 py-0.5 rounded-md border border-white/10 truncate max-w-[85%] backdrop-blur-sm">
                    {feed.name}
                  </span>
                  {feed.isSelf && isMicMuted && (
                    <span className="p-1 rounded bg-red-950/80 border border-red-500/40 text-red-400" title="Stummgeschaltet">
                      <MicOff className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
