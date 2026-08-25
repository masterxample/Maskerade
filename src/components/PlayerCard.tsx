import React, { useEffect, useRef } from 'react';
import { PlayerState, PlayerCardState } from '../types';
import { CardDisplay } from './CardDisplay';
import { Coins, ShieldAlert, Crown, User, Volume2, VideoOff, Skull } from 'lucide-react';

interface PlayerCardProps {
  player: PlayerState;
  isSelf: boolean;
  isCurrentTurn: boolean;
  myHand?: PlayerCardState[];
  stream?: MediaStream | null;
  hasVideo?: boolean;
  isHost?: boolean;
  isSpeaking?: boolean;
  onCardClick?: (card: PlayerCardState | { isHidden: boolean; index: number }) => void;
  id?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isSelf,
  isCurrentTurn,
  myHand = [],
  stream,
  hasVideo = true,
  isHost = false,
  isSpeaking = false,
  onCardClick,
  id
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isEliminated = player.eliminated;

  // Active video track check:
  // For self: check if stream exists and has an enabled, non-stopped video track
  // For peer: check if stream exists, has video track, and peer has not disabled video
  const videoTrack = stream ? stream.getVideoTracks().find(t => t.readyState === 'live' && t.enabled) : null;
  const isVideoAvailable = isSelf ? (hasVideo || !!videoTrack) : (hasVideo && !!videoTrack);

  const handleVideoRef = (videoEl: HTMLVideoElement | null) => {
    videoRef.current = videoEl;
    if (videoEl && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch(err => {
        console.warn('Auto-play video playback handled:', err);
      });
    }
  };

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isVideoAvailable && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch(err => {
        console.warn('Auto-play video playback handled:', err);
      });
    } else {
      if (videoEl.srcObject) {
        videoEl.srcObject = null;
      }
    }
  }, [stream, isVideoAvailable]);

  // Active cards for self vs. opponents
  const selfAliveCards = isSelf ? myHand.filter(c => c.alive) : [];
  const selfDeadCards = isSelf ? myHand.filter(c => !c.alive) : [];

  return (
    <div
      id={id}
      className={`relative glass-panel rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between ${
        isCurrentTurn
          ? 'border-[#c5a059] shadow-[0_0_20px_rgba(197,160,89,0.35)] ring-1 ring-[#c5a05988]'
          : 'border-white/10 hover:border-[#c5a05944]'
      } ${isEliminated ? 'opacity-35 grayscale-[0.8] border-red-900/30' : ''}`}
    >
      {/* Turn Indicator Aura */}
      {isCurrentTurn && !isEliminated && (
        <div className="absolute -top-2.5 left-4 px-3 py-0.5 bg-[#c5a059] text-black text-[10px] font-bold uppercase rounded-full shadow-[0_0_12px_rgba(197,160,89,0.6)] tracking-widest flex items-center gap-1.5 font-sans z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
          Am Zug
        </div>
      )}

      {/* Top Section: Header & Player Stats */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {player.position && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-[#c5a059] border border-[#c5a05933] flex-shrink-0">
                #{player.position}
              </span>
            )}
            {isHost && (
              <span title="Raumeröffner" className="text-[#c5a059] flex-shrink-0">
                <Crown className="w-3.5 h-3.5 inline" />
              </span>
            )}
            <h3 className="font-serif font-bold text-sm text-[#e0e0e0] truncate tracking-tight">
              {player.name}
            </h3>
            {isSelf && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#c5a05922] text-[#c5a059] font-bold border border-[#c5a05944] flex-shrink-0">
                Du
              </span>
            )}
            {isSpeaking && (
              <span className="text-emerald-400 animate-pulse flex-shrink-0" title="Sprachübertragung aktiv">
                <Volume2 className="w-3.5 h-3.5 inline" />
              </span>
            )}
          </div>

          {/* Coins & Influence Pips */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 font-mono font-bold gold-accent bg-[#c5a05915] border border-[#c5a05933] px-2 py-0.5 rounded-full text-xs">
              <Coins className="w-3 h-3 text-[#c5a059]" />
              <span>{player.coins}</span>
            </div>

            {/* Influence Pips */}
            <div className="flex items-center gap-1" title={`${player.influence} Hofeinfluss verbleibend`}>
              {[0, 1].map(index => {
                const isAlivePip = index < player.influence;
                return (
                  <div
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isAlivePip
                        ? 'bg-[#c5a059] shadow-[0_0_8px_rgba(197,160,89,0.8)]'
                        : 'bg-zinc-800 border border-white/10 opacity-40'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Webcam Window or Avatar Box */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/90 border border-[#c5a05933] shadow-inner mb-3 flex items-center justify-center group">
          {isVideoAvailable && stream ? (
            <video
              ref={handleVideoRef}
              autoPlay
              playsInline
              muted={true}
              className={`w-full h-full object-cover ${isSelf ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-500 select-none py-4">
              <div className="w-12 h-12 rounded-full bg-[#c5a05915] border border-[#c5a05944] flex items-center justify-center text-[#c5a059] font-serif font-bold text-lg shadow-[0_0_12px_rgba(197,160,89,0.2)]">
                {player.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {player.name}
              </span>
            </div>
          )}

          {/* Video Overlay Name Pill */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
            <span className="text-[9px] font-semibold bg-black/80 text-zinc-200 px-2 py-0.5 rounded border border-white/10 truncate max-w-[80%] backdrop-blur-sm">
              {player.name} {isSelf ? '(Du)' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Hofkarten direkt unter dem Webcam-Fenster */}
      <div className="pt-1">
        <div className="text-[10px] uppercase font-mono tracking-wider gold-accent font-semibold mb-1.5 text-center flex items-center justify-center gap-1.5">
          <span>Hofkarten ({player.influence}/2)</span>
        </div>

        <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
          {isSelf ? (
            <>
              {/* My Alive Cards */}
              {selfAliveCards.map((card, idx) => (
                <div key={card.cardId || idx} className="transform transition-transform hover:scale-105">
                  <CardDisplay
                    cardId={card.cardId}
                    role={card.role}
                    variantIndex={card.variantIndex}
                    displayName={card.displayName}
                    alive={true}
                    size="md"
                    selectable={true}
                    onClick={() => onCardClick && onCardClick(card)}
                  />
                </div>
              ))}
              {/* My Dead Revealed Cards (Requirement 4: Clearly marked as Aufgedeckt / Zerrissen) */}
              {selfDeadCards.map((card, idx) => (
                <div key={`dead-${card.cardId || idx}`} className="transform transition-transform">
                  <CardDisplay
                    cardId={card.cardId}
                    role={card.role}
                    variantIndex={card.variantIndex}
                    displayName={card.displayName}
                    alive={false}
                    size="md"
                    selectable={true}
                    onClick={() => onCardClick && onCardClick(card)}
                  />
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Opponent Alive Cards (Hidden Backside) */}
              {Array.from({ length: player.influence }).map((_, idx) => (
                <div key={`hidden-${idx}`} className="transform transition-transform hover:scale-105">
                  <CardDisplay
                    isHidden={true}
                    size="md"
                    onClick={() => onCardClick && onCardClick({ isHidden: true, index: idx })}
                  />
                </div>
              ))}
              {/* Opponent Revealed (Dead) Cards */}
              {player.revealedCards.map((card, idx) => (
                <div key={`revealed-${card.cardId || idx}`} className="transform transition-transform">
                  <CardDisplay
                    cardId={card.cardId}
                    role={card.role}
                    variantIndex={card.variantIndex}
                    displayName={card.displayName}
                    alive={false}
                    size="md"
                    selectable={true}
                    onClick={() => onCardClick && onCardClick(card)}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Eliminated Footer */}
      {isEliminated && (
        <div className="mt-3 text-center py-1.5 bg-red-950/50 border border-red-900/40 rounded-xl text-xs font-semibold text-red-400 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Ausgeschieden (Kein Einfluss)</span>
        </div>
      )}
    </div>
  );
};
