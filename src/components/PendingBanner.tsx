import React from 'react';
import { PendingAction, PlayerState, RoleKey } from '../types';
import { GAME_ACTIONS, ROLES_META } from '../data/cards';
import { Shield, Swords, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface PendingBannerProps {
  pending: PendingAction;
  players: PlayerState[];
  myId: string;
  onPass: () => void;
  onChallenge: () => void;
  onBlock: (role: RoleKey) => void;
  onBlockPass: () => void;
  onBlockChallenge: () => void;
  id?: string;
}

export const PendingBanner: React.FC<PendingBannerProps> = ({
  pending,
  players,
  myId,
  onPass,
  onChallenge,
  onBlock,
  onBlockPass,
  onBlockChallenge,
  id
}) => {
  const actor = players.find(p => p.id === pending.actorId);
  const target = pending.targetId ? players.find(p => p.id === pending.targetId) : null;
  const actionDef = GAME_ACTIONS[pending.action];
  const me = players.find(p => p.id === myId);

  if (!actor || !actionDef || !me) return null;

  const isActor = myId === pending.actorId;
  const isTarget = myId === pending.targetId;

  // Phase 1: Action Claimed -> Response (Challenge / Block / Pass)
  if (pending.phase === 'response') {
    const hasResponded = pending.responded.includes(myId);
    const isEligibleToRespond = !isActor && !me.eliminated && !hasResponded;

    // Remaining players we are waiting on
    const waitingPlayers = players
      .filter(p => p.id !== pending.actorId && !p.eliminated && !pending.responded.includes(p.id))
      .map(p => p.name);

    return (
      <div id={id} className="glass-panel border-[#c5a05966] rounded-2xl p-4 sm:p-5 shadow-[0_0_24px_rgba(197,160,89,0.2)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] gold-accent font-bold uppercase tracking-[0.2em] mb-1">
              <Swords className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>Aktions-Ansage im Hof</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#e0e0e0] font-serif">
              <strong className="gold-accent">{actor.name}</strong> beansprucht „<strong className="text-white">{actionDef.label}</strong>“
              {target ? <span> gegen <strong className="text-zinc-200">{target.name}</strong></span> : ''}
              {actionDef.role && (
                <span className="text-xs text-zinc-400 font-sans block mt-1">
                  (Behauptet Hofrolle: <strong className="gold-accent">{ROLES_META[actionDef.role].name}</strong>)
                </span>
              )}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono gold-accent bg-black/60 px-3 py-1 rounded-full border border-[#c5a05944]">
            <Clock className="w-3 h-3 animate-spin text-[#c5a059]" />
            <span>Reaktion</span>
          </div>
        </div>

        {isEligibleToRespond ? (
          <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
            {actionDef.challengeable && (
              <button
                onClick={onChallenge}
                className="px-3.5 py-2 bg-red-900/60 hover:bg-red-800/80 text-red-100 font-bold text-xs rounded-xl border border-red-500/40 shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-300" />
                <span>Anfechten! (Bluff?)</span>
              </button>
            )}

            {actionDef.blockable && (actionDef.blockEligibility === 'anyone' || isTarget) && (
              actionDef.blockRoles.map(roleKey => (
                <button
                  key={roleKey}
                  onClick={() => onBlock(roleKey)}
                  className="px-3.5 py-2 bg-[#c5a05922] hover:bg-[#c5a05933] text-[#c5a059] font-bold text-xs rounded-xl border border-[#c5a05966] shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>Blocken: {ROLES_META[roleKey].name}</span>
                </button>
              ))
            )}

            <button
              onClick={onPass}
              className="px-3.5 py-2 glass hover:bg-white/10 text-zinc-200 hover:text-white font-semibold text-xs rounded-xl border border-white/10 shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Aktion akzeptieren (Passen)</span>
            </button>
          </div>
        ) : (
          <div className="mt-3 text-xs text-zinc-400 italic">
            {isActor
              ? `Warte auf Reaktion der Mitspieler (${waitingPlayers.join(', ') || 'Alle reagiert'}) …`
              : `Du hast reagiert. Warte auf: ${waitingPlayers.join(', ') || 'Auswertung …'}`}
          </div>
        )}
      </div>
    );
  }

  // Phase 2: Block Claimed -> Block Response (Challenge block or Accept block)
  if (pending.phase === 'blockResponse' && pending.block) {
    const blocker = players.find(p => p.id === pending.block!.playerId);
    const isBlocker = myId === pending.block.playerId;
    const hasResponded = pending.blockResponded.includes(myId);
    const isEligibleToRespond = !isBlocker && !me.eliminated && !hasResponded;

    const waitingPlayers = players
      .filter(p => p.id !== pending.block!.playerId && !p.eliminated && !pending.blockResponded.includes(p.id))
      .map(p => p.name);

    return (
      <div id={id} className="glass-panel border-[#c5a05966] rounded-2xl p-4 sm:p-5 shadow-[0_0_24px_rgba(197,160,89,0.2)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] gold-accent font-bold uppercase tracking-[0.2em] mb-1">
              <Shield className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>Verteidigungs-Block</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#e0e0e0] font-serif">
              <strong className="text-white">{blocker ? blocker.name : 'Ein Spieler'}</strong> blockt die Aktion mit{' '}
              <strong className="gold-accent">{ROLES_META[pending.block.role].name}</strong>!
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono gold-accent bg-black/60 px-3 py-1 rounded-full border border-[#c5a05944]">
            <Clock className="w-3 h-3 animate-spin text-[#c5a059]" />
            <span>Blockprüfung</span>
          </div>
        </div>

        {isEligibleToRespond ? (
          <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
            <button
              onClick={onBlockChallenge}
              className="px-3.5 py-2 bg-red-900/60 hover:bg-red-800/80 text-red-100 font-bold text-xs rounded-xl border border-red-500/40 shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-300" />
              <span>Block anfechten! (Hat er die Karte?)</span>
            </button>

            <button
              onClick={onBlockPass}
              className="px-3.5 py-2 glass hover:bg-white/10 text-zinc-200 hover:text-white font-semibold text-xs rounded-xl border border-white/10 shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Block akzeptieren</span>
            </button>
          </div>
        ) : (
          <div className="mt-3 text-xs text-zinc-400 italic">
            {isBlocker
              ? `Warte auf Bestätigung der Mitspieler (${waitingPlayers.join(', ') || 'Alle reagiert'}) …`
              : `Du hast reagiert. Warte auf: ${waitingPlayers.join(', ') || 'Auswertung …'}`}
          </div>
        )}
      </div>
    );
  }

  // Phase 3 & 4: Lose Influence or Exchange waiting states
  if (pending.phase === 'loseInfluence' || pending.phase === 'exchange') {
    const waitingPlayer = players.find(p => p.id === pending.waitingOn);
    return (
      <div id={id} className="glass-panel rounded-2xl p-4 shadow-lg text-center text-xs text-zinc-300">
        <div className="flex items-center justify-center gap-2 font-bold gold-accent text-sm font-serif mb-1">
          <Clock className="w-4 h-4 animate-spin text-[#c5a059]" />
          <span>
            {pending.phase === 'loseInfluence'
              ? `${waitingPlayer ? waitingPlayer.name : 'Ein Spieler'} wählt eine aufzudeckende Hofkarte …`
              : `${waitingPlayer ? waitingPlayer.name : 'Ein Spieler'} führt geheimen Kartentausch durch …`}
          </span>
        </div>
      </div>
    );
  }

  return null;
};
