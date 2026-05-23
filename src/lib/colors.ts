export type PaletteColor = { id: string; name: string; hex: string };

/** Paleta cerrada de colores de ficha. El id es estable; el nombre y hex se muestran. */
export const COLOR_PALETTE: PaletteColor[] = [
  { id: 'white',  name: 'Blanca',   hex: '#f5f5f5' },
  { id: 'red',    name: 'Roja',     hex: '#dc2626' },
  { id: 'green',  name: 'Verde',    hex: '#16a34a' },
  { id: 'blue',   name: 'Azul',     hex: '#2563eb' },
  { id: 'black',  name: 'Negra',    hex: '#111827' },
  { id: 'purple', name: 'Morada',   hex: '#7c3aed' },
  { id: 'yellow', name: 'Amarilla', hex: '#eab308' },
  { id: 'orange', name: 'Naranja',  hex: '#ea580c' },
  { id: 'pink',   name: 'Rosa',     hex: '#ec4899' },
  { id: 'gray',   name: 'Gris',     hex: '#6b7280' },
];

export const getColor = (id: string): PaletteColor =>
  COLOR_PALETTE.find((c) => c.id === id) || COLOR_PALETTE[0];

export const firstUnusedColor = (usedIds: string[]): PaletteColor | null =>
  COLOR_PALETTE.find((c) => !usedIds.includes(c.id)) || null;
