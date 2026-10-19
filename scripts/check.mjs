import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { styles, appNames } from '../public/assets/styles.js';
import { catalogs } from '../server/catalog.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicDir = path.join(root, 'public');
export const applicationIds = ['commerce', 'booking', 'events', 'tasks', 'journal', 'learning', 'studio', 'analytics', 'ai'];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesIn(path.join(directory, entry.name))
    : path.join(directory, entry.name)));
  return nested.flat().sort();
}

export function checkManifest() {
  assert.equal(styles.length, 49, 'The gallery must expose all 49 promised styles.');
  assert.equal(new Set(styles.map(style => style.slug)).size, styles.length, 'Style URLs must be unique.');
  assert.equal(new Set(styles.map(style => style.id)).size, styles.length, 'Style IDs must be unique.');
  assert.deepEqual(Object.keys(appNames).sort(), [...applicationIds].sort(), 'All nine application workflows need labels.');
  assert.deepEqual([...new Set(styles.map(style => style.app))].sort(), [...applicationIds].sort(), 'Every application workflow must have a demo.');
  const palettes = new Set();
  for (const style of styles) {
    assert.match(style.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `Unsafe style URL: ${style.slug}`);
    assert.ok(Number.isSafeInteger(style.id) && style.id > 0, `${style.slug}: invalid ID.`);
    for (const field of ['name', 'group', 'brand', 'headline', 'description']) {
      assert.ok(typeof style[field] === 'string' && style[field].trim(), `${style.slug}: missing ${field}.`);
    }
    assert.ok(applicationIds.includes(style.app), `${style.slug}: unknown application.`);
    assert.equal(style.colors.length, 3, `${style.slug}: provide background, text, and accent colors.`);
    for (const color of style.colors) assert.match(color, /^#[\da-f]{6}$/i, `${style.slug}: invalid palette color.`);
    assert.equal(new Set(style.colors.map(color => color.toLowerCase())).size, 3, `${style.slug}: palette colors must differ.`);
    palettes.add(style.colors.map(color => color.toLowerCase()).join(','));
  }
  assert.equal(palettes.size, styles.length, 'Each style should have its own palette.');
  return styles.length;
}

export async function checkApplications() {
  for (const name of applicationIds) {
    const moduleURL = pathToFileURL(path.join(publicDir, 'assets', 'apps', `${name}.js`));
    const application = await import(moduleURL.href);
    assert.equal(typeof application.mount, 'function', `${name}: missing mount export.`);
    assert.ok((await readFile(path.join(publicDir, 'assets', 'apps', `${name}.css`), 'utf8')).trim(), `${name}: missing stylesheet.`);
  }
  return applicationIds.length;
}

// HTML in this project is generated from controlled strings; these attributes cover
// its links, stylesheets, scripts, images, and other local asset references.
export function localReferences(html, documentURL) {
  return [...html.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi)]
    .map(match => match[2])
    .filter(value => value && !value.startsWith('#') && !/^(?:https?:|data:|blob:|mailto:|tel:|\/\/)/i.test(value))
    .map(value => new URL(value, documentURL));
}

async function assertPublicFile(url, context) {
  assert.equal(url.protocol, 'file:', `${context}: unexpected local asset protocol.`);
  let filename = fileURLToPath(url);
  const relative = path.relative(publicDir, filename);
  assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), `${context}: link leaves public directory.`);
  let info;
  try {
    info = await stat(filename);
    if (info.isDirectory()) {
      filename = path.join(filename, 'index.html');
      info = await stat(filename);
    }
  } catch (cause) {
    throw new Error(`${context}: missing local asset ${filename}`, { cause });
  }
  assert.ok(info.isFile() && info.size > 0, `${context}: empty or invalid asset ${filename}`);
}

export async function checkBuiltPages() {
  const htmlFiles = (await filesIn(publicDir)).filter(filename => filename.endsWith('.html'));
  assert.equal(htmlFiles.length, styles.length + 1, 'Build must contain one gallery and exactly 49 style pages.');
  for (const style of styles) {
    const filename = path.join(publicDir, 'demos', style.slug, 'index.html');
    const html = await readFile(filename, 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/i, `${style.slug}: missing page title.`);
    assert.ok(html.includes(`data-style="${style.slug}"`) && html.includes(`data-app="${style.app}"`), `${style.slug}: wrong application route.`);
    assert.ok(/<script\b[^>]*type=["']module["'][^>]*src=/i.test(html), `${style.slug}: missing module entry point.`);
    assert.ok(html.includes(`apps/${style.app}.css`), `${style.slug}: missing application CSS.`);
  }
  for (const filename of htmlFiles) {
    const html = await readFile(filename, 'utf8');
    for (const url of localReferences(html, pathToFileURL(filename))) await assertPublicFile(url, filename);
  }
  const cssFiles = (await filesIn(path.join(publicDir, 'assets'))).filter(filename => filename.endsWith('.css'));
  for (const filename of cssFiles) {
    const css = await readFile(filename, 'utf8');
    for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
      const value = match[2];
      if (!value || /^(?:https?:|data:|blob:|#|\/\/)/i.test(value)) continue;
      await assertPublicFile(new URL(value, pathToFileURL(filename)), filename);
    }
  }
  return htmlFiles.length;
}

export function assertNoAnswerKeys(value, location = 'public catalog') {
  if (value === null || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.replace(/[^a-z]/gi, '').toLowerCase();
    assert.ok(!/^(?:quizanswers?|answers?|answerkeys?|correct(?:answer|choice|index)|solution)$/.test(normalized), `${location}.${key}: private quiz answer key exposed.`);
    assertNoAnswerKeys(nested, `${location}.${key}`);
  }
}

export async function checkCatalog() {
  const catalog = JSON.parse(await readFile(path.join(publicDir, 'assets', 'catalog.json'), 'utf8'));
  assertNoAnswerKeys(catalog);
  assert.deepEqual(catalog, catalogs, 'Public read-only catalog is stale. Run npm run build.');
  return Object.keys(catalog).length;
}

export async function checkScripts() {
  const scriptFiles = (await Promise.all(['public', 'server', 'scripts', 'tests'].map(directory => filesIn(path.join(root, directory)))))
    .flat().filter(filename => /\.(?:mjs|js)$/.test(filename));
  for (const filename of scriptFiles) {
    try { execFileSync(process.execPath, ['--check', filename], { encoding: 'utf8', stdio: 'pipe' }); }
    catch (error) { throw new Error(`JavaScript syntax check failed: ${filename}\n${error.stderr || error.message}`, { cause: error }); }
    const source = await readFile(filename, 'utf8');
    const imports = /\b(?:import|export)\s+(?:[\w*{}\s,$]+\s+from\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
    for (const match of source.matchAll(imports)) {
      const specifier = match[1] || match[2];
      if (!specifier.startsWith('.')) continue;
      const imported = new URL(specifier, pathToFileURL(filename));
      let exists = false;
      try { exists = (await stat(fileURLToPath(imported))).isFile(); } catch { /* The assertion provides the importing file. */ }
      assert.ok(exists, `${filename}: missing imported module ${specifier}`);
    }
  }
  return scriptFiles.length;
}

export async function checkAll() {
  const styleCount = checkManifest();
  const applicationCount = await checkApplications();
  const pageCount = await checkBuiltPages();
  const catalogCount = await checkCatalog();
  const scriptCount = await checkScripts();
  return { styleCount, applicationCount, pageCount, catalogCount, scriptCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const counts = await checkAll();
    console.log(`Checks passed: ${counts.styleCount} styles, ${counts.applicationCount} applications, ${counts.pageCount} HTML pages, ${counts.catalogCount} public catalogs, ${counts.scriptCount} JavaScript modules.`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
