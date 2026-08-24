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
  SwitchCamera
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
  showLobbyVideoPreview?: boolean;
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
  myId = '',
  showLobbyVideoPreview = false
}) => {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [testTonePlaying, setTestTonePlaying] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const peerAudioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Detect mobile device reliably (Smartphone / Tablet vs. PC Desktop)
  useEffect(() => {
    const checkIsMobile = () => {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileUA = mobileRegex.test(ua.toLowerCase());
      const hasTouch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
      const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
      return isMobileUA || (hasTouch && isSmallScreen);
    };

    setIsMobile(checkIsMobile());
    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  // Unlock Audio
  const unlockAudio = useCallback(async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    // Apply speaker state to all audio elements
    (Object.values(peerAudioElementsRef.current) as HTMLAudioElement[]).forEach(audioEl => {
      try {
        audioEl.muted = !speakerEnabled;
        audioEl.volume = speakerEnabled ? 1 : 0;
        if (speakerEnabled) {
          audioEl.play().catch(() => {});
        }
      } catch (e) {
        // silent ignore
      }
    });

    setIsAudioUnlocked(true);
  }, [getAudioContext, speakerEnabled]);

  // Unlock audio on initial user touch or click
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

  // Sync peer audio tracks into dedicated audio elements
  useEffect(() => {
    const activePeerIds = Object.keys(remoteStreams);

    activePeerIds.forEach(peerId => {
      const stream = remoteStreams[peerId];
      if (!stream) return;

      const hasAudio = stream.getAudioTracks().some(t => t.readyState === 'live');
      if (!hasAudio) return;

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

      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
      }

      audioEl.muted = !speakerEnabled;
      audioEl.volume = speakerEnabled ? 1 : 0;

      if (speakerEnabled) {
        audioEl.play().catch(() => {
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

  // Direct, safe speaker toggling on all active audio elements without blocking
  useEffect(() => {
    (Object.values(peerAudioElementsRef.current) as HTMLAudioElement[]).forEach(audioEl => {
      try {
        audioEl.muted = !speakerEnabled;
        audioEl.volume = speakerEnabled ? 1 : 0;
        if (speakerEnabled) {
          audioEl.play().catch(() => {});
        } else {
          audioEl.pause();
        }
      } catch (e) {
        // safety catch
      }
    });
  }, [speakerEnabled]);

  // Play test sound
  const playSoundTest = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    unlockAudio();

    setTestTonePlaying(true);
    const now = ctx.currentTime;

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

  return (
    <div className="glass rounded-2xl p-3 sm:p-3.5 space-y-2.5 border border-[#c5a05933] shadow-lg">
      {/* Mobile Audio Unlock Banner (Smartphone only) */}
      {isMobile && !isAudioUnlocked && (
        <div className="w-full bg-[#c5a05915] border border-[#c5a05966] rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-[#c5a059]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#c5a059] flex-shrink-0 animate-pulse" />
            <span>
              <strong>Smartphone-Audio:</strong> Tippe hier, um Ton & Mikrofon freizugeben!
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
              isCameraActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'glass text-[#c5a059] border-[#c5a05944] hover:bg-[#c5a05915]'
            }`}
            title={isCameraActive ? 'Kamera ausschalten' : 'Kamera einschalten'}
          >
            {isCameraActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-[#c5a059]" />}
            <span>{isCameraActive ? 'Kamera: AN' : 'Kamera: AUS'}</span>
          </button>

          {/* Flip Camera Switch: ONLY on Mobile when camera is on (Hidden on Desktop/PC) */}
          {isMobile && isCameraActive && onSwitchFacingMode && (
            <button
              id="switch-camera-btn"
              onClick={onSwitchFacingMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-[#c5a059] border border-[#c5a05944] hover:bg-[#c5a05915] text-xs font-semibold transition-all active:scale-95 cursor-pointer"
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
              localStream && !isMicMuted
                ? 'bg-[#c5a05925] text-[#c5a059] border-[#c5a059] hover:bg-[#c5a05935] shadow-[0_0_12px_rgba(197,160,89,0.3)]'
                : isMicMuted
                ? 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30'
                : 'glass text-zinc-400 border-white/10 hover:text-white'
            }`}
            title={isMicMuted ? 'Mikrofon einschalten' : 'Mikrofon stummschalten'}
          >
            {localStream && !isMicMuted ? <Mic className="w-4 h-4 text-[#c5a059]" /> : <MicOff className="w-4 h-4 text-red-400" />}
            <span>{isMicMuted ? 'Mikro: STUMM' : 'Mikro: AN'}</span>
          </button>

          {/* Master Speaker Toggle: ONLY on Mobile (Hidden on Desktop/PC) */}
          {isMobile && (
            <button
              id="master-speaker-toggle-btn"
              onClick={onToggleSpeaker}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
                speakerEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30'
              }`}
              title={speakerEnabled ? 'Handy-Lautsprecher stummschalten' : 'Handy-Lautsprecher einschalten'}
            >
              {speakerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{speakerEnabled ? 'Lautsprecher: AN' : 'Lautsprecher: AUS'}</span>
            </button>
          )}

          {/* Sound Test Button (Desktop & Mobile) */}
          <button
            id="sound-test-btn"
            onClick={playSoundTest}
            disabled={testTonePlaying}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
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
              ? `${remoteCount} Mitspieler verbunden`
              : 'Warte auf Mitspieler...'}
          </span>
        </div>
      </div>
    </div>
  );
};
