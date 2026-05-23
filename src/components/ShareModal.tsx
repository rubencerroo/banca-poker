import { useState, useEffect } from 'react';

type Props = {
  text: string;
  onClose: () => void;
};

export function ShareModal({ text, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: seleccionar el textarea
      const ta = document.getElementById('share-text') as HTMLTextAreaElement | null;
      if (ta) {
        ta.focus();
        ta.select();
      }
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ text });
    } catch {
      // Cancelado o no soportado
    }
  };

  const canShareNative = typeof navigator !== 'undefined' && !!(navigator as any).share;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-felt-900 border border-white/15 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-display text-xl text-gold-400">Compartir resumen</h3>
          <button onClick={onClose} className="text-emerald-100/60 hover:text-emerald-50 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 flex-1 overflow-auto">
          <textarea
            id="share-text"
            readOnly
            value={text}
            className="w-full h-72 md:h-80 bg-black/40 border border-white/15 rounded-lg p-3 font-mono text-sm text-emerald-50 resize-none focus:outline-none focus:border-gold-400/60"
          />
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex flex-wrap gap-2 justify-end">
          {canShareNative && (
            <button onClick={handleNativeShare} className="btn-secondary">
              Compartir…
            </button>
          )}
          <button onClick={handleCopy} className={`btn-primary transition-all ${copied ? 'bg-emerald-400' : ''}`}>
            {copied ? '✓ Copiado' : 'Copiar al portapapeles'}
          </button>
        </div>
      </div>
    </div>
  );
}
