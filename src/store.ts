import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChipType, Phase, SessionState, Contact, SessionPlayer, GameRecord, TopTab, SettlementMode,
} from './types';
import { uid } from './lib/format';
import { firstUnusedColor } from './lib/colors';
import { computeNets, computeSettlement } from './lib/chips';
import { closeOpenIntervals, isPlayerActive } from './lib/intervals';
import {
  apiMe, apiLogin, apiLogout, apiState,
  apiUpsertContact, apiDeleteContact,
  apiUpsertSession, apiPatchSession, apiDeleteSession,
  apiRestore, apiAudit,
} from './lib/api';

const defaultChipsTemplate: Omit<ChipType, 'id'>[] = [
  { label: 5,  colorId: 'white', valueCents: 10,  totalAvailable: 100 },
  { label: 10, colorId: 'red',   valueCents: 20,  totalAvailable: 100 },
  { label: 25, colorId: 'green', valueCents: 50,  totalAvailable: 50  },
  { label: 50, colorId: 'blue',  valueCents: 100, totalAvailable: 25  },
];

const makeDefaultChips = (): ChipType[] =>
  defaultChipsTemplate.map((c) => ({ ...c, id: uid() }));

type Actions = {
  // Chips
  addChip: () => void;
  updateChip: (id: string, patch: Partial<ChipType>) => void;
  removeChip: (id: string) => void;

  // Players actuales
  addPlayerFromContact: (contactId: string) => void;
  removePlayer: (id: string) => void;
  rebuy: (id: string) => void;
  undoRebuy: (id: string) => void;
  bustPlayer: (id: string) => void;
  reenterPlayer: (id: string) => void;

  // Final counts & ajustes
  setFinalCount: (playerId: string, chipId: string, count: number) => void;
  applyAdjustment: (mode: 'all' | 'winners') => void;
  clearAdjustments: () => void;

  // Transfers
  recomputeTransfers: () => void;
  toggleTransferPaid: (idx: number) => Promise<void>;
  setSettlementMode: (mode: SettlementMode) => void;
  setBancaPlayerId: (id: string | null) => void;

  // Fase / tab
  setPhase: (phase: Phase) => void;
  setBuyIn: (cents: number) => void;
  setTopTab: (t: TopTab) => void;
  setGameTitle: (title: string) => void;
  renameArchivedSession: (id: string, title: string) => Promise<void>;

  startGame: () => void;
  finishGame: () => void;
  newRound: () => void;
  resetSession: () => void;

  // Auth
  checkAuth: () => Promise<void>;
  login: (actor: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Contactos
  refreshState: () => Promise<void>;
  addContact: (name: string) => Promise<Contact | null>;
  renameContact: (id: string, name: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;

  // Historial / archivos
  saveAndArchive: () => Promise<void>;
  deleteArchivedSession: (id: string) => Promise<void>;
  toggleArchivedTransferPaid: (sessionId: string, idx: number) => Promise<void>;
  restoreEntity: (type: 'contact' | 'session', id: string) => Promise<void>;

  // Audit
  refreshAudit: () => Promise<void>;

  // UI
  viewSession: (id: string | null) => void;
  setShowDeleted: (v: boolean) => void;
};

const initialState: SessionState = {
  chips: makeDefaultChips(),
  buyInCents: 500,
  players: [],
  transfers: null,
  startedAt: null,
  phase: 'setup',
  topTab: 'game',
  gameTitle: '',
  settlementMode: 'greedy',
  bancaPlayerId: null,
  contacts: [],
  sessions: [],
  auditEntries: [],
  actor: null,
  authChecked: false,
  authError: null,
  busy: false,
  viewingSessionId: null,
  showDeleted: false,
};

export const useStore = create<SessionState & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addChip: () =>
        set((s) => {
          const used = s.chips.map((c) => c.colorId);
          const next = firstUnusedColor(used);
          if (!next) return s;
          return {
            chips: [
              ...s.chips,
              { id: uid(), label: 100, colorId: next.id, valueCents: 200, totalAvailable: 20 },
            ],
          };
        }),

      updateChip: (id, patch) =>
        set((s) => {
          if (patch.colorId && s.chips.some((c) => c.id !== id && c.colorId === patch.colorId)) {
            return s;
          }
          return { chips: s.chips.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
        }),

      removeChip: (id) => set((s) => ({ chips: s.chips.filter((c) => c.id !== id) })),

      addPlayerFromContact: (contactId) =>
        set((s) => {
          if (s.players.some((p) => p.contactId === contactId)) return s;
          const contact = s.contacts.find((c) => c.id === contactId);
          if (!contact) return s;
          const intervals = s.phase === 'playing'
            ? [{ joinedAt: Date.now(), leftAt: null }]
            : [];
          const newPlayer: SessionPlayer = {
            id: uid(),
            contactId,
            name: contact.name,
            buyIns: 1,
            finalCounts: null,
            adjustmentCents: 0,
            intervals,
            bustedAt: null,
          };
          return { players: [...s.players, newPlayer] };
        }),

      removePlayer: (id) =>
        set((s) => ({ players: s.players.filter((p) => p.id !== id) })),

      rebuy: (id) =>
        set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, buyIns: p.buyIns + 1 } : p)) })),

      undoRebuy: (id) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, buyIns: Math.max(1, p.buyIns - 1) } : p,
          ),
        })),

      bustPlayer: (id) =>
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== id || !isPlayerActive(p)) return p;
            const now = Date.now();
            const intervals = closeOpenIntervals(p.intervals, now);
            const zeroCounts: Record<string, number> = {};
            for (const c of s.chips) zeroCounts[c.id] = 0;
            return { ...p, intervals, finalCounts: zeroCounts, bustedAt: now };
          }),
        })),

      reenterPlayer: (id) =>
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== id || isPlayerActive(p)) return p;
            return {
              ...p,
              buyIns: p.buyIns + 1,
              intervals: [...p.intervals, { joinedAt: Date.now(), leftAt: null }],
              finalCounts: null,
              bustedAt: null,
            };
          }),
        })),

      setFinalCount: (playerId, chipId, count) =>
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== playerId) return p;
            const fc = { ...(p.finalCounts || {}) };
            fc[chipId] = Math.max(0, Math.floor(count) || 0);
            return { ...p, finalCounts: fc };
          }),
        })),

      applyAdjustment: (mode) => {
        const { players, chips, buyInCents } = get();
        const expected = players.reduce((s, p) => s + p.buyIns * buyInCents, 0);
        let actual = 0;
        for (const p of players) {
          if (!p.finalCounts) continue;
          for (const c of chips) actual += (p.finalCounts[c.id] || 0) * c.valueCents;
        }
        const diff = actual - expected;
        if (diff === 0) return;

        let recipients;
        if (mode === 'winners') {
          recipients = players.filter((p) => {
            if (!p.finalCounts) return false;
            const finalValue = chips.reduce((s, c) => s + (p.finalCounts![c.id] || 0) * c.valueCents, 0);
            return finalValue - p.buyIns * buyInCents > 0;
          });
        } else {
          recipients = players;
        }
        if (recipients.length === 0) return;

        const base = Math.trunc(diff / recipients.length);
        let remainder = diff - base * recipients.length;

        const adjustments: Record<string, number> = {};
        for (const p of players) adjustments[p.id] = 0;
        for (let i = 0; i < recipients.length; i++) {
          let share = base;
          if (remainder !== 0) {
            const sign = remainder > 0 ? 1 : -1;
            share += sign;
            remainder -= sign;
          }
          adjustments[recipients[i].id] = -share;
        }

        set({ players: players.map((p) => ({ ...p, adjustmentCents: adjustments[p.id] })) });
        get().recomputeTransfers();
      },

      clearAdjustments: () => {
        set((s) => ({ players: s.players.map((p) => ({ ...p, adjustmentCents: 0 })) }));
        get().recomputeTransfers();
      },

      recomputeTransfers: () => {
        const { players, chips, buyInCents, transfers, settlementMode, bancaPlayerId } = get();
        if (!players.every((p) => p.finalCounts !== null) || players.length === 0) {
          set({ transfers: null });
          return;
        }
        const nets = computeNets(players, chips, buyInCents);
        const fresh = computeSettlement(nets, settlementMode, bancaPlayerId);
        const merged = fresh.map((t) => {
          const existing = transfers?.find(
            (e) => e.from === t.from && e.to === t.to && e.cents === t.cents,
          );
          return { ...t, paid: existing?.paid ?? false };
        });
        set({ transfers: merged });
      },

      setSettlementMode: (mode) => {
        set({ settlementMode: mode });
        get().recomputeTransfers();
      },
      setBancaPlayerId: (id) => {
        set({ bancaPlayerId: id });
        if (get().settlementMode === 'banca') get().recomputeTransfers();
      },

      toggleTransferPaid: async (idx) => {
        const { transfers } = get();
        if (!transfers) return;
        const next = transfers.map((t, i) => (i === idx ? { ...t, paid: !t.paid } : t));
        set({ transfers: next });
      },

      setPhase: (phase) => set({ phase }),
      setBuyIn: (cents) => set({ buyInCents: Math.max(0, Math.floor(cents)) }),
      setTopTab: (t) => set({ topTab: t, viewingSessionId: null }),
      setGameTitle: (title) => set({ gameTitle: title }),

      renameArchivedSession: async (id, title) => {
        const newTitle = title.trim() || undefined;
        await apiPatchSession(id, { title: newTitle });
        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, title: newTitle } : x)),
        }));
      },

      startGame: () =>
        set((s) => {
          const now = Date.now();
          return {
            phase: 'playing',
            startedAt: now,
            players: s.players.map((p) => ({
              ...p,
              intervals: p.intervals.length > 0 ? p.intervals : [{ joinedAt: now, leftAt: null }],
            })),
          };
        }),

      finishGame: () => {
        set((s) => {
          const now = Date.now();
          return {
            phase: 'settled',
            players: s.players.map((p) => ({
              ...p,
              intervals: closeOpenIntervals(p.intervals, now),
            })),
          };
        });
        get().recomputeTransfers();
      },

      newRound: () =>
        set((s) => ({
          phase: 'setup',
          startedAt: null,
          transfers: null,
          gameTitle: '',
          bancaPlayerId: null,
          players: s.players.map((p) => ({
            ...p, buyIns: 1, finalCounts: null, adjustmentCents: 0, intervals: [], bustedAt: null,
          })),
        })),

      resetSession: () =>
        set({
          chips: makeDefaultChips(),
          buyInCents: 500,
          players: [],
          transfers: null,
          startedAt: null,
          gameTitle: '',
          phase: 'setup',
        }),

      // ── Auth ──
      checkAuth: async () => {
        try {
          const { actor } = await apiMe();
          set({ actor, authChecked: true, authError: null });
          if (actor) await get().refreshState();
        } catch {
          // Sin backend en dev o sin sesión — pintamos la pantalla de login limpia.
          set({ actor: null, authChecked: true, authError: null });
        }
      },

      login: async (actor, password) => {
        set({ busy: true, authError: null });
        try {
          const res = await apiLogin(actor, password);
          set({ actor: res.actor, busy: false });
          await get().refreshState();
        } catch (e) {
          set({ busy: false, authError: (e as Error).message });
          throw e;
        }
      },

      logout: async () => {
        try { await apiLogout(); } catch { /* ignore */ }
        set({ actor: null, contacts: [], sessions: [], auditEntries: [] });
      },

      // ── Contacts (cloud) ──
      refreshState: async () => {
        const { showDeleted } = get();
        const data = await apiState(showDeleted);
        set({ contacts: data.contacts, sessions: data.sessions });
      },

      addContact: async (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const existing = get().contacts.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing;
        const contact: Contact = { id: uid(), name: trimmed, createdAt: Date.now() };
        await apiUpsertContact({ id: contact.id, name: contact.name });
        set((s) => ({ contacts: [...s.contacts, contact].sort((a, b) => a.name.localeCompare(b.name)) }));
        return contact;
      },

      renameContact: async (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        await apiUpsertContact({ id, name: trimmed });
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, name: trimmed } : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }));
      },

      removeContact: async (id) => {
        await apiDeleteContact(id);
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
          players: s.players.filter((p) => p.contactId !== id),
        }));
      },

      // ── Sessions (cloud) ──
      saveAndArchive: async () => {
        const { chips, buyInCents, players, transfers, startedAt, gameTitle, settlementMode, bancaPlayerId } = get();
        if (players.length === 0 || !transfers) return;
        const record: GameRecord = {
          id: uid(),
          title: gameTitle.trim() || undefined,
          startedAt: startedAt || Date.now(),
          finishedAt: Date.now(),
          buyInCents,
          chips: chips.map((c) => ({ ...c })),
          players: players.map((p) => ({ ...p, finalCounts: p.finalCounts ? { ...p.finalCounts } : null })),
          transfers: transfers.map((t) => ({ ...t })),
          settlementMode,
          bancaPlayerId,
        };
        await apiUpsertSession(record);
        set((s) => ({
          sessions: [record, ...s.sessions],
          players: [],
          transfers: null,
          startedAt: null,
          gameTitle: '',
          bancaPlayerId: null,
          phase: 'setup',
        }));
      },

      deleteArchivedSession: async (id) => {
        await apiDeleteSession(id);
        // En vista normal lo quitamos; si showDeleted está activo lo marcamos eliminado
        const { showDeleted, actor } = get();
        set((s) => ({
          sessions: showDeleted
            ? s.sessions.map((x) => (x.id === id ? { ...x, deletedAt: Date.now(), deletedBy: actor || '?' } : x))
            : s.sessions.filter((x) => x.id !== id),
        }));
      },

      toggleArchivedTransferPaid: async (sessionId, idx) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return;
        const transfers = session.transfers.map((t, i) => (i === idx ? { ...t, paid: !t.paid } : t));
        await apiPatchSession(sessionId, { transfers });
        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, transfers } : x)),
        }));
      },

      restoreEntity: async (type, id) => {
        await apiRestore(type, id);
        await get().refreshState();
      },

      // ── Audit ──
      refreshAudit: async () => {
        try {
          const { entries } = await apiAudit();
          set({ auditEntries: entries });
        } catch (e) {
          console.error('audit error', e);
        }
      },

      // ── UI ──
      viewSession: (id) => set({ viewingSessionId: id }),
      setShowDeleted: async (v) => {
        set({ showDeleted: v });
        await get().refreshState();
      },
    }),
    {
      name: 'poker-banca-local',
      version: 5,
      partialize: (s) => ({
        // Sólo persistimos en localStorage la timba EN CURSO (state pre-archive)
        // y la pestaña/UI. Los datos persistentes viven en el servidor.
        chips: s.chips,
        buyInCents: s.buyInCents,
        players: s.players,
        transfers: s.transfers,
        startedAt: s.startedAt,
        phase: s.phase,
        topTab: s.topTab,
        gameTitle: s.gameTitle,
        showDeleted: s.showDeleted,
        settlementMode: s.settlementMode,
        bancaPlayerId: s.bancaPlayerId,
      }),
    },
  ),
);

// Comprobar sesión al cargar la app
if (typeof window !== 'undefined') {
  useStore.getState().checkAuth();
}
