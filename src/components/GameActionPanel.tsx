import React, { useState } from 'react';
import { ActionKey, PlayerCardState, PlayerState } from '../types';
import { GAME_ACTIONS, ROLES_META, getCardDef } from '../data/cards';
import { Swords, Shield, Target, AlertTriangle, Coins, Sparkles, ArrowRight } from 'lucide-react';

interface GameActionPanelProps {
  myCoins: number;
  myHand: PlayerCardState[];
  players: PlayerState[];
  myId: string;
  isMyTurn: boolean;
  isPending: boolean;
  onDeclareAction: (actionKey: ActionKey, targetId?: string) => void;
  id?: string;
}

export const GameActionPanel: React.FC<GameActionPanelProps> = ({
  myCoins,
  myHand,
  players,
  myId,
  isMyTurn,
  isPending,
  onDeclareAction,
  id
}) => {
  const [selectedTargetAction, setSelectedTargetAction] = useState<ActionKey | null>(null);

  const aliveHandRoles = myHand.filter(c => c.alive).map(c => c.role);
  const eligibleTargets = players.filter(p => p.id !== myId && !p.eliminated);
  const forcedCoup = myCoins >= 10;

  const handleActionClick = (actionKey: ActionKey) => {
    const def = GAME_ACTIONS[actionKey];
    if (def.targeted) {
      if (selectedTargetAction === actionKey) {
        setSelectedTargetAction(null);
      } else {
        setSelectedTargetAction(actionKey);
      }
      return;
    }
    onDeclareAction(actionKey);
  };

  const handleSelectTarget = (targetId: string) => {
    if (selectedTargetAction) {
      onDeclareAction(selectedTargetAction, targetId);
      setSelectedTargetAction(null);
    }
  };

  return (
    <div id={id} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-[#c5a059]" />
          <h2 className="font-serif text-base font-bold text-[#e0e0e0]">
            Hofaktionen
          </h2>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] inline-block shadow-[0_0_6px_#c5a059]" /> Echte Rolle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Bluff
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" /> Allgemein
          </span>
        </div>
      </div>

      {!isMyTurn ? (
        <div className="text-center py-6 text-zinc-400 text-xs italic glass rounded-xl border border-white/5">
          {isPending ? 'Eine Aktion wird gerade im Rat verhandelt …' : 'Warte, bis du an der Reihe bist.'}
        </div>
      ) : (
        <div className="space-y-2">
          {forcedCoup && (
            <div className="p-3 bg-[#c5a05915] border border-[#c5a05966] rounded-xl text-xs text-[#c5a059] flex items-center gap-2.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#c5a059] flex-shrink-0 animate-bounce" />
              <span>
                <strong>10+ Münzen Regel:</strong> Du besitzt 10 oder mehr Münzen und musst einen Staatsstreich (Coup) ausführen!
              </span>
            </div>
          )}

          {Object.values(GAME_ACTIONS).map(action => {
            const isRoleAction = !!action.role;
            const hasRealCard = action.role ? aliveHandRoles.includes(action.role) : false;
            const isTargeted = action.targeted;
            const notEnoughCoins = action.cost > 0 && myCoins < action.cost;
            const disabled = (forcedCoup && action.key !== 'staatsstreich') || notEnoughCoins || (isTargeted && eligibleTargets.length === 0);

            // Badge and outline styling
            let badgeClass = 'bg-white/5 text-zinc-400 border-white/10';
            let badgeText = 'Allgemein';
            let cardBorder = 'border-white/5 hover:border-[#c5a05955]';

            if (isRoleAction) {
              if (hasRealCard) {
                badgeClass = 'bg-[#c5a05922] text-[#c5a059] border-[#c5a05955]';
                badgeText = 'Echte Rolle';
                cardBorder = 'border-[#c5a05944] hover:border-[#c5a059] bg-[#c5a05908]';
              } else {
                badgeClass = 'bg-red-950/40 text-red-300 border-red-500/30';
                badgeText = 'Bluff';
                cardBorder = 'border-red-900/30 hover:border-red-500/50 bg-red-950/05';
              }
            }

            const roleCard = action.role ? getCardDef(undefined, action.role) : null;
            const isSelected = selectedTargetAction === action.key;

            return (
              <div key={action.key} className="space-y-2">
                <button
                  onClick={() => handleActionClick(action.key)}
                  disabled={disabled}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${cardBorder} ${
                    isSelected ? 'ring-1 ring-[#c5a059] bg-[#c5a05915] border-[#c5a059]' : 'bg-[#141414]/70'
                  } ${disabled ? 'opacity-35 cursor-not-allowed' : 'hover:scale-[1.006] cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Role Card Thumbnail */}
                    {roleCard ? (
                      <div className="w-9 h-12 rounded-lg overflow-hidden border border-[#c5a05955] flex-shrink-0 shadow relative bg-black/60">
                        <img
                          src={roleCard.image}
                          alt={roleCard.displayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-center font-mono text-[#c5a059] truncate px-0.5">
                          {roleCard.roleName}
                        </span>
                      </div>
                    ) : (
                      <div className="w-9 h-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0 text-xs text-zinc-400">
                        {action.key === 'staatsstreich' ? '👑' : '🪙'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-bold text-xs sm:text-sm text-[#e0e0e0]">
                          {action.label}
                        </span>
                        {action.cost > 0 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#c5a05922] text-[#c5a059] font-bold border border-[#c5a05944] font-mono">
                            {action.cost} Münzen
                          </span>
                        )}
                        {action.coinsGain > 0 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 font-mono">
                            +{action.coinsGain} {action.coinsGain === 1 ? 'Münze' : 'Münzen'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 truncate font-sans">
                        {action.desc}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass}`}>
                      {badgeText}
                    </span>
                    {isTargeted && (
                      <Target className={`w-3.5 h-3.5 ${isSelected ? 'text-[#c5a059]' : 'text-zinc-600'}`} />
                    )}
                  </div>
                </button>

                {/* Target Selection Drawer */}
                {isSelected && (
                  <div className="p-3 bg-[#111111] border border-[#c5a05955] rounded-xl space-y-2">
                    <div className="text-xs font-serif font-bold gold-accent flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>Wähle ein Ziel für {action.label}:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {eligibleTargets.map(target => (
                        <button
                          key={target.id}
                          onClick={() => handleSelectTarget(target.id)}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[#181818] hover:bg-[#c5a05915] border border-white/5 hover:border-[#c5a059] text-left transition-all text-xs group cursor-pointer"
                        >
                          <div>
                            <div className="font-semibold text-zinc-200 group-hover:text-[#c5a059]">
                              Nr. {target.position} — {target.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2 font-mono">
                              <span>💰 {target.coins} Münzen</span>
                              <span>🛡️ {target.influence} Einfluss</span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-[#c5a059] transform group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
