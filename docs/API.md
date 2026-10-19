# HTTP API and durable demo workspaces

Run `npm start` with **Node.js 24 or newer**. The frontend and API share `http://127.0.0.1:4180`. No package download, external database, API key, or AI service is required. `HOST`, `PORT`, and `DB_PATH` configure the listener and SQLite file; the defaults are `127.0.0.1`, `4180`, and `data/workspaces.sqlite`.

For a TLS-terminating reverse proxy, explicitly configure `PUBLIC_ORIGIN=https://your-demo.example.com` (include a port if the public origin uses a non-default port). The value accepts only an absolute HTTP(S) origin with no credentials, additional path, query, or fragment. Browser write origins are compared against that configured origin, and an HTTPS public origin marks the workspace cookie `Secure` even when the proxy talks HTTP to Node. Leave `PUBLIC_ORIGIN` unset for direct local HTTP use. Forwarding headers such as `X-Forwarded-Host` and `X-Forwarded-Proto` are deliberately not trusted. Keep the internal listener private behind the proxy.

All routes below have the `/api` prefix. Responses are JSON; errors have `{ "error": "Human-readable explanation" }`. Monetary values are integer satang (THB cents), so `1250` means ฿12.50. Timestamps are ISO 8601 UTC strings. Booking calendar dates use `YYYY-MM-DD` and are validated against the current date in Asia/Bangkok.

## Browser session and write protection

1. Request `GET /api/bootstrap` before using a workflow.
2. Keep the returned `nnt_workspace` cookie. It is `HttpOnly`, `SameSite=Lax`, lasts seven days, and identifies a random anonymous workspace. The cookie receives `Secure` when the request arrives over TLS or the explicitly configured public origin uses HTTPS.
3. Keep the JSON response's `csrfToken` in memory. Include it as `X-CSRF-Token` on every `POST`, `PUT`, `PATCH`, and `DELETE` request. Send JSON bodies with `Content-Type: application/json`.
4. Browser writes must have the same `Origin` as the explicitly configured public origin, or the direct server scheme/host when it is unset. Cross-site `Sec-Fetch-Site` writes are rejected. No permissive CORS header is emitted.

The frontend API helper performs these steps. A direct browser-console example, after opening the local site:

```js
const bootstrap = await fetch('/api/bootstrap').then(r => r.json());
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': bootstrap.csrfToken,
  },
  body: JSON.stringify({ style: 'minimalist', title: 'Trace one request to SQLite' }),
});
console.log(await response.json());
```

Anonymous workspaces are a demonstration boundary, not authenticated user accounts. The cookie holder can access that workspace; clearing the cookie starts a separate workspace. Keep personal or confidential information out of the demo. Expired workspaces and their records are cleaned up on a subsequent bootstrap request. Run on the default loopback interface for local use; binding a public interface requires the deployment hardening described in the README.

## Routes

| Method | Path | Input / behavior | Success response |
| --- | --- | --- | --- |
| GET | `/health` | Public liveness and storage type | `{ok:true,storage:'sqlite'}` |
| GET | `/bootstrap` | Create or resume workspace; set cookie | `{csrfToken,workspace,products,services,events,articles,courses}` |
| GET | `/products` | Public fictional catalog | `{products}` |
| GET | `/services` | Public fictional catalog | `{services}` |
| GET | `/events` | Public fictional catalog | `{events}` |
| GET | `/articles` | Public full article bodies | `{articles}` |
| GET | `/courses` | Public lesson bodies, questions, and choices | `{courses}` |
| GET | `/orders?style=slug` | Workspace order history | `{orders}` |
| POST | `/orders` | `{style,items:[{productId,quantity}],alias}` | `{order}`; HTTP 201 |
| GET | `/bookings?style=slug` | Workspace booking history | `{bookings}` |
| POST | `/bookings` | `{style,serviceId,date,time,guests,alias}` | `{booking}`; HTTP 201 |
| DELETE | `/bookings/:id` | Cancel own booking; release demo capacity | `{ok:true}` |
| GET | `/reservations?style=slug` | Workspace ticket history | `{reservations}` |
| POST | `/reservations` | `{style,eventId,quantity,alias}` | `{reservation}`; HTTP 201 |
| GET | `/tasks?style=slug` | Workspace task board | `{tasks}` |
| POST | `/tasks` | `{style,title}`; initial status `todo` | `{task}`; HTTP 201 |
| PATCH | `/tasks/:id` | `{status,title?}` | `{task}` |
| DELETE | `/tasks/:id` | Remove own task | `{ok:true}` |
| GET | `/bookmarks?style=slug` | Workspace saved articles | `{bookmarks}` |
| POST | `/bookmarks` | `{style,articleId}` | `{bookmark}`; HTTP 201 |
| DELETE | `/bookmarks/:id` | Remove own bookmark | `{ok:true}` |
| GET | `/progress?style=slug` | Workspace lesson progress | `{progress}` |
| PUT | `/progress` | `{style,courseId,lessonId,completed}` | `{progress:{courseId,lessonId,completed}}` |
| POST | `/quiz` | `{style,courseId,answers:[{lessonId,choice}]}` | `{score,total}` |
| GET | `/presets?style=slug` | Workspace saved generative scenes | `{presets}` |
| POST | `/presets` | `{style,name,seed,density,color,motion,scene}` | `{preset}`; HTTP 201 |
| DELETE | `/presets/:id` | Remove own preset | `{ok:true}` |
| GET | `/inquiries?style=slug` | Workspace inquiries saved locally | `{inquiries}` |
| POST | `/inquiries` | `{style,alias,projectType,message}` | `{inquiry:{id,createdAt}}`; HTTP 201 |
| GET | `/ledger?style=slug` | Workspace ledger | `{entries}` |
| POST | `/ledger` | `{style,kind,category,amountCents,note}` | `{entry}`; HTTP 201 |
| DELETE | `/ledger/:id` | Remove own ledger entry | `{ok:true}` |
| GET | `/summary?style=slug` | Sum own ledger entries | `{incomeCents,expenseCents,balanceCents,entryCount}` |
| POST | `/classify` | `{style,text}` | `{classification}`; HTTP 201 |
| GET | `/classifications?style=slug` | Workspace inference history | `{classifications}` |

Collection reads are newest first. The `style` parameter separates records for different visual examples inside the same workspace. Lookups, updates, and deletes also check workspace ownership; an ID from another workspace returns 404. Orders, bookings, and reservations include a generated demo reference and a creation timestamp.

## Validation and domain rules

- JSON bodies have a **32 KB maximum**. Objects reject unknown fields, arrays where objects are expected, missing fields, incorrect types, and control characters. SQL statements bind all user values.
- `style`: lowercase letters/numbers separated by single hyphens; maximum 80 characters. The server accepts any valid slug so the gallery can grow without a server migration.
- `alias`: 1–60 characters. This is a demo nickname, not an email address or authentication credential.
- Orders: 1–6 distinct catalog products; quantity is an integer 1–30 per line. The server retrieves its own catalog prices and rejects client-supplied price or total fields. Stock is checked transactionally against previous orders in the workspace across styles.
- Bookings: a real calendar date from today through the next 365 days, a slot of `10:00`, `14:00`, or `17:00`, and integer guests from 1 through the service capacity. Occupancy is checked across styles for the same service/date/time. Canceling releases capacity.
- Reservations: integer quantity 1–10. Ticket capacity is checked transactionally across styles; totals use server catalog prices, including the free event.
- Tasks: title 1–160 characters; status is `todo`, `doing`, or `done`.
- Bookmarks: an existing article ID; the same article cannot be saved twice in the same style.
- Progress: an existing lesson inside the selected course and a real boolean `completed`. Repeated `PUT` requests update one unique progress row. A quiz requires every lesson exactly once, with a zero-based integer choice. Answer keys remain in server code and are excluded from the public API and preview fixture.
- Presets: name 1–60 characters, integer seed 0–4294967295, integer density 10–500, hex color `#RRGGBB`, boolean `motion`, and scene `particles`, `orb`, or `grid`.
- Inquiries: project type 1–80 characters; message 10–2000 characters. The request is saved in SQLite and is **not emailed or sent to a company**.
- Ledger: kind `income` or `expense`, category 1–60 characters, integer amount 1–100000000 satang, note 0–240 characters. The summary uses integer arithmetic over that style's workspace records.
- Classification: nonempty text up to 1000 Unicode characters. The server runs the local model and stores its actual output.

All stock, slot capacity, and ticket capacity are **per anonymous workspace**, allowing separate visitors to try the same fictional demonstration without exhausting global inventory. The product/service/event catalog is shared read-only seed data. There are no payments, real orders, real reservations, email delivery, or global administrative mutations.

## Local AI model

`server/support-model.json` and `server/inference.mjs` are adapted directly from NNT's earlier `applied-ai-web-lab` support classifier. The model is character n-gram Multinomial Naive Bayes trained on 96 hand-authored educational synthetic Thai/English examples. Classes are `account`, `billing`, `delivery`, and `technical`; no external network request occurs during inference.

The returned `classification` contains `{id,text,label,scores:[{label,score}],coverage,abstained,reasons,createdAt}`. Scores are **uncalibrated model scores**, not probabilities of correctness. Unfamiliar character-pattern coverage or a low leading score triggers abstention. Synthetic development results do not establish performance on real customers, other languages, or other topics. The source model is supplied to make this application reproducible; this repo does not claim a newly trained model or production accuracy.

## Status codes and static files

| Code | Meaning |
| --- | --- |
| 200 / 201 | Read/update success / newly created record |
| 400 | Invalid JSON, fields, types, ranges, entity ID, date, or path |
| 401 | Workspace missing or expired; bootstrap again |
| 403 | CSRF token, Origin, or fetch-site check failed |
| 404 | Route/file absent or record not owned by this workspace |
| 405 | Unsupported method |
| 409 | Insufficient stock/capacity or duplicate bookmark |
| 413 | Body exceeds 32 KB |
| 415 | Body is not sent as `application/json` |

The server serves only `public/`. It rejects dot segments, encoded path separators, invalid URL encoding, and null bytes, then verifies the resolved real path stays inside the public directory. This also blocks symlink escapes. Database files, server source, and environment files are not exposed. JSON responses use `Cache-Control: no-store`; static responses use `no-cache`. Security headers include a content security policy, `nosniff`, a same-origin referrer policy, and no frame embedding.

GitHub Pages serves the static gallery preview only. It can browse the public catalog and lesson bodies; workflow writes explicitly require the Node backend. No frontend success message stands in for server persistence.

## Verification

Run `node --test tests/backend.test.mjs`. The HTTP integration suite creates temporary SQLite files and independent cookies, exercises every workflow, restarts the server to verify durability, and checks ownership, CSRF, origin rejection, session expiry, price tampering, transactional capacity, malformed input, and static path/symlink confinement.
