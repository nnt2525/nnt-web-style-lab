import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.mjs';
import { catalogs } from '../server/catalog.mjs';
import { styles } from '../public/assets/styles.js';
import { checkManifest, checkApplications, checkBuiltPages, checkCatalog, checkScripts, assertNoAnswerKeys, localReferences, publicDir } from '../scripts/check.mjs';

test('49 unique style URLs and palettes cover all nine application workflows', () => {
  assert.equal(checkManifest(), 49);
});

test('every application has a callable module entry point and a real stylesheet', async () => {
  assert.equal(await checkApplications(), 9);
});

test('generated gallery and demo pages resolve all local asset links', async () => {
  assert.equal(await checkBuiltPages(), 50);
});

test('JavaScript parses and all literal local module imports resolve', async () => {
  assert.ok(await checkScripts() > 0);
});

test('read-only catalog fixture matches public API data without quiz answer keys', async () => {
  assert.equal(await checkCatalog(), Object.keys(catalogs).length);
});

test('every style route serves its own HTML and actual CSS/module assets over HTTP', async t => {
  const app = createApp({ dbPath: ':memory:', publicDir });
  t.after(() => app.close());
  await new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const checkedAssets = new Map();
  async function asset(url) {
    if (!checkedAssets.has(url.href)) checkedAssets.set(url.href, (async () => {
      const response = await fetch(url);
      assert.equal(response.status, 200, `Missing served asset: ${url.pathname}`);
      const content = await response.text();
      assert.ok(content.trim(), `Empty served asset: ${url.pathname}`);
      if (url.pathname.endsWith('.css')) assert.match(response.headers.get('content-type'), /^text\/css\b/);
      if (url.pathname.endsWith('.js')) assert.match(response.headers.get('content-type'), /^text\/javascript\b/);
      return content;
    })());
    return checkedAssets.get(url.href);
  }
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  for (const style of styles) {
    await t.test(style.slug, async () => {
      const url = new URL(`/demos/${style.slug}/`, base);
      const response = await fetch(url);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^text\/html\b/);
      const html = await response.text();
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
      assert.ok(title?.includes(escape(style.name)) && title.includes(escape(style.brand)), `${style.slug}: wrong or missing title.`);
      assert.ok(html.includes(`data-style="${style.slug}"`) && html.includes(`data-app="${style.app}"`), 'A demo must serve its own page, not the gallery fallback.');
      const references = localReferences(html, url);
      assert.ok(references.some(reference => reference.pathname.endsWith(`/apps/${style.app}.css`)), 'Demo must load its application stylesheet.');
      assert.ok(references.some(reference => reference.pathname.endsWith('/app.js')), 'Demo must load the module entry point.');
      for (const reference of references.filter(reference => /\.(?:css|js)$/.test(reference.pathname))) await asset(reference);
      // The app entry loads this module dynamically, so verify the actual route too.
      await asset(new URL(`/assets/apps/${style.app}.js`, base));
    });
  }
  await t.test('gallery and unauthenticated read-only catalog GETs', async () => {
    const gallery = await fetch(base);
    assert.equal(gallery.status, 200);
    assert.match(await gallery.text(), /<title>[^<]*Web Style Lab/);
    const fixture = await fetch(`${base}/assets/catalog.json`);
    assert.equal(fixture.status, 200);
    assert.match(fixture.headers.get('content-type'), /^application\/json\b/);
    assert.equal(fixture.headers.get('set-cookie'), null);
    const publicCatalog = await fixture.json();
    assertNoAnswerKeys(publicCatalog);
    assert.deepEqual(publicCatalog, catalogs);
    for (const name of Object.keys(catalogs)) {
      const response = await fetch(`${base}/api/${name}`);
      assert.equal(response.status, 200);
      const payload = await response.json();
      assertNoAnswerKeys(payload);
      assert.deepEqual(payload[name], publicCatalog[name]);
    }
  });
});
