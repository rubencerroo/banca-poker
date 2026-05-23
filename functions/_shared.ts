// Utilidades compartidas por todas las Pages Functions.
// Auth: cookie firmada con HMAC-SHA256.

export interface Env {
  DB: D1Database;
  AUTH_PASSWORD: string;
  AUTH_SECRET: string;
}

const COOKIE = 'pb-auth';
const TTL = 60 * 60 * 24 * 30; // 30 días

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function makeAuthCookie(actor: string, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const payload = `${encodeURIComponent(actor)}.${exp}`;
  const sig = b64url(await hmac(secret, payload));
  return `${payload}.${sig}`;
}

export async function parseAuthCookie(value: string, secret: string): Promise<{ actor: string; exp: number } | null> {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [actorEnc, expStr, sig] = parts;
  const payload = `${actorEnc}.${expStr}`;
  const expected = b64url(await hmac(secret, payload));
  if (!(await timingSafeEqual(expected, sig))) return null;
  const exp = parseInt(expStr, 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return null;
  try {
    return { actor: decodeURIComponent(actorEnc), exp };
  } catch { return null; }
}

export function getCookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export async function getActor(request: Request, env: Env): Promise<string | null> {
  const c = getCookieValue(request, COOKIE);
  if (!c) return null;
  const parsed = await parseAuthCookie(c, env.AUTH_SECRET);
  return parsed?.actor ?? null;
}

export function setCookieHeader(value: string): string {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`;
}

export function clearCookieHeader(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function logAudit(
  env: Env, actor: string, action: string,
  entityType: string | null = null, entityId: string | null = null,
  payload: unknown = null,
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO audit_log (at, actor, action, entity_type, entity_id, payload_json) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(
    Date.now(), actor, action, entityType, entityId,
    payload ? JSON.stringify(payload) : null,
  ).run();
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(status: number, message: string, extraHeaders?: HeadersInit): Response {
  return jsonResponse({ error: message }, { status, headers: extraHeaders });
}

export function getActorFromContext(context: any): string {
  return (context.data?.actor as string) || 'desconocido';
}
