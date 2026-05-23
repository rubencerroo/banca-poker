import { useState, useRef, useEffect } from 'react';
import { COLOR_PALETTE, getColor } from '../lib/colors';

type Props = {
  value: string;
  /** IDs ya usados por otras fichas (no se pueden seleccionar) */
  excludeIds: string[];
  onChange: (id: string) => void;
};

export function ColorPicker({ value, excludeIds, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = getColor(value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-black/30 border border-white/15 rounded-lg px-2 py-1.5 hover:border-gold-400/50 transition-colors w-full"
      >
        <span
          className="w-5 h-5 rounded-full border border-white/30 shadow-inner"
          style={{ background: current.hex }}
        />
        <span className="text-sm flex-1 text-left">{current.name}</span>
        <span className="text-emerald-100/40 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 left-0 min-w-full w-max bg-felt-900 border border-white/15 rounded-lg shadow-xl p-1 max-h-56 overflow-auto">
          {COLOR_PALETTE.map((c) => {
            const disabled = c.id !== value && excludeIds.includes(c.id);
            const selected = c.id === value;
            return (
              <button
                key={c.id}
                type="button"
                disabled={disabled}
                onClick={() => { onChange(c.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5'
                } ${selected ? 'bg-white/10' : ''}`}
              >
                <span
                  className="w-5 h-5 rounded-full border border-white/30 shadow-inner shrink-0"
                  style={{ background: c.hex }}
                />
                <span className="flex-1 text-left">{c.name}</span>
                {disabled && <span className="text-[10px] text-emerald-100/40">en uso</span>}
                {selected && <span className="text-gold-400">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
