import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Smartphone, BellRing, Radio, Sparkles } from 'lucide-react';

interface AudioControllerProps {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  isMicMuted: boolean;
  onToggleMic: () => void;
  peerAudioLevels?: Record<string, number>;
}

export const AudioController: React.FC<AudioControllerProps> = ({
  localStream,
  remoteStreams,
  isMicMuted,
  onToggleMic
}) => {
  const [speakerEnabled, setSpeakerEnabled] = useState<boolean>(true);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [testTonePlaying, setTestTonePlaying] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const peerAudioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Detect mobile device
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileCheck = /android|ipad|iphone|ipod|windows phone/i.test(userAgent.toLowerCase());
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

    // Attempt to play all remote audio elements
    (Object.values(peerAudioElementsRef.current) as HTMLAudioElement[]).forEach(audioEl => {
      audioEl.muted = !speakerEnabled;
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

  // Sync remote streams to dedicated <audio> elements for crystal-clear mobile playback
  useEffect(() => {
    const activePeerIds = Object.keys(remoteStreams);

    activePeerIds.forEach(peerId => {
      const stream = remoteStreams[peerId];
      if (!stream) return;

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

  // Toggle master speaker
  const toggleSpeaker = () => {
    const newState = !speakerEnabled;
    setSpeakerEnabled(newState);
    unlockAudio();

    (Object.values(peerAudioElementsRef.current) as HTMLAudioElement[]).forEach(audioEl => {
      audioEl.muted = !newState;
      if (newState) {
        audioEl.play().catch(() => {});
      }
    });
  };

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

  return (
    <div className="glass rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 border border-[#c5a05933]">
      {/* Mobile Sound Helper Banner if not yet unlocked */}
      {!isAudioUnlocked && (
        <div className="w-full bg-[#c5a05915] border border-[#c5a05966] rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-[#c5a059]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#c5a059] flex-shrink-0 animate-pulse" />
            <span>
              <strong>Smartphone-Sound:</strong> Tippe hier, um den Lautsprecher am Smartphone zu aktivieren!
            </span>
          </div>
          <button
            id="mobile-audio-unlock-btn"
            onClick={unlockAudio}
            className="px-3.5 py-1.5 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-wider rounded-lg text-xs shadow-[0_0_10px_rgba(197,160,89,0.3)] active:scale-95 transition-all flex-shrink-0 cursor-pointer"
          >
            Ton aktivieren
          </button>
        </div>
      )}

      {/* Left controls: Mic & Speaker Toggles */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Master Speaker Toggle */}
        <button
          id="master-speaker-toggle-btn"
          onClick={toggleSpeaker}
          className={`speaker-btn flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
            speakerEnabled
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
              : 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
          }`}
          title={speakerEnabled ? 'Lautsprecher ist aktiv' : 'Lautsprecher ist stummgeschaltet'}
        >
          {speakerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>{speakerEnabled ? 'Lautsprecher: AN' : 'Lautsprecher: STUMM'}</span>
        </button>

        {/* Microphone Toggle if local stream exists */}
        {localStream && (
          <button
            id="mic-toggle-btn"
            onClick={onToggleMic}
            className={`speaker-btn flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
              !isMicMuted
                ? 'bg-[#c5a05922] text-[#c5a059] border-[#c5a05966] hover:bg-[#c5a05933]'
                : 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
            }`}
          >
            {!isMicMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span>{!isMicMuted ? 'Mikrofon: AN' : 'Mikrofon: STUMM'}</span>
          </button>
        )}

        {/* Sound Test Button */}
        <button
          id="sound-test-btn"
          onClick={playSoundTest}
          disabled={testTonePlaying}
          className="speaker-btn flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          title="Prüft die Tonausgabe über die Handy-/Geräte-Lautsprecher"
        >
          <BellRing className={`w-3.5 h-3.5 ${testTonePlaying ? 'animate-bounce text-[#c5a059]' : 'text-[#c5a059]'}`} />
          <span>{testTonePlaying ? 'Testet...' : 'Ton-Test'}</span>
        </button>
      </div>

      {/* Right status badge */}
      <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
        <Radio className="w-3.5 h-3.5 text-emerald-400" />
        <span>
          {remoteCount > 0
            ? `${remoteCount} Mitspieler verbunden`
            : 'Keine Mitspieler im Sprachkanal'}
        </span>
      </div>
    </div>
  );
};
