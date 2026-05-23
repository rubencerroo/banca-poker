import { useState } from 'react';
import { useStore } from '../store';
import { formatEuros } from '../lib/format';
import { isPlayerActive, playerActiveMs } from '../lib/intervals';
import { playerInvestedCents } from '../lib/chips';
import { formatDuration } from '../lib/stats';
import { RebuyForm } from './RebuyForm';

export function Game() {
  const {
    players, buyInCents, contacts, startedAt,
    rebuy, undoRebuy, bustPlayer, reenterPlayer,
    addPlayerFromContact, finishGame, setPhase,
  } = useStore();

  const [adding, setAdding] = useState(false);
  const [rebuyingId, setRebuyingId] = useState<string | null>(null);
  const [reenteringId, setReenteringId] = useState<string | null>(null);

  const totalPot = players.reduce((s, p) => s + playerInvestedCents(p, buyInCents), 0);
  const totalRebuys = players.reduce((s, p) => s + (p.buyIns - 1), 0);
  const activeCount = players.filter(isPlayerActive).length;

  const usedContactIds = new Set(players.map((p) => p.contactId));
  const availableContacts = contacts.filter((c) => !usedContactIds.has(c.id));
  const now = Date.now();
  const gameElapsed = startedAt ? now - startedAt : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Stat label="Bote total" value={formatEuros(totalPot)} accent />
        <Stat label="En mesa" value={`${activeCount}/${players.length}`} />
        <Stat label="Recompras" value={totalRebuys.toString()} />
        <Stat label="Tiempo" value={formatDuration(gameElapsed)} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-display text-2xl text-gold-400">Mesa</h2>
          {availableContacts.length > 0 && (
            <button onClick={() => setAdding((a) => !a)} className="btn-secondary text-sm">
              {adding ? 'Cancelar' : '+ Añadir jugador'}
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-3 bg-black/25 border border-gold-400/30 rounded-xl p-3">
            <p className="text-sm text-emerald-100/70 mb-2">Selecciona un contacto para que entre en la partida ahora:</p>
            <div className="flex flex-wrap gap-2">
              {availableContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { addPlayerFromContact(c.id); setAdding(false); }}
                  className="btn-secondary text-sm"
                >
                  + {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {players.map((p) => {
            const active = isPlayerActive(p);
            const isBusted = p.bustedAt !== null;
            const timePlayed = playerActiveMs(p, now);
            const invested = playerInvestedCents(p, buyInCents);
            const isRebuying = rebuyingId === p.id;
            const isReentering = reenteringId === p.id;

            return (
              <div key={p.id}
                className={`rounded-xl p-4 border transition-colors ${
                  active
                    ? 'bg-black/25 border-white/10'
                    : 'bg-red-500/5 border-red-400/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-lg font-semibold truncate">{p.name}</div>
                      {isBusted && (
                        <span className="text-[10px] uppercase tracking-wide bg-red-500/20 text-red-200 border border-red-400/30 rounded-full px-2 py-0.5">
                          Eliminado
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-emerald-100/60">
                      {p.buyIns} entrada{p.buyIns === 1 ? '' : 's'} · {formatEuros(invested)}
                      {' · '}{formatDuration(timePlayed)}
                    </div>
                  </div>
                </div>

                {isRebuying ? (
                  <RebuyForm
                    defaultCents={buyInCents}
                    onConfirm={(amount) => { rebuy(p.id, amount); setRebuyingId(null); }}
                    onCancel={() => setRebuyingId(null)}
                  />
                ) : isReentering ? (
                  <RebuyForm
                    defaultCents={buyInCents}
                    onConfirm={(amount) => { reenterPlayer(p.id, amount); setReenteringId(null); }}
                    onCancel={() => setReenteringId(null)}
                  />
                ) : (
                  <div className="flex gap-2 flex-wrap items-center">
                    {active ? (
                      <>
                        {p.buyIns > 1 && (
                          <button onClick={() => undoRebuy(p.id)} className="btn-ghost text-xs" title="Deshacer última recompra">
                            − recompra
                          </button>
                        )}
                        <button onClick={() => setRebuyingId(p.id)} className="btn-secondary text-sm">
                          + Recomprar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿${p.name} se va sin recomprar?\nSus fichas finales quedan en 0.`)) {
                              bustPlayer(p.id);
                            }
                          }}
                          className="text-red-300/80 hover:text-red-200 text-xs ml-auto"
                        >
                          Salir mesa
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setReenteringId(p.id)} className="btn-primary text-sm">
                        ↺ Volver a entrar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap justify-between gap-2 pt-4">
        <button onClick={() => setPhase('setup')} className="btn-ghost">← Volver a configuración</button>
        <button onClick={finishGame} className="btn-primary text-lg px-8 py-3">Finalizar y contar fichas →</button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-black/25 border border-white/10 rounded-xl p-3 md:p-4">
      <div className="text-[10px] md:text-xs uppercase tracking-wide text-emerald-100/50">{label}</div>
      <div className={`mt-1 font-display text-xl md:text-3xl ${accent ? 'text-gold-400' : ''}`}>{value}</div>
    </div>
  );
}
