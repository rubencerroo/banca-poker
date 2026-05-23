import { clearCookieHeader, jsonResponse, type Env } from '../_shared';

export const onRequestPost: PagesFunction<Env> = async () => {
  return jsonResponse({ ok: true }, {
    headers: { 'set-cookie': clearCookieHeader() },
  });
};
