import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { ShareModal } from './ShareModal';
import { formatEuros } from '../lib/format';
import { computeNets } from '../lib/chips';
import { buildShareTextFromRecord } from '../lib/share';
import type { GameRecord } from '../types';

export function History() {
  const { sessions, viewingSessionId, viewSession } = useStore();

  if (viewingSessionId) {
    const session = sessions.find((s) => s.id === viewingSessionId);
    if (!session) {
      return (
        <div>
          <button onClick={() => viewSession(null)} className="btn-ghost mb-4">← Volver al historial</button>
          <p className="text-emerald-100/60">Partida no encontrada.</p>
        </div>
      );
    }
    return <SessionDetail session={session} />;
  }

  return (
    <section>
      <h2 className="font-display text-2xl text-gold-400 mb-3">Historial de timbas</h2>
      {sessions.length === 0 ? (
        <p className="text-emerald-100/60 text-sm">Aún no hay partidas archivadas. Al finalizar y guardar una timba aparecerá aquí.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => <HistoryRow key={s.id} session={s} />)}
        </ul>
      )}
    </section>
  );
}

function HistoryRow({ session }: { session: GameRecord }) {
  const viewSession = useStore((st) => st.viewSession);
  const restoreEntity = useStore((st) => st.restoreEntity);
  const date = new Date(session.finishedAt);
  const totalPot = session.players.reduce((s, p) => s + p.buyIns * session.buyInCents, 0);
  const pendingTransfers = session.transfers.filter((t) => !t.paid).length;
  const isDeleted = !!session.deletedAt;

  return (
    <li>
      <button
        onClick={() => isDeleted ? null : viewSession(session.id)}
        className={`w-full text-left rounded-xl p-4 transition-colors border ${
          isDeleted
            ? 'bg-red-500/5 border-red-400/20 opacity-70'
            : 'bg-black/25 hover:bg-black/35 border-white/10 hover:border-gold-400/40'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <div className="font-display text-lg text-gold-400 truncate">
              {session.title || `Timba del ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              {isDeleted && <span className="ml-2 text-[10px] uppercase tracking-wide text-red-200 bg-red-500/20 border border-red-400/30 rounded-full px-2 py-0.5 align-middle">Eliminada</span>}
            </div>
            <div className="text-sm text-emerald-100/60">
              {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              {' · '}
              {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              {session.players.length} jugadores · Bote {formatEuros(totalPot)}
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            {isDeleted ? (
              <span
                onClick={(e) => { e.stopPropagation(); restoreEntity('session', session.id); }}
                className="text-emerald-300/80 hover:text-emerald-200 text-xs cursor-pointer"
              >
                ↺ Restaurar
              </span>
            ) : pendingTransfers > 0 ? (
              <span className="text-amber-300 text-sm">
                {pendingTransfers} pago{pendingTransfers === 1 ? '' : 's'} pendiente{pendingTransfers === 1 ? '' : 's'}
              </span>
            ) : session.transfers.length === 0 ? (
              <span className="text-emerald-100/40 text-sm">Sin movimientos</span>
            ) : (
              <span className="text-emerald-300 text-sm">✓ Todo pagado</span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function SessionDetail({ session }: { session: GameRecord }) {
  const { viewSession, toggleArchivedTransferPaid, deleteArchivedSession, renameArchivedSession } = useStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(session.title || '');
  const nets = useMemo(
    () => computeNets(session.players, session.chips, session.buyInCents),
    [session],
  );
  const playerById = (id: string) => session.players.find((p) => p.id === id)?.name || '?';
  const date = new Date(session.finishedAt);
  const defaultTitle = `Timba del ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const saveTitle = async () => {
    await renameArchivedSession(session.id, titleValue);
    setEditingTitle(false);
  };

  return (
    <div className="space-y-6">
      {shareOpen && <ShareModal text={buildShareTextFromRecord(session)} onClose={() => setShareOpen(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => viewSession(null)} className="btn-ghost">← Volver al historial</button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShareOpen(true)} className="btn-secondary text-sm">📋 Compartir</button>
          <button
            onClick={() => {
              if (confirm('¿Eliminar esta partida del historial?')) {
                deleteArchivedSession(session.id);
                viewSession(null);
              }
            }}
            className="text-red-300/70 hover:text-red-300 text-xs"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div>
        {editingTitle ? (
          <form
            onSubmit={(e) => { e.preventDefault(); saveTitle(); }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              placeholder={defaultTitle}
              maxLength={80}
              className="input flex-1 font-display text-xl"
            />
          </form>
        ) : (
          <button
            onClick={() => { setEditingTitle(true); setTitleValue(session.title || ''); }}
            className="font-display text-2xl text-gold-400 hover:underline text-left"
            title="Editar título"
          >
            {session.title || defaultTitle}
          </button>
        )}
        <p className="text-emerald-100/60 text-sm">
          {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          {' · '}Entrada {formatEuros(session.buyInCents)}
        </p>
      </div>

      <section>
        <h3 className="font-display text-xl text-gold-400 mb-3">Resultado</h3>
        <div className="grid gap-2">
          {session.players.map((p) => {
            const net = nets[p.id] || 0;
            return (
              <div key={p.id} className="flex items-center justify-between bg-black/20 border border-white/10 rounded-lg px-4 py-2">
                <div>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-emerald-100/50 ml-2">
                    {p.buyIns} entrada{p.buyIns === 1 ? '' : 's'}
                  </span>
                </div>
                <span className={`font-display text-lg ${net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {net >= 0 ? '+' : ''}{formatEuros(net)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="font-display text-xl text-gold-400 mb-3">Pagos</h3>
        {session.transfers.length === 0 ? (
          <p className="text-emerald-100/60 text-sm">No hubo movimientos.</p>
        ) : (
          <ul className="space-y-2">
            {session.transfers.map((t, i) => (
              <li key={i}
                className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-colors ${
                  t.paid
                    ? 'bg-emerald-500/10 border-emerald-400/30'
                    : 'bg-gradient-to-r from-emerald-900/60 to-emerald-800/40 border-gold-400/30'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={t.paid}
                    onChange={() => toggleArchivedTransferPaid(session.id, i)}
                    className="w-5 h-5 accent-emerald-400 cursor-pointer"
                  />
                  <span className={`font-semibold ${t.paid ? 'text-emerald-300/70 line-through' : 'text-red-200'}`}>
                    {playerById(t.from)}
                  </span>
                  <span className="text-emerald-100/40">→</span>
                  <span className={`font-semibold ${t.paid ? 'text-emerald-300/70 line-through' : 'text-emerald-200'}`}>
                    {playerById(t.to)}
                  </span>
                </label>
                <span className={`font-display text-xl ${t.paid ? 'text-emerald-300/70 line-through' : 'text-gold-400'}`}>
                  {formatEuros(t.cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
