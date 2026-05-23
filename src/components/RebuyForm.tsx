import { useState, useRef, useEffect } from 'react';
import { formatEuros } from '../lib/format';

type Props = {
  defaultCents: number;
  onConfirm: (amountCents: number) => void;
  onCancel: () => void;
};

export function RebuyForm({ defaultCents, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState((defaultCents / 100).toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onConfirm(Math.round(parsed * 100));
  };

  const presets = [defaultCents, defaultCents * 2, Math.round(defaultCents / 2)];

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
          className="w-24 bg-black/30 border border-gold-400/50 rounded-lg pl-3 pr-8 py-1.5 text-right text-sm font-semibold focus:outline-none focus:border-gold-400"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-100/50 text-xs pointer-events-none">€</span>
      </div>
      <div className="flex gap-1">
        {presets.filter((p, i, arr) => p > 0 && arr.indexOf(p) === i).map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => setValue((cents / 100).toFixed(2))}
            className="text-[10px] text-emerald-100/60 hover:text-emerald-50 border border-white/15 hover:border-white/30 rounded px-1.5 py-0.5"
          >
            {formatEuros(cents)}
          </button>
        ))}
      </div>
      <button type="submit" className="btn-primary text-xs px-3 py-1.5">OK</button>
      <button type="button" onClick={onCancel} className="btn-ghost text-xs">×</button>
    </form>
  );
}
