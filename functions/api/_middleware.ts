import { getActor, errorResponse, type Env } from '../_shared';

const PUBLIC_PATHS = new Set(['/api/login', '/api/me']);

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (PUBLIC_PATHS.has(url.pathname)) return next();

  const actor = await getActor(request, env);
  if (!actor) return errorResponse(401, 'No autenticado');

  context.data.actor = actor;
  return next();
};
