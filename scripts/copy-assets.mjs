import { cp, chmod } from 'node:fs/promises';
await cp('src/dashboard/public', 'dist/dashboard/public', { recursive: true });
await cp('src/runner-support', 'dist/runner-support', { recursive: true });
await chmod('dist/cli.js', 0o755);
