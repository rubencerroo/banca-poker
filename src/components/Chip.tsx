import type { ChipType } from '../types';
import { getColor } from '../lib/colors';

type Props = {
  chip: ChipType;
  size?: number;
  showLabel?: boolean;
};

export function Chip({ chip, size = 56, showLabel = true }: Props) {
  const color = getColor(chip.colorId);
  return (
    <span
      className="chip"
      aria-label={`Ficha ${chip.label} ${color.name}`}
      style={{
        width: size,
        height: size,
        color: color.hex,
        fontSize: size * 0.32,
      }}
    >
      {showLabel && <span style={{ color: contrastText(color.hex) }}>{chip.label}</span>}
    </span>
  );
}

function contrastText(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#fff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f2937' : '#ffffff';
}
