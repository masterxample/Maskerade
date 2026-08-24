import React, { useEffect, useState } from 'react';
import { CardRevealEvent } from '../types';
import { getCardDef, ROLES_META } from '../data/cards';
import { X, Sparkles, AlertTriangle, ShieldCheck, Flame, Skull } from 'lucide-react';

interface CardRevealModalProps {
  revealEvent: CardRevealEvent | null;
  onClose: () => void;
}

export const CardRevealModal: React.FC<CardRevealModalProps> = ({ revealEvent, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [isTorn, setIsTorn] = useState(false);

  const isLoss = revealEvent?.isLoss ?? (revealEvent?.revealType === 'loss' || !revealEvent?.revealType?.includes('proof'));

  useEffect(() => {
    if (revealEvent) {
      setVisible(true);
      setIsTorn(false);

      // Requirement 3: Show the card 100% complete and pristine for exactly 2.0 seconds (2000ms),
      // then trigger the dramatic tearing animation.
      let tearTimer: NodeJS.Timeout | null = null;
      if (isLoss) {
        tearTimer = setTimeout(() => {
          setIsTorn(true);
        }, 2000);
      }

      // Auto-dismiss after 7.5s so players have time to see the whole sequence
      const closeTimer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 7500);

      return () => {
        if (tearTimer) clearTimeout(tearTimer);
        clearTimeout(closeTimer);
      };
    } else {
      setVisible(false);
      setIsTorn(false);
    }
  }, [revealEvent, isLoss, onClose]);

  if (!revealEvent || !visible) return null;

  const cardDef = getCardDef(revealEvent.card.cardId, revealEvent.card.role, revealEvent.card.variantIndex);
  const roleMeta = ROLES_META[cardDef.role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in pointer-events-auto">
      <div className="relative glass-panel border-2 border-[#c5a059] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-[0_0_60px_rgba(197,160,89,0.4)]">
        {/* Close Button */}
        <button
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full glass hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer z-20"
          title="Schließen"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Tag */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-300 ${
              isLoss
                ? 'bg-red-950/80 border border-red-500/60 text-red-400'
                : 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-400'
            }`}
          >
            {isLoss ? <Flame className="w-6 h-6 animate-pulse" /> : <ShieldCheck className="w-6 h-6 animate-pulse" />}
          </div>

          <span
            className={`text-[10px] uppercase tracking-[0.25em] font-bold ${
              isLoss ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {isLoss ? (isTorn ? 'Hofkarte Zerrissen' : 'Hofkarten-Verlust') : 'Echter Rollenbeweis (Wahrheit)'}
          </span>

          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e0e0e0] leading-tight">
            {revealEvent.playerName}
          </h3>
        </div>

        {/* Big Card Display with 2-second pristine reveal followed by dramatic tearing effect */}
        <div className="flex justify-center py-2 relative min-h-[240px] sm:min-h-[260px] items-center">
          {/* Card Presentation Container */}
          <div className="relative w-[160px] h-[240px] sm:w-[180px] sm:h-[270px]">
            {isLoss ? (
              // Two halves tearing apart in full vibrant color after 2 seconds
              <div className="relative w-full h-full">
                {/* Left Half */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out border border-[#c5a059]"
                  style={{
                    clipPath: isTorn ? 'polygon(0% 0%, 58% 0%, 46% 38%, 56% 68%, 42% 100%, 0% 100%)' : 'none',
                    transform: isTorn
                      ? 'translate(-24px, 14px) rotate(-10deg) scale(0.95)'
                      : 'translate(0px, 0px) rotate(0deg) scale(1)',
                    filter: isTorn ? 'drop-shadow(-6px 10px 14px rgba(0,0,0,0.85))' : 'drop-shadow(0 0 20px rgba(197,160,89,0.4))'
                  }}
                >
                  <img
                    src={cardDef.image}
                    alt={cardDef.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
                </div>

                {/* Right Half (only split when isTorn is true) */}
                {isTorn && (
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out border border-[#c5a059]"
                    style={{
                      clipPath: 'polygon(58% 0%, 100% 0%, 100% 100%, 42% 100%, 56% 68%, 46% 38%)',
                      transform: 'translate(24px, 18px) rotate(10deg) scale(0.95)',
                      filter: 'drop-shadow(6px 10px 14px rgba(0,0,0,0.85))'
                    }}
                  >
                    <img
                      src={cardDef.image}
                      alt={cardDef.displayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
                  </div>
                )}

                {/* Tear energy flash & skull when torn */}
                {isTorn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-fade-in">
                    <div className="px-3 py-1 bg-red-950/90 border-2 border-red-500 rounded-xl text-red-300 font-serif font-extrabold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.8)] flex items-center gap-1.5 backdrop-blur-md">
                      <Skull className="w-4 h-4 text-red-400" />
                      <span>Zerrissen</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Unbroken Proof Card with Gold Aura
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(16,185,129,0.4)] border-2 border-emerald-500/80 animate-scale-up">
                <img
                  src={cardDef.image}
                  alt={cardDef.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 font-mono text-[9px] font-bold">
                  Beweis erbracht
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Name and Role Description */}
        <div className="space-y-1 bg-black/40 p-3.5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-center gap-2">
            <span className="text-base">{roleMeta?.emblem || '🎭'}</span>
            <span className="font-serif font-bold text-lg text-[#e0e0e0]">
              {cardDef.displayName}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#c5a05922] text-[#c5a059] border border-[#c5a05944]">
              {cardDef.roleName}
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
            {revealEvent.reason}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95 cursor-pointer shadow-lg ${
            isLoss
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              : 'bg-[#c5a059] hover:bg-[#d4b980] text-black shadow-[0_0_20px_rgba(197,160,89,0.3)]'
          }`}
        >
          Verstanden
        </button>
      </div>
    </div>
  );
};
