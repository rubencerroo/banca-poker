// POST /api/restore — body: { type: 'contact' | 'session', id: string }

import { jsonResponse, errorResponse, logAudit, getActorFromContext, type Env } from '../_shared';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const actor = getActorFromContext(context);
  let body: any;
  try { body = await request.json(); }
  catch { return errorResponse(400, 'JSON inválido'); }

  const type = String(body?.type ?? '');
  const id = String(body?.id ?? '');
  if (!id) return errorResponse(400, 'Falta id');

  const table = type === 'contact' ? 'contacts' : type === 'session' ? 'sessions' : null;
  if (!table) return errorResponse(400, 'type inválido');

  const res = await env.DB.prepare(
    `UPDATE ${table} SET deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL`,
  ).bind(id).run();

  if ((res.meta as any)?.changes === 0) return errorResponse(404, 'No encontrado o no estaba eliminado');
  await logAudit(env, actor, `${type}.restore`, type, id);
  return jsonResponse({ ok: true });
};
