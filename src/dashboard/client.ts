import type { RunRecord } from '../types.js';
// Browser-only module: all untrusted content is inserted through textContent.
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el;
}
const labels: Record<string, string> = { generating: 'Gerando', awaiting_approval: 'Aguardando aprovação', running: 'Executando', healing: 'Corrigindo', completed: 'Concluído', cancelled: 'Cancelado', operational_error: 'Erro operacional', passed: 'Passou', failed: 'Falhou', recovered: 'Recuperado', error: 'Erro operacional', approved: 'Aprovada', rejected: 'Rejeitada', invalid: 'Inválida', requesting: 'Solicitando' };
const active = (r: RunRecord) => ['generating', 'awaiting_approval', 'running', 'healing'].includes(r.state);
const badge = (r: RunRecord) => node('span', labels[r.outcome ?? r.state] ?? r.state, `badge ${active(r) ? 'active' : r.outcome ?? ''}`);
let runs: RunRecord[] = [], selected = new URLSearchParams(location.search).get('run') ?? '', timer: ReturnType<typeof setTimeout> | undefined, busy = false;
async function api<T>(url: string): Promise<T> { const res = await fetch(url, { cache: 'no-store' }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() as Promise<T>; }
const date = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
function evidenceLink(run: RunRecord, relative: string, label: string) {
  const link = node('a', label); link.href = `/api/runs/${encodeURIComponent(run.id)}/evidence/${relative.split('/').map(encodeURIComponent).join('/')}`; link.target = '_blank'; link.rel = 'noopener'; return link;
}
function codeDetails(title: string, code: string) { const d = node('details'); d.append(node('summary', title), node('pre', code)); return d; }
function renderList() {
  const query = $<HTMLInputElement>('search').value.toLocaleLowerCase();
  const status = $<HTMLSelectElement>('status').value, provider = $<HTMLSelectElement>('provider').value;
  const filtered = runs.filter(r => r.requirement.toLocaleLowerCase().includes(query) && (!provider || provider === r.provider) && (!status || (status === 'active' ? active(r) : r.outcome === status)));
  const list = $('runs'); list.replaceChildren();
  if (!filtered.length) { const empty = node('div', undefined, 'empty'); empty.append(node('h3', runs.length ? 'Nenhuma execução encontrada.' : 'Seu histórico começa aqui.'), node('p', runs.length ? 'Ajuste a pesquisa ou os filtros.' : 'Gere seu primeiro cenário pelo CLI.')); list.append(empty); }
  for (const run of filtered) {
    const item = node('button', undefined, `run-item${selected === run.id ? ' selected' : ''}`); item.type = 'button'; item.setAttribute('aria-pressed', String(selected === run.id));
    const providerLabel = run.provider === 'mock' ? 'SIMULADOR' : 'OPENROUTER';
    item.append(badge(run), node('span', providerLabel, 'provider-badge'), node('strong', run.requirement), node('span', `${date(run.createdAt)} · ${run.attempts.length} tentativa(s)`, 'run-meta'));
    item.addEventListener('click', () => { selected = run.id; history.replaceState(null, '', `?run=${encodeURIComponent(selected)}`); renderList(); void loadDetail(); }); list.append(item);
  }
}
let detailVersion = '';
async function loadDetail() {
  if (!selected) return;
  const id = selected;
  try {
    const run = await api<RunRecord>(`/api/runs/${encodeURIComponent(id)}`);
    if (id !== selected) return;
    const version = JSON.stringify(run);
    if (version === detailVersion) return;
    detailVersion = version;
    const detail = $('detail'); detail.replaceChildren();
    detail.append(badge(run), node('h2', run.requirement), node('p', `${run.provider === 'mock' ? 'Simulador · código predefinido da demo' : 'OpenRouter · modelo real'}${run.model ? ` / ${run.model}` : ''}`), node('p', `${run.id}\n${date(run.createdAt)} · ${run.url}${run.originProvider ? ` · Origem: ${run.originProvider}` : ''}`, 'detail-meta'));
    if (run.error) detail.append(node('p', run.error, 'error-text'));
    if (active(run)) detail.append(node('p', 'Execução ativa. Atualização automática a cada segundo. Aprovações são feitas no terminal.'));
    const links = node('div', undefined, 'evidence');
    if (!active(run)) links.append(evidenceLink(run, 'report.html', '↓ Relatório HTML'), evidenceLink(run, 'summary.json', 'Resumo JSON'));
    links.append(evidenceLink(run, 'events.jsonl', 'Eventos JSONL')); detail.append(links);
    if (run.usage) detail.append(codeDetails('Consumo informado pelo provedor', JSON.stringify(run.usage, null, 2)));
    if (run.code) detail.append(codeDetails('Código atual', run.code));
    detail.append(node('h3', 'Aprovações'));
    if (!run.approvals.length) detail.append(node('p', run.approvedFile ? 'Arquivo previamente aprovado e verificado por hash.' : 'Nenhuma aprovação registrada.'));
    for (const a of run.approvals) detail.append(node('p', `${a.kind === 'generation' ? 'Geração' : `Reparo ${a.proposal}`} · ${a.approved ? 'Aprovado' : 'Rejeitado'} · ${a.automatic ? '--auto-approve' : 'Revisão humana'} · ${date(a.at)}`));
    detail.append(node('h3', `Sequência de tentativas (${run.attempts.length})`));
    if (!run.attempts.length) detail.append(node('p', 'Nenhuma execução do teste iniciada.'));
    for (const a of run.attempts) {
      const section = node('article', undefined, 'attempt'); section.append(node('h3', `Tentativa ${a.number} · ${labels[a.status] ?? a.status}`), node('p', `${a.durationMs ?? '…'} ms${a.failureKind ? ` · ${a.failureKind}` : ''}`));
      if (a.error) section.append(codeDetails('Erro', a.error));
      if (a.logs) section.append(codeDetails('Logs', a.logs));
      section.append(codeDetails('Código desta tentativa', a.code));
      const evidence = node('div', undefined, 'evidence');
      for (const [label, relative] of Object.entries(a.evidence)) evidence.append(evidenceLink(run, relative, label));
      if (!Object.keys(a.evidence).length) section.append(node('p', a.status === 'running' ? 'Evidências serão disponibilizadas ao concluir.' : 'Evidências indisponíveis.'));
      section.append(evidence); detail.append(section);
    }
    if (run.proposals.length) detail.append(node('h3', 'Propostas de correção'));
    for (const p of run.proposals) {
      const section = node('article', undefined, 'attempt'); section.append(node('h3', `Proposta ${p.number} · ${labels[p.status] ?? p.status}`));
      if (p.error) section.append(node('p', p.error, 'error-text'));
      if (p.diff || p.code) section.append(codeDetails(p.diff ? 'Diff de localizadores' : 'Código proposto', p.diff ?? p.code!));
      if (p.metadata) section.append(codeDetails('Modelo e consumo do reparo', JSON.stringify(p.metadata, null, 2)));
      detail.append(section);
    }
  } catch { if (id === selected) { detailVersion = ''; $('detail').replaceChildren(node('p', 'Detalhes indisponíveis. Tente atualizar.', 'error-text')); } }
}
async function refresh() {
  if (busy) return; busy = true; clearTimeout(timer);
  let interval = 5000;
  try {
    const data = await api<{ runs: RunRecord[]; counts: Record<string, number>; active: boolean }>('/api/runs'); runs = data.runs;
    $('alert').hidden = true;
    for (const key of ['generated', 'approved', 'passed', 'failed', 'recovered']) $(key).textContent = String(data.counts[key] ?? 0);
    $('run-count').textContent = String(data.counts.runs ?? 0); $('attempt-count').textContent = `${data.counts.attempts ?? 0} tentativas`;
    $('sync').textContent = data.active ? '● Ao vivo · 1 s' : `Atualizado ${new Date().toLocaleTimeString('pt-BR')}`;
    if (!selected && runs[0]) selected = runs[0].id;
    renderList(); await loadDetail(); interval = data.active ? 1000 : 5000;
  } catch { $('alert').hidden = false; $('alert').textContent = 'Falha ao atualizar. Os últimos dados continuam visíveis. Tentaremos novamente.'; $('sync').textContent = 'Sem conexão'; }
  finally { busy = false; timer = setTimeout(() => void refresh(), interval); }
}
$('refresh').addEventListener('click', () => void refresh());
for (const id of ['search', 'status', 'provider']) $(id).addEventListener('input', renderList);
void refresh();
