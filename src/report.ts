import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { atomicJSON, type Store } from './store.js';
import type { RunRecord } from './types.js';
export const escapeHTML = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function counts(runs: RunRecord[]) {
  const scenarios = new Map<string, RunRecord>();
  for (const run of [...runs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) scenarios.set(run.scenarioId, run);
  const latest = [...scenarios.values()];
  const generated = latest.filter(r => !!r.code);
  return {
    generated: generated.length,
    approved: latest.filter(r => r.approvedFile || r.approvals.some(a => a.kind === 'generation' && a.approved)).length,
    passed: generated.filter(r => r.outcome === 'passed' || r.outcome === 'recovered').length,
    failed: generated.filter(r => r.outcome === 'failed' || r.outcome === 'error').length,
    recovered: generated.filter(r => r.outcome === 'recovered').length,
    attempts: runs.reduce((n, r) => n + r.attempts.length, 0), runs: runs.length,
  };
}
export function staticReport(run: RunRecord): string {
  const esc = (v: unknown) => escapeHTML(String(v ?? ''));
  const attempts = run.attempts.map(a => `<article><h3>Tentativa ${a.number}: ${esc(a.status)} · ${a.durationMs ?? 0} ms</h3><p>${esc(a.failureKind)}</p><pre>${esc(a.error)}</pre><pre>${esc(a.logs)}</pre><p>${Object.entries(a.evidence).map(([label, link]) => `<a href="${esc(link)}">${esc(label)}</a>`).join(' · ') || 'Evidências indisponíveis'}</p><details><summary>Código da tentativa</summary><pre>${esc(a.code)}</pre></details></article>`).join('');
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>TestPilot ${esc(run.id)}</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:20px;color:#1b2940}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eff2f6;padding:20px}article{border-top:1px solid #ccd4e0;padding:20px 0}a{color:#254ec8}</style><h1>TestPilot · Relatório</h1><p>${esc(run.requirement)}</p><p>Provedor: ${esc(run.provider)} · Modelo: ${esc(run.model)} · Estado: ${esc(run.state)} · Resultado: ${esc(run.outcome)}</p><p>${esc(run.createdAt)} · ${esc(run.url)}</p><pre>${esc(run.error)}</pre><h2>Aprovações</h2><pre>${esc(JSON.stringify(run.approvals, null, 2))}</pre><h2>Código final</h2><pre>${esc(run.code)}</pre><h2>Tentativas</h2>${attempts}<h2>Propostas</h2>${run.proposals.map(p => `<h3>${p.number}: ${esc(p.status)}</h3><pre>${esc(p.error)}</pre><pre>${esc(p.diff ?? p.code)}</pre>`).join('')}</html>`;
}
export async function writeReports(store: Store, run: RunRecord): Promise<void> {
  const summary = { id: run.id, scenarioId: run.scenarioId, requirement: run.requirement, provider: run.provider, model: run.model, state: run.state, outcome: run.outcome, attempts: run.attempts.length, proposals: run.proposals.length, durationMs: run.attempts.reduce((n, a) => n + (a.durationMs ?? 0), 0), error: run.error };
  await atomicJSON(path.join(store.dir(run.id), 'summary.json'), summary);
  await writeFile(path.join(store.dir(run.id), 'report.html'), staticReport(run));
}
