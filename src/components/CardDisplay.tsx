import React from 'react';
import { CardDef, RoleKey, PlayerCardState } from '../types';
import { getCardDef, CARD_BACK_IMAGE, ROLES_META } from '../data/cards';
import { Shield, Eye, Skull, Check } from 'lucide-react';

export interface CardDisplayProps {
  cardId?: string;
  role?: RoleKey;
  variantIndex?: number;
  displayName?: string;
  alive?: boolean;
  isHidden?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  selected?: boolean;
  selectable?: boolean;
  onClick?: () => void;
  showDetails?: boolean;
  className?: string;
  id?: string;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
  cardId,
  role,
  variantIndex = 0,
  displayName,
  alive = true,
  isHidden = false,
  size = 'md',
  selected = false,
  selectable = false,
  onClick,
  showDetails = false,
  className = '',
  id
}) => {
  const cardDef: CardDef = getCardDef(cardId, role, variantIndex);
  const cardName = displayName || cardDef.displayName;
  const roleMeta = role ? ROLES_META[role] : (cardDef.role ? ROLES_META[cardDef.role] : null);

  // Standardized aspect ratio 2:3 with consistent dimensions across the entire app
  const sizeClasses = {
    xs: 'w-[40px] h-[60px] rounded-md text-[9px]',
    sm: 'w-[56px] h-[84px] rounded-md text-[10px]',
    md: 'w-[78px] h-[117px] rounded-lg text-xs',
    lg: 'w-[110px] h-[165px] rounded-xl text-sm',
    xl: 'w-[140px] h-[210px] rounded-2xl text-base'
  }[size];

  if (isHidden) {
    return (
      <div
        id={id}
        onClick={onClick}
        className={`relative ${sizeClasses} flex-shrink-0 cursor-pointer overflow-hidden border border-[#c5a05944] bg-[#111111] shadow-md transition-all duration-200 select-none hover:scale-105 hover:border-[#c5a059] hover:shadow-[0_0_15px_rgba(197,160,89,0.2)] ${
          selected ? 'ring-2 ring-[#c5a059] scale-105 shadow-[0_0_20px_rgba(197,160,89,0.4)]' : ''
        } ${className}`}
        title="Verdeckte Hofkarte"
      >
        <img
          src={CARD_BACK_IMAGE}
          alt="Maskerade Kartenrückseite"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-1 text-center font-serif text-[9px] font-bold gold-accent tracking-widest">
          MASKERADE
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      onClick={selectable || onClick ? onClick : undefined}
      className={`group relative ${sizeClasses} flex-shrink-0 overflow-hidden border shadow-lg transition-all duration-200 select-none ${
        alive
          ? 'border-[#c5a05955] hover:border-[#c5a059] hover:shadow-[0_0_15px_rgba(197,160,89,0.2)]'
          : 'border-red-900/60 grayscale-[0.85] opacity-60'
      } ${selectable ? 'cursor-pointer hover:scale-105' : ''} ${
        selected ? 'ring-2 ring-[#c5a059] scale-105 shadow-[0_0_20px_rgba(197,160,89,0.4)]' : ''
      } ${className}`}
      title={`${cardName} (${cardDef.roleName})`}
    >
      {/* Background artwork */}
      <img
        src={cardDef.image}
        alt={cardName}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        referrerPolicy="no-referrer"
        loading="lazy"
      />

      {/* Top Banner with Emblem */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/85 via-black/50 to-transparent p-1 flex items-center justify-between">
        <span className="text-[11px] leading-none drop-shadow-md">
          {roleMeta?.emblem || '🎭'}
        </span>
        {selected && (
          <span className="w-4 h-4 rounded-full bg-[#c5a059] text-black flex items-center justify-center font-bold text-[10px] shadow">
            <Check className="w-3 h-3 stroke-[3]" />
          </span>
        )}
      </div>

      {/* Bottom Name Plate */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-3 pb-1 px-1 text-center">
        <div className="font-serif font-bold gold-accent truncate leading-tight drop-shadow-md">
          {cardName}
        </div>
        {size !== 'xs' && size !== 'sm' && (
          <div className="text-[8px] text-zinc-400 font-mono tracking-wider uppercase truncate mt-0.5">
            {cardDef.roleName}
          </div>
        )}
      </div>

      {/* Eliminated Overlay if dead */}
      {!alive && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-1 backdrop-blur-[1px]">
          <div className="w-6 h-6 rounded-full bg-red-950/90 border border-red-500/60 flex items-center justify-center text-red-400 shadow-md">
            <Skull className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif font-extrabold text-[9px] text-red-300 tracking-wider uppercase mt-1 drop-shadow">
            Aufgedeckt
          </span>
        </div>
      )}

      {/* Optional details expanded overlay on hover or preview */}
      {showDetails && (
        <div className="absolute inset-0 bg-black/95 p-2 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between text-[10px]">
          <div>
            <div className="font-bold gold-accent font-serif">{cardName}</div>
            <div className="text-zinc-300 mt-1 font-sans">{cardDef.actionText}</div>
          </div>
          <div className="gold-accent text-[9px] font-mono">{cardDef.blocksText}</div>
        </div>
      )}
    </div>
  );
};
