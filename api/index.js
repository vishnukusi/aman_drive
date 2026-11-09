// Vercel Serverless Function: every /api/* request is rewritten here (see vercel.json) and handled by server/app.js.
// Requires DATABASE_URL (hosted libSQL, e.g. Turso) + DATABASE_AUTH_TOKEN + SESSION_SECRET in the project environment.
import { handle } from '../server/app.js';

export default function handler(req, res) {
  return handle(req, res);
}
