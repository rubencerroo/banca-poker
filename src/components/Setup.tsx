import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Chip } from './Chip';
import { ColorPicker } from './ColorPicker';
import { formatEuros } from '../lib/format';
import { computeDistribution } from '../lib/chips';
import { COLOR_PALETTE } from '../lib/colors';

export function Setup() {
  const {
    chips, buyInCents, players, contacts, gameTitle,
    addChip, updateChip, removeChip,
    addPlayerFromContact, removePlayer,
    setBuyIn, startGame, addContact, setTopTab, setGameTitle,
  } = useStore();

  const [newContact, setNewContact] = useState('');

  const distribution = useMemo(
    () => computeDistribution(chips, Math.max(1, players.length), buyInCents),
    [chips, players.length, buyInCents],
  );

  const canStart = players.length >= 2 && chips.length > 0 && buyInCents > 0;
  const canAddChip = chips.length < COLOR_PALETTE.length;
  const usedColorIds = chips.map((c) => c.colorId);

  const selectedIds = new Set(players.map((p) => p.contactId));

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.trim()) return;
    const c = await addContact(newContact);
    setNewContact('');
    if (c) addPlayerFromContact(c.id);
  };

  return (
    <div className="space-y-8">
      <Section title="Detalles">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wide text-emerald-100/50 mb-1">Importe por jugador</span>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min={0}
                value={(buyInCents / 100).toFixed(2)}
                onChange={(e) => setBuyIn(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full bg-black/30 border border-white/15 rounded-lg pl-3 pr-8 py-2 text-right text-lg font-semibold focus:outline-none focus:border-gold-400/60"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-100/50 text-sm pointer-events-none">€</span>
            </div>
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wide text-emerald-100/50 mb-1">
              Título de la timba <span className="opacity-60 normal-case">(opcional)</span>
            </span>
            <input
              type="text"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              placeholder="Sábado en casa de Erik, post-cena…"
              maxLength={80}
              className="input w-full"
            />
          </label>
        </div>
      </Section>

      <Section title="Fichas" action={
        <button
          onClick={addChip}
          disabled={!canAddChip}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Añadir ficha
        </button>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chips.map((c) => (
            <div key={c.id} className="flex items-center gap-4 bg-black/20 border border-white/10 rounded-xl p-3">
              <Chip chip={c} size={52} />
              <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                <Field label="Nº">
                  <input type="number" value={c.label}
                    onChange={(e) => updateChip(c.id, { label: parseInt(e.target.value) || 0 })}
                    className="input w-full" />
                </Field>
                <Field label="Color">
                  <ColorPicker
                    value={c.colorId}
                    excludeIds={usedColorIds}
                    onChange={(id) => updateChip(c.id, { colorId: id })}
                  />
                </Field>
                <Field label="Valor (céntimos)">
                  <input type="number" value={c.valueCents}
                    onChange={(e) => updateChip(c.id, { valueCents: parseInt(e.target.value) || 0 })}
                    className="input w-full" />
                </Field>
                <Field label="Disponibles">
                  <input type="number" value={c.totalAvailable}
                    onChange={(e) => updateChip(c.id, { totalAvailable: parseInt(e.target.value) || 0 })}
                    className="input w-full" />
                </Field>
              </div>
              <button
                onClick={() => removeChip(c.id)}
                disabled={chips.length <= 1}
                className="text-red-300/70 hover:text-red-300 text-xs whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
        {!canAddChip && (
          <p className="text-xs text-emerald-100/50 mt-2">Has usado todos los colores de la paleta.</p>
        )}
      </Section>

      <Section title="Jugadores en la mesa" action={
        <button onClick={() => setTopTab('contacts')} className="btn-ghost text-xs">
          Gestionar contactos →
        </button>
      }>
        <form onSubmit={handleAddContact} className="flex gap-2 mb-4">
          <input
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            placeholder="Crear nuevo contacto y añadir"
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">+ Crear</button>
        </form>

        {contacts.length === 0 ? (
          <p className="text-emerald-100/50 text-sm">Aún no hay contactos. Crea el primero arriba.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {contacts.map((c) => {
              const selected = selectedIds.has(c.id);
              const player = players.find((p) => p.contactId === c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (selected && player) removePlayer(player.id);
                    else addPlayerFromContact(c.id);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-left ${
                    selected
                      ? 'bg-gold-400/20 border-gold-400/60 text-gold-400'
                      : 'bg-black/20 border-white/10 text-emerald-50 hover:border-white/30'
                  }`}
                >
                  <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                    selected ? 'bg-gold-400 border-gold-400 text-felt-950' : 'border-white/30'
                  }`}>
                    {selected ? '✓' : ''}
                  </span>
                  <span className="text-sm font-medium truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {players.length > 0 && (
          <div className="mt-3 text-sm text-emerald-100/60">
            {players.length} jugador{players.length === 1 ? '' : 'es'} seleccionado{players.length === 1 ? '' : 's'}
          </div>
        )}
      </Section>

      {players.length > 0 && (
        <Section title="Reparto sugerido por jugador">
          <div className="bg-black/25 border border-white/10 rounded-xl p-4">
            <div className="flex flex-wrap gap-4">
              {chips.map((c) => {
                const n = distribution.perPlayer[c.id] || 0;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <Chip chip={c} size={48} />
                    <div>
                      <div className="text-2xl font-display font-semibold leading-none">×{n}</div>
                      <div className="text-xs text-emerald-100/60">{formatEuros(c.valueCents)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-emerald-100/70 text-sm">Valor entregado por jugador</span>
              <span className="text-xl font-display font-semibold text-gold-400">
                {formatEuros(distribution.valuePerPlayerCents)}
              </span>
            </div>
            {distribution.warning && (
              <p className="mt-3 text-amber-300/90 text-sm">⚠ {distribution.warning}</p>
            )}
          </div>
        </Section>
      )}

      <div className="flex justify-end">
        <button
          onClick={startGame}
          disabled={!canStart}
          className="btn-primary text-lg px-8 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Empezar partida →
        </button>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display text-2xl text-gold-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-emerald-100/50 mb-1">{label}</span>
      {children}
    </label>
  );
}
