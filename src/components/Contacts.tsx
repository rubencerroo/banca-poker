import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Ranking } from './Ranking';
import { AuditLog } from './AuditLog';
import { formatEuros } from '../lib/format';
import { computeContactStats, formatDuration } from '../lib/stats';

export function Contacts() {
  const {
    contacts, sessions, addContact, renameContact, removeContact,
    restoreEntity,
  } = useStore();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const stats = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, computeContactStats(sessions, c.id)])),
    [contacts, sessions],
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addContact(name);
    setName('');
  };

  return (
    <div className="space-y-10">
      <Ranking />

      <section>
        <h2 className="font-display text-2xl text-gold-400 mb-3">Jugadores</h2>
        <p className="text-emerald-100/60 text-sm mb-4">
          Tus contactos persisten entre timbas. Aquí ves cuánto ha ganado o perdido cada uno.
        </p>
        <form onSubmit={handleAdd} className="flex gap-2 mb-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del nuevo jugador"
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">+ Añadir</button>
        </form>

        {contacts.length === 0 ? (
          <p className="text-emerald-100/50 text-sm">Aún no hay contactos. Añade el primero arriba.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {contacts.map((c) => {
              const s = stats[c.id];
              const isEditing = editing === c.id;
              const isDeleted = !!c.deletedAt;
              return (
                <div key={c.id} className={`border rounded-xl p-4 ${
                  isDeleted ? 'bg-red-500/5 border-red-400/20 opacity-70' : 'bg-black/25 border-white/10'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    {isEditing ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await renameContact(c.id, editValue);
                          setEditing(null);
                        }}
                        className="flex-1 flex gap-2"
                      >
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => setEditing(null)}
                          className="input flex-1"
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => { setEditing(c.id); setEditValue(c.name); }}
                        className="font-display text-xl text-gold-400 hover:underline text-left"
                      >
                        {c.name}
                      </button>
                    )}
                    {isDeleted ? (
                      <button
                        onClick={() => restoreEntity('contact', c.id)}
                        className="text-emerald-300/80 hover:text-emerald-200 text-xs"
                      >
                        ↺ Restaurar
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${c.name}?\nQueda registrado y se puede restaurar.`)) {
                            removeContact(c.id);
                          }
                        }}
                        className="text-red-300/70 hover:text-red-300 text-xs"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Stat label="Partidas" value={s.gamesPlayed.toString()} />
                    <Stat
                      label="Balance total"
                      value={`${s.totalNetCents >= 0 ? '+' : ''}${formatEuros(s.totalNetCents)}`}
                      tone={s.totalNetCents > 0 ? 'good' : s.totalNetCents < 0 ? 'bad' : 'neutral'}
                    />
                    <Stat label="Mayor ganancia" value={formatEuros(s.biggestWinCents)} tone="good" />
                    <Stat label="Mayor pérdida" value={formatEuros(s.biggestLossCents)} tone="bad" />
                    <Stat label="Total entradas" value={formatEuros(s.totalBuyInsCents)} />
                    <Stat
                      label="Pendiente"
                      value={s.pendingCents === 0 ? '—' : `${s.pendingCents >= 0 ? '+' : ''}${formatEuros(s.pendingCents)}`}
                      tone={s.pendingCents > 0 ? 'good' : s.pendingCents < 0 ? 'bad' : 'neutral'}
                    />
                    <Stat label="Tiempo en mesa" value={formatDuration(s.totalActiveMs)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AuditLog />
    </div>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const color =
    tone === 'good' ? 'text-emerald-300' :
    tone === 'bad' ? 'text-red-300' :
    'text-emerald-50';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-emerald-100/50">{label}</div>
      <div className={`font-display text-base ${color}`}>{value}</div>
    </div>
  );
}
