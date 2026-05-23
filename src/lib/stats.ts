import type { ChipType, Contact, GameRecord, SessionPlayer } from '../types';
import { playerActiveMs } from './intervals';
import { playerInvestedCents } from './chips';

export type ContactStats = {
  contactId: string;
  gamesPlayed: number;
  totalBuyInsCents: number;
  totalNetCents: number;
  biggestWinCents: number;
  biggestLossCents: number;
  /** Suma neta de transferencias aún no pagadas (positivo: le deben; negativo: debe) */
  pendingCents: number;
  /** Tiempo total que el contacto ha estado en mesa (suma de intervalos en todas las partidas) */
  totalActiveMs: number;
};

function playerFinalValue(p: SessionPlayer, chips: ChipType[]): number {
  if (!p.finalCounts) return 0;
  return chips.reduce((s, c) => s + (p.finalCounts![c.id] || 0) * c.valueCents, 0);
}

export function computeContactStats(sessions: GameRecord[], contactId: string): ContactStats {
  const stats: ContactStats = {
    contactId,
    gamesPlayed: 0,
    totalBuyInsCents: 0,
    totalNetCents: 0,
    biggestWinCents: 0,
    biggestLossCents: 0,
    pendingCents: 0,
    totalActiveMs: 0,
  };

  for (const session of sessions) {
    const player = session.players.find((p) => p.contactId === contactId);
    if (!player) continue;
    stats.gamesPlayed++;
    const invested = playerInvestedCents(player, session.buyInCents);
    const finalValue = playerFinalValue(player, session.chips);
    const net = finalValue - invested + (player.adjustmentCents || 0);
    stats.totalBuyInsCents += invested;
    stats.totalNetCents += net;
    if (net > stats.biggestWinCents) stats.biggestWinCents = net;
    if (net < stats.biggestLossCents) stats.biggestLossCents = net;
    // Tiempo activo del jugador en esta sesión. Si no hay intervals (partidas antiguas),
    // asumimos que jugó toda la duración de la sesión.
    if (player.intervals && player.intervals.length > 0) {
      stats.totalActiveMs += playerActiveMs(player, session.finishedAt);
    } else {
      stats.totalActiveMs += Math.max(0, session.finishedAt - session.startedAt);
    }

    for (const t of session.transfers) {
      if (t.paid) continue;
      if (t.from === player.id) stats.pendingCents -= t.cents;
      if (t.to === player.id) stats.pendingCents += t.cents;
    }
  }
  return stats;
}

export type GroupStats = {
  totalSessions: number;
  totalPotCents: number;
  biggestPotCents: number;
  biggestPotDate: number | null;
  biggestSingleWinCents: number;
  biggestSingleWinContactId: string | null;
  longestGameMs: number;
  longestGameDate: number | null;
  /** Suma de la duración real de cada partida (start→finish). */
  totalPlayedMs: number;
  /** Suma de tiempo activo de todos los jugadores (player-horas). */
  totalPlayerActiveMs: number;
  /** Ranking de contactos ordenado por totalNet desc */
  leaderboard: { contact: Contact; stats: ContactStats }[];
};

export function computeGroupStats(sessions: GameRecord[], contacts: Contact[]): GroupStats {
  let totalPotCents = 0;
  let biggestPotCents = 0;
  let biggestPotDate: number | null = null;
  let biggestSingleWinCents = 0;
  let biggestSingleWinContactId: string | null = null;
  let longestGameMs = 0;
  let longestGameDate: number | null = null;
  let totalPlayedMs = 0;
  let totalPlayerActiveMs = 0;

  for (const session of sessions) {
    const pot = session.players.reduce((s, p) => s + playerInvestedCents(p, session.buyInCents), 0);
    totalPotCents += pot;
    if (pot > biggestPotCents) {
      biggestPotCents = pot;
      biggestPotDate = session.finishedAt;
    }
    const duration = session.finishedAt - session.startedAt;
    totalPlayedMs += Math.max(0, duration);
    if (duration > longestGameMs) {
      longestGameMs = duration;
      longestGameDate = session.finishedAt;
    }
    for (const p of session.players) {
      if (p.intervals && p.intervals.length > 0) {
        totalPlayerActiveMs += playerActiveMs(p, session.finishedAt);
      } else {
        totalPlayerActiveMs += Math.max(0, duration);
      }
    }
    for (const p of session.players) {
      const finalValue = p.finalCounts
        ? session.chips.reduce((s, c) => s + (p.finalCounts![c.id] || 0) * c.valueCents, 0)
        : 0;
      const net = finalValue - playerInvestedCents(p, session.buyInCents) + (p.adjustmentCents || 0);
      if (net > biggestSingleWinCents) {
        biggestSingleWinCents = net;
        biggestSingleWinContactId = p.contactId;
      }
    }
  }

  const leaderboard = contacts
    .map((contact) => ({ contact, stats: computeContactStats(sessions, contact.id) }))
    .filter((x) => x.stats.gamesPlayed > 0)
    .sort((a, b) => b.stats.totalNetCents - a.stats.totalNetCents);

  return {
    totalSessions: sessions.length,
    totalPotCents,
    biggestPotCents,
    biggestPotDate,
    biggestSingleWinCents,
    biggestSingleWinContactId,
    longestGameMs,
    longestGameDate,
    totalPlayedMs,
    totalPlayerActiveMs,
    leaderboard,
  };
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}
