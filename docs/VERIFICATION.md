# Verification notes

Checked on 19 October 2026 (Asia/Bangkok).

## Automated checks

`node scripts/build.mjs` generates all 49 style routes and the public catalog fixtures.
`node scripts/check.mjs` verifies 49 styles, nine application modules, 50 HTML pages,
five public catalogs, local asset/import resolution, and JavaScript syntax.

`node --test tests/*.test.mjs` passed **74 tests** locally on Node 24.11.1:
18 backend integration tests and 56 frontend/static/HTTP tests, including
the nested checks for every style route and its actual assets.

The backend tests use real HTTP requests and SQLite. They cover trusted order
prices and stock, booking capacity/cancellation, event passes, task CRUD,
bookmarks, lesson progress and quizzes, studio presets/inquiries, ledger totals,
server-side model inference, restart persistence, workspace isolation, CSRF,
same-origin checks, configured HTTPS origins, validation and static path containment.

## Browser checks

The full stack was served on `127.0.0.1:4180`. All nine workflows were opened in
the browser and their primary operations exercised: create an order, create/move
a task, reserve a service, reserve an event pass, complete a lesson and score a
quiz, bookmark a story, classify Thai text through the backend, add ledger rows,
and save a creative preset. The saved order was confirmed after reloading.

All 49 style pages were visited at a 390 × 844 viewport. Their main content
rendered with the API connected. A Glitch heading overflow was corrected and
rechecked; all 49 then fit the document width at that viewport. The gallery was
also checked at that mobile size and at 1440 × 1000, including combined text
search and application filtering. This is a responsive smoke check, not a
complete accessibility certification or cross-browser/device test suite.

## Deployment boundaries

The initial GitHub Actions run passed all checks and deployed successfully:
[verified run](https://github.com/nnt2525/nnt-web-style-lab/actions/runs/39217918975).
The public gallery and a task-workspace route were then opened in the browser.
The route displayed its read-only status, loaded fixtures, and rejected a write
with the documented requirement to run the real backend.

GitHub Pages publishes the frontend and read-only catalog fixtures. A Pages
preview does not run Node or SQLite. Writes display a clear backend requirement;
the canvas controls, article reader and lesson reader remain usable locally in
the browser. Full write workflows require the Node server.

Docker configuration is provided for a persistent-disk environment; its runtime
has not been verified here. The repository does not include a paid hosting
subscription, payment processor, outbound email service or authenticated user
account system. All records and brands are fictional demonstration material.
