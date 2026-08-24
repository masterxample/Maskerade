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

  // Unlock Audio globally for all elements and AudioContext
  const unlockAudio = useCallback(async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    // Attempt to play all HTML5 audio elements on page
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(el => {
      try {
        el.muted = !speakerEnabled;
        if (speakerEnabled && el.srcObject) {
          el.play().catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    });

    setIsAudioUnlocked(true);
  }, [getAudioContext, speakerEnabled]);

  // Unlock audio on initial user touch or click anywhere
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
    };

    window.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
    window.addEventListener('touchend', handleInteraction, { once: true, passive: true });
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('pointerdown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('touchend', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
    };
  }, [unlockAudio]);

  // Play test sound for speaker confirmation
  const playSoundTest = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    unlockAudio();

    setTestTonePlaying(true);
    const now = ctx.currentTime;

    // Harmonic fanfare: C5, E5, G5, C6
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);

      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.6);
    });

    setTimeout(() => setTestTonePlaying(false), 950);
  };

  const remoteCount = Object.keys(remoteStreams).length;

  return (
    <div className="glass rounded-2xl p-3 sm:p-3.5 space-y-2.5 border border-[#c5a05933] shadow-lg">
      {/* Dedicated JSX Audio Elements for all active remote peer streams */}
      <div className="hidden" aria-hidden="true">
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <audio
            key={peerId}
            id={`remote-audio-${peerId}`}
            autoPlay
            playsInline
            ref={el => {
              if (el) {
                if (el.srcObject !== stream) {
                  el.srcObject = stream;
                }
                el.muted = !speakerEnabled;
                if (speakerEnabled) {
                  el.play().catch(() => {});
                }
              }
            }}
          />
        ))}
      </div>

      {/* Mobile Audio Unlock Banner (Smartphone only if not yet interacted) */}
      {isMobile && !isAudioUnlocked && (
        <div className="w-full bg-gradient-to-r from-[#c5a05925] to-[#c5a05910] border-2 border-[#c5a059] rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.25)]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#c5a059] flex-shrink-0 animate-pulse" />
            <span className="leading-tight">
              <strong className="text-white">Smartphone-Ton aktivieren:</strong> Tippe hier, um Audio & Lautsprecher freizuschalten.
            </span>
          </div>
          <button
            id="mobile-audio-unlock-btn"
            onClick={unlockAudio}
            className="px-3.5 py-2 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-wider rounded-lg text-xs shadow-[0_0_12px_rgba(197,160,89,0.4)] active:scale-95 transition-all flex-shrink-0 cursor-pointer"
          >
            Ton an
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

          {/* Flip Camera Switch: ONLY on Mobile when camera is on */}
          {isMobile && isCameraActive && onSwitchFacingMode && (
            <button
              id="switch-camera-btn"
              onClick={onSwitchFacingMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-[#c5a059] border border-[#c5a05944] hover:bg-[#c5a05915] text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              title={`Kamera wechseln (aktuell: ${facingMode === 'user' ? 'Frontkamera' : 'Rückkamera'})`}
            >
              <SwitchCamera className="w-4 h-4 text-[#c5a059]" />
              <span>{facingMode === 'user' ? 'Front' : 'Rück'}</span>
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

          {/* Universal Speaker Toggle (PC & Mobile) */}
          <button
            id="master-speaker-toggle-btn"
            onClick={onToggleSpeaker}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
              speakerEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30'
            }`}
            title={speakerEnabled ? 'Lautsprecher stummschalten' : 'Lautsprecher einschalten'}
          >
            {speakerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{speakerEnabled ? 'Lautsprecher: AN' : 'Lautsprecher: STUMM'}</span>
          </button>

          {/* Sound Test Button (Desktop & Mobile) */}
          <button
            id="sound-test-btn"
            onClick={playSoundTest}
            disabled={testTonePlaying}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            title="Prüft die Tonausgabe über die Lautsprecher mit einem Testton"
          >
            <BellRing className={`w-3.5 h-3.5 ${testTonePlaying ? 'animate-bounce text-[#c5a059]' : 'text-[#c5a059]'}`} />
            <span>{testTonePlaying ? 'Testet...' : 'Ton-Test'}</span>
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
