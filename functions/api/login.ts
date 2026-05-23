import {
  makeAuthCookie, setCookieHeader, jsonResponse, errorResponse, logAudit,
  type Env,
} from '../_shared';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return errorResponse(400, 'JSON inválido'); }

  const password = String(body?.password ?? '');
  const actor = String(body?.actor ?? '').trim();

  if (!actor) return errorResponse(400, 'Falta el nombre');
  if (!password) return errorResponse(400, 'Falta la contraseña');
  if (!env.AUTH_PASSWORD || !env.AUTH_SECRET) {
    return errorResponse(500, 'Servidor sin AUTH_PASSWORD/AUTH_SECRET configurados');
  }

  if (password !== env.AUTH_PASSWORD) {
    await logAudit(env, actor, 'login.failed').catch(() => {});
    return errorResponse(401, 'Contraseña incorrecta');
  }

  const cookie = await makeAuthCookie(actor, env.AUTH_SECRET);
  await logAudit(env, actor, 'login');

  return jsonResponse({ ok: true, actor }, {
    headers: { 'set-cookie': setCookieHeader(cookie) },
  });
};
