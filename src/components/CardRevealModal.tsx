import React, { useEffect, useState } from 'react';
import { CardRevealEvent } from '../types';
import { CardDisplay } from './CardDisplay';
import { ShieldAlert, X, Eye } from 'lucide-react';

interface CardRevealModalProps {
  revealEvent: CardRevealEvent | null;
  onClose: () => void;
}

export const CardRevealModal: React.FC<CardRevealModalProps> = ({ revealEvent, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (revealEvent) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 7000); // Auto-dismiss after 7s
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [revealEvent, onClose]);

  if (!revealEvent || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative glass-panel border-2 border-[#c5a059] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(197,160,89,0.4)]">
        {/* Close Button */}
        <button
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full glass hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          title="Schließen"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Tag */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl bg-[#c5a05922] border border-[#c5a059] flex items-center justify-center text-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.3)]">
            <Eye className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-bold">
            Hofkarte Aufgedeckt
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#e0e0e0] leading-tight">
            {revealEvent.playerName}
          </h3>
        </div>

        {/* Big Card Display */}
        <div className="flex justify-center py-2">
          <div className="transform transition-transform hover:scale-105 shadow-2xl">
            <CardDisplay
              role={revealEvent.card.role}
              variantIndex={revealEvent.card.variantIndex}
              displayName={revealEvent.card.displayName}
              alive={revealEvent.card.alive}
              size="lg"
            />
          </div>
        </div>

        {/* Reason Banner */}
        <div className="p-3 rounded-xl bg-[#c5a05915] border border-[#c5a05944] text-xs text-[#c5a059] font-medium leading-relaxed">
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
          Verstanden
        </button>
      </div>
    </div>
  );
};
