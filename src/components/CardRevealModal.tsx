import React, { useEffect, useState } from 'react';
import { CardRevealEvent } from '../types';
import { getCardDef, ROLES_META } from '../data/cards';
import { X, ShieldCheck, Flame } from 'lucide-react';

interface CardRevealModalProps {
  revealEvent: CardRevealEvent | null;
  onClose: () => void;
}

// Realistic tactile paper tear sound synthesis
function playPaperTearSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.4);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.7));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + 0.35);
    filter.Q.setValueAtTime(2.2, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.4);
  } catch (e) {
    // Audio context safely handled
  }
}

export const CardRevealModal: React.FC<CardRevealModalProps> = ({ revealEvent, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [isTorn, setIsTorn] = useState(false);
  const [showSparks, setShowSparks] = useState(false);

  const isLoss = revealEvent?.isLoss ?? (revealEvent?.revealType === 'loss' || !revealEvent?.revealType?.includes('proof'));

  useEffect(() => {
    if (revealEvent) {
      setVisible(true);
      setIsTorn(false);
      setShowSparks(false);

      // Show the card pristine for 1.8 seconds, then trigger the realistic tear animation & audio
      let tearTimer: NodeJS.Timeout | null = null;
      let sparksTimer: NodeJS.Timeout | null = null;

      if (isLoss) {
        tearTimer = setTimeout(() => {
          setIsTorn(true);
          setShowSparks(true);
          playPaperTearSound();

          sparksTimer = setTimeout(() => {
            setShowSparks(false);
          }, 1200);
        }, 1800);
      }

      // Auto-dismiss after 7.5s
      const closeTimer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 7500);

      return () => {
        if (tearTimer) clearTimeout(tearTimer);
        if (sparksTimer) clearTimeout(sparksTimer);
        clearTimeout(closeTimer);
      };
    } else {
      setVisible(false);
      setIsTorn(false);
      setShowSparks(false);
    }
  }, [revealEvent, isLoss, onClose]);

  if (!revealEvent || !visible) return null;

  const cardDef = getCardDef(revealEvent.card.cardId, revealEvent.card.role, revealEvent.card.variantIndex);
  const roleMeta = ROLES_META[cardDef.role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in pointer-events-auto">
      <div className="relative glass-panel border-2 border-[#c5a059] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-[0_0_60px_rgba(197,160,89,0.4)] overflow-hidden">
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
            {isLoss ? 'Hofkarten-Verlust' : 'Echter Rollenbeweis (Wahrheit)'}
          </span>

          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e0e0e0] leading-tight">
            {revealEvent.playerName}
          </h3>
        </div>

        {/* Big Card Display with Pristine Reveal followed by Physical Tearing Effect (NO text "Zerrissen") */}
        <div className="flex justify-center py-2 relative min-h-[250px] sm:min-h-[280px] items-center">
          <div className="relative w-[170px] h-[255px] sm:w-[190px] sm:h-[285px]">
            {isLoss ? (
              // Two jagged halves tearing apart smoothly in full vibrant color
              <div className="relative w-full h-full">
                {/* Left Torn Piece */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden border border-[#c5a059]/80 shadow-2xl"
                  style={{
                    clipPath: isTorn
                      ? 'polygon(0% 0%, 54% 0%, 47% 20%, 55% 42%, 43% 65%, 53% 85%, 45% 100%, 0% 100%)'
                      : 'none',
                    transform: isTorn
                      ? 'translate(-28px, 16px) rotate(-12deg) scale(0.93)'
                      : 'translate(0px, 0px) rotate(0deg) scale(1)',
                    transition: 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), clip-path 0.2s ease, filter 0.85s ease',
                    filter: isTorn
                      ? 'drop-shadow(-8px 12px 16px rgba(0,0,0,0.9)) saturate(0.85)'
                      : 'drop-shadow(0 0 25px rgba(197,160,89,0.45))'
                  }}
                >
                  <img
                    src={cardDef.image}
                    alt={cardDef.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
                  {/* Subtle jagged edge fiber highlight on the split */}
                  {isTorn && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10 pointer-events-none" />
                  )}
                </div>

                {/* Right Torn Piece (Splits and drifts away) */}
                {isTorn && (
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden border border-[#c5a059]/80 shadow-2xl animate-fade-in"
                    style={{
                      clipPath: 'polygon(54% 0%, 100% 0%, 100% 100%, 45% 100%, 53% 85%, 43% 65%, 55% 42%, 47% 20%)',
                      transform: 'translate(28px, 22px) rotate(12deg) scale(0.93)',
                      transition: 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
                      filter: 'drop-shadow(8px 12px 16px rgba(0,0,0,0.9)) saturate(0.85)'
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

                {/* Dynamic Tear Flash & Sparks along the tear seam */}
                {showSparks && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-1 h-full bg-gradient-to-b from-red-400 via-amber-300 to-red-500 opacity-90 blur-[2px] animate-pulse" />
                    <div className="absolute w-24 h-24 bg-red-500/30 rounded-full blur-xl animate-ping" />
                  </div>
                )}
              </div>
            ) : (
              // Unbroken Proof Card with Gold / Emerald Aura
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
