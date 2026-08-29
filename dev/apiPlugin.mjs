// Dev-only Vite plugin that mounts api/*.js the same way Vercel does in
// production, so `npm run dev` exercises the real handlers (real cookies,
// real Postgres) instead of needing `vercel dev` / a separate server.
// Not used by `vite build` — Vercel's own serverless-function detection
// takes over there.
import { readFileSync } from 'fs';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default function apiPlugin() {
  return {
    name: 'nomad-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();

        const [pathname] = req.url.split('?');
        const filePath = new URL('..' + pathname + '.js', import.meta.url);

        let mod;
        try {
          readFileSync(filePath); // throws if it doesn't exist -> fall through to next()
          mod = await server.ssrLoadModule(filePath.pathname);
        } catch {
          return next();
        }

        const rawBody = await readBody(req);
        const contentType = req.headers['content-type'] || '';
        req.body = rawBody.length && contentType.includes('application/json') ? JSON.parse(rawBody.toString('utf-8')) : undefined;

        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
          return res;
        };

        try {
          await mod.default(req, res);
        } catch (err) {
          console.error('[dev-api]', pathname, err);
          res.status(500).json({ error: 'Internal error' });
        }
      });
    },
  };
}
