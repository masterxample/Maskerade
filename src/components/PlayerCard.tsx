import React from 'react';
import { PlayerState, PlayerCardState } from '../types';
import { CardDisplay } from './CardDisplay';
import { Coins, ShieldAlert, Crown, User, Volume2 } from 'lucide-react';

interface PlayerCardProps {
  player: PlayerState;
  isSelf: boolean;
  isCurrentTurn: boolean;
  myHand?: PlayerCardState[];
  stream?: MediaStream | null;
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
  isHost = false,
  isSpeaking = false,
  onCardClick,
  id
}) => {
  const isEliminated = player.eliminated;

  // Active cards for self vs. opponents
  const selfAliveCards = isSelf ? myHand.filter(c => c.alive) : [];
  const selfDeadCards = isSelf ? myHand.filter(c => !c.alive) : [];

  return (
    <div
      id={id}
      className={`relative glass-panel rounded-2xl p-4 transition-all duration-300 ${
        isCurrentTurn
          ? 'border-[#c5a059] shadow-[0_0_16px_rgba(197,160,89,0.3)] scale-[1.01]'
          : 'border-white/5 hover:border-[#c5a05944]'
      } ${isEliminated ? 'opacity-35 grayscale-[0.8] border-red-900/30' : ''}`}
    >
      {/* Turn Indicator Aura */}
      {isCurrentTurn && !isEliminated && (
        <div className="absolute -top-2.5 left-4 px-3 py-0.5 bg-[#c5a059] text-black text-[10px] font-bold uppercase rounded-full shadow-[0_0_10px_rgba(197,160,89,0.5)] tracking-widest flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
          Am Zug
        </div>
      )}

      {/* Header with Position, Name, Coins, and Embedded Uniform Cards */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: Player Info & Video Avatar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {player.position && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-[#c5a059] border border-[#c5a05933]">
                #{player.position}
              </span>
            )}
            {isHost && (
              <span title="Raumeröffner" className="text-[#c5a059]">
                <Crown className="w-3.5 h-3.5 inline" />
              </span>
            )}
            <h3 className="font-semibold text-sm text-[#e0e0e0] truncate tracking-tight">
              {player.name}
            </h3>
            {isSelf && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#c5a05922] text-[#c5a059] font-bold border border-[#c5a05944]">
                Du
              </span>
            )}
            {isSpeaking && (
              <span className="text-emerald-400 animate-pulse" title="Sprachübertragung aktiv">
                <Volume2 className="w-3.5 h-3.5 inline" />
              </span>
            )}
          </div>

          {/* Coins & Influence Pips */}
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <div className="flex items-center gap-1 font-mono font-bold gold-accent bg-[#c5a05915] border border-[#c5a05933] px-2.5 py-0.5 rounded-full text-xs">
              <Coins className="w-3 h-3 text-[#c5a059]" />
              <span>{player.coins} {player.coins === 1 ? 'Münze' : 'Münzen'}</span>
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
                        : 'bg-zinc-800 border border-white/10 opacity-50'
                    }`}
                  />
                );
              })}
              <span className="text-[10px] text-zinc-500 ml-0.5 font-mono">
                {player.influence}/2
              </span>
            </div>
          </div>

          {/* Optional Video Feed if active with video tracks */}
          {stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.readyState === 'live') && (
            <div className="mt-2.5 relative w-28 aspect-video rounded-lg overflow-hidden border border-[#c5a05944] bg-black shadow-inner">
              <video
                ref={el => {
                  if (el && el.srcObject !== stream) {
                    el.srcObject = stream;
                  }
                }}
                autoPlay
                playsInline
                webkit-playsinline="true"
                muted={isSelf}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 left-1 text-[9px] bg-black/85 px-1.5 py-0.2 rounded text-zinc-300 font-mono border border-white/10">
                {player.name}
              </span>
            </div>
          )}
        </div>

        {/* Right: Embedded Cards cleanly displayed side-by-side next to name */}
        <div className="flex items-center gap-2 flex-shrink-0">
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
              {/* My Dead Revealed Cards */}
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
              {/* Opponent Alive Cards (Hidden Backside in uniform size) */}
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
        <div className="mt-2 text-center py-1 bg-red-950/40 border border-red-900/30 rounded-lg text-xs font-semibold text-red-400 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Ausgeschieden (Kein Hofeinfluss mehr)</span>
        </div>
      )}
    </div>
  );
};
