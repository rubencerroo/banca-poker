import { getActor, jsonResponse, type Env } from '../_shared';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const actor = await getActor(request, env);
  return jsonResponse({ actor });
};
