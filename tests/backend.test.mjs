import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { createApp } from '../server/app.mjs';
import { catalogs, quizAnswers } from '../server/catalog.mjs';

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'nnt-web-api-'));
  const publicDir = join(directory, 'public');
  await mkdir(publicDir);
  await writeFile(join(publicDir, 'index.html'), '<!doctype html><title>Style lab</title>');
  await writeFile(join(publicDir, 'hello.txt'), 'public content');
  await writeFile(join(directory, 'private.txt'), 'server secret');
  let app;
  let base;
  const start = async () => { app = createApp({ ...options, dbPath: join(directory, 'test.sqlite'), publicDir }); await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${app.server.address().port}`; };
  await start();
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  const client = () => {
    let cookie; let token;
    return {
      async call(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
        const requestHeaders = { ...(cookie ? { Cookie: cookie } : {}), ...(method !== 'GET' ? { 'X-CSRF-Token': token, Origin: base } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers };
        for (const key of Object.keys(requestHeaders)) if (requestHeaders[key] === undefined) delete requestHeaders[key];
        const response = await fetch(`${base}/api${path}`, { method, headers: requestHeaders, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
        if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
        const data = await response.json();
        if (data.csrfToken) token = data.csrfToken;
        return { status: response.status, data, headers: response.headers };
      },
      bootstrap() { return this.call('/bootstrap'); },
    };
  };
  return { client, directory, publicDir, get app() { return app; }, get base() { return base; }, async restart() { await app.close(); await start(); } };
}
const style = 'test-style';
const post = (body, method = 'POST') => ({ method, body });
const nextDate = () => new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

test('health, catalogs, bootstrap cookie, and server-only quiz keys', async t => {
  const f = await fixture(t); const c = f.client();
  assert.deepEqual((await c.call('/health')).data, { ok: true, storage: 'sqlite' });
  for (const name of Object.keys(catalogs)) { const response = await c.call(`/${name}`); assert.equal(response.status, 200); assert.deepEqual(response.data[name], catalogs[name]); }
  const response = await c.bootstrap();
  assert.equal(response.status, 200);
  assert.match(response.data.csrfToken, /^[a-f0-9]{64}$/);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Path=\//);
  const maxAge = Number(response.headers.get('set-cookie').match(/Max-Age=(\d+)/)[1]);
  assert.ok(maxAge >= 604790 && maxAge <= 604800);
  assert.equal(response.data.workspace.label, 'Demo workspace');
  assert.equal(response.data.products.length, 6);
  assert.equal(response.data.articles.length, 6);
  assert.equal(response.data.courses.length, 3);
  assert.equal(JSON.stringify(response.data).includes('quizAnswers'), false);
  assert.equal(response.data.courses.some(course => course.lessons.some(lesson => 'answer' in lesson || 'correctChoice' in lesson)), false);
  assert.equal((await c.bootstrap()).data.csrfToken, response.data.csrfToken);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('orders calculate trusted prices, reject tampering, enforce stock atomically', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const payload = { style, items: [{ productId: 'p-chair', quantity: 2 }, { productId: 'p-plant', quantity: 1 }], alias: 'Student' };
  const response = await c.call('/orders', post(payload));
  assert.equal(response.status, 201);
  assert.equal(response.data.order.totalCents, 690000 * 2 + 45000);
  assert.equal(response.data.order.items[0].unitPriceCents, 690000);
  assert.match(response.data.order.reference, /^DEMO-/);
  assert.equal((await c.call('/orders', post({ ...payload, totalCents: 1 }))).status, 400);
  assert.equal((await c.call('/orders', post({ ...payload, items: [{ productId: 'p-chair', quantity: 1, unitPriceCents: 1 }] }))).status, 400);
  assert.equal((await c.call('/orders', post({ ...payload, items: [{ productId: 'p-chair', quantity: 1 }, { productId: 'p-chair', quantity: 1 }] }))).status, 400);
  assert.equal((await c.call('/orders', post({ ...payload, items: [{ productId: 'p-chair', quantity: 11 }, { productId: 'p-bag', quantity: 1 }] }))).status, 409);
  assert.equal((await c.call(`/orders?style=${style}`)).data.orders.length, 1);
  assert.equal((await c.call('/orders', post({ ...payload, items: [{ productId: 'p-chair', quantity: 10 }] }))).status, 201);
  assert.equal((await c.call('/orders', post({ ...payload, style: 'another-style', items: [{ productId: 'p-chair', quantity: 1 }] }))).status, 409);
  const other = f.client(); await other.bootstrap();
  assert.equal((await other.call('/orders', post({ ...payload, items: [{ productId: 'p-chair', quantity: 12 }] }))).status, 201);
});

test('bookings validate calendar/slots and cancellation restores workspace capacity', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const payload = { style, serviceId: 's-table', date: nextDate(), time: '10:00', guests: 8, alias: 'Reader' };
  const response = await c.call('/bookings', post(payload)); assert.equal(response.status, 201);
  assert.equal((await c.call('/bookings', post({ ...payload, guests: 1 }))).status, 409);
  assert.equal((await c.call('/bookings', post({ ...payload, time: '12:00' }))).status, 400);
  for (const date of ['2027-02-30', '2020-01-01', '2035-01-01', 'tomorrow']) assert.equal((await c.call('/bookings', post({ ...payload, date }))).status, 400);
  assert.equal((await c.call(`/bookings/${response.data.booking.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await c.call(`/bookings/${response.data.booking.id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await c.call('/bookings', post(payload))).status, 201);
  assert.equal((await c.call(`/bookings?style=${style}`)).data.bookings.length, 1);
});

test('event reservations enforce capacity and trusted totals', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const payload = { style, eventId: 'e-code', quantity: 10, alias: 'Builder' };
  for (let index = 0; index < 4; index++) { const response = await c.call('/reservations', post(payload)); assert.equal(response.status, 201); assert.equal(response.data.reservation.totalCents, 65000 * 10); }
  assert.equal((await c.call('/reservations', post({ ...payload, quantity: 1 }))).status, 409);
  assert.equal((await c.call('/reservations', post({ ...payload, totalCents: 0 }))).status, 400);
  const free = await c.call('/reservations', post({ ...payload, eventId: 'e-data', quantity: 1 })); assert.equal(free.data.reservation.totalCents, 0);
  assert.equal((await c.call(`/reservations?style=${style}`)).data.reservations.length, 5);
});

test('task CRUD scopes reads and mutations to workspace and style', async t => {
  const f = await fixture(t); const a = f.client(); const b = f.client(); await a.bootstrap(); await b.bootstrap();
  const response = await a.call('/tasks', post({ style, title: "Study SQLite'); DROP TABLE records; --" }));
  assert.equal(response.status, 201); const taskId = response.data.task.id;
  assert.equal((await a.call(`/tasks?style=${style}`)).data.tasks.length, 1);
  assert.deepEqual((await a.call('/tasks?style=other-style')).data.tasks, []);
  assert.deepEqual((await b.call(`/tasks?style=${style}`)).data.tasks, []);
  assert.equal((await b.call(`/tasks/${taskId}`, post({ status: 'done' }, 'PATCH'))).status, 404);
  assert.equal((await b.call(`/tasks/${taskId}`, { method: 'DELETE' })).status, 404);
  const update = await a.call(`/tasks/${taskId}`, post({ status: 'doing', title: 'Write an API test' }, 'PATCH'));
  assert.equal(update.data.task.title, 'Write an API test'); assert.equal(update.data.task.status, 'doing');
  assert.equal((await a.call(`/tasks/${taskId}`, post({ status: 'unknown' }, 'PATCH'))).status, 400);
  assert.equal((await a.call(`/tasks/${taskId}`, { method: 'DELETE' })).status, 200);
  assert.deepEqual((await a.call(`/tasks?style=${style}`)).data.tasks, []);
});

test('journal bookmarks are unique per style and can be removed', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const response = await c.call('/bookmarks', post({ style, articleId: 'a-space' })); assert.equal(response.status, 201);
  assert.equal((await c.call('/bookmarks', post({ style, articleId: 'a-space' }))).status, 409);
  assert.equal((await c.call('/bookmarks', post({ style: 'other-style', articleId: 'a-space' }))).status, 201);
  assert.equal((await c.call(`/bookmarks?style=${style}`)).data.bookmarks.length, 1);
  assert.equal((await c.call(`/bookmarks/${response.data.bookmark.id}`, { method: 'DELETE' })).status, 200);
  assert.deepEqual((await c.call(`/bookmarks?style=${style}`)).data.bookmarks, []);
});

test('learning stores boolean progress and grades a complete quiz only on server', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const payload = { style, courseId: 'c-web', lessonId: 'web-1', completed: true };
  assert.equal((await c.call('/progress', post(payload, 'PUT'))).data.progress.completed, true);
  assert.equal((await c.call('/progress', post({ ...payload, completed: false }, 'PUT'))).status, 200);
  assert.deepEqual((await c.call(`/progress?style=${style}`)).data.progress, [{ courseId: 'c-web', lessonId: 'web-1', completed: false }]);
  assert.equal((await c.call('/progress', post({ ...payload, completed: 'true' }, 'PUT'))).status, 400);
  assert.equal((await c.call('/progress', post({ ...payload, lessonId: 'data-1' }, 'PUT'))).status, 400);
  const answers = Object.entries(quizAnswers['c-web']).map(([lessonId, choice]) => ({ lessonId, choice }));
  assert.deepEqual((await c.call('/quiz', post({ style, courseId: 'c-web', answers }))).data, { score: 3, total: 3 });
  assert.deepEqual((await c.call('/quiz', post({ style, courseId: 'c-web', answers: answers.map(a => ({ ...a, choice: (a.choice + 1) % 3 })) }))).data, { score: 0, total: 3 });
  assert.equal((await c.call('/quiz', post({ style, courseId: 'c-web', answers: [answers[0], answers[0], answers[0]] }))).status, 400);
  assert.equal((await c.call('/quiz', post({ style, courseId: 'c-web', answers: [] }))).status, 400);
});

test('generative presets persist typed settings and reject executable color strings', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const payload = { style, name: 'A quiet grid', seed: 4294967295, density: 100, color: '#89abcd', motion: false, scene: 'grid' };
  const response = await c.call('/presets', post(payload)); assert.equal(response.status, 201); assert.equal(response.data.preset.motion, false);
  assert.equal((await c.call(`/presets?style=${style}`)).data.presets[0].seed, 4294967295);
  for (const invalid of [{ seed: -1 }, { seed: '42' }, { density: 501 }, { density: 1.5 }, { color: 'red;url(javascript:alert(1))' }, { motion: 1 }, { scene: 'script' }]) assert.equal((await c.call('/presets', post({ ...payload, ...invalid }))).status, 400);
  assert.equal((await c.call(`/presets/${response.data.preset.id}`, { method: 'DELETE' })).status, 200);
});

test('portfolio inquiries save local text and return a local record receipt', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const payload = { style, alias: 'Student', projectType: 'Web application', message: 'I want to build a useful portfolio.' };
  const response = await c.call('/inquiries', post(payload)); assert.equal(response.status, 201); assert.deepEqual(Object.keys(response.data.inquiry).sort(), ['createdAt', 'id']);
  const saved = (await c.call(`/inquiries?style=${style}`)).data.inquiries; assert.equal(saved.length, 1); assert.equal(saved[0].message, payload.message);
  assert.equal((await c.call('/inquiries', post({ ...payload, message: 'short' }))).status, 400);
});

test('finance ledger aggregates integer cents and deletion changes the summary', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const response = await c.call('/ledger', post({ style, kind: 'income', category: 'Project', amountCents: 125050, note: 'Demo income' })); assert.equal(response.status, 201);
  await c.call('/ledger', post({ style, kind: 'expense', category: 'Tools', amountCents: 5075, note: '' }));
  assert.deepEqual((await c.call(`/summary?style=${style}`)).data, { incomeCents: 125050, expenseCents: 5075, balanceCents: 119975, entryCount: 2 });
  assert.equal((await c.call(`/ledger?style=${style}`)).data.entries.length, 2);
  assert.equal((await c.call('/ledger', post({ style, kind: 'income', category: 'Invalid', amountCents: 1.5, note: '' }))).status, 400);
  assert.equal((await c.call(`/ledger/${response.data.entry.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await c.call(`/summary?style=${style}`)).data.balanceCents, -5075);
});

test('local AI classifies familiar text, abstains on unfamiliar input, and saves real history', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  const response = await c.call('/classify', post({ style, text: 'I cannot log in to my account and need to reset my password' }));
  assert.equal(response.status, 201); assert.equal(response.data.classification.label, 'account');
  assert.equal(response.data.classification.scores.length, 4);
  assert.ok(Math.abs(response.data.classification.scores.reduce((sum, row) => sum + row.score, 0) - 1) < 0.000001);
  const unfamiliar = await c.call('/classify', post({ style, text: '🪐🪐🪐' })); assert.equal(unfamiliar.data.classification.abstained, true); assert.equal(unfamiliar.data.classification.coverage, 0);
  assert.equal((await c.call(`/classifications?style=${style}`)).data.classifications.length, 2);
  assert.equal((await c.call('/classify', post({ style, text: 'a'.repeat(1001) }))).status, 400);
});

test('SQLite records, progress, workspace cookie, and CSRF token survive restart', async t => {
  const f = await fixture(t); const c = f.client(); const boot = await c.bootstrap();
  const task = (await c.call('/tasks', post({ style, title: 'Survive a restart' }))).data.task;
  await c.call('/progress', post({ style, courseId: 'c-data', lessonId: 'data-1', completed: true }, 'PUT'));
  await f.restart();
  assert.equal((await c.bootstrap()).data.csrfToken, boot.data.csrfToken);
  assert.equal((await c.call(`/tasks?style=${style}`)).data.tasks[0].id, task.id);
  assert.equal((await c.call(`/progress?style=${style}`)).data.progress[0].completed, true);
  assert.equal((await c.call(`/tasks/${task.id}`, post({ status: 'done' }, 'PATCH'))).status, 200);
});

test('session, CSRF, Origin, and fetch-site checks reject unauthorized writes', async t => {
  const f = await fixture(t); const c = f.client(); const body = { style, title: 'Protected action' };
  assert.equal((await c.call('/tasks', post(body))).status, 401);
  await c.bootstrap();
  assert.equal((await c.call('/tasks', { ...post(body), headers: { 'X-CSRF-Token': undefined } })).status, 403);
  assert.equal((await c.call('/tasks', { ...post(body), headers: { 'X-CSRF-Token': 'wrong' } })).status, 403);
  assert.equal((await c.call('/tasks', { ...post(body), headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await c.call('/tasks', { ...post(body), headers: { Origin: 'null' } })).status, 403);
  assert.equal((await c.call('/tasks', { ...post(body), headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await c.call('/tasks', post(body))).status, 201);
  f.app.db.prepare('UPDATE workspaces SET expires_at = 0').run();
  assert.equal((await c.call(`/tasks?style=${style}`)).status, 401);
  await c.bootstrap(); assert.deepEqual((await c.call(`/tasks?style=${style}`)).data.tasks, []);
});

test('explicit public HTTPS origin supports a TLS proxy and marks its cookie Secure', async t => {
  const f = await fixture(t, { publicOrigin: 'https://style-lab.example:8443' }); const c = f.client();
  const boot = await c.bootstrap(); assert.match(boot.headers.get('set-cookie'), /; Secure(?:;|$)/);
  const payload = post({ style, title: 'Persist behind a TLS proxy' });
  assert.equal((await c.call('/tasks', payload)).status, 403, 'The internal listener origin is not the configured public origin.');
  assert.equal((await c.call('/tasks', { ...payload, headers: { Origin: 'https://style-lab.example:8443' } })).status, 201);
  for (const origin of ['http://style-lab.example:8443', 'https://style-lab.example', 'https://style-lab.example.attacker.test:8443']) assert.equal((await c.call('/tasks', { ...payload, headers: { Origin: origin } })).status, 403);
  assert.equal((await c.call('/tasks', { ...payload, headers: { Origin: 'https://attacker.test', 'X-Forwarded-Host': 'attacker.test', 'X-Forwarded-Proto': 'https' } })).status, 403);
  assert.equal((await c.call(`/tasks?style=${style}`)).data.tasks.length, 1);
});

test('public origin configuration rejects non-origins and does not trust forwarding headers', async t => {
  for (const publicOrigin of ['', 'example.com', 'https:example.com', 'ftp://example.com', 'https://user:password@example.com', 'https://@example.com', 'https://example.com/nested', 'https://example.com?token=secret', 'https://example.com?', 'https://example.com#fragment', 'https://example.com#', ' https://example.com', null, 42]) {
    assert.throws(() => createApp({ dbPath: ':memory:', publicOrigin }), /PUBLIC_ORIGIN/, String(publicOrigin));
  }
  const f = await fixture(t, { publicOrigin: 'http://style-lab.example:8080' }); const c = f.client();
  assert.equal((await c.bootstrap()).headers.get('set-cookie').includes('; Secure'), false);
  const payload = post({ style, title: 'Configured HTTP origin' });
  assert.equal((await c.call('/tasks', { ...payload, headers: { Origin: 'http://style-lab.example:8080' } })).status, 201);
  const direct = await fixture(t); const d = direct.client();
  const bootstrap = await d.call('/bootstrap', { headers: { 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'attacker.test' } });
  assert.equal(bootstrap.headers.get('set-cookie').includes('; Secure'), false);
  assert.equal((await d.call('/tasks', { ...payload, headers: { Origin: 'https://attacker.test', 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'attacker.test' } })).status, 403);
});

test('strict JSON, types, limits, IDs, and slug validation protect write boundaries', async t => {
  const f = await fixture(t); const c = f.client(); await c.bootstrap();
  for (const body of [null, [], {}, { style, title: '' }, { style, title: 42 }, { style, title: 'a'.repeat(161) }, { style, title: 'bad\u0000text' }, { style: "x'; DELETE FROM records;--", title: 'Test' }, { style, title: 'Valid', admin: true }]) assert.equal((await c.call('/tasks', post(body))).status, 400);
  assert.equal((await c.call('/tasks', { ...post('{broken'), raw: true })).status, 400);
  assert.equal((await c.call('/tasks', { ...post({ style, title: 'Valid' }), headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await c.call('/tasks', { ...post({ style, title: 'a'.repeat(33000) }) })).status, 413);
  assert.equal((await c.call('/bookmarks', post({ style, articleId: 'missing' }))).status, 400);
  assert.equal((await c.call('/orders', post({ style, alias: 'A', items: [{ productId: 'p-bag', quantity: 0 }] }))).status, 400);
  assert.equal((await c.call('/tasks?style=../../server')).status, 400);
});

function rawGet(base, path) {
  return new Promise((resolve, reject) => { const target = new URL(base); const request = httpRequest({ hostname: target.hostname, port: target.port, path }, response => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, text: Buffer.concat(chunks).toString('utf8') })); }); request.on('error', reject); request.end(); });
}

test('static serving confines real paths and does not expose DB/server files', async t => {
  const f = await fixture(t);
  assert.equal((await fetch(`${f.base}/`)).status, 200);
  assert.equal(await (await fetch(`${f.base}/hello.txt`)).text(), 'public content');
  const head = await fetch(`${f.base}/hello.txt`, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const path of ['/../private.txt', '/%2e%2e/private.txt', '/..%2fprivate.txt', '/%5c..%5cprivate.txt', '/%00private.txt']) { const response = await rawGet(f.base, path); assert.equal(response.status, 400, path); assert.equal(response.text.includes('server secret'), false); }
  assert.equal((await fetch(`${f.base}/server/app.mjs`)).status, 404);
  assert.equal((await fetch(`${f.base}/data/workspaces.sqlite`)).status, 404);
  await symlink(f.directory, join(f.publicDir, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  const symlinkResponse = await fetch(`${f.base}/escape/private.txt`); assert.equal(symlinkResponse.status, 404); assert.equal((await symlinkResponse.text()).includes('server secret'), false);
  assert.equal((await fetch(`${f.base}/hello.txt`, { method: 'POST' })).status, 405);
});

test('all user collections are isolated from a second workspace', async t => {
  const f = await fixture(t); const a = f.client(); const b = f.client(); await a.bootstrap(); await b.bootstrap();
  const writes = [
    ['/orders', { style, alias: 'A', items: [{ productId: 'p-bag', quantity: 1 }] }],
    ['/bookings', { style, serviceId: 's-studio', date: nextDate(), time: '14:00', guests: 1, alias: 'A' }],
    ['/reservations', { style, eventId: 'e-design', quantity: 1, alias: 'A' }],
    ['/tasks', { style, title: 'Private task' }],
    ['/bookmarks', { style, articleId: 'a-api' }],
    ['/presets', { style, name: 'Private', seed: 42, density: 20, color: '#abcdef', motion: true, scene: 'orb' }],
    ['/inquiries', { style, alias: 'A', projectType: 'Site', message: 'Private demo request.' }],
    ['/ledger', { style, kind: 'income', category: 'Project', amountCents: 100, note: 'Private note' }],
    ['/classify', { style, text: 'Please reset my password' }],
  ];
  const deletions = [];
  for (const [path, body] of writes) {
    const response = await a.call(path, post(body)); assert.equal(response.status, 201, path);
    const value = Object.values(response.data)[0];
    if (['/bookings', '/tasks', '/bookmarks', '/presets', '/ledger'].includes(path)) deletions.push(`${path}/${value.id}`);
    const collection = path === '/classify' ? '/classifications' : path;
    const other = await b.call(`${collection}?style=${style}`); assert.equal(Object.values(other.data)[0].length, 0, path);
  }
  for (const path of deletions) assert.equal((await b.call(path, { method: 'DELETE' })).status, 404, path);
  await a.call('/progress', post({ style, courseId: 'c-ai', lessonId: 'ai-1', completed: true }, 'PUT'));
  assert.deepEqual((await b.call(`/progress?style=${style}`)).data.progress, []);
  assert.equal((await b.call(`/summary?style=${style}`)).data.entryCount, 0);
});
