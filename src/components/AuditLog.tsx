import { useEffect, useState } from 'react';
import { useStore } from '../store';

const ACTION_LABELS: Record<string, string> = {
  'login': '🔑 Inició sesión',
  'login.failed': '⚠ Intento de login fallido',
  'contact.create': '➕ Añadió jugador',
  'contact.update': '✏ Editó jugador',
  'contact.delete': '🗑 Eliminó jugador',
  'contact.restore': '↺ Restauró jugador',
  'session.create': '🃏 Guardó partida',
  'session.update': '✏ Modificó partida',
  'session.patch': '✏ Modificó partida',
  'session.delete': '🗑 Eliminó partida',
  'session.restore': '↺ Restauró partida',
};

function formatAt(at: number): string {
  const d = new Date(at);
  return d.toLocaleString('es-ES', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function AuditLog() {
  const { auditEntries, sessions, contacts, refreshAudit, showDeleted, setShowDeleted } = useStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) refreshAudit();
  }, [open, refreshAudit]);

  const entityLabel = (entry: typeof auditEntries[number]): string => {
    if (entry.entityType === 'session') {
      const s = sessions.find((x) => x.id === entry.entityId);
      if (s) return s.title || new Date(s.finishedAt).toLocaleDateString('es-ES');
      return entry.payload?.title || entry.entityId || '';
    }
    if (entry.entityType === 'contact') {
      const c = contacts.find((x) => x.id === entry.entityId);
      if (c) return c.name;
      return entry.payload?.name || entry.entityId || '';
    }
    return '';
  };

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-2xl text-gold-400">Actividad</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-emerald-100/70 cursor-pointer">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="w-4 h-4 accent-gold-400"
            />
            Mostrar eliminados
          </label>
          <button onClick={() => setOpen((o) => !o)} className="btn-secondary text-sm">
            {open ? 'Ocultar' : 'Ver registro'}
          </button>
        </div>
      </div>

      <p className="text-emerald-100/60 text-sm mt-2">
        Todo lo que ocurre queda registrado con quién y cuándo. Nada se borra de verdad — los elementos
        eliminados pueden restaurarse desde el listado activando "mostrar eliminados".
      </p>

      {open && (
        <div className="mt-4 bg-black/20 border border-white/10 rounded-xl overflow-hidden">
          {auditEntries.length === 0 ? (
            <p className="text-sm text-emerald-100/50 p-4">Sin actividad registrada todavía.</p>
          ) : (
            <ul className="divide-y divide-white/5 max-h-96 overflow-auto">
              {auditEntries.map((e) => (
                <li key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="text-emerald-50 truncate">
                      <span className="font-medium text-gold-400">{e.actor}</span>
                      {' '}
                      {ACTION_LABELS[e.action] || e.action}
                      {entityLabel(e) && (
                        <span className="text-emerald-100/70"> · {entityLabel(e)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-emerald-100/40 shrink-0">{formatAt(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
