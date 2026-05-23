import { useStore } from './store';
import { Setup } from './components/Setup';
import { Game } from './components/Game';
import { Settlement } from './components/Settlement';
import { Contacts } from './components/Contacts';
import { History } from './components/History';
import { Login } from './components/Login';
import { Logo } from './components/Logo';
import type { TopTab } from './types';

const TOP_TABS: { id: TopTab; label: string; short: string; icon: string }[] = [
  { id: 'game',     label: 'Timba',     short: 'Timba',  icon: '♠' },
  { id: 'history',  label: 'Historial', short: 'Hist.',  icon: '⏱' },
  { id: 'contacts', label: 'Jugadores', short: 'Pers.',  icon: '☺' },
];

const STEPS = [
  { id: 'setup',   label: 'Configuración', short: 'Config' },
  { id: 'playing', label: 'En juego',      short: 'Juego' },
  { id: 'settled', label: 'Liquidación',   short: 'Liquid.' },
] as const;

function App() {
  const phase = useStore((s) => s.phase);
  const topTab = useStore((s) => s.topTab);
  const setTopTab = useStore((s) => s.setTopTab);
  const resetSession = useStore((s) => s.resetSession);
  const sessions = useStore((s) => s.sessions);
  const actor = useStore((s) => s.actor);
  const authChecked = useStore((s) => s.authChecked);
  const logout = useStore((s) => s.logout);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-emerald-100/40">
        Cargando…
      </div>
    );
  }
  if (!actor) {
    return <Login />;
  }

  const pendingTotal = sessions.reduce(
    (s, x) => s + x.transfers.filter((t) => !t.paid).length, 0,
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Logo size={40} className="shrink-0" />
            <h1 className="font-display text-base md:text-xl text-gold-400 leading-none truncate">Banca de Poker</h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden md:inline text-xs text-emerald-100/50">{actor}</span>
            {topTab === 'game' && (
              <button
                onClick={() => { if (confirm('¿Reiniciar la timba actual?')) resetSession(); }}
                className="btn-ghost text-xs"
              >
                Reiniciar
              </button>
            )}
            <button
              onClick={() => { if (confirm('¿Cerrar sesión?')) logout(); }}
              className="btn-ghost text-xs"
              title={`Sesión: ${actor}`}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Top tabs */}
        <nav className="max-w-5xl mx-auto px-2 md:px-6 pb-2 flex gap-1">
          {TOP_TABS.map((t) => {
            const active = t.id === topTab;
            const showBadge = t.id === 'history' && pendingTotal > 0;
            return (
              <button
                key={t.id}
                onClick={() => setTopTab(t.id)}
                className={`relative flex-1 px-2 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gold-400 text-felt-950'
                    : 'text-emerald-100/70 hover:bg-white/5'
                }`}
              >
                <span className="md:hidden">{t.short}</span>
                <span className="hidden md:inline">{t.label}</span>
                {showBadge && (
                  <span className="absolute top-1 right-1 md:top-2 md:right-3 bg-amber-400 text-felt-950 text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {pendingTotal}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {topTab === 'game' && (
          <>
            <StepIndicator phase={phase} />
            {phase === 'setup' && <Setup />}
            {phase === 'playing' && <Game />}
            {phase === 'settled' && <Settlement />}
          </>
        )}
        {topTab === 'history'  && <History />}
        {topTab === 'contacts' && <Contacts />}
      </main>

      <footer className="text-center text-xs text-emerald-100/30 py-6 px-4">
        Datos sincronizados en la nube — sesión iniciada como <span className="text-emerald-100/50">{actor}</span>
      </footer>
    </div>
  );
}

function StepIndicator({ phase }: { phase: string }) {
  const currentIdx = STEPS.findIndex((s) => s.id === phase);
  return (
    <div className="mb-6 flex items-center gap-1 md:gap-2">
      {STEPS.map((s, i) => {
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <div key={s.id} className="flex items-center flex-1">
            <div className={`flex-1 px-2 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border text-center ${
              active ? 'bg-gold-400/20 text-gold-400 border-gold-400/60' :
              done ? 'border-emerald-400/40 text-emerald-200' :
              'border-white/10 text-emerald-100/40'
            }`}>
              <span className="md:hidden">{s.short}</span>
              <span className="hidden md:inline">{i + 1}. {s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-2 md:w-4 h-px bg-white/10" />}
          </div>
        );
      })}
    </div>
  );
}

export default App;
