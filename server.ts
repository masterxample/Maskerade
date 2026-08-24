import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

// Types for server state
export type RoleKey = 'kanzler' | 'strassenraeuber' | 'spion' | 'bodyguard' | 'bluthund';

interface ServerCard {
  cardId: string;
  role: RoleKey;
  variantIndex: number;
  displayName: string;
  alive: boolean;
}

interface ServerPlayer {
  id: string;
  name: string;
  position: number | null;
  coins: number;
  cards: ServerCard[];
  eliminated: boolean;
}

interface PendingState {
  phase: 'response' | 'blockResponse' | 'loseInfluence' | 'exchange' | null;
  action: string;
  actorId: string;
  targetId: string | null;
  responded: string[];
  block: {
    playerId: string;
    role: RoleKey;
  } | null;
  blockResponded: string[];
  waitingOn: string | null;
  _loseCallback?: (() => void) | null;
  _exchangePool?: ServerCard[];
}

interface Room {
  code: string;
  hostId: string;
  maxPlayers: number;
  started: boolean;
  players: ServerPlayer[];
  turnIndex: number;
  deck: ServerCard[];
  pending: PendingState | null;
}

const ROLES_INFO: Record<RoleKey, { name: string; titles: string[] }> = {
  kanzler: { name: 'Kanzler', titles: ['Kanzler', 'Kanzlerin', 'Kanzler'] },
  strassenraeuber: { name: 'Straßenräuber', titles: ['Straßenräuber', 'Straßenräuberin', 'Straßenräuber'] },
  spion: { name: 'Spion', titles: ['Spion', 'Spionin', 'Spion'] },
  bodyguard: { name: 'Bodyguard', titles: ['Bodyguard', 'Bodyguardin', 'Bodyguard'] },
  bluthund: { name: 'Bluthund', titles: ['Bluthund', 'Bluthündin', 'Bluthund'] }
};

const ROLE_KEYS: RoleKey[] = ['kanzler', 'strassenraeuber', 'spion', 'bodyguard', 'bluthund'];
const COPIES_PER_ROLE = 3;

interface ActionDef {
  label: string;
  coins: number;
  cost: number;
  targeted: boolean;
  challengeable: boolean;
  role?: RoleKey;
  blockable: boolean;
  blockRoles?: RoleKey[];
  blockEligibility?: 'anyone' | 'target';
  isExchange?: boolean;
}

const ACTIONS: Record<string, ActionDef> = {
  einkommen: { label: 'Einkommen', coins: 1, cost: 0, targeted: false, challengeable: false, blockable: false },
  fremde_hilfe: { label: 'Entwicklungshilfe', coins: 2, cost: 0, targeted: false, challengeable: false, blockable: true, blockRoles: ['kanzler'], blockEligibility: 'anyone' },
  staatsstreich: { label: 'Coup', coins: 0, cost: 7, targeted: true, challengeable: false, blockable: false },
  steuer: { label: 'Steuern', coins: 3, cost: 0, targeted: false, challengeable: true, role: 'kanzler', blockable: false },
  raubzug: { label: 'Raubzug', coins: 0, cost: 0, targeted: true, challengeable: true, role: 'strassenraeuber', blockable: true, blockRoles: ['strassenraeuber', 'spion'], blockEligibility: 'target' },
  anschlag: { label: 'Mordanschlag', coins: 0, cost: 3, targeted: true, challengeable: true, role: 'bluthund', blockable: true, blockRoles: ['bodyguard'], blockEligibility: 'target' },
  tausch: { label: 'Austausch', coins: 0, cost: 0, targeted: false, challengeable: true, role: 'spion', blockable: false, isExchange: true }
};

function buildDeck(): ServerCard[] {
  const deck: ServerCard[] = [];
  ROLE_KEYS.forEach(roleKey => {
    for (let variant = 0; variant < COPIES_PER_ROLE; variant++) {
      deck.push({
        cardId: `${roleKey}_${variant + 1}`,
        role: roleKey,
        variantIndex: variant,
        displayName: ROLES_INFO[roleKey].titles[variant] || ROLES_INFO[roleKey].name,
        alive: true
      });
    }
  });
  return shuffle(deck);
}

function shuffle<T>(array: T[]): T[] {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roomCodeGen(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) {
    c += chars[Math.floor(Math.random() * chars.length)];
  }
  return c;
}

const rooms: Record<string, Room> = {};

function alivePlayers(room: Room): ServerPlayer[] {
  return room.players.filter(p => !p.eliminated);
}

function influenceCount(p: ServerPlayer): number {
  return p.cards.filter(c => c.alive).length;
}

function playerName(room: Room, id: string): string {
  const p = room.players.find(pl => pl.id === id);
  return p ? p.name : 'Unbekannt';
}

function publicPending(room: Room) {
  if (!room.pending) return null;
  const p = room.pending;
  return {
    phase: p.phase,
    action: p.action,
    actorId: p.actorId,
    targetId: p.targetId,
    responded: p.responded || [],
    block: p.block ? { playerId: p.block.playerId, role: p.block.role } : null,
    blockResponded: p.blockResponded || [],
    waitingOn: p.waitingOn || null
  };
}

function publicState(room: Room) {
  return {
    code: room.code,
    maxPlayers: room.maxPlayers,
    started: room.started,
    hostId: room.hostId,
    turnIndex: room.turnIndex,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      coins: p.coins,
      influence: influenceCount(p),
      eliminated: p.eliminated,
      cardsCount: p.cards.length,
      revealedCards: p.cards.filter(c => !c.alive).map(c => ({
        cardId: c.cardId,
        role: c.role,
        variantIndex: c.variantIndex,
        displayName: c.displayName,
        alive: false
      }))
    })),
    pending: publicPending(room)
  };
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', game: 'Maskerade' });
  });

  function broadcast(room: Room) {
    io.to(room.code).emit('gameState', publicState(room));
  }

  function log(room: Room, msg: string) {
    io.to(room.code).emit('log', msg);
  }

  function sendHand(room: Room, player: ServerPlayer) {
    io.to(player.id).emit('yourHand', player.cards);
  }

  function checkWin(room: Room): boolean {
    const alive = alivePlayers(room);
    if (alive.length <= 1) {
      const winner = alive[0] ? alive[0].name : null;
      io.to(room.code).emit('gameOver', { winnerName: winner });
      room.started = false;
      room.pending = null;
      broadcast(room);
      return true;
    }
    return false;
  }

  function checkEliminated(room: Room, p: ServerPlayer) {
    if (influenceCount(p) === 0 && !p.eliminated) {
      p.eliminated = true;
      log(room, `${p.name} scheidet aus — kein Einfluss mehr übrig.`);
    }
  }

  function nextTurn(room: Room) {
    if (room.players.length === 0) return;
    do {
      room.turnIndex = (room.turnIndex + 1) % room.players.length;
    } while (room.players[room.turnIndex].eliminated && alivePlayers(room).length > 1);

    room.pending = null;
    if (checkWin(room)) return;
    broadcast(room);
  }

  function eligibleResponders(room: Room): string[] {
    if (!room.pending) return [];
    return alivePlayers(room)
      .filter(p => p.id !== room.pending!.actorId)
      .map(p => p.id);
  }

  function startLoseInfluence(room: Room, playerId: string, callback: () => void) {
    const p = room.players.find(pl => pl.id === playerId);
    if (!p || influenceCount(p) === 0) {
      callback();
      return;
    }

    if (influenceCount(p) === 1) {
      const c = p.cards.find(card => card.alive);
      if (c) {
        c.alive = false;
        log(room, `${p.name} deckt die letzte Hofkarte auf: ${c.displayName} (${ROLES_INFO[c.role].name}).`);
      }
      checkEliminated(room, p);
      broadcast(room);
      if (checkWin(room)) return;
      callback();
      return;
    }

    room.pending = room.pending || {
      action: '',
      actorId: '',
      targetId: null,
      phase: null,
      responded: [],
      block: null,
      blockResponded: [],
      waitingOn: null
    };

    room.pending.phase = 'loseInfluence';
    room.pending.waitingOn = playerId;
    room.pending._loseCallback = callback;
    broadcast(room);

    const aliveCards = p.cards.filter(c => c.alive);
    io.to(playerId).emit('chooseLoseCard', aliveCards);
  }

  function resolveChallenge(
    room: Room,
    claimPlayerId: string,
    claimRole: RoleKey,
    challengerId: string,
    callback: (success: boolean) => void
  ) {
    const claimPlayer = room.players.find(p => p.id === claimPlayerId);
    if (!claimPlayer) return;

    const hasCard = claimPlayer.cards.find(c => c.alive && c.role === claimRole);
    if (hasCard) {
      // Player really had the role! Replace card in deck and draw a new one
      claimPlayer.cards = claimPlayer.cards.filter(c => c !== hasCard);
      room.deck.push(hasCard);
      room.deck = shuffle(room.deck);
      const newCard = room.deck.pop();
      if (newCard) {
        newCard.alive = true;
        claimPlayer.cards.push(newCard);
      }
      sendHand(room, claimPlayer);
      log(room, `✓ ${claimPlayer.name} zeigt wahrheitsgemäß ${hasCard.displayName} vor und zieht eine neue geheime Hofkarte.`);
      startLoseInfluence(room, challengerId, () => callback(false));
    } else {
      log(room, `✗ ${claimPlayer.name} kann die Karte (${ROLES_INFO[claimRole].name}) nicht vorweisen — Bluff aufgedeckt!`);
      startLoseInfluence(room, claimPlayerId, () => callback(true));
    }
  }

  function startExchange(room: Room, playerId: string) {
    const p = room.players.find(pl => pl.id === playerId);
    if (!p) return;

    const draw1 = room.deck.pop();
    const draw2 = room.deck.pop();
    const drawn = [draw1, draw2].filter(Boolean) as ServerCard[];

    if (!room.pending) return;
    room.pending.phase = 'exchange';
    room.pending.waitingOn = playerId;
    room.pending._exchangePool = drawn;
    broadcast(room);

    const aliveCards = p.cards.filter(c => c.alive);
    io.to(playerId).emit('chooseExchange', {
      current: aliveCards,
      drawn: drawn,
      keepCount: aliveCards.length
    });
  }

  function resolveAction(room: Room) {
    if (!room.pending) return;
    const actor = room.players.find(p => p.id === room.pending!.actorId);
    const target = room.pending.targetId ? room.players.find(p => p.id === room.pending!.targetId) : null;

    if (!actor) return;

    switch (room.pending.action) {
      case 'einkommen':
        actor.coins += 1;
        log(room, `${actor.name} erhält 1 Münze (Einkommen). Kontostand: ${actor.coins} Münzen.`);
        room.pending = null;
        nextTurn(room);
        return;

      case 'fremde_hilfe':
        actor.coins += 2;
        log(room, `${actor.name} erhält 2 Münzen (Entwicklungshilfe). Kontostand: ${actor.coins} Münzen.`);
        room.pending = null;
        nextTurn(room);
        return;

      case 'steuer':
        actor.coins += 3;
        log(room, `${actor.name} kassiert 3 Münzen (Steuern des Kanzlers). Kontostand: ${actor.coins} Münzen.`);
        room.pending = null;
        nextTurn(room);
        return;

      case 'raubzug': {
        if (!target) return;
        const amt = Math.min(2, target.coins);
        target.coins -= amt;
        actor.coins += amt;
        log(room, `${actor.name} raubt ${amt} Münze(n) von ${target.name}. [${actor.name}: ${actor.coins} | ${target.name}: ${target.coins}]`);
        room.pending = null;
        nextTurn(room);
        return;
      }

      case 'staatsstreich':
        if (!target) return;
        log(room, `${actor.name} führt einen gnadenlosen Staatsstreich (Coup) gegen ${target.name} aus.`);
        startLoseInfluence(room, target.id, () => {
          room.pending = null;
          nextTurn(room);
        });
        return;

      case 'anschlag':
        if (!target) return;
        log(room, `${actor.name}s Mordanschlag trifft ${target.name}.`);
        startLoseInfluence(room, target.id, () => {
          room.pending = null;
          nextTurn(room);
        });
        return;

      case 'tausch':
        startExchange(room, actor.id);
        return;
    }
  }

  // Socket.IO event handling
  io.on('connection', (socket) => {
    socket.on('createRoom', ({ name, maxPlayers }: { name: string; maxPlayers?: number }) => {
      const code = roomCodeGen();
      const room: Room = {
        code,
        hostId: socket.id,
        maxPlayers: Math.max(2, Math.min(6, parseInt(String(maxPlayers), 10) || 4)),
        started: false,
        players: [],
        turnIndex: 0,
        deck: [],
        pending: null
      };

      const playerNameStr = (name || 'Spieler').trim().slice(0, 20);
      room.players.push({
        id: socket.id,
        name: playerNameStr,
        position: null,
        coins: 0,
        cards: [],
        eliminated: false
      });

      rooms[code] = room;
      socket.join(code);
      socket.data.roomCode = code;

      socket.emit('joined', { code, youAreHost: true });
      io.to(code).emit('roomUpdate', publicState(room));
    });

    socket.on('joinRoom', ({ name, code }: { name: string; code: string }) => {
      const roomKey = (code || '').trim().toUpperCase();
      const room = rooms[roomKey];

      if (!room) {
        socket.emit('errorMsg', 'Raum nicht gefunden.');
        return;
      }
      if (room.started) {
        socket.emit('errorMsg', 'Das Spiel läuft bereits.');
        return;
      }
      if (room.players.length >= room.maxPlayers) {
        socket.emit('errorMsg', 'Der Raum ist bereits voll.');
        return;
      }

      const playerNameStr = (name || 'Spieler').trim().slice(0, 20);
      room.players.push({
        id: socket.id,
        name: playerNameStr,
        position: null,
        coins: 0,
        cards: [],
        eliminated: false
      });

      socket.join(room.code);
      socket.data.roomCode = room.code;

      socket.emit('joined', { code: room.code, youAreHost: false });
      io.to(room.code).emit('roomUpdate', publicState(room));
    });

    function initiateGame(room: Room, isRematch: boolean = false) {
      room.started = true;
      room.deck = buildDeck();
      room.pending = null;

      // Randomize turn positions
      const order = shuffle(room.players.map((_, i) => i));
      order.forEach((playerIdx, pos) => {
        room.players[playerIdx].position = pos + 1;
      });
      room.players.sort((a, b) => (a.position || 0) - (b.position || 0));

      room.players.forEach(p => {
        p.coins = 2;
        p.eliminated = false;
        const card1 = room.deck.pop();
        const card2 = room.deck.pop();
        p.cards = [
          card1 ? { ...card1, alive: true } : { cardId: 'kanzler_1', role: 'kanzler', variantIndex: 0, displayName: 'Kanzler', alive: true },
          card2 ? { ...card2, alive: true } : { cardId: 'spion_1', role: 'spion', variantIndex: 0, displayName: 'Spion', alive: true }
        ];
      });

      room.turnIndex = 0;
      io.to(room.code).emit('gameStarted', publicState(room));
      room.players.forEach(p => sendHand(room, p));
      if (isRematch) {
        log(room, '⚡ Ein erneutes Spiel wurde direkt gestartet! Die Hofkarten wurden neu verteilt. Jeder startet mit 2 Münzen.');
      } else {
        log(room, 'Maskerade beginnt! Die Hofkarten wurden verteilt. Jeder Spieler startet mit 2 Münzen.');
      }
    }

    socket.on('startGame', () => {
      const room = rooms[socket.data.roomCode];
      if (!room || room.hostId !== socket.id || room.started) return;
      if (room.players.length < 2) {
        socket.emit('errorMsg', 'Mindestens 2 Spieler sind für den Spielstart nötig.');
        return;
      }
      initiateGame(room, false);
    });

    socket.on('startRematch', () => {
      const room = rooms[socket.data.roomCode];
      if (!room || room.hostId !== socket.id) return;
      if (room.players.length < 2) {
        socket.emit('errorMsg', 'Mindestens 2 Spieler sind für ein Spiel nötig.');
        return;
      }
      initiateGame(room, true);
    });

    socket.on('declareAction', ({ actionKey, targetId }: { actionKey: string; targetId?: string }) => {
      const room = rooms[socket.data.roomCode];
      if (!room || !room.started || room.pending) return;

      const actor = room.players[room.turnIndex];
      if (!actor || actor.id !== socket.id) return;

      const def = ACTIONS[actionKey];
      if (!def) return;

      if (actor.coins >= 10 && actionKey !== 'staatsstreich') {
        socket.emit('errorMsg', 'Bei 10 oder mehr Münzen musst du einen Staatsstreich (Coup) ausführen.');
        return;
      }
      if (def.cost > 0 && actor.coins < def.cost) {
        socket.emit('errorMsg', `Nicht genügend Münzen. Du benötigst ${def.cost} Münzen.`);
        return;
      }

      let target: ServerPlayer | null = null;
      if (def.targeted) {
        target = room.players.find(p => p.id === targetId && !p.eliminated && p.id !== actor.id) || null;
        if (!target) return;
      }

      if (def.cost > 0) {
        actor.coins -= def.cost;
      }

      room.pending = {
        action: actionKey,
        actorId: actor.id,
        targetId: target ? target.id : null,
        phase: null,
        responded: [],
        block: null,
        blockResponded: [],
        waitingOn: null
      };

      if (!def.challengeable && !def.blockable) {
        log(room, `${actor.name} nutzt ${def.label}${target ? ` gegen ${target.name}` : ''}.`);
        resolveAction(room);
        return;
      }

      room.pending.phase = 'response';
      const claimedRoleName = def.role ? ` (behauptet: ${ROLES_INFO[def.role].name})` : '';
      log(room, `${actor.name} beansprucht „${def.label}“${claimedRoleName}${target ? ` gegen ${target.name}` : ''}.`);
      broadcast(room);
    });

    socket.on('respondPass', () => {
      const room = rooms[socket.data.roomCode];
      if (!room || !room.pending || room.pending.phase !== 'response') return;

      const pid = socket.id;
      if (pid === room.pending.actorId || !eligibleResponders(room).includes(pid)) return;

      if (!room.pending.responded.includes(pid)) {
        room.pending.responded.push(pid);
      }

      if (eligibleResponders(room).every(id => room.pending!.responded.includes(id))) {
        resolveAction(room);
      } else {
        broadcast(room);
      }
    });

    socket.on('respondChallenge', () => {
      const room = rooms[socket.data.roomCode];
      if (!room || !room.pending || room.pending.phase !== 'response') return;

      const def = ACTIONS[room.pending.action];
      if (!def.challengeable || !def.role) return;

      const challengerId = socket.id;
      if (challengerId === room.pending.actorId || !eligibleResponders(room).includes(challengerId)) return;

      const actor = room.players.find(p => p.id === room.pending!.actorId);
      if (!actor) return;

      log(room, `⚡ ${playerName(room, challengerId)} zweifelt die Behauptung von ${actor.name} an!`);

      resolveChallenge(room, room.pending.actorId, def.role, challengerId, (wasBluff) => {
        if (wasBluff) {
          room.pending = null;
          nextTurn(room);
        } else {
          resolveAction(room);
        }
      });
    });

    socket.on('respondBlock', ({ role }: { role: RoleKey }) => {
      const room = rooms[socket.data.roomCode];
      if (!room || !room.pending || room.pending.phase !== 'response') return;

      const def = ACTIONS[room.pending.action];
      if (!def.blockable || !def.blockRoles || !def.blockRoles.includes(role)) return;

      const blockerId = socket.id;
      if (blockerId === room.pending.actorId) return;
      if (def.blockEligibility === 'target' && blockerId !== room.pending.targetId) return;
      if (def.blockEligibility === 'anyone' && !eligibleResponders(room).includes(blockerId)) return;

      room.pending.block = { playerId: blockerId, role };
      room.pending.phase = 'blockResponse';
      room.pending.blockResponded = [];

      log(room, `🛡️ ${playerName(room, blockerId)} blockt mit ${ROLES_INFO[role].name}.`);
      broadcast(room);
    });

    socket.on('blockRespondPass', () => {
      const room = rooms[socket.data.roomCode];
      if (!room || !room.pending || room.pending.phase !== 'blockResponse' || !room.pending.block) return;

      const pid = socket.id;
      const blockerId = room.pending.block.playerId;
      if (pid === blockerId) return;

      const eligible = alivePlayers(room).filter(p => p.id !== blockerId).map(p => p.id);
      if (!eligible.includes(pid)) return;

      if (!room.pending.blockResponded.includes(pid)) {
        room.pending.blockResponded.push(pid);
      }

      if (eligible.every(id => room.pending!.blockResponded.includes(id))) {
        log(room, `Block akzeptiert — die Aktion wurde erfolgreich abgewehrt.`);
        room.pending = null;
        nextTurn(room);
      } else {
        broadcast(room);
      }
    });

    socket.on('blockRespondChallenge', () => {
      const room = rooms[socket.data.roomCode];
      if (!room || !room.pending || room.pending.phase !== 'blockResponse' || !room.pending.block) return;

      const challengerId = socket.id;
      const block = room.pending.block;
      if (challengerId === block.playerId) return;

      log(room, `⚡ ${playerName(room, challengerId)} zweifelt den Block von ${playerName(room, block.playerId)} an!`);

      resolveChallenge(room, block.playerId, block.role, challengerId, (wasBluff) => {
        if (wasBluff) {
          // Blocker was bluffing, action proceeds
          resolveAction(room);
        } else {
          // Block was real, action cancelled
          log(room, `Block von ${playerName(room, block.playerId)} bestätigt.`);
          room.pending = null;
          nextTurn(room);
        }
      });
    });

    socket.on('confirmLoseCard', ({ cardId }: { cardId: string }) => {
      const room = rooms[socket.data.roomCode];
      if (!room || !room.pending || room.pending.phase !== 'loseInfluence') return;
      if (room.pending.waitingOn !== socket.id) return;

      const p = room.players.find(pl => pl.id === socket.id);
      if (!p) return;

      const card = p.cards.find(c => c.cardId === cardId && c.alive);
      if (!card) return;

      card.alive = false;
      log(room, `💀 ${p.name} deckt ${card.displayName} (${ROLES_INFO[card.role].name}) auf und verliert 1 Hofeinfluss.`);
      checkEliminated(room, p);

      const cb = room.pending._loseCallback;
      room.pending._loseCallback = null;
      room.pending.waitingOn = null;

      broadcast(room);
      if (checkWin(room)) return;

      if (cb) cb();
    });

    socket.on('confirmExchange', ({ keepCardIds }: { keepCardIds: string[] }) => {
      const room = rooms[socket.data.roomCode];
      if (!room || !room.pending || room.pending.phase !== 'exchange') return;
      if (room.pending.waitingOn !== socket.id) return;

      const p = room.players.find(pl => pl.id === socket.id);
      if (!p) return;

      const aliveCards = p.cards.filter(c => c.alive);
      const deadCards = p.cards.filter(c => !c.alive);
      const drawnCards = room.pending._exchangePool || [];
      const pool = aliveCards.concat(drawnCards);
      const keepCount = aliveCards.length;

      if (!Array.isArray(keepCardIds) || keepCardIds.length !== keepCount) return;

      const selected = pool.filter(c => keepCardIds.includes(c.cardId));
      if (selected.length !== keepCount) return;

      const returnToDeck = pool.filter(c => !keepCardIds.includes(c.cardId));
      room.deck = shuffle(room.deck.concat(returnToDeck));

      p.cards = selected.map(c => ({ ...c, alive: true })).concat(deadCards);
      sendHand(room, p);

      log(room, `🎴 ${p.name} hat geheime Hofkarten ausgetauscht.`);
      room.pending = null;
      broadcast(room);
      nextTurn(room);
    });

    function handleBackToLobby(socketId: string) {
      const room = rooms[socket.data.roomCode];
      if (!room || room.hostId !== socketId) return;

      room.started = false;
      room.pending = null;
      room.turnIndex = 0;
      room.players.forEach(p => {
        p.coins = 0;
        p.cards = [];
        p.eliminated = false;
        p.position = null;
      });

      io.to(room.code).emit('backToLobby', publicState(room));
      log(room, '🏛️ Der Spielleiter hat alle Spieler zurück in die Lobby gebracht.');
    }

    socket.on('restartGame', () => {
      handleBackToLobby(socket.id);
    });

    socket.on('returnToLobby', () => {
      handleBackToLobby(socket.id);
    });

    // WebRTC signaling
    socket.on('webrtc-signal', ({ to, data }: { to: string; data: any }) => {
      io.to(to).emit('webrtc-signal', { from: socket.id, data });
    });

    // Audio status sync
    socket.on('audio-status', (status: { speaking: boolean; muted: boolean }) => {
      const code = socket.data.roomCode;
      if (code) {
        socket.to(code).emit('peer-audio-status', { from: socket.id, status });
      }
    });

    socket.on('disconnect', () => {
      const code = socket.data.roomCode;
      const room = rooms[code];
      if (!room) return;

      io.to(code).emit('peerLeft', socket.id);

      if (!room.started) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          delete rooms[code];
          return;
        }
        if (room.hostId === socket.id) {
          room.hostId = room.players[0].id;
        }
        io.to(room.code).emit('roomUpdate', publicState(room));
        return;
      }

      const p = room.players.find(pl => pl.id === socket.id);
      if (p && !p.eliminated) {
        p.cards.forEach(c => { c.alive = false; });
        p.eliminated = true;
        log(room, `${p.name} hat den Raum verlassen und scheidet aus.`);
      }

      if (room.hostId === socket.id) {
        const alive = alivePlayers(room);
        if (alive.length > 0) room.hostId = alive[0].id;
      }

      const wasTurn = room.players[room.turnIndex] && room.players[room.turnIndex].id === socket.id;
      if (room.pending && (
        room.pending.actorId === socket.id ||
        room.pending.waitingOn === socket.id ||
        (room.pending.block && room.pending.block.playerId === socket.id)
      )) {
        room.pending = null;
      }

      if (checkWin(room)) return;
      if (wasTurn && !room.pending) {
        nextTurn(room);
        return;
      }
      broadcast(room);
    });
  });

  // Vite middleware setup or Static file serving
  const cwdDist = path.join(process.cwd(), 'dist');
  const dirnameDist = typeof __dirname !== 'undefined' ? path.join(__dirname, '..', 'dist') : cwdDist;
  const directDist = typeof __dirname !== 'undefined' ? __dirname : cwdDist;

  const distPath = fs.existsSync(path.join(cwdDist, 'index.html'))
    ? cwdDist
    : fs.existsSync(path.join(dirnameDist, 'index.html'))
    ? dirnameDist
    : fs.existsSync(path.join(directDist, 'index.html'))
    ? directDist
    : cwdDist;

  if (fs.existsSync(path.join(distPath, 'index.html')) || process.env.NODE_ENV === 'production') {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Maskerade server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
