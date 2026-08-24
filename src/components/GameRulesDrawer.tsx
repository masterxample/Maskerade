import React from 'react';
import { ROLES_META, ALL_CARD_DEFS } from '../data/cards';
import { CardDisplay } from './CardDisplay';
import { BookOpen, Shield, Swords, AlertTriangle, X } from 'lucide-react';

interface GameRulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameRulesDrawer: React.FC<GameRulesDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex justify-end">
      <div className="bg-[#0d0d0d] border-l border-[#c5a05944] w-full max-w-xl h-full overflow-y-auto p-6 sm:p-8 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#c5a059]" />
            <h2 className="font-serif text-xl font-bold text-[#e0e0e0]">
              Spielregeln & Hofkarten
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 mt-6 text-xs sm:text-sm text-zinc-300">
          {/* Overview */}
          <div className="glass rounded-2xl p-5 space-y-2 border border-[#c5a05933]">
            <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-semibold">
              Überblick
            </span>
            <h3 className="font-serif text-base font-bold text-[#e0e0e0]">
              Grundprinzip von Maskerade
            </h3>
            <p className="leading-relaxed text-zinc-300 font-sans text-xs">
              Jeder Spieler startet mit <strong className="gold-accent">2 Münzen</strong> und <strong className="gold-accent">2 verdeckten Hofkarten</strong> (= dein politischer Einfluss).
              Verlierst du beide Karten, scheidest du aus. Du darfst jede Hofkarten-Aktion behaupten, egal ob du die entsprechende Karte tatsächlich besitzt — <strong className="text-white">Bluffen ist ausdrücklich erlaubt</strong>!
            </p>
          </div>

          {/* Basis Aktionen */}
          <div className="space-y-3">
            <h3 className="font-serif text-base font-bold gold-accent flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#c5a059]" />
              <span>Freie Basis-Aktionen (Nicht anfechtbar)</span>
            </h3>
            <div className="space-y-2">
              <div className="p-3.5 glass rounded-xl border border-white/5">
                <strong className="text-white font-serif">Einkommen:</strong> <span className="text-zinc-300">+1 Münze aus der Staatskasse.</span>
              </div>
              <div className="p-3.5 glass rounded-xl border border-white/5">
                <strong className="text-white font-serif">Entwicklungshilfe:</strong> <span className="text-zinc-300">+2 Münzen (kann von jedem Spieler, der den <em>Kanzler</em> behauptet, geblockt werden).</span>
              </div>
              <div className="p-3.5 glass rounded-xl border border-white/5">
                <strong className="text-white font-serif">Staatsstreich (Coup):</strong> <span className="text-zinc-300">Zahle 7 Münzen. Ein Zielspieler verliert sofort 1 Einfluss. Diese Aktion kann weder geblockt noch angefochten werden. <strong className="gold-accent">Ab 10 Münzen ist der Coup Pflicht.</strong></span>
              </div>
            </div>
          </div>

          {/* Die 5 Rollen & Karten */}
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold gold-accent">
              Die 5 Hofklassen & 15 Kartendesigns
            </h3>

            {(['kanzler', 'strassenraeuber', 'spion', 'bodyguard', 'bluthund'] as const).map(roleKey => {
              const meta = ROLES_META[roleKey];
              const roleCards = ALL_CARD_DEFS.filter(c => c.role === roleKey);

              return (
                <div key={roleKey} className="glass rounded-2xl p-4 sm:p-5 space-y-3 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.emblem}</span>
                      <h4 className="font-serif font-bold text-base text-[#e0e0e0]">
                        {meta.name}
                      </h4>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full glass gold-accent border border-[#c5a05944]">
                      3 Karten im Deck
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 bg-black/60 p-3 rounded-xl border border-white/5 font-sans">
                    <div><strong className="gold-accent">Aktion:</strong> <span className="text-zinc-300">{meta.action}</span></div>
                    <div><strong className="text-sky-300">Verteidigt:</strong> <span className="text-zinc-300">{meta.blocks}</span></div>
                  </div>

                  {/* 3 Uniform Cards Display */}
                  <div className="flex items-center gap-3 overflow-x-auto pt-1 pb-2">
                    {roleCards.map(c => (
                      <div key={c.id} className="flex flex-col items-center">
                        <CardDisplay
                          cardId={c.id}
                          role={c.role}
                          variantIndex={c.variantIndex}
                          displayName={c.displayName}
                          size="sm"
                        />
                        <span className="text-[10px] text-zinc-300 mt-1 truncate max-w-[80px] font-mono">
                          {c.displayName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Anfechten Regeln */}
          <div className="glass rounded-2xl p-4 sm:p-5 space-y-2 border border-red-500/30 bg-red-950/10">
            <h3 className="font-serif text-base font-bold text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Anfechten & Bluffs</span>
            </h3>
            <p className="leading-relaxed text-zinc-300 font-sans text-xs">
              Wer eine Behauptung anzweifelt, fordert den Beweis.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-300 font-sans text-xs">
              <li><strong className="text-white">War es die Wahrheit:</strong> Der Behauptende zeigt die Karte, mischt sie zurück in den Stapel, zieht eine neue geheime Karte und der Anfechtende verliert 1 Einfluss!</li>
              <li><strong className="text-red-300">War es ein Bluff:</strong> Der Behauptende verliert sofort 1 Einfluss und die Aktion scheitert.</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#c5a059] hover:bg-[#d4b980] text-black font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.3)] active:scale-95 transition-all cursor-pointer"
          >
            Verstanden & Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
