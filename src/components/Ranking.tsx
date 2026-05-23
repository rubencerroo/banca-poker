import { useMemo } from 'react';
import { useStore } from '../store';
import { computeGroupStats, formatDuration } from '../lib/stats';
import { formatEuros } from '../lib/format';

export function Ranking() {
  const { sessions, contacts } = useStore();
  const stats = useMemo(() => computeGroupStats(sessions, contacts), [sessions, contacts]);

  if (sessions.length === 0) return null;

  const winnerName = stats.biggestSingleWinContactId
    ? contacts.find((c) => c.id === stats.biggestSingleWinContactId)?.name || '?'
    : '—';

  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-gold-400">Récords del grupo</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Timbas" value={stats.totalSessions.toString()} />
        <BigStat label="Bote acumulado" value={formatEuros(stats.totalPotCents)} accent />
        <BigStat
          label="Mayor bote"
          value={formatEuros(stats.biggestPotCents)}
          sub={stats.biggestPotDate ? new Date(stats.biggestPotDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : undefined}
        />
        <BigStat
          label="Mayor ganancia"
          value={formatEuros(stats.biggestSingleWinCents)}
          sub={winnerName}
          accent
        />
        <BigStat label="Partida más larga" value={formatDuration(stats.longestGameMs)}
          sub={stats.longestGameDate ? new Date(stats.longestGameDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : undefined} />
        <BigStat label="Tiempo total jugado" value={formatDuration(stats.totalPlayedMs)} />
        <BigStat label="Jugadores" value={contacts.length.toString()} />
        <BigStat label="Líder actual" value={stats.leaderboard[0]?.contact.name || '—'} accent />
      </div>

      {stats.leaderboard.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-gold-400 mb-2">Clasificación</h3>
          <ol className="space-y-1">
            {stats.leaderboard.map((row, i) => {
              const podium = i < 3;
              const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
              return (
                <li key={row.contact.id}
                  className={`flex items-center justify-between px-4 py-2 rounded-lg border ${
                    podium ? 'bg-gold-400/10 border-gold-400/30' : 'bg-black/20 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg w-8 text-center shrink-0">{medal}</span>
                    <span className="font-medium truncate">{row.contact.name}</span>
                    <span className="text-xs text-emerald-100/40 shrink-0">
                      {row.stats.gamesPlayed} timba{row.stats.gamesPlayed === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className={`font-display text-lg shrink-0 ${
                    row.stats.totalNetCents >= 0 ? 'text-emerald-300' : 'text-red-300'
                  }`}>
                    {row.stats.totalNetCents >= 0 ? '+' : ''}{formatEuros(row.stats.totalNetCents)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

function BigStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-black/25 border border-white/10 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-emerald-100/50">{label}</div>
      <div className={`mt-1 font-display text-base md:text-xl leading-tight ${accent ? 'text-gold-400' : 'text-emerald-50'}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-emerald-100/40 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
