// GET /api/audit?limit=200

import { jsonResponse, type Env } from '../_shared';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(500, parseInt(url.searchParams.get('limit') || '200', 10)));

  const res = await env.DB.prepare(
    'SELECT id, at, actor, action, entity_type, entity_id, payload_json FROM audit_log ORDER BY at DESC LIMIT ?',
  ).bind(limit).all<{
    id: number; at: number; actor: string; action: string;
    entity_type: string | null; entity_id: string | null; payload_json: string | null;
  }>();

  const entries = (res.results || []).map((r) => ({
    id: r.id,
    at: r.at,
    actor: r.actor,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    payload: r.payload_json ? JSON.parse(r.payload_json) : null,
  }));

  return jsonResponse({ entries });
};
