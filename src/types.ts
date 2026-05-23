export type ChipType = {
  id: string;
  /** Número impreso en la ficha */
  label: number;
  /** ID del color en la paleta (único por mesa) */
  colorId: string;
  /** Valor de la ficha en céntimos */
  valueCents: number;
  /** Total de fichas físicas disponibles de este tipo */
  totalAvailable: number;
};

/** Persona persistente — vive en D1 (cloud). */
export type Contact = {
  id: string;
  name: string;
  createdAt: number;
  deletedAt?: number | null;
  deletedBy?: string | null;
};

/** Intervalo activo del jugador en la mesa. */
export type PlayerInterval = {
  joinedAt: number;
  /** null = sigue en la mesa */
  leftAt: number | null;
};

/** Jugador en una partida concreta — referencia a un contacto. */
export type SessionPlayer = {
  id: string;          // único por sesión
  contactId: string;   // referencia a Contact
  /** Snapshot del nombre al momento de la partida (por si se renombra el contacto después). */
  name: string;
  buyIns: number;
  finalCounts: Record<string, number> | null;
  adjustmentCents: number;
  /** Sesiones de juego del jugador (puede entrar tarde, salir, volver). */
  intervals: PlayerInterval[];
  /** Timestamp en el que se le marcó como eliminado sin recomprar. null si nunca o si re-entró. */
  bustedAt: number | null;
};

export type Transfer = {
  from: string;   // SessionPlayer.id
  to: string;     // SessionPlayer.id
  cents: number;
  paid: boolean;
};

/** Partida cerrada y archivada en D1. */
export type GameRecord = {
  id: string;
  /** Título libre opcional (ej. "Sábado en casa de Erik") */
  title?: string;
  startedAt: number;
  finishedAt: number;
  buyInCents: number;
  chips: ChipType[];
  players: SessionPlayer[];
  transfers: Transfer[];
  deletedAt?: number | null;
  deletedBy?: string | null;
};

export type AuditEntry = {
  id: number;
  at: number;
  actor: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: any;
};

export type Phase = 'setup' | 'playing' | 'settled';

export type TopTab = 'game' | 'history' | 'contacts';

export type SessionState = {
  // Activa
  chips: ChipType[];
  buyInCents: number;
  players: SessionPlayer[];
  transfers: Transfer[] | null;
  startedAt: number | null;
  phase: Phase;
  topTab: TopTab;
  /** Título libre opcional para la timba en curso */
  gameTitle: string;

  // Cache en memoria de la API
  contacts: Contact[];
  sessions: GameRecord[];
  auditEntries: AuditEntry[];

  // Auth
  actor: string | null;
  authChecked: boolean;
  authError: string | null;
  busy: boolean;

  // UI
  viewingSessionId: string | null;
  showDeleted: boolean;
};
