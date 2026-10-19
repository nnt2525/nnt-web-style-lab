import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync, mkdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogs, products, services, events, courses, quizAnswers } from './catalog.mjs';
import { classify } from './inference.mjs';

const model = JSON.parse(readFileSync(new URL('./support-model.json', import.meta.url), 'utf8'));
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE = 'nnt_workspace';
const MAX_BODY = 32 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8' };
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const id = prefix => `${prefix}_${randomUUID()}`;
const now = () => new Date().toISOString();
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const publicDirDefault = fileURLToPath(new URL('../public/', import.meta.url));

function text(value, name, min = 1, max = 160) {
  if (typeof value !== 'string') fail(400, `${name} must be text.`);
  const cleaned = value.trim();
  if ([...cleaned].length < min || [...cleaned].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(cleaned)) fail(400, `${name} must contain ${min}–${max} characters without control characters.`);
  return cleaned;
}
function integer(value, name, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(400, `${name} must be an integer from ${min} to ${max}.`);
  return value;
}
function bool(value, name) { if (typeof value !== 'boolean') fail(400, `${name} must be true or false.`); return value; }
function choice(value, name, allowed) { if (!allowed.includes(value)) fail(400, `${name} must be one of: ${allowed.join(', ')}.`); return value; }
function slug(value) { if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) fail(400, 'style must be a valid style slug.'); return value; }
function fields(body, allowed, required = allowed) {
  if (!body || Array.isArray(body) || typeof body !== 'object') fail(400, 'Send a JSON object.');
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fail(400, `Unexpected field: ${key}.`);
  for (const key of required) if (!own(body, key)) fail(400, `Missing field: ${key}.`);
}
function entity(list, value, name) { if (typeof value !== 'string') fail(400, `${name} must be an ID.`); const result = list.find(item => item.id === value); if (!result) fail(400, `Unknown ${name}.`); return result; }
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(400, 'date must use YYYY-MM-DD.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(400, 'Choose a real calendar date.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const today = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
  const latest = new Date(new Date(`${today}T00:00:00Z`).getTime() + 365 * 86400000).toISOString().slice(0, 10);
  if (value < today || value > latest) fail(400, 'Choose a date from today through the next 365 days (Asia/Bangkok).');
  return value;
}
async function readBody(req) {
  if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') fail(415, 'Send Content-Type: application/json.');
  if (Number(req.headers['content-length']) > MAX_BODY) { req.resume(); fail(413, 'Request body must not exceed 32 KB.'); }
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= MAX_BODY) chunks.push(chunk);
  }
  if (size > MAX_BODY) fail(413, 'Request body must not exceed 32 KB.');
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Request body must be valid JSON.'); }
}
function equal(a, b) { return typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
function normalizePublicOrigin(value) {
  if (value === undefined) return undefined;
  let parsed;
  try { if (typeof value !== 'string' || !value.trim()) throw new Error(); parsed = new URL(value); }
  catch { throw new Error('PUBLIC_ORIGIN must be an absolute http(s) origin, for example https://demo.example.com.'); }
  if (!/^https?:\/\/[^\s/@?#]+\/?$/i.test(value) || !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('PUBLIC_ORIGIN must contain only an http(s) scheme, hostname, and optional port; no credentials, path, query, or fragment.');
  }
  return parsed.origin;
}

/** Create an unbound HTTP server. Caller owns listen(); close() shuts down server + DB. */
export function createApp({ dbPath = resolve('data/workspaces.sqlite'), publicDir = publicDirDefault, publicOrigin } = {}) {
  const configuredOrigin = normalizePublicOrigin(publicOrigin);
  if (dbPath !== ':memory:') mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, kind TEXT NOT NULL, style TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS records_workspace_kind_style ON records(workspace_id,kind,style);
    CREATE TABLE IF NOT EXISTS progress (workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, style TEXT NOT NULL, course_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completed INTEGER NOT NULL CHECK(completed IN(0,1)), PRIMARY KEY(workspace_id,style,course_id,lesson_id));`);
  const findWorkspace = db.prepare('SELECT * FROM workspaces WHERE id = ? AND expires_at > ?');
  const listRecords = db.prepare('SELECT payload FROM records WHERE workspace_id = ? AND kind = ? AND style = ? ORDER BY rowid DESC');
  const listAllRecords = db.prepare('SELECT payload FROM records WHERE workspace_id = ? AND kind = ? ORDER BY rowid DESC');
  const findRecord = db.prepare('SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = ?');
  const insertRecord = db.prepare('INSERT INTO records(id,workspace_id,kind,style,payload,created_at) VALUES(?,?,?,?,?,?)');
  const updateRecord = db.prepare('UPDATE records SET payload = ? WHERE id = ? AND workspace_id = ? AND kind = ?');
  const deleteRecord = db.prepare('DELETE FROM records WHERE id = ? AND workspace_id = ? AND kind = ?');
  const records = (workspace, kind, style) => (style === undefined ? listAllRecords.all(workspace.id, kind) : listRecords.all(workspace.id, kind, style)).map(row => JSON.parse(row.payload));
  const save = (workspace, kind, style, payload) => { insertRecord.run(payload.id, workspace.id, kind, style, JSON.stringify(payload), payload.createdAt); return payload; };
  const requiredRecord = (workspace, kind, recordId) => { const record = findRecord.get(recordId, workspace.id, kind); if (!record) fail(404, 'Record not found in this workspace.'); return { row: record, value: JSON.parse(record.payload) }; };
  const transact = callback => { db.exec('BEGIN IMMEDIATE'); try { const result = callback(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  const getSession = req => {
    const cookies = (req.headers.cookie || '').split(';').map(part => part.trim());
    const raw = cookies.find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    return raw && /^[a-f0-9]{64}$/.test(raw) ? findWorkspace.get(raw, Date.now()) : undefined;
  };
  const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    try {
      const rawPath = (req.url || '/').split('?')[0];
      let decodedPath;
      try { decodedPath = decodeURIComponent(rawPath); } catch { fail(400, 'Invalid URL encoding.'); }
      if (decodedPath.includes('\\') || decodedPath.includes('\0') || decodedPath.split('/').some(part => part === '..' || part === '.') || /%2f|%5c/i.test(rawPath)) fail(400, 'Invalid path.');
      const url = new URL(req.url || '/', 'http://local.invalid');
      const path = url.pathname.replace(/\/$/, '') || '/';
      if (!path.startsWith('/api/') && path !== '/api') {
        if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'Method not allowed.');
        const base = realpathSync(publicDir);
        const requested = resolve(base, `.${decodedPath}`);
        if (requested !== base && !requested.startsWith(base + sep)) fail(400, 'Invalid path.');
        let file = requested;
        try { if (statSync(file).isDirectory()) file = resolve(file, 'index.html'); if (!statSync(file).isFile()) fail(404, 'File not found.'); }
        catch (error) { if (error.status) throw error; if (extname(requested)) fail(404, 'File not found.'); file = resolve(base, 'index.html'); }
        try { file = realpathSync(file); } catch { fail(404, 'File not found.'); }
        if (file !== base && !file.startsWith(base + sep)) fail(404, 'File not found.');
        const contents = readFileSync(file);
        res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': contents.length, 'Cache-Control': 'no-cache' });
        res.end(req.method === 'HEAD' ? undefined : contents); return;
      }
      const route = path.slice(4) || '/';
      if (route === '/health' && req.method === 'GET') { json(res, 200, { ok: true, storage: 'sqlite' }); return; }
      let workspace = getSession(req);
      if (route === '/bootstrap' && req.method === 'GET') {
        if (!workspace) {
          // Expired sessions and their records are removed only at bootstrap, never in another visitor's workflow.
          db.prepare('DELETE FROM workspaces WHERE expires_at <= ?').run(Date.now());
          workspace = { id: randomBytes(32).toString('hex'), csrf: randomBytes(32).toString('hex'), expires_at: Date.now() + SESSION_MS };
          db.prepare('INSERT INTO workspaces(id,csrf,expires_at,created_at) VALUES(?,?,?,?)').run(workspace.id, workspace.csrf, workspace.expires_at, now());
        }
        const remaining = Math.max(0, Math.floor((workspace.expires_at - Date.now()) / 1000));
        res.setHeader('Set-Cookie', `${COOKIE}=${workspace.id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${remaining}${req.socket.encrypted || configuredOrigin?.startsWith('https:') ? '; Secure' : ''}`);
        json(res, 200, { csrfToken: workspace.csrf, workspace: { label: 'Demo workspace' }, ...catalogs }); return;
      }
      if (req.method === 'GET' && own(catalogs, route.slice(1))) { json(res, 200, { [route.slice(1)]: catalogs[route.slice(1)] }); return; }
      if (!workspace) fail(401, 'Open /api/bootstrap to start a demo workspace.');
      const writing = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (writing) {
        const origin = req.headers.origin;
        const expected = configuredOrigin || `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
        if ((origin && origin !== expected) || req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Cross-origin writes are not allowed.');
        if (!equal(req.headers['x-csrf-token'], workspace.csrf)) fail(403, 'Missing or invalid CSRF token. Reload the page and try again.');
      }
      if (req.method === 'GET') {
        const plural = { '/orders': 'orders', '/bookings': 'bookings', '/reservations': 'reservations', '/tasks': 'tasks', '/bookmarks': 'bookmarks', '/presets': 'presets', '/inquiries': 'inquiries', '/ledger': 'entries', '/classifications': 'classifications' };
        if (!own(plural, route) && !['/progress', '/summary'].includes(route)) fail(404, 'API route not found.');
        const style = slug(url.searchParams.get('style'));
        if (own(plural, route)) { json(res, 200, { [plural[route]]: records(workspace, route.slice(1), style) }); return; }
        if (route === '/progress') {
          json(res, 200, { progress: db.prepare('SELECT course_id AS courseId, lesson_id AS lessonId, completed FROM progress WHERE workspace_id = ? AND style = ? ORDER BY course_id,lesson_id').all(workspace.id, style).map(row => ({ ...row, completed: Boolean(row.completed) })) }); return;
        }
        if (route === '/summary') {
          const entries = records(workspace, 'ledger', style);
          const incomeCents = entries.filter(e => e.kind === 'income').reduce((sum, e) => sum + e.amountCents, 0);
          const expenseCents = entries.filter(e => e.kind === 'expense').reduce((sum, e) => sum + e.amountCents, 0);
          json(res, 200, { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, entryCount: entries.length }); return;
        }
        fail(404, 'API route not found.');
      }
      const match = route.match(/^\/(bookings|tasks|bookmarks|presets|ledger)\/([a-z]+_[a-f0-9-]{36})$/);
      if (match && req.method === 'DELETE') {
        requiredRecord(workspace, match[1], match[2]);
        deleteRecord.run(match[2], workspace.id, match[1]); json(res, 200, { ok: true }); return;
      }
      if (match && match[1] === 'tasks' && req.method === 'PATCH') {
        const body = await readBody(req); fields(body, ['status', 'title'], ['status']);
        const { value } = requiredRecord(workspace, 'tasks', match[2]);
        value.status = choice(body.status, 'status', ['todo', 'doing', 'done']);
        if (own(body, 'title')) value.title = text(body.title, 'title');
        updateRecord.run(JSON.stringify(value), value.id, workspace.id, 'tasks'); json(res, 200, { task: value }); return;
      }
      if (!['POST', 'PUT'].includes(req.method)) fail(405, 'Method not allowed.');
      const body = await readBody(req);
      if (route === '/orders' && req.method === 'POST') {
        fields(body, ['style', 'items', 'alias']); const style = slug(body.style); const alias = text(body.alias, 'alias', 1, 60);
        if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 6) fail(400, 'items must contain 1–6 different products.');
        const seen = new Set();
        const items = body.items.map(item => { fields(item, ['productId', 'quantity']); const product = entity(products, item.productId, 'productId'); if (seen.has(product.id)) fail(400, 'Use one line per product.'); seen.add(product.id); return { productId: product.id, name: product.name, quantity: integer(item.quantity, 'quantity', 1, 30), unitPriceCents: product.priceCents }; });
        const order = transact(() => {
          const previous = records(workspace, 'orders');
          for (const item of items) { const used = previous.flatMap(o => o.items).filter(i => i.productId === item.productId).reduce((sum, i) => sum + i.quantity, 0); if (used + item.quantity > products.find(p => p.id === item.productId).stock) fail(409, 'Not enough demo stock in this workspace.'); }
          return save(workspace, 'orders', style, { id: id('order'), items, alias, totalCents: items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0), reference: `DEMO-${randomBytes(4).toString('hex').toUpperCase()}`, createdAt: now() });
        }); json(res, 201, { order }); return;
      }
      if (route === '/bookings' && req.method === 'POST') {
        fields(body, ['style', 'serviceId', 'date', 'time', 'guests', 'alias']); const style = slug(body.style); const service = entity(services, body.serviceId, 'serviceId'); const bookingDate = date(body.date); const time = choice(body.time, 'time', ['10:00', '14:00', '17:00']); const guests = integer(body.guests, 'guests', 1, service.capacity); const alias = text(body.alias, 'alias', 1, 60);
        const booking = transact(() => {
          const used = records(workspace, 'bookings').filter(b => b.serviceId === service.id && b.date === bookingDate && b.time === time).reduce((sum, b) => sum + b.guests, 0);
          if (used + guests > service.capacity) fail(409, 'This slot is full in your demo workspace. Choose another time.');
          return save(workspace, 'bookings', style, { id: id('booking'), serviceId: service.id, date: bookingDate, time, guests, alias, reference: `BOOK-${randomBytes(4).toString('hex').toUpperCase()}`, createdAt: now() });
        }); json(res, 201, { booking }); return;
      }
      if (route === '/reservations' && req.method === 'POST') {
        fields(body, ['style', 'eventId', 'quantity', 'alias']); const style = slug(body.style); const event = entity(events, body.eventId, 'eventId'); const quantity = integer(body.quantity, 'quantity', 1, 10); const alias = text(body.alias, 'alias', 1, 60);
        const reservation = transact(() => { const used = records(workspace, 'reservations').filter(r => r.eventId === event.id).reduce((sum, r) => sum + r.quantity, 0); if (used + quantity > event.capacity) fail(409, 'Not enough tickets in this demo workspace.'); return save(workspace, 'reservations', style, { id: id('reservation'), eventId: event.id, quantity, alias, totalCents: event.priceCents * quantity, reference: `TICKET-${randomBytes(4).toString('hex').toUpperCase()}`, createdAt: now() }); });
        json(res, 201, { reservation }); return;
      }
      if (route === '/tasks' && req.method === 'POST') {
        fields(body, ['style', 'title']); const task = save(workspace, 'tasks', slug(body.style), { id: id('task'), title: text(body.title, 'title'), status: 'todo', createdAt: now() }); json(res, 201, { task }); return;
      }
      if (route === '/bookmarks' && req.method === 'POST') {
        fields(body, ['style', 'articleId']); const style = slug(body.style); const article = entity(catalogs.articles, body.articleId, 'articleId');
        const bookmark = transact(() => { if (records(workspace, 'bookmarks', style).some(b => b.articleId === article.id)) fail(409, 'This article is already bookmarked.'); return save(workspace, 'bookmarks', style, { id: id('bookmark'), articleId: article.id, createdAt: now() }); }); json(res, 201, { bookmark }); return;
      }
      if (route === '/progress' && req.method === 'PUT') {
        fields(body, ['style', 'courseId', 'lessonId', 'completed']); const style = slug(body.style); const course = entity(courses, body.courseId, 'courseId'); entity(course.lessons, body.lessonId, 'lessonId'); const completed = bool(body.completed, 'completed');
        db.prepare('INSERT INTO progress(workspace_id,style,course_id,lesson_id,completed) VALUES(?,?,?,?,?) ON CONFLICT(workspace_id,style,course_id,lesson_id) DO UPDATE SET completed = excluded.completed').run(workspace.id, style, course.id, body.lessonId, Number(completed)); json(res, 200, { progress: { courseId: course.id, lessonId: body.lessonId, completed } }); return;
      }
      if (route === '/quiz' && req.method === 'POST') {
        fields(body, ['style', 'courseId', 'answers']); slug(body.style); const course = entity(courses, body.courseId, 'courseId');
        if (!Array.isArray(body.answers) || body.answers.length !== course.lessons.length) fail(400, 'Answer each lesson exactly once.');
        const seen = new Set(); let score = 0;
        for (const answer of body.answers) { fields(answer, ['lessonId', 'choice']); const lesson = entity(course.lessons, answer.lessonId, 'lessonId'); if (seen.has(lesson.id)) fail(400, 'Answer each lesson exactly once.'); seen.add(lesson.id); const selected = integer(answer.choice, 'choice', 0, lesson.choices.length - 1); if (selected === quizAnswers[course.id][lesson.id]) score++; }
        json(res, 200, { score, total: course.lessons.length }); return;
      }
      if (route === '/presets' && req.method === 'POST') {
        fields(body, ['style', 'name', 'seed', 'density', 'color', 'motion', 'scene']); const style = slug(body.style); const name = text(body.name, 'name', 1, 60); const seed = integer(body.seed, 'seed', 0, 4294967295); const density = integer(body.density, 'density', 10, 500); if (typeof body.color !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(body.color)) fail(400, 'color must use #RRGGBB.'); const motion = bool(body.motion, 'motion'); const scene = choice(body.scene, 'scene', ['particles', 'orb', 'grid']);
        const preset = save(workspace, 'presets', style, { id: id('preset'), name, seed, density, color: body.color, motion, scene, createdAt: now() }); json(res, 201, { preset }); return;
      }
      if (route === '/inquiries' && req.method === 'POST') {
        fields(body, ['style', 'alias', 'projectType', 'message']); const style = slug(body.style); const value = save(workspace, 'inquiries', style, { id: id('inquiry'), alias: text(body.alias, 'alias', 1, 60), projectType: text(body.projectType, 'projectType', 1, 80), message: text(body.message, 'message', 10, 2000), createdAt: now() }); json(res, 201, { inquiry: { id: value.id, createdAt: value.createdAt } }); return;
      }
      if (route === '/ledger' && req.method === 'POST') {
        fields(body, ['style', 'kind', 'category', 'amountCents', 'note']); const style = slug(body.style); const entry = save(workspace, 'ledger', style, { id: id('entry'), kind: choice(body.kind, 'kind', ['income', 'expense']), category: text(body.category, 'category', 1, 60), amountCents: integer(body.amountCents, 'amountCents', 1, 100000000), note: text(body.note, 'note', 0, 240), createdAt: now() }); json(res, 201, { entry }); return;
      }
      if (route === '/classify' && req.method === 'POST') {
        fields(body, ['style', 'text']); const style = slug(body.style); const input = text(body.text, 'text', 1, model.text_limit); const classification = save(workspace, 'classifications', style, { id: id('classification'), text: input, ...classify(input, model), createdAt: now() }); json(res, 201, { classification }); return;
      }
      fail(404, 'API route not found.');
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      if (!error.status) console.error('Request failed:', error);
      json(res, error.status || 500, { error: error.status ? error.message : 'The server could not complete this request.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  let closed = false;
  return { server, db, async close() { if (closed) return; closed = true; if (server.listening) await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose())); db.close(); } };
}
