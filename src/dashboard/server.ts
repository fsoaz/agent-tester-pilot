import { createServer, type Server } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, isActive } from '../store.js';
import { counts } from '../report.js';
const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const clientFile = fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? '../../dist/dashboard/client.js' : './client.js', import.meta.url));
export async function startDashboard(store: Store, port: number): Promise<Server> {
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    const json = (status: number, data: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data)); };
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? '')) { json(403, { error: 'Host local exigido.' }); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); json(405, { error: 'API somente leitura.' }); return; }
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname === '/api/runs') {
        const runs = await store.list();
        json(200, { runs: runs.map(r => ({ ...r, code: undefined, attempts: r.attempts.map(a => ({ ...a, code: undefined, logs: undefined })), proposals: r.proposals.map(p => ({ ...p, code: undefined, diff: undefined })) })), counts: counts(runs), active: runs.some(isActive) }); return;
      }
      const match = /^\/api\/runs\/([0-9a-f-]{36})(?:\/evidence\/(.+))?$/.exec(url.pathname);
      if (match) {
        const id = match[1]!;
        const run = await store.get(id);
        if (!match[2]) { json(200, run); return; }
        const relative = decodeURIComponent(match[2]);
        if (relative.includes('..') || relative.includes('\\') || relative.startsWith('/')) { json(400, { error: 'Caminho inválido.' }); return; }
        const allowed = new Set(['report.html', 'summary.json', 'events.jsonl', ...run.attempts.flatMap(a => Object.values(a.evidence))]);
        if (!allowed.has(relative)) { json(404, { error: 'Evidência indisponível.' }); return; }
        const root = await realpath(store.dir(id));
        if (path.dirname(root) !== await realpath(store.artifacts)) { json(400, { error: 'Caminho inválido.' }); return; }
        const file = await realpath(path.join(root, relative));
        if (!file.startsWith(root + path.sep)) { json(400, { error: 'Caminho inválido.' }); return; }
        const ext = path.extname(file);
        const mime: Record<string, string> = { '.png': 'image/png', '.zip': 'application/zip', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.jsonl': 'text/plain; charset=utf-8', '.log': 'text/plain; charset=utf-8' };
        if (ext === '.html' || ext === '.zip') res.setHeader('Content-Disposition', `attachment; filename="${path.basename(file)}"`);
        if (ext === '.html') res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'");
        const data = await readFile(file);
        res.writeHead(200, { 'Content-Type': mime[ext] ?? 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : data); return;
      }
      const staticFiles: Record<string, [string, string]> = {
        '/': [path.join(publicDir, 'index.html'), 'text/html; charset=utf-8'],
        '/style.css': [path.join(publicDir, 'style.css'), 'text/css; charset=utf-8'],
        '/app.js': [clientFile, 'text/javascript; charset=utf-8'],
      };
      const asset = staticFiles[url.pathname];
      if (!asset) { json(404, { error: 'Não encontrado.' }); return; }
      const data = await readFile(asset[0]);
      res.writeHead(200, { 'Content-Type': asset[1] }); res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      json(error instanceof URIError ? 400 : code === 'ENOENT' ? 404 : 500, { error: code === 'ENOENT' ? 'Execução ou evidência indisponível.' : 'Falha ao consultar os artefatos.' });
    }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); }); });
  return server;
}
