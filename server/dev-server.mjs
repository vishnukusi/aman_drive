// Local API server:  npm run api   (http://localhost:8787, database file ./data/driveflow.db)
// The Vite dev server proxies /api to it, so the website and staff dashboard use the same origin.
import http from 'node:http';
import { getDb, handle } from './app.js';

const port = Number(process.env.API_PORT || 8787);
await getDb(); // migrate + seed before accepting requests
http.createServer((req, res) => handle(req, res)).listen(port, () => {
  console.log(`DriveFlow API on http://localhost:${port}  (db: ${process.env.DATABASE_URL || 'file:./data/driveflow.db'}, demo: ${process.env.DEMO_MODE !== 'false'})`);
});
