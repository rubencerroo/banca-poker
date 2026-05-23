import { useMemo, useEffect, useState } from 'react';
import { useStore } from '../store';
import { Chip } from './Chip';
import { ShareModal } from './ShareModal';
import { getColor } from '../lib/colors';
import { formatEuros } from '../lib/format';
import { computeNets, validateChipCount } from '../lib/chips';
import { buildShareText } from '../lib/share';

export function Settlement() {
  const {
    players, chips, buyInCents, transfers, gameTitle,
    setFinalCount, setPhase, newRound,
    applyAdjustment, clearAdjustments,
    recomputeTransfers, toggleTransferPaid,
    saveAndArchive,
  } = useStore();

  const [shareOpen, setShareOpen] = useState(false);

  const allCounted = players.every((p) => p.finalCounts !== null);

  // Recalcular transfers cuando cambian conteos / ajustes
  useEffect(() => {
    recomputeTransfers();
  }, [players, chips, buyInCents, recomputeTransfers]);

  const validation = useMemo(
    () => validateChipCount(players, chips, buyInCents),
    [players, chips, buyInCents],
  );

  const nets = useMemo(
    () => computeNets(players, chips, buyInCents),
    [players, chips, buyInCents],
  );

  const playerById = (id: string) => players.find((p) => p.id === id)?.name || '?';

  const hasAdjustments = players.some((p) => p.adjustmentCents !== 0);
  const winnersCount = players.filter((p) => {
    if (!p.finalCounts) return false;
    const fv = chips.reduce((s, c) => s + (p.finalCounts![c.id] || 0) * c.valueCents, 0);
    return fv - p.buyIns * buyInCents > 0;
  }).length;

  const allPaid = transfers !== null && transfers.length > 0 && transfers.every((t) => t.paid);

  const shareText = useMemo(() => {
    if (!transfers) return '';
    return buildShareText({
      title: gameTitle,
      date: new Date(),
      buyInCents,
      chips,
      players,
      transfers,
    });
  }, [transfers, gameTitle, buyInCents, chips, players]);

  return (
    <div className="space-y-8">
      {shareOpen && <ShareModal text={shareText} onClose={() => setShareOpen(false)} />}
      <section>
        <h2 className="font-display text-2xl text-gold-400 mb-3">Recuento final</h2>
        <p className="text-emerald-100/60 text-sm mb-4">
          Introduce cuántas fichas de cada tipo tiene cada jugador al cerrar la timba.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 text-xs uppercase tracking-wide text-emerald-100/50">Jugador</th>
                {chips.map((c) => (
                  <th key={c.id} className="px-2 py-2 text-xs uppercase tracking-wide text-emerald-100/50">
                    <div className="flex flex-col items-center gap-1">
                      <Chip chip={c} size={36} />
                      <span>{getColor(c.colorId).name}</span>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-right text-xs uppercase tracking-wide text-emerald-100/50">Valor</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const value = chips.reduce((s, c) => s + (p.finalCounts?.[c.id] || 0) * c.valueCents, 0);
                return (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className="py-2 pr-3 font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{p.name}</span>
                        {p.bustedAt !== null && (
                          <span className="text-[10px] uppercase tracking-wide bg-red-500/20 text-red-200 border border-red-400/30 rounded-full px-2 py-0.5">
                            Eliminado
                          </span>
                        )}
                      </div>
                    </td>
                    {chips.map((c) => (
                      <td key={c.id} className="px-1 py-2">
                        <input
                          type="number"
                          min={0}
                          value={p.finalCounts?.[c.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => setFinalCount(p.id, c.id, parseInt(e.target.value) || 0)}
                          className="w-16 bg-black/30 border border-white/15 rounded px-2 py-1 text-center"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right font-display text-lg text-gold-400">
                      {formatEuros(value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="text-emerald-100/60">
            Bote esperado: <span className="text-emerald-100">{formatEuros(validation.expected)}</span>
            {' · '}
            Recuento: <span className="text-emerald-100">{formatEuros(validation.actual)}</span>
          </div>
          {validation.diff !== 0 ? (
            <div className={validation.diff > 0 ? 'text-amber-300' : 'text-red-300'}>
              {validation.diff > 0 ? 'Sobran' : 'Faltan'} {formatEuros(Math.abs(validation.diff))}
            </div>
          ) : (
            <div className="text-emerald-300">✓ Cuadra perfectamente</div>
          )}
        </div>

        {allCounted && validation.diff !== 0 && (
          <div className="mt-4 bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
            <div className="font-medium text-amber-200 mb-2">Ajustar descuadre</div>
            <p className="text-sm text-amber-100/80 mb-3">
              {validation.diff > 0
                ? `Hay ${formatEuros(validation.diff)} de más en la mesa. Reparte el exceso para cuadrar.`
                : `Faltan ${formatEuros(-validation.diff)} en la mesa. Reparte la pérdida para cuadrar.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => applyAdjustment('all')} className="btn-secondary text-sm">
                Repartir entre todos ({players.length})
              </button>
              <button
                onClick={() => applyAdjustment('winners')}
                disabled={winnersCount === 0}
                className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Solo ganadores ({winnersCount})
              </button>
            </div>
          </div>
        )}

        {hasAdjustments && (
          <div className="mt-3 flex items-center justify-between bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm">
            <span className="text-emerald-100/70">Hay ajustes aplicados al cuadre.</span>
            <button onClick={clearAdjustments} className="btn-ghost text-xs">Quitar ajustes</button>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl text-gold-400 mb-3">Liquidación</h2>
        {!allCounted ? (
          <p className="text-emerald-100/60 text-sm">Completa el recuento de todos los jugadores para ver quién paga a quién.</p>
        ) : (
          <>
            <div className="grid gap-2 mb-6">
              {players.map((p) => {
                const net = nets[p.id] || 0;
                return (
                  <div key={p.id} className="flex items-center justify-between bg-black/20 border border-white/10 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.adjustmentCents !== 0 && (
                        <span className="text-[11px] text-amber-300/80">
                          (ajuste {p.adjustmentCents > 0 ? '+' : ''}{formatEuros(p.adjustmentCents)})
                        </span>
                      )}
                    </div>
                    <span className={`font-display text-lg ${net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {net >= 0 ? '+' : ''}{formatEuros(net)}
                    </span>
                  </div>
                );
              })}
            </div>

            {!transfers || transfers.length === 0 ? (
              <p className="text-emerald-100/70">Todos quedan en paz. Nadie debe nada.</p>
            ) : (
              <ul className="space-y-2">
                {transfers.map((t, i) => (
                  <li key={i}
                    className={`flex items-center justify-between rounded-xl px-4 md:px-5 py-3 border transition-colors ${
                      t.paid
                        ? 'bg-emerald-500/10 border-emerald-400/30'
                        : 'bg-gradient-to-r from-emerald-900/60 to-emerald-800/40 border-gold-400/30'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.paid}
                        onChange={() => toggleTransferPaid(i)}
                        className="w-5 h-5 accent-emerald-400 cursor-pointer shrink-0"
                      />
                      <span className={`font-semibold truncate ${t.paid ? 'text-emerald-300/70 line-through' : 'text-red-200'}`}>
                        {playerById(t.from)}
                      </span>
                      <span className="text-emerald-100/40">→</span>
                      <span className={`font-semibold truncate ${t.paid ? 'text-emerald-300/70 line-through' : 'text-emerald-200'}`}>
                        {playerById(t.to)}
                      </span>
                    </label>
                    <span className={`font-display text-xl ${t.paid ? 'text-emerald-300/70 line-through' : 'text-gold-400'} shrink-0 ml-3`}>
                      {formatEuros(t.cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <div className="flex flex-wrap justify-between gap-2 pt-4 border-t border-white/10">
        <button onClick={() => setPhase('playing')} className="btn-ghost">← Volver a la partida</button>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShareOpen(true)}
            disabled={!allCounted || !transfers}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📋 Compartir
          </button>
          <button onClick={newRound} className="btn-secondary">Nueva timba (sin guardar)</button>
          <button
            onClick={saveAndArchive}
            disabled={!allCounted || !transfers}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            title={allPaid ? 'Guarda en el historial' : 'Puedes marcar pagos después en el historial'}
          >
            Guardar en historial
          </button>
        </div>
      </div>
    </div>
  );
}
