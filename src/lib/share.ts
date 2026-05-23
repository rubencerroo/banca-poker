import type { ChipType, SessionPlayer, Transfer, GameRecord } from '../types';
import { computeNets } from './chips';
import { formatEuros } from './format';

function formatNet(net: number): string {
  const sign = net >= 0 ? '+' : '−';
  return `${sign}${formatEuros(Math.abs(net))}`;
}

export function buildShareText(opts: {
  title?: string;
  date: Date;
  buyInCents: number;
  chips: ChipType[];
  players: SessionPlayer[];
  transfers: Transfer[];
}): string {
  const { title, date, buyInCents, chips, players, transfers } = opts;
  const totalPot = players.reduce((s, p) => s + p.buyIns * buyInCents, 0);
  const nets = computeNets(players, chips, buyInCents);

  const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const lines: string[] = [];
  lines.push(`🃏 ${title?.trim() || `Timba del ${dateStr}`}`);
  lines.push(`Entrada ${formatEuros(buyInCents)} · Bote ${formatEuros(totalPot)}`);
  lines.push('');

  // Resultados ordenados de mayor a menor
  const sorted = [...players].sort((a, b) => (nets[b.id] || 0) - (nets[a.id] || 0));
  lines.push('Resultados:');
  for (const p of sorted) {
    const net = nets[p.id] || 0;
    const icon = net > 0 ? '✅' : net < 0 ? '❌' : '➖';
    lines.push(`${icon} ${p.name.padEnd(10, ' ')} ${formatNet(net)}`);
  }
  lines.push('');

  // Pagos
  const playerById = (id: string) => players.find((p) => p.id === id)?.name || '?';
  const unpaid = transfers.filter((t) => !t.paid);
  const paid = transfers.filter((t) => t.paid);

  if (transfers.length === 0) {
    lines.push('Sin pagos pendientes.');
  } else {
    if (unpaid.length > 0) {
      lines.push('Pagos pendientes:');
      for (const t of unpaid) {
        lines.push(`• ${playerById(t.from)} → ${playerById(t.to)}: ${formatEuros(t.cents)}`);
      }
    }
    if (paid.length > 0) {
      if (unpaid.length > 0) lines.push('');
      lines.push('Ya pagado:');
      for (const t of paid) {
        lines.push(`✓ ${playerById(t.from)} → ${playerById(t.to)}: ${formatEuros(t.cents)}`);
      }
    }
  }

  return lines.join('\n');
}

export function buildShareTextFromRecord(record: GameRecord): string {
  return buildShareText({
    title: record.title,
    date: new Date(record.finishedAt),
    buyInCents: record.buyInCents,
    chips: record.chips,
    players: record.players,
    transfers: record.transfers,
  });
}
