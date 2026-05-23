// POST   /api/sessions               — upsert (body completo de GameRecord)
// DELETE /api/sessions?id=X          — soft-delete
// PATCH  /api/sessions?id=X          — body parcial: { title?, transfers? } (rename / pago)

import { jsonResponse, errorResponse, logAudit, getActorFromContext, type Env } from '../_shared';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const actor = getActorFromContext(context);
  let body: any;
  try { body = await request.json(); }
  catch { return errorResponse(400, 'JSON inválido'); }

  const id = String(body?.id ?? '').trim();
  if (!id) return errorResponse(400, 'Falta id');

  const title = body.title ? String(body.title) : null;
  const startedAt = Number(body.startedAt);
  const finishedAt = Number(body.finishedAt);
  const buyInCents = Number(body.buyInCents);
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt) || !Number.isFinite(buyInCents)) {
    return errorResponse(400, 'Campos numéricos inválidos');
  }
  const chipsJson = JSON.stringify(body.chips ?? []);
  const playersJson = JSON.stringify(body.players ?? []);
  const transfersJson = JSON.stringify(body.transfers ?? []);
  const now = Date.now();

  const existing = await env.DB.prepare('SELECT id FROM sessions WHERE id = ?').bind(id).first();
  if (existing) {
    await env.DB.prepare(
      `UPDATE sessions SET title = ?, started_at = ?, finished_at = ?, buy_in_cents = ?,
       chips_json = ?, players_json = ?, transfers_json = ?, updated_at = ?, updated_by = ?,
       deleted_at = NULL, deleted_by = NULL WHERE id = ?`,
    ).bind(title, startedAt, finishedAt, buyInCents, chipsJson, playersJson, transfersJson, now, actor, id).run();
    await logAudit(env, actor, 'session.update', 'session', id, { title });
  } else {
    await env.DB.prepare(
      `INSERT INTO sessions (id, title, started_at, finished_at, buy_in_cents,
       chips_json, players_json, transfers_json, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, title, startedAt, finishedAt, buyInCents, chipsJson, playersJson, transfersJson, now, now, actor).run();
    await logAudit(env, actor, 'session.create', 'session', id, { title, buyInCents, players: body.players?.length || 0 });
  }

  return jsonResponse({ ok: true });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const actor = getActorFromContext(context);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return errorResponse(400, 'Falta id');

  let body: any;
  try { body = await request.json(); }
  catch { return errorResponse(400, 'JSON inválido'); }

  const row = await env.DB.prepare(
    'SELECT title, transfers_json FROM sessions WHERE id = ? AND deleted_at IS NULL',
  ).bind(id).first<{ title: string | null; transfers_json: string }>();
  if (!row) return errorResponse(404, 'Sesión no encontrada');

  const updates: string[] = [];
  const binds: any[] = [];
  const auditPayload: Record<string, unknown> = {};

  if ('title' in body) {
    const newTitle = body.title ? String(body.title) : null;
    updates.push('title = ?');
    binds.push(newTitle);
    auditPayload.title = { from: row.title, to: newTitle };
  }

  if ('transfers' in body) {
    const transfers = body.transfers;
    if (!Array.isArray(transfers)) return errorResponse(400, 'transfers debe ser un array');
    updates.push('transfers_json = ?');
    binds.push(JSON.stringify(transfers));
    // Detect lo que cambió
    try {
      const prev = JSON.parse(row.transfers_json);
      const changes: any[] = [];
      for (let i = 0; i < transfers.length && i < prev.length; i++) {
        if (prev[i]?.paid !== transfers[i]?.paid) {
          changes.push({ idx: i, from: prev[i]?.paid, to: transfers[i]?.paid });
        }
      }
      if (changes.length) auditPayload.transfers = changes;
    } catch { /* ignora */ }
  }

  if (updates.length === 0) return errorResponse(400, 'Nada que actualizar');

  updates.push('updated_at = ?', 'updated_by = ?');
  binds.push(Date.now(), actor, id);

  await env.DB.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  await logAudit(env, actor, 'session.patch', 'session', id, auditPayload);

  return jsonResponse({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const actor = getActorFromContext(context);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return errorResponse(400, 'Falta id');

  const now = Date.now();
  const res = await env.DB.prepare(
    'UPDATE sessions SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
  ).bind(now, actor, id).run();

  if ((res.meta as any)?.changes === 0) return errorResponse(404, 'No encontrada o ya eliminada');
  await logAudit(env, actor, 'session.delete', 'session', id);
  return jsonResponse({ ok: true });
};
