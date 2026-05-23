// GET /api/state — devuelve contactos y sesiones (no eliminados por defecto).
// ?showDeleted=1 incluye también los eliminados (para vista de actividad/restore).

import { jsonResponse, errorResponse, type Env } from '../_shared';

type ContactRow = {
  id: string; name: string; created_at: number;
  deleted_at: number | null; deleted_by: string | null;
};
type SessionRow = {
  id: string; title: string | null;
  started_at: number; finished_at: number; buy_in_cents: number;
  chips_json: string; players_json: string; transfers_json: string;
  deleted_at: number | null; deleted_by: string | null;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const showDeleted = url.searchParams.get('showDeleted') === '1';

  try {
    const contactsStmt = showDeleted
      ? env.DB.prepare('SELECT * FROM contacts ORDER BY name')
      : env.DB.prepare('SELECT * FROM contacts WHERE deleted_at IS NULL ORDER BY name');
    const sessionsStmt = showDeleted
      ? env.DB.prepare('SELECT * FROM sessions ORDER BY finished_at DESC')
      : env.DB.prepare('SELECT * FROM sessions WHERE deleted_at IS NULL ORDER BY finished_at DESC');

    const [contactsRes, sessionsRes] = await Promise.all([
      contactsStmt.all<ContactRow>(),
      sessionsStmt.all<SessionRow>(),
    ]);

    const contacts = (contactsRes.results || []).map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      deletedAt: r.deleted_at,
      deletedBy: r.deleted_by,
    }));

    const sessions = (sessionsRes.results || []).map((r) => ({
      id: r.id,
      title: r.title ?? undefined,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      buyInCents: r.buy_in_cents,
      chips: JSON.parse(r.chips_json),
      players: JSON.parse(r.players_json),
      transfers: JSON.parse(r.transfers_json),
      deletedAt: r.deleted_at,
      deletedBy: r.deleted_by,
    }));

    return jsonResponse({ contacts, sessions });
  } catch (e) {
    return errorResponse(500, `Error en DB: ${(e as Error).message}`);
  }
};
