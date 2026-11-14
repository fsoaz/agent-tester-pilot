import { test as base, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
export const test = base.extend<{ evidence: void }>({
  evidence: [async ({ page }, use, testInfo) => {
    const logs: string[] = [];
    page.on('console', message => logs.push(`[${message.type()}] ${message.text()}`));
    page.on('pageerror', error => logs.push(`[pageerror] ${error.message}`));
    const failures: string[] = [];
    page.on('response', response => { if (response.status() >= 500) failures.push(`HTTP ${response.status()} ${response.url()}`); });
    await use();
    await writeFile(testInfo.outputPath('browser.log'), logs.join('\n'));
    await writeFile(testInfo.outputPath('application-errors.json'), JSON.stringify(failures));
    if (testInfo.status !== testInfo.expectedStatus) {
      try { await writeFile(testInfo.outputPath('failure.html'), await page.content()); } catch { /* page may have crashed */ }
      try { await page.screenshot({ path: testInfo.outputPath('failure.png'), fullPage: true, timeout: 5000 }); } catch { /* unavailable evidence is shown in the UI */ }
      try {
        const dom = await page.evaluate(() => {
          const root = document.documentElement.cloneNode(true) as HTMLElement;
          root.querySelectorAll('script,style,noscript,iframe,object,embed,template,meta,link').forEach(e => e.remove());
          root.querySelectorAll('input,textarea,select,[contenteditable]').forEach(e => { e.removeAttribute('value'); e.textContent = ''; });
          for (const e of [root, ...root.querySelectorAll('*')]) for (const a of [...e.attributes]) if (!['id', 'class', 'role', 'name', 'type', 'placeholder', 'for', 'title', 'alt', 'aria-label', 'data-testid'].includes(a.name) || /password|token|secret|auth|cookie|session/i.test(a.name)) e.removeAttribute(a.name);
          return root.outerHTML.replace(/Bearer\s+[\w.\-]+/gi, '[REDACTED]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[EMAIL]').slice(0, 20_000);
        });
        await writeFile(testInfo.outputPath('context.html'), dom);
      } catch { /* unavailable context prevents healing */ }
    }
  }, { auto: true }],
});
export { expect };
