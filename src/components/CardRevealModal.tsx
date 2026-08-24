import React, { useEffect, useState } from 'react';
import { CardRevealEvent } from '../types';
import { getCardDef, ROLES_META } from '../data/cards';
import { X, Sparkles, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';

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

      // If it's a card loss, trigger the dramatic tearing animation after 500ms
      let tearTimer: NodeJS.Timeout | null = null;
      if (isLoss) {
        tearTimer = setTimeout(() => {
          setIsTorn(true);
        }, 550);
      }

      // Auto-dismiss after 6.5s
      const closeTimer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 6500);

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
            {isLoss ? 'Hofkarten-Verlust (Zerrissen)' : 'Echter Rollenbeweis (Wahrheit)'}
          </span>

          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e0e0e0] leading-tight">
            {revealEvent.playerName}
          </h3>
        </div>

        {/* Big Card Display with Tearing Effect (Zerreiß-Effekt) */}
        <div className="flex justify-center py-2 relative min-h-[220px] sm:min-h-[240px] items-center">
          {/* Card Presentation Container */}
          <div className="relative w-[150px] h-[225px] sm:w-[170px] sm:h-[255px]">
            {isLoss ? (
              // Two halves tearing apart in full vibrant color
              <div className="relative w-full h-full">
                {/* Left Half */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out"
                  style={{
                    clipPath: 'polygon(0% 0%, 58% 0%, 46% 38%, 56% 68%, 42% 100%, 0% 100%)',
                    transform: isTorn
                      ? 'translate(-22px, 14px) rotate(-9deg) scale(0.96)'
                      : 'translate(0px, 0px) rotate(0deg) scale(1)',
                    filter: isTorn ? 'drop-shadow(-4px 8px 12px rgba(0,0,0,0.8))' : 'none'
                  }}
                >
                  <img
                    src={cardDef.image}
                    alt={cardDef.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                </div>

                {/* Right Half */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out"
                  style={{
                    clipPath: 'polygon(58% 0%, 100% 0%, 100% 100%, 42% 100%, 56% 68%, 46% 38%)',
                    transform: isTorn
                      ? 'translate(22px, 18px) rotate(9deg) scale(0.96)'
                      : 'translate(0px, 0px) rotate(0deg) scale(1)',
                    filter: isTorn ? 'drop-shadow(4px 8px 12px rgba(0,0,0,0.8))' : 'none'
                  }}
                >
                  <img
                    src={cardDef.image}
                    alt={cardDef.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                </div>

                {/* Tear energy streak line */}
                {isTorn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-ping">
                    <span className="text-red-500 font-extrabold text-2xl font-serif">⚡</span>
                  </div>
                )}
              </div>
            ) : (
              // Intact card with radiant aura for role proof
              <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-[#c5a059] shadow-[0_0_30px_rgba(197,160,89,0.6)] animate-pulse">
                <img
                  src={cardDef.image}
                  alt={cardDef.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-xs gold-accent font-bold">
                  <span>{roleMeta?.emblem}</span>
                  <span className="bg-black/70 px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
                    {cardDef.roleName}
                  </span>
                </div>
                <div className="absolute bottom-2 inset-x-2 text-center">
                  <div className="font-serif font-bold text-white text-sm">{cardDef.displayName}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Name & Role Info */}
        <div className="space-y-1">
          <div className="font-serif text-lg font-bold text-[#e0e0e0] flex items-center justify-center gap-2">
            <span>{roleMeta?.emblem}</span>
            <span>{cardDef.displayName}</span>
            <span className="text-xs font-mono font-normal text-zinc-400">({cardDef.roleName})</span>
          </div>
          <p className="text-[11px] text-zinc-300 italic">{cardDef.actionText}</p>
        </div>

        {/* Reason Banner */}
        <div
          className={`p-3 rounded-xl border text-xs font-medium leading-relaxed ${
            isLoss
              ? 'bg-red-950/40 border-red-500/40 text-red-200'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {revealEvent.reason}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          className="w-full py-2.5 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.3)] transition-all active:scale-95 cursor-pointer"
        >
          Fortfahren
        </button>
      </div>
    </div>
  );
};
