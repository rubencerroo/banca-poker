// Cliente fetch para las Pages Functions. Cloud-first: la fuente de verdad
// es el servidor; el store local sólo cachea para evitar relecturas.

import type { Contact, GameRecord, AuditEntry } from '../types';

async function request<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) headers.set('content-type', 'application/json');
  const body = init?.json !== undefined ? JSON.stringify(init.json) : init?.body;
  const res = await fetch(path, {
    ...init,
    headers,
    body: body as BodyInit | undefined,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch { /* ignore */ }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ── Auth ──
export const apiMe = () => request<{ actor: string | null }>('/api/me');
export const apiLogin = (actor: string, password: string) =>
  request<{ ok: true; actor: string }>('/api/login', { method: 'POST', json: { actor, password } });
export const apiLogout = () =>
  request<{ ok: true }>('/api/logout', { method: 'POST' });

// ── State ──
export const apiState = (showDeleted = false) =>
  request<{ contacts: Contact[]; sessions: GameRecord[] }>(
    `/api/state${showDeleted ? '?showDeleted=1' : ''}`,
  );

// ── Contacts ──
export const apiUpsertContact = (c: { id: string; name: string }) =>
  request<{ ok: true }>('/api/contacts', { method: 'POST', json: c });
export const apiDeleteContact = (id: string) =>
  request<{ ok: true }>(`/api/contacts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// ── Sessions ──
export const apiUpsertSession = (s: GameRecord) =>
  request<{ ok: true }>('/api/sessions', { method: 'POST', json: s });
export const apiPatchSession = (id: string, patch: Partial<GameRecord>) =>
  request<{ ok: true }>(`/api/sessions?id=${encodeURIComponent(id)}`, {
    method: 'PATCH', json: patch,
  });
export const apiDeleteSession = (id: string) =>
  request<{ ok: true }>(`/api/sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// ── Restore ──
export const apiRestore = (type: 'contact' | 'session', id: string) =>
  request<{ ok: true }>('/api/restore', { method: 'POST', json: { type, id } });

// ── Audit ──
export const apiAudit = (limit = 200) =>
  request<{ entries: AuditEntry[] }>(`/api/audit?limit=${limit}`);
