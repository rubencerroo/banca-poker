// POST /api/contacts — upsert (body: { id?, name })
// DELETE /api/contacts?id=X — soft-delete
// POST /api/contacts/restore?id=X — restaurar

import { jsonResponse, errorResponse, logAudit, getActorFromContext, type Env } from '../_shared';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const actor = getActorFromContext(context);
  let body: any;
  try { body = await request.json(); }
  catch { return errorResponse(400, 'JSON inválido'); }

  const id = String(body?.id ?? '').trim();
  const name = String(body?.name ?? '').trim();
  if (!id || !name) return errorResponse(400, 'Faltan id o name');

  const now = Date.now();
  const existing = await env.DB.prepare('SELECT id FROM contacts WHERE id = ?').bind(id).first();

  if (existing) {
    await env.DB.prepare(
      'UPDATE contacts SET name = ?, updated_at = ?, updated_by = ?, deleted_at = NULL, deleted_by = NULL WHERE id = ?',
    ).bind(name, now, actor, id).run();
    await logAudit(env, actor, 'contact.update', 'contact', id, { name });
  } else {
    await env.DB.prepare(
      'INSERT INTO contacts (id, name, created_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)',
    ).bind(id, name, now, now, actor).run();
    await logAudit(env, actor, 'contact.create', 'contact', id, { name });
  }

  return jsonResponse({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const actor = getActorFromContext(context);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return errorResponse(400, 'Falta id');

  const now = Date.now();
  const res = await env.DB.prepare(
    'UPDATE contacts SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
  ).bind(now, actor, id).run();

  if ((res.meta as any)?.changes === 0) return errorResponse(404, 'No encontrado o ya eliminado');
  await logAudit(env, actor, 'contact.delete', 'contact', id);
  return jsonResponse({ ok: true });
};
