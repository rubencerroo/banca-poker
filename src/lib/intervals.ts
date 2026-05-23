import type { SessionPlayer, PlayerInterval } from '../types';

export function isPlayerActive(p: SessionPlayer): boolean {
  if (p.intervals.length === 0) return false;
  return p.intervals[p.intervals.length - 1].leftAt === null;
}

export function hasPlayed(p: SessionPlayer): boolean {
  return p.intervals.length > 0;
}

/** Tiempo total en ms que el jugador estuvo en la mesa (suma de intervalos). */
export function playerActiveMs(p: SessionPlayer, endTime: number): number {
  let total = 0;
  for (const iv of p.intervals) {
    const end = iv.leftAt ?? endTime;
    total += Math.max(0, end - iv.joinedAt);
  }
  return total;
}

/** Cierra cualquier intervalo abierto al timestamp dado. */
export function closeOpenIntervals(intervals: PlayerInterval[], at: number): PlayerInterval[] {
  return intervals.map((iv) => (iv.leftAt === null ? { ...iv, leftAt: at } : iv));
}
