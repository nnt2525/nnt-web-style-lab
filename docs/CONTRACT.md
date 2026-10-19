# Shared implementation contract

Node 24+ server + built-in SQLite. No third-party runtime dependencies. Static frontend is `public/`.
All example brands/content are fictional demonstrations, no payments/email delivery/real purchases.
All browser writes go to actual HTTP APIs and durable SQLite, scoped to an anonymous HttpOnly-cookie workspace.

## Browser modules

Each `public/assets/apps/<app>.js` exports `async function mount(root, style, ctx)`.
`style` has `{id,slug,name,group,app,brand,headline,description,colors:[bg,ink,accent],tags:[]}`.
`ctx` has:
- `api(path, options={})`: fetch `/api` + path, parse JSON, throw user-readable Error for non-2xx; include CSRF automatically. `options.body` may be an object (JSON encoded), `options.method` defaults GET.
- `el(tag, className='', text)`: create DOM element, assign textContent; no unsafe untrusted innerHTML.
- `notify(message, kind='success')`: accessible status toast.
- `art(kind, color, label)`: return a DOM node with a code-drawn illustration. Optional; modules may own their own illustrations.
- `mode`: `'server'` or `'preview'`. In preview (GitHub Pages), GET fixture browsing works; writes throw a clear message explaining Node backend must run locally. Do not fake successful persistence.

Modules own app layouts; CSS is at `public/assets/apps/<app>.css`. Scope with `.app-<app>` to avoid conflict. Root provides .btn, .btn-secondary, .field, .app-header, .app-brand, .eyebrow, .muted, .card, .app-footer and theme variables `--bg --ink --accent --surface --line --muted --radius --shadow --display`.
Each app should give useful read-only content and real interaction in server mode. All destructive actions reversible at demo scope; no global admin mutations.

## API contract

All API responses JSON. Success objects with named array properties below. Error `{error:'message'}`. Dates ISO strings, all money integer cents in THB; display /100.
GET `/health` -> `{ok:true,storage:'sqlite'}`
GET `/bootstrap` -> `{csrfToken,workspace:{label:'Demo workspace'},products,services,events,articles,courses}`; sets anonymous workspace cookie.
GET `/products` -> `{products:[{id,name,category,description,priceCents,stock,art:'chair'|'lamp'|'headphones'|'bag'|'speaker'|'plant'}]}`
GET `/orders?style=slug` -> `{orders:[]}`
POST `/orders` `{style,items:[{productId,quantity}],alias}` -> `{order:{id,items,totalCents,reference,createdAt}}`; server prices/stock; no payment.
GET `/services` -> `{services:[{id,name,description,priceCents,durationMinutes,capacity,art}]}`
GET `/bookings?style=slug` -> `{bookings:[]}`
POST `/bookings` `{style,serviceId,date:'YYYY-MM-DD',time:'10:00'|'14:00'|'17:00',guests,alias}` -> `{booking:{id,serviceId,date,time,guests,reference,createdAt}}`; validate date, slot and capacity.
DELETE `/bookings/:id` -> `{ok:true}`
GET `/events` -> `{events:[{id,name,description,date,venue,category,priceCents,capacity}]}`
GET `/reservations?style=slug` -> `{reservations:[]}`
POST `/reservations` `{style,eventId,quantity,alias}` -> `{reservation:{id,eventId,quantity,totalCents,reference,createdAt}}`
GET `/tasks?style=slug` -> `{tasks:[{id,title,status:'todo'|'doing'|'done',createdAt}]}`
POST `/tasks` `{style,title}` -> `{task}`
PATCH `/tasks/:id` `{status,title?}` -> `{task}`
DELETE `/tasks/:id` -> `{ok:true}`
GET `/articles` -> `{articles:[{id,title,category,author,readMinutes,excerpt,body:[paragraphs],art}]}`
GET `/bookmarks?style=slug` -> `{bookmarks:[{id,articleId,createdAt}]}`
POST `/bookmarks` `{style,articleId}` -> `{bookmark}`
DELETE `/bookmarks/:id` -> `{ok:true}`
GET `/courses` -> `{courses:[{id,title,category,description,lessons:[{id,title,body,question,choices:[]}]}]}`
GET `/progress?style=slug` -> `{progress:[{courseId,lessonId,completed}]}`
PUT `/progress` `{style,courseId,lessonId,completed:boolean}` -> `{progress:{courseId,lessonId,completed}}`
POST `/quiz` `{style,courseId,answers:[{lessonId,choice:number}]}` -> `{score:number,total:number}`; correct answers server-only.
GET `/presets?style=slug` -> `{presets:[{id,name,seed,density,color,motion,scene,createdAt}]}`
POST `/presets` `{style,name,seed,density,color,motion:boolean,scene:'particles'|'orb'|'grid'}` -> `{preset}`
DELETE `/presets/:id` -> `{ok:true}`
POST `/inquiries` `{style,alias,projectType,message}` -> `{inquiry:{id,createdAt}}`; stored locally, not emailed.
GET `/inquiries?style=slug` -> `{inquiries:[]}`
GET `/ledger?style=slug` -> `{entries:[{id,kind:'income'|'expense',category,amountCents,note,createdAt}]}`
POST `/ledger` `{style,kind,category,amountCents,note}` -> `{entry}`
DELETE `/ledger/:id` -> `{ok:true}`
GET `/summary?style=slug` -> `{incomeCents,expenseCents,balanceCents,entryCount}`
POST `/classify` `{style,text}` -> `{classification:{id,text,label,scores:[{label,score}],coverage,abstained,reasons,createdAt}}`
GET `/classifications?style=slug` -> `{classifications:[]}`

Validate text lengths, types, integers, entity IDs; bind SQL parameters, scope read/update/delete by workspace. 32KB max request body; reject cross-origin writes and require CSRF; no permissive CORS. Return 400 bad data, 401 no session, 403 bad CSRF, 404 missing/cross-workspace entity, 409 capacity/stock/duplicate conflict. Cookie expiry 7 days; local DB ignored.
