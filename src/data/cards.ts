import { CardDef, RoleKey, ActionKey, ActionDefinition } from '../types';

import kanzler1 from '../assets/images/kanzler_card_1787590668383.jpg';
import kanzler2 from '../assets/images/kanzlerin_card_1787590845712.jpg';
import kanzler3 from '../assets/images/kanzler_elder_card_1787590920279.jpg';

import strassenraeuber1 from '../assets/images/strassenraeuber_card_1787590685292.jpg';
import strassenraeuber2 from '../assets/images/strassenraeuberin_card_1787590859654.jpg';
import strassenraeuber3 from '../assets/images/strassenraeuber_mask_card_1787590935913.jpg';

import spion1 from '../assets/images/spion_card_1787590697235.jpg';
import spion2 from '../assets/images/spionin_card_1787590874034.jpg';
import spion3 from '../assets/images/spion_analyst_card_1787590949296.jpg';

import bodyguard1 from '../assets/images/bodyguard_card_1787590727979.jpg';
import bodyguard2 from '../assets/images/bodyguardin_card_1787590888013.jpg';
import bodyguard3 from '../assets/images/bodyguard_bald_card_1787590962433.jpg';

import bluthund1 from '../assets/images/bluthund_card_1787590748832.jpg';
import bluthund2 from '../assets/images/bluthuendin_card_1787590901530.jpg';
import bluthund3 from '../assets/images/bluthund_fedora_card_1787590977371.jpg';

import cardBackImg from '../assets/images/grafik_deck_1787590648412.jpg';

export const CARD_BACK_IMAGE = cardBackImg;

export const ROLES_META: Record<RoleKey, {
  name: string;
  action: string;
  blocks: string;
  color: string;
  deep: string;
  emblem: string;
}> = {
  kanzler: {
    name: 'Kanzler',
    action: 'Steuern — nimmt 3 Münzen aus der Staatskasse',
    blocks: 'Entwicklungshilfe (+2 Münzen)',
    color: '#D4AF37', // Gold
    deep: '#5A4308',
    emblem: '🦅'
  },
  strassenraeuber: {
    name: 'Straßenräuber',
    action: 'Raubzug — stiehlt 2 Münzen von einem Zielspieler',
    blocks: 'Raubzug (wehrt Diebstahl ab)',
    color: '#D94D43', // Crimson
    deep: '#5A1612',
    emblem: '💰'
  },
  spion: {
    name: 'Spion',
    action: 'Austausch — zieht 2 Hofkarten, wählt & tauscht geheim',
    blocks: 'Raubzug (wehrt Diebstahl ab)',
    color: '#2DD4BF', // Teal
    deep: '#0F4840',
    emblem: '🎩'
  },
  bodyguard: {
    name: 'Bodyguard',
    action: '— (Passiv: keine eigene Angriffsaktion)',
    blocks: 'Mordanschlag (schützt Ziel vor dem Bluthund)',
    color: '#38BDF8', // Shield Blue
    deep: '#0C4A6E',
    emblem: '🛡️'
  },
  bluthund: {
    name: 'Bluthund',
    action: 'Mordanschlag — zahlt 3 Münzen, eliminiert 1 Hofeinfluss',
    blocks: '— (keine Blockfunktion)',
    color: '#A855F7', // Deep Royal Purple
    deep: '#3B0764',
    emblem: '🐺'
  }
};

export const ALL_CARD_DEFS: CardDef[] = [
  // KANZLER (3 Karten)
  {
    id: 'kanzler_1',
    role: 'kanzler',
    variantIndex: 0,
    displayName: 'Kanzler',
    title: 'Staatskanzler',
    image: kanzler1,
    roleName: 'Kanzler',
    roleDescription: 'Sammelt Steuern für die Staatskasse und blockiert Entwicklungshilfe.',
    actionText: 'Steuern: +3 Münzen',
    blocksText: 'Blockt Entwicklungshilfe',
    themeColor: '#D4AF37',
    deepColor: '#5A4308'
  },
  {
    id: 'kanzler_2',
    role: 'kanzler',
    variantIndex: 1,
    displayName: 'Kanzlerin',
    title: 'Bundeskanzlerin',
    image: kanzler2,
    roleName: 'Kanzlerin',
    roleDescription: 'Regiert mit eiserner Diplomatie und überwacht alle Steuerabgaben.',
    actionText: 'Steuern: +3 Münzen',
    blocksText: 'Blockt Entwicklungshilfe',
    themeColor: '#D4AF37',
    deepColor: '#5A4308'
  },
  {
    id: 'kanzler_3',
    role: 'kanzler',
    variantIndex: 2,
    displayName: 'Kanzler',
    title: 'Altkanzler',
    image: kanzler3,
    roleName: 'Kanzler',
    roleDescription: 'Erfahrener Staatsmann mit tiefgreifendem politischem Einfluss.',
    actionText: 'Steuern: +3 Münzen',
    blocksText: 'Blockt Entwicklungshilfe',
    themeColor: '#D4AF37',
    deepColor: '#5A4308'
  },

  // STRASSENRÄUBER (3 Karten)
  {
    id: 'strassenraeuber_1',
    role: 'strassenraeuber',
    variantIndex: 0,
    displayName: 'Straßenräuber',
    title: 'Gassendieb',
    image: strassenraeuber1,
    roleName: 'Straßenräuber',
    roleDescription: 'Erpresst gegnerische Spieler und entwendet deren Münzen.',
    actionText: 'Raubzug: Klaut 2 Münzen',
    blocksText: 'Blockt Raubzug',
    themeColor: '#D94D43',
    deepColor: '#5A1612'
  },
  {
    id: 'strassenraeuber_2',
    role: 'strassenraeuber',
    variantIndex: 1,
    displayName: 'Straßenräuberin',
    title: 'Bandenchefin',
    image: strassenraeuber2,
    roleName: 'Straßenräuberin',
    roleDescription: 'Führt die Unterwelt mit List und Schnelligkeit an.',
    actionText: 'Raubzug: Klaut 2 Münzen',
    blocksText: 'Blockt Raubzug',
    themeColor: '#D94D43',
    deepColor: '#5A1612'
  },
  {
    id: 'strassenraeuber_3',
    role: 'strassenraeuber',
    variantIndex: 2,
    displayName: 'Straßenräuber',
    title: 'Schattenräuber',
    image: strassenraeuber3,
    roleName: 'Straßenräuber',
    roleDescription: 'Vermummt und unberechenbar in den dunklen Winkeln der Stadt.',
    actionText: 'Raubzug: Klaut 2 Münzen',
    blocksText: 'Blockt Raubzug',
    themeColor: '#D94D43',
    deepColor: '#5A1612'
  },

  // SPION (3 Karten)
  {
    id: 'spion_1',
    role: 'spion',
    variantIndex: 0,
    displayName: 'Spion',
    title: 'Geheimagent',
    image: spion1,
    roleName: 'Spion',
    roleDescription: 'Infiltriert den Hof und tauscht verdeckte Karten nach Belieben aus.',
    actionText: 'Austausch: Zieht 2 Karten & tauscht',
    blocksText: 'Blockt Raubzug',
    themeColor: '#2DD4BF',
    deepColor: '#0F4840'
  },
  {
    id: 'spion_2',
    role: 'spion',
    variantIndex: 1,
    displayName: 'Spionin',
    title: 'Doppelagentin',
    image: spion2,
    roleName: 'Spionin',
    roleDescription: 'Verführerisch und scharfsinnig — sieht alles, bleibt ungesehen.',
    actionText: 'Austausch: Zieht 2 Karten & tauscht',
    blocksText: 'Blockt Raubzug',
    themeColor: '#2DD4BF',
    deepColor: '#0F4840'
  },
  {
    id: 'spion_3',
    role: 'spion',
    variantIndex: 2,
    displayName: 'Spion',
    title: 'Cyber-Analyst',
    image: spion3,
    roleName: 'Spion',
    roleDescription: 'Analysiert geheime Datenströme und verschiebt die Karten im Hintergrund.',
    actionText: 'Austausch: Zieht 2 Karten & tauscht',
    blocksText: 'Blockt Raubzug',
    themeColor: '#2DD4BF',
    deepColor: '#0F4840'
  },

  // BODYGUARD (3 Karten)
  {
    id: 'bodyguard_1',
    role: 'bodyguard',
    variantIndex: 0,
    displayName: 'Bodyguard',
    title: 'Personenschützer',
    image: bodyguard1,
    roleName: 'Bodyguard',
    roleDescription: 'Schützt das Ziel bedingungslos vor tödlichen Mordanschlägen.',
    actionText: 'Passiv (Schutzrolle)',
    blocksText: 'Blockt Mordanschlag',
    themeColor: '#38BDF8',
    deepColor: '#0C4A6E'
  },
  {
    id: 'bodyguard_2',
    role: 'bodyguard',
    variantIndex: 1,
    displayName: 'Bodyguardin',
    title: 'Sicherheitschefin',
    image: bodyguard2,
    roleName: 'Bodyguardin',
    roleDescription: 'Aufmerksam und unnachgiebig — wehrt jeden Anschlag sofort ab.',
    actionText: 'Passiv (Schutzrolle)',
    blocksText: 'Blockt Mordanschlag',
    themeColor: '#38BDF8',
    deepColor: '#0C4A6E'
  },
  {
    id: 'bodyguard_3',
    role: 'bodyguard',
    variantIndex: 2,
    displayName: 'Bodyguard',
    title: 'Elite-Wächter',
    image: bodyguard3,
    roleName: 'Bodyguard',
    roleDescription: 'Ein menschlicher Schild gegen jede Bedrohung am Tisch.',
    actionText: 'Passiv (Schutzrolle)',
    blocksText: 'Blockt Mordanschlag',
    themeColor: '#38BDF8',
    deepColor: '#0C4A6E'
  },

  // BLUTHUND (3 Karten)
  {
    id: 'bluthund_1',
    role: 'bluthund',
    variantIndex: 0,
    displayName: 'Bluthund',
    title: 'Auftragsmörder',
    image: bluthund1,
    roleName: 'Bluthund',
    roleDescription: 'Führt für 3 Münzen einen gezielten Mordanschlag auf ein Ziel aus.',
    actionText: 'Mordanschlag: 3 Münzen → Eliminiert Einfluss',
    blocksText: 'Keine Blockfunktion',
    themeColor: '#A855F7',
    deepColor: '#3B0764'
  },
  {
    id: 'bluthund_2',
    role: 'bluthund',
    variantIndex: 1,
    displayName: 'Bluthündin',
    title: 'Schattenattentäterin',
    image: bluthund2,
    roleName: 'Bluthündin',
    roleDescription: 'Lautlos, tödlich und unaufhaltsam im Auftrag ihrer Verbündeten.',
    actionText: 'Mordanschlag: 3 Münzen → Eliminiert Einfluss',
    blocksText: 'Keine Blockfunktion',
    themeColor: '#A855F7',
    deepColor: '#3B0764'
  },
  {
    id: 'bluthund_3',
    role: 'bluthund',
    variantIndex: 2,
    displayName: 'Bluthund',
    title: 'Syndikatsboss',
    image: bluthund3,
    roleName: 'Bluthund',
    roleDescription: 'Erlässt das Todesurteil mit unverhohlener Präzision.',
    actionText: 'Mordanschlag: 3 Münzen → Eliminiert Einfluss',
    blocksText: 'Keine Blockfunktion',
    themeColor: '#A855F7',
    deepColor: '#3B0764'
  }
];

export const CARD_DEF_BY_ID = ALL_CARD_DEFS.reduce<Record<string, CardDef>>((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export function getCardDef(cardId?: string, role?: RoleKey, variantIndex: number = 0): CardDef {
  if (cardId && CARD_DEF_BY_ID[cardId]) {
    return CARD_DEF_BY_ID[cardId];
  }
  if (role) {
    const matching = ALL_CARD_DEFS.filter(c => c.role === role);
    return matching[variantIndex % matching.length] || matching[0];
  }
  return ALL_CARD_DEFS[0];
}

export const GAME_ACTIONS: Record<ActionKey, ActionDefinition> = {
  einkommen: {
    key: 'einkommen',
    label: 'Einkommen',
    desc: 'Basis: Nimm 1 Münze aus der Staatskasse',
    role: null,
    cost: 0,
    coinsGain: 1,
    targeted: false,
    challengeable: false,
    blockable: false,
    blockRoles: [],
    blockEligibility: 'anyone'
  },
  fremde_hilfe: {
    key: 'fremde_hilfe',
    label: 'Entwicklungshilfe',
    desc: 'Basis: Nimm 2 Münzen (Kanzler kann blocken)',
    role: null,
    cost: 0,
    coinsGain: 2,
    targeted: false,
    challengeable: false,
    blockable: true,
    blockRoles: ['kanzler'],
    blockEligibility: 'anyone'
  },
  staatsstreich: {
    key: 'staatsstreich',
    label: 'Coup (Staatsstreich)',
    desc: 'Zahle 7 Münzen — Ein Zielspieler verliert sofort 1 Einfluss (nicht abwendbar). Pflicht bei 10+ Münzen.',
    role: null,
    cost: 7,
    coinsGain: 0,
    targeted: true,
    challengeable: false,
    blockable: false,
    blockRoles: [],
    blockEligibility: 'target'
  },
  steuer: {
    key: 'steuer',
    label: 'Steuern',
    desc: 'Kanzler: Nimm 3 Münzen aus der Staatskasse',
    role: 'kanzler',
    cost: 0,
    coinsGain: 3,
    targeted: false,
    challengeable: true,
    blockable: false,
    blockRoles: [],
    blockEligibility: 'anyone'
  },
  raubzug: {
    key: 'raubzug',
    label: 'Raubzug',
    desc: 'Straßenräuber: Stiehl 2 Münzen von einem Mitspieler',
    role: 'strassenraeuber',
    cost: 0,
    coinsGain: 0,
    targeted: true,
    challengeable: true,
    blockable: true,
    blockRoles: ['strassenraeuber', 'spion'],
    blockEligibility: 'target'
  },
  anschlag: {
    key: 'anschlag',
    label: 'Mordanschlag',
    desc: 'Bluthund: Zahle 3 Münzen — Eliminiere 1 Einfluss eines Spielers',
    role: 'bluthund',
    cost: 3,
    coinsGain: 0,
    targeted: true,
    challengeable: true,
    blockable: true,
    blockRoles: ['bodyguard'],
    blockEligibility: 'target'
  },
  tausch: {
    key: 'tausch',
    label: 'Austausch',
    desc: 'Spion: Ziehe 2 Hofkarten, wähle geheim und mische den Rest zurück',
    role: 'spion',
    cost: 0,
    coinsGain: 0,
    targeted: false,
    challengeable: true,
    blockable: false,
    blockRoles: [],
    blockEligibility: 'anyone',
    isExchange: true
  }
};
