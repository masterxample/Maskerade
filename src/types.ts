export type RoleKey = 'kanzler' | 'strassenraeuber' | 'spion' | 'bodyguard' | 'bluthund';

export type ActionKey = 
  | 'einkommen'
  | 'fremde_hilfe'
  | 'staatsstreich'
  | 'steuer'
  | 'raubzug'
  | 'anschlag'
  | 'tausch';

export interface CardDef {
  id: string;
  role: RoleKey;
  variantIndex: number;
  displayName: string;
  title: string;
  image: string;
  roleName: string;
  roleDescription: string;
  actionText: string;
  blocksText: string;
  themeColor: string;
  deepColor: string;
}

export interface PlayerCardState {
  cardId: string;
  role: RoleKey;
  variantIndex: number;
  displayName: string;
  alive: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  position: number | null;
  coins: number;
  influence: number;
  eliminated: boolean;
  cardsCount: number;
  revealedCards: PlayerCardState[];
}

export interface PendingAction {
  phase: 'response' | 'blockResponse' | 'loseInfluence' | 'exchange' | null;
  action: ActionKey;
  actorId: string;
  targetId: string | null;
  responded: string[];
  block: {
    playerId: string;
    role: RoleKey;
  } | null;
  blockResponded: string[];
  waitingOn: string | null;
  exchangeKeepCount?: number;
}

export interface GameState {
  code: string;
  maxPlayers: number;
  started: boolean;
  hostId: string;
  turnIndex: number;
  players: PlayerState[];
  pending: PendingAction | null;
  turnDeadline?: number | null;
  turnTimeLimit?: number;
}

export interface CardRevealEvent {
  id: string;
  playerId: string;
  playerName: string;
  card: PlayerCardState;
  reason: string;
  timestamp: number;
  revealType?: 'loss' | 'proof';
  isLoss?: boolean;
}

export interface ActionDefinition {
  key: ActionKey;
  label: string;
  desc: string;
  role: RoleKey | null;
  cost: number;
  coinsGain: number;
  targeted: boolean;
  challengeable: boolean;
  blockable: boolean;
  blockRoles: RoleKey[];
  blockEligibility: 'anyone' | 'target';
  isExchange?: boolean;
}
