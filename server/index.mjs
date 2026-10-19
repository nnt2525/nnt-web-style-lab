import { resolve } from 'node:path';
import { createApp } from './app.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4180);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
const app = createApp({ dbPath: process.env.DB_PATH || resolve('data/workspaces.sqlite'), publicOrigin: process.env.PUBLIC_ORIGIN });
app.server.listen(port, host, () => console.log(`NNT Web Style Lab running at http://${host}:${port} · SQLite persistence enabled`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
