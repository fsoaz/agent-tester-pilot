import { chromium, type Page } from '@playwright/test';

export function validateUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL deve usar HTTP(S), sem credenciais embutidas.');
  return url.toString();
}
export async function sanitizedDOM(page: Page): Promise<string> {
  return page.evaluate(() => {
    const root = document.documentElement.cloneNode(true) as HTMLElement;
    root.querySelectorAll('script,style,noscript,iframe,object,embed,template,meta,link').forEach(e => e.remove());
    root.querySelectorAll('input,textarea,select,[contenteditable]').forEach(e => { e.removeAttribute('value'); e.textContent = ''; });
    for (const e of [root, ...root.querySelectorAll('*')]) {
      for (const a of [...e.attributes]) {
        if (a.name.startsWith('on') || /token|secret|password|auth|cookie|session|value|srcdoc/i.test(a.name) || (!['id', 'class', 'role', 'name', 'type', 'placeholder', 'for', 'title', 'alt', 'aria-label', 'data-testid'].includes(a.name))) e.removeAttribute(a.name);
      }
    }
    return root.outerHTML.replace(/Bearer\s+[\w.\-]+/gi, '[REDACTED]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[EMAIL]').slice(0, 20_000);
  });
}
export async function captureDOM(url: string): Promise<string> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const response = await page.goto(validateUrl(url), { timeout: 15_000, waitUntil: 'domcontentloaded' });
    if (response && response.status() >= 400) throw new Error(`Aplicação indisponível: HTTP ${response.status()}`);
    return await sanitizedDOM(page);
  } finally { await browser.close(); }
}
