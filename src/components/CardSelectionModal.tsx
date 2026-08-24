import React, { useState } from 'react';
import { PlayerCardState } from '../types';
import { CardDisplay } from './CardDisplay';
import { getCardDef, ROLES_META } from '../data/cards';
import { Skull, RefreshCw, X, Check, Shield, Swords } from 'lucide-react';

export interface CardSelectionModalProps {
  type: 'loseInfluence' | 'exchange' | 'inspect';
  cards?: PlayerCardState[];
  keepCount?: number;
  inspectCard?: PlayerCardState | { isHidden: boolean; index?: number };
  onConfirmLoseCard?: (cardId: string) => void;
  onConfirmExchange?: (keepCardIds: string[]) => void;
  onCloseInspect?: () => void;
}

export const CardSelectionModal: React.FC<CardSelectionModalProps> = ({
  type,
  cards = [],
  keepCount = 1,
  inspectCard,
  onConfirmLoseCard,
  onConfirmExchange,
  onCloseInspect
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    cards.length === 1 ? cards[0].cardId : null
  );
  const [selectedExchangeCardIds, setSelectedExchangeCardIds] = useState<string[]>([]);

  const handleToggleExchange = (cardId: string) => {
    if (selectedExchangeCardIds.includes(cardId)) {
      setSelectedExchangeCardIds(selectedExchangeCardIds.filter(id => id !== cardId));
    } else {
      if (selectedExchangeCardIds.length < keepCount) {
        setSelectedExchangeCardIds([...selectedExchangeCardIds, cardId]);
      }
    }
  };

  // Inspect Card Modal
  if (type === 'inspect') {
    if (!inspectCard) return null;
    const isHidden = (inspectCard as any).isHidden;
    const cardDef = !isHidden ? getCardDef((inspectCard as PlayerCardState).cardId, (inspectCard as PlayerCardState).role, (inspectCard as PlayerCardState).variantIndex) : null;
    const roleMeta = cardDef ? ROLES_META[cardDef.role] : null;

    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="glass-panel border-[#c5a05966] rounded-3xl p-6 max-w-sm w-full shadow-[0_0_40px_rgba(197,160,89,0.25)] relative text-center">
          <button
            onClick={onCloseInspect}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {isHidden ? (
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-semibold">
                Geheimes Blatt
              </span>
              <h3 className="font-serif text-xl font-bold text-[#e0e0e0]">
                Verdeckte Hofkarte
              </h3>
              <div className="flex justify-center my-4">
                <CardDisplay isHidden={true} size="xl" />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Diese Karte gehört zur Hand deines Mitspielers und ist geheim. Nur wer blufft oder die Wahrheit sagt, weiß um ihre wahre Identität.
              </p>
            </div>
          ) : cardDef ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-semibold">
                  Hofkarten-Detail
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">{roleMeta?.emblem}</span>
                  <h3 className="font-serif text-xl font-bold text-[#e0e0e0]">
                    {cardDef.displayName}
                  </h3>
                </div>
              </div>

              <div className="flex justify-center my-3">
                <CardDisplay
                  cardId={cardDef.id}
                  role={cardDef.role}
                  variantIndex={cardDef.variantIndex}
                  displayName={cardDef.displayName}
                  alive={(inspectCard as PlayerCardState).alive}
                  size="xl"
                />
              </div>

              <div className="text-left bg-black/60 border border-white/5 rounded-xl p-3.5 space-y-2 text-xs">
                <div>
                  <span className="gold-accent font-bold uppercase tracking-wider text-[9px] block">Rolle</span>
                  <span className="text-[#e0e0e0] font-semibold">{cardDef.roleName} — {cardDef.title}</span>
                </div>
                <div>
                  <span className="gold-accent font-bold uppercase tracking-wider text-[9px] block">Aktion</span>
                  <span className="text-zinc-300">{cardDef.actionText}</span>
                </div>
                <div>
                  <span className="gold-accent font-bold uppercase tracking-wider text-[9px] block">Verteidigung / Block</span>
                  <span className="text-zinc-300">{cardDef.blocksText}</span>
                </div>
              </div>
            </div>
          ) : null}

          <button
            onClick={onCloseInspect}
            className="mt-5 w-full py-2.5 glass hover:bg-white/10 text-zinc-200 hover:text-white font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }

  // Lose Influence Modal
  if (type === 'loseInfluence') {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="glass-panel border-red-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_40px_rgba(239,68,68,0.2)] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400 mx-auto shadow-lg">
            <Skull className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-red-400 font-semibold">
              Verlust
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#e0e0e0]">
              Einflussverlust
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Du musst 1 Hofkarte dauerhaft aufdecken. Wähle die Karte aus, die du preisgeben möchtest:
          </p>

          <div className="flex flex-wrap justify-center gap-4 my-4">
            {cards.map(card => (
              <div key={card.cardId} className="flex flex-col items-center gap-2">
                <CardDisplay
                  cardId={card.cardId}
                  role={card.role}
                  variantIndex={card.variantIndex}
                  displayName={card.displayName}
                  alive={true}
                  size="lg"
                  selectable={true}
                  selected={selectedCardId === card.cardId}
                  onClick={() => setSelectedCardId(card.cardId)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (selectedCardId && onConfirmLoseCard) {
                onConfirmLoseCard(selectedCardId);
              }
            }}
            disabled={!selectedCardId}
            className="w-full py-3.5 bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Skull className="w-4 h-4" />
            <span>Ausgewählte Karte aufdecken</span>
          </button>
        </div>
      </div>
    );
  }

  // Exchange Cards Modal
  if (type === 'exchange') {
    const isReady = selectedExchangeCardIds.length === keepCount;

    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="glass-panel border-[#c5a059] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_40px_rgba(197,160,89,0.25)] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#c5a05922] border border-[#c5a059] flex items-center justify-center text-[#c5a059] mx-auto shadow-lg">
            <RefreshCw className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.25em] gold-accent font-semibold">
              Geheimaktion
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#e0e0e0]">
              Kartentausch des Spions
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Wähle genau <strong className="gold-accent font-bold">{keepCount}</strong> Hofkarte(n), die du auf der Hand behalten möchtest. Der Rest wird geheim zurück in den Stapel gemischt.
          </p>

          <div className="text-xs font-mono font-bold gold-accent bg-black/60 py-1.5 px-4 rounded-full inline-block border border-[#c5a05944]">
            Ausgewählt: {selectedExchangeCardIds.length} von {keepCount}
          </div>

          <div className="flex flex-wrap justify-center gap-3 my-3 max-h-[55vh] overflow-y-auto p-1">
            {cards.map(card => {
              const isSelected = selectedExchangeCardIds.includes(card.cardId);
              return (
                <div key={card.cardId} className="flex flex-col items-center">
                  <CardDisplay
                    cardId={card.cardId}
                    role={card.role}
                    variantIndex={card.variantIndex}
                    displayName={card.displayName}
                    alive={true}
                    size="lg"
                    selectable={true}
                    selected={isSelected}
                    onClick={() => handleToggleExchange(card.cardId)}
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (isReady && onConfirmExchange) {
                onConfirmExchange(selectedExchangeCardIds);
              }
            }}
            disabled={!isReady}
            className="w-full py-3.5 bg-[#c5a059] hover:bg-[#d4b980] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Kartenauswahl bestätigen</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
