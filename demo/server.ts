import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const stateFile = process.env.DEMO_STATE_FILE ?? fileURLToPath(new URL('../artifacts/demo-state.json', import.meta.url));
async function state() { try { return JSON.parse(await readFile(stateFile, 'utf8')) as { changed?: boolean; broken?: boolean }; } catch { return {}; } }
const html = (changed: boolean, broken: boolean) => `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TestPilot · Demo</title><style>body{font:17px system-ui;background:#eef2f7;color:#17243b;margin:0}main{max-width:560px;margin:8vh auto;padding:36px;background:white;border-radius:18px;box-shadow:0 20px 80px #15253d18}label{display:block;margin-top:18px}input,textarea,button{font:inherit;padding:12px;border:1px solid #a4b1c5;border-radius:8px;box-sizing:border-box;width:100%}button{background:#2459d7;color:white;margin-top:22px;cursor:pointer}small{color:#536079}a{color:#2459d7}</style><main><small>TESTPILOT / APLICAÇÃO DE DEMONSTRAÇÃO</small><h1>Entre no seu espaço</h1><form id="login"><label for="${changed ? 'account-email' : 'email'}">E-mail</label><input id="${changed ? 'account-email' : 'email'}" type="email" autocomplete="username" required><label for="${changed ? 'account-password' : 'password'}">Senha</label><input id="${changed ? 'account-password' : 'password'}" type="password" autocomplete="current-password" required><button id="${changed ? 'access-account' : 'login-button'}">Entrar</button><p id="error" role="alert"></p></form><small>Credenciais fictícias: demo@testpilot.local / TestPilot123!</small></main><script>document.querySelector('#login').addEventListener('submit',e=>{e.preventDefault();const inputs=document.querySelectorAll('input');if(inputs[0].value==='demo@testpilot.local'&&inputs[1].value==='TestPilot123!'){document.querySelector('main').innerHTML='<small>TESTPILOT / PAINEL</small><h1>${broken ? 'Serviço indisponível' : 'Bem-vindo, Demo'}</h1><p>Visão geral da sua conta</p><h2>Enviar mensagem</h2><form id="contact"><label for="subject">Assunto</label><input id="subject" required><label for="message">Mensagem</label><textarea id="message" required></textarea><button>Enviar</button></form><p role="status"></p>';document.querySelector('#contact').addEventListener('submit',e=>{e.preventDefault();document.querySelector('[role=status]').textContent='Mensagem enviada com sucesso';});}else{document.querySelector('#error').textContent='Credenciais inválidas';}});</script></html>`;
const server = createServer(async (req, res) => {
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (req.url === '/health') { res.writeHead(200).end('ok'); return; }
  if (req.url !== '/') { res.writeHead(404).end(); return; }
  const s = await state(); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(html(!!s.changed, !!s.broken));
});
const arg = process.argv[2];
if (['selectors', 'functional', 'reset'].includes(arg ?? '')) {
  const s = await state();
  await writeFile(stateFile, JSON.stringify(arg === 'reset' ? {} : arg === 'selectors' ? { ...s, changed: !s.changed } : { ...s, broken: !s.broken }));
  console.log('Demo atualizada. A próxima navegação usará o novo estado.');
} else {
  const port = Number(process.env.DEMO_PORT ?? 3000);
  server.listen(port, '127.0.0.1', () => console.log(`Demo: http://127.0.0.1:${(server.address() as { port: number }).port}`));
}
