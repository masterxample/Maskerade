import React, { useEffect, useRef } from 'react';
import { PlayerState } from '../types';
import { Crown, Mic, MicOff, Video, VideoOff, Volume2, UserMinus } from 'lucide-react';

interface LobbyVideoTileProps {
  player: PlayerState;
  isSelf: boolean;
  isHost: boolean;
  canKick: boolean;
  stream?: MediaStream | null;
  hasVideo?: boolean;
  isMicMuted?: boolean;
  isSpeaking?: boolean;
  onKick?: () => void;
}

export const LobbyVideoTile: React.FC<LobbyVideoTileProps> = ({
  player,
  isSelf,
  isHost,
  canKick,
  stream,
  hasVideo = true,
  isMicMuted = false,
  isSpeaking = false,
  onKick
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check if live video track is available and enabled
  const videoTrack = stream ? stream.getVideoTracks().find(t => t.readyState === 'live' && t.enabled) : null;
  const isVideoAvailable = !!videoTrack && (isSelf ? true : hasVideo);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isVideoAvailable && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch(err => {
        console.warn('Lobby video playback handled:', err);
      });
    } else {
      if (videoEl.srcObject) {
        videoEl.srcObject = null;
      }
    }
  }, [stream, isVideoAvailable]);

  return (
    <div className="relative rounded-2xl overflow-hidden glass border border-[#c5a05944] bg-[#0c0c10] shadow-lg flex flex-col group transition-all duration-300 hover:border-[#c5a059]">
      {/* Video Container (aspect-video) */}
      <div className="relative w-full aspect-video bg-black/90 flex items-center justify-center overflow-hidden">
        {isVideoAvailable ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isSelf}
            className="w-full h-full object-cover transform scale-100"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 py-6 select-none">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#c5a05933] to-[#8a6d3b22] border-2 border-[#c5a05955] flex items-center justify-center text-[#c5a059] font-serif font-bold text-xl sm:text-2xl shadow-[0_0_15px_rgba(197,160,89,0.2)]">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <VideoOff className="w-3.5 h-3.5 text-zinc-500" />
              <span>Kamera aus</span>
            </div>
          </div>
        )}

        {/* Top Badges (Host Crown, Du Badge, Kick Button) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5">
            {isHost && (
              <span className="px-2 py-0.5 rounded-full bg-[#c5a059] text-black font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow">
                <Crown className="w-3 h-3 fill-black" />
                <span>Leiter</span>
              </span>
            )}
            {isSelf && (
              <span className="px-2 py-0.5 rounded-full bg-black/70 border border-[#c5a059] text-[#c5a059] font-bold text-[10px] uppercase tracking-wider shadow backdrop-blur-sm">
                Du
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {canKick && onKick && (
              <button
                onClick={onKick}
                className="p-1 rounded-lg bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/50 shadow transition-all cursor-pointer text-[10px] flex items-center gap-1"
                title={`${player.name} entfernen`}
              >
                <UserMinus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Status Bar on Video */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-serif font-bold text-xs sm:text-sm text-zinc-100 truncate drop-shadow">
              {player.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isSpeaking && (
              <span className="text-emerald-400 animate-pulse" title="Spricht gerade">
                <Volume2 className="w-3.5 h-3.5" />
              </span>
            )}
            {isMicMuted ? (
              <span className="p-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-400" title="Mikrofon stumm">
                <MicOff className="w-3 h-3" />
              </span>
            ) : (
              <span className="p-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400" title="Mikrofon aktiv">
                <Mic className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
