import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { styles } from '../public/assets/styles.js';
import { catalogs } from '../server/catalog.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const style of styles){
  const directory=path.join(root,'public','demos',style.slug);
  await mkdir(directory,{recursive:true});
  const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(style.brand)} / ${escape(style.name)} — NNT_DEV</title><meta name="description" content="${escape(style.description)} A functional portfolio demonstration by NNT_DEV."><link rel="stylesheet" href="../../assets/base.css"><link rel="stylesheet" href="../../assets/themes.css"><link rel="stylesheet" href="../../assets/apps/${style.app}.css"><script type="module" src="../../assets/app.js"></script></head>
<body data-style="${style.slug}" data-app="${style.app}"><a class="skip" href="#app">Skip to content</a><div class="demo-toolbar"><a href="../../">NNT_DEV <span>/ STYLE LAB</span></a><span>${escape(style.name)}</span><div><span id="runtime-status">Connecting…</span><a href="https://github.com/nnt2525/nnt-web-style-lab">Code ↗</a></div></div><div id="runtime-banner" role="status"></div><main id="app"><p class="loading-message">Opening ${escape(style.brand)}…</p></main><footer class="demo-footer"><span>A fictional demonstration · ${escape(style.name)}</span><a href="../../">Explore all 49 styles ↗</a></footer><div id="toast" role="status" aria-live="polite"></div></body></html>
`;
  await writeFile(path.join(directory,'index.html'),html,'utf8');
}
await writeFile(path.join(root,'public/assets/catalog.json'),JSON.stringify(catalogs,null,2)+'\n','utf8');
const themeCSS=styles.map(style=>`body[data-style="${style.slug}"]{--bg:${style.colors[0]};--ink:${style.colors[1]};--accent:${style.colors[2]};--surface:color-mix(in srgb,var(--bg) 91%,var(--ink));--line:color-mix(in srgb,var(--ink) 22%,var(--bg));--muted:color-mix(in srgb,var(--ink) 76%,var(--bg))}`).join('\n');
await writeFile(path.join(root,'public/assets/palettes.css'),themeCSS+'\n','utf8');
console.log(`Built ${styles.length} style routes, palette definitions, and read-only catalog fixtures.`);
