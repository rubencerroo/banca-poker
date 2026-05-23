import { useState } from 'react';
import { useStore } from '../store';

export function Login() {
  const { login, busy, authError } = useStore();
  const [actor, setActor] = useState(() => localStorage.getItem('pb-last-actor') || '');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor.trim() || !password) return;
    try {
      await login(actor.trim(), password);
      localStorage.setItem('pb-last-actor', actor.trim());
    } catch { /* error mostrado vía authError */ }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-black/30 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gold-400 flex items-center justify-center text-felt-950 font-display text-3xl font-bold mb-3 shadow-chip">
            ♠
          </div>
          <h1 className="font-display text-2xl text-gold-400">Banca de Poker</h1>
          <p className="text-xs text-emerald-100/50 mt-1">Reparto y liquidación de la timba</p>
        </div>

        <label className="block mb-3">
          <span className="block text-[11px] uppercase tracking-wide text-emerald-100/50 mb-1">
            Tu nombre
          </span>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Cómo te llamas"
            autoComplete="username"
            required
            className="input w-full"
          />
        </label>

        <label className="block mb-5">
          <span className="block text-[11px] uppercase tracking-wide text-emerald-100/50 mb-1">
            Contraseña del grupo
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="input w-full"
          />
        </label>

        {authError && (
          <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {authError}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !actor.trim() || !password}
          className="btn-primary w-full py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-[11px] text-emerald-100/40 text-center mt-4">
          Tus acciones quedan registradas con tu nombre.
        </p>
      </form>
    </div>
  );
}
