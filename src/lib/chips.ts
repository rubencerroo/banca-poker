import type { ChipType, SessionPlayer, Transfer } from '../types';

/**
 * Búsqueda exhaustiva (backtracking con poda) de la mejor combinación de fichas
 * cuyo valor total iguale al buy-in, respetando los topes por jugador.
 *
 * Estrategia:
 *  1) Intenta primero con restricción dura: ≥1 de cada denominación.
 *  2) Si no hay solución, relaja la restricción (permite 0 de alguna denom).
 *  3) Score: maximizar nº total de fichas (stack más jugable). Desempate por
 *     "pirámide" — preferimos que las denominaciones pequeñas tengan más fichas
 *     que las grandes (penaliza inversiones de monotonía).
 */
function searchBestCombo(
  sortedAsc: ChipType[],
  maxPerPlayer: number[],
  targetCents: number,
  minPerDenom: number,
): number[] | null {
  // Pre-cálculo de bounds restantes para podar
  const restMin: number[] = new Array(sortedAsc.length + 1).fill(0);
  const restMax: number[] = new Array(sortedAsc.length + 1).fill(0);
  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    restMin[i] = restMin[i + 1] + minPerDenom * sortedAsc[i].valueCents;
    restMax[i] = restMax[i + 1] + maxPerPlayer[i] * sortedAsc[i].valueCents;
  }
  if (restMin[0] > targetCents || restMax[0] < targetCents) return null;

  let best: number[] | null = null;
  let bestScore = -Infinity;

  const counts: number[] = new Array(sortedAsc.length).fill(0);

  function score(c: number[]): number {
    const total = c.reduce((s, n) => s + n, 0);
    // Bonus por monotonía decreciente (small denom > big denom en nº de fichas)
    let monotonic = 0;
    for (let i = 0; i < c.length - 1; i++) {
      if (c[i] >= c[i + 1]) monotonic += 1;
    }
    return total * 100 + monotonic;
  }

  function rec(idx: number, remaining: number) {
    if (idx === sortedAsc.length) {
      if (remaining === 0) {
        const s = score(counts);
        if (s > bestScore) {
          bestScore = s;
          best = [...counts];
        }
      }
      return;
    }
    const c = sortedAsc[idx];
    const max = maxPerPlayer[idx];

    // Última denominación: forzamos match exacto
    if (idx === sortedAsc.length - 1) {
      if (remaining % c.valueCents !== 0) return;
      const n = remaining / c.valueCents;
      if (n >= minPerDenom && n <= max) {
        counts[idx] = n;
        rec(idx + 1, 0);
        counts[idx] = 0;
      }
      return;
    }

    const maxN = Math.min(max, Math.floor(remaining / c.valueCents));
    // Probamos primero los conteos altos (más fichas = mejor score) para encontrar
    // pronto el óptimo y permitir pruning.
    for (let n = maxN; n >= minPerDenom; n--) {
      const used = n * c.valueCents;
      const rem = remaining - used;
      if (rem < restMin[idx + 1]) continue;
      if (rem > restMax[idx + 1]) break; // disminuir n solo aumenta rem
      counts[idx] = n;
      rec(idx + 1, rem);
    }
    counts[idx] = 0;
  }

  rec(0, targetCents);
  return best;
}

export function computeDistribution(
  chips: ChipType[],
  numPlayers: number,
  buyInCents: number,
): { perPlayer: Record<string, number>; valuePerPlayerCents: number; warning: string | null } {
  if (numPlayers <= 0 || chips.length === 0) {
    return { perPlayer: {}, valuePerPlayerCents: 0, warning: null };
  }

  const sorted = [...chips].sort((a, b) => a.valueCents - b.valueCents);
  const maxPerPlayer = sorted.map((c) => Math.floor(c.totalAvailable / numPlayers));

  // 1) Restricción dura: ≥1 de cada denominación
  let combo = searchBestCombo(sorted, maxPerPlayer, buyInCents, 1);
  let relaxed = false;
  if (!combo) {
    // 2) Relajar: permitir 0 de alguna
    combo = searchBestCombo(sorted, maxPerPlayer, buyInCents, 0);
    relaxed = true;
  }

  const perPlayer: Record<string, number> = {};
  let allocatedCents = 0;

  if (combo) {
    sorted.forEach((c, i) => {
      perPlayer[c.id] = combo![i];
      allocatedCents += combo![i] * c.valueCents;
    });
  } else {
    // 3) Imposible llegar al buy-in exacto: aproximación que use al menos 1 de cada
    //    si caben, hasta agotar denominaciones grandes.
    sorted.forEach((c, i) => (perPlayer[c.id] = Math.min(1, maxPerPlayer[i])));
    allocatedCents = sorted.reduce((s, c) => s + perPlayer[c.id] * c.valueCents, 0);
  }

  let warning: string | null = null;
  if (allocatedCents !== buyInCents) {
    warning = `No es posible repartir exactamente ${(buyInCents / 100).toFixed(2)} € por jugador con las fichas disponibles. Valor más cercano: ${(allocatedCents / 100).toFixed(2)} €.`;
  } else if (relaxed) {
    warning = `Sin fichas suficientes para incluir al menos 1 de cada denominación. Reparto sin alguna denom.`;
  }

  return { perPlayer, valuePerPlayerCents: allocatedCents, warning };
}

export function computeNets(
  players: SessionPlayer[],
  chips: ChipType[],
  buyInCents: number,
): Record<string, number> {
  const nets: Record<string, number> = {};
  for (const p of players) {
    let finalValue = 0;
    if (p.finalCounts) {
      for (const c of chips) finalValue += (p.finalCounts[c.id] || 0) * c.valueCents;
    }
    nets[p.id] = finalValue - p.buyIns * buyInCents + (p.adjustmentCents || 0);
  }
  return nets;
}

export function computeSettlement(nets: Record<string, number>): Transfer[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, net] of Object.entries(nets)) {
    if (net < 0) debtors.push({ id, amount: -net });
    else if (net > 0) creditors.push({ id, amount: net });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      transfers.push({ from: debtors[i].id, to: creditors[j].id, cents: pay, paid: false });
      debtors[i].amount -= pay;
      creditors[j].amount -= pay;
    }
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }

  return transfers;
}

export function validateChipCount(
  players: SessionPlayer[],
  chips: ChipType[],
  buyInCents: number,
): { ok: boolean; expected: number; actual: number; diff: number } {
  const expected = players.reduce((s, p) => s + p.buyIns * buyInCents, 0);
  let actual = 0;
  for (const p of players) {
    if (!p.finalCounts) continue;
    for (const c of chips) actual += (p.finalCounts[c.id] || 0) * c.valueCents;
  }
  return { ok: actual === expected, expected, actual, diff: actual - expected };
}
