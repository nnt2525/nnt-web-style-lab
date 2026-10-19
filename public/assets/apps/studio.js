function seededRandom(seed) { let value = seed >>> 0; return () => { value += 0x6D2B79F5; let n = Math.imul(value ^ value >>> 15, 1 | value); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }
const isHex = value => /^#[0-9a-f]{6}$/i.test(value);

export async function mount(root, style, ctx) {
  const { el, api, notify } = ctx;
  const page = el('div', 'app-studio'); root.replaceChildren(page);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initialScene = ['three-d-interactive', 'spatial-ui', 'cinematic'].includes(style.slug) ? 'orb' : style.slug === 'kinetic-grid' ? 'grid' : 'particles';
  const state = { seed: 1729, density: 140, color: isHex(style.colors?.[2] || '') ? style.colors[2] : '#7b85c5', motion: !reducedMotion, scene: initialScene };
  let presets = [], frameId = 0, phase = 0, previousTime = 0, visible = true, destroyed = false, points = [], width = 700, height = 480, yaw = -28, pitch = -18;
  const controller = new AbortController();
  const nav = el('header', 'studio-nav'); const brand = el('a', 'studio-brand', style.brand || 'FIELD'); brand.href = '#'; brand.addEventListener('click', e => { e.preventDefault(); page.scrollIntoView({ behavior: 'smooth' }); });
  const navLinks = el('nav', 'studio-nav-links'); navLinks.setAttribute('aria-label', 'Studio navigation');
  for (const [text, id] of [['PLAYGROUND', 'playground'], ['SAVED STUDIES', 'saved-studies'], ['SAY HELLO ↗', 'studio-inquiry']]) { const link = el('a', '', text); link.href = `#${id}`; navLinks.append(link); } nav.append(brand, navLinks); page.append(nav);
  const intro = el('section', 'studio-intro'); const introCopy = el('div', ''); introCopy.append(el('p', 'studio-eyebrow', 'AN INTERACTIVE EXPLORATION / VOL. 01'), el('h1', '', style.headline || 'Order from randomness.'));
  const introAside = el('div', 'studio-intro-aside'); introAside.append(el('p', '', style.description || 'A living canvas, shaped by a few simple rules. Make something unexpected.'), el('span', 'studio-medium', 'CODE AS A CREATIVE MEDIUM')); intro.append(introCopy, introAside); page.append(intro);
  const workbench = el('section', 'studio-workbench'); workbench.id = 'playground';
  const stageWrap = el('div', 'studio-stage-wrap'); const stage = el('div', 'studio-stage'); stage.dataset.scene = state.scene;
  const canvas = el('canvas', 'studio-canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Interactive seeded generative composition. Use the adjacent controls to change its scene, colour and density.'); stage.append(canvas);
  const cssSpace = el('div', 'studio-css-space'); cssSpace.setAttribute('aria-hidden', 'true'); const cube = el('div', 'studio-cube');
  for (const [face, text] of [['front', '01'], ['back', '02'], ['right', '03'], ['left', '04'], ['top', '05'], ['bottom', '06']]) { const node = el('div', `studio-cube-face studio-face-${face}`); node.append(el('span', 'studio-face-number', text), el('span', 'studio-face-mark', '✳')); cube.append(node); }
  cssSpace.append(cube, el('div', 'studio-cube-shadow')); stage.append(cssSpace);
  const stageTop = el('div', 'studio-stage-top'); const stateText = el('span', 'studio-state-text'); stageTop.append(el('span', '', 'LIVE STUDY / 001'), stateText); stage.append(stageTop);
  const stageBottom = el('div', 'studio-stage-bottom'); const sceneText = el('span', ''); const pause = el('button', 'studio-pause'); pause.type = 'button'; stageBottom.append(sceneText, pause); stage.append(stageBottom); stageWrap.append(stage);
  const annotation = el('div', 'studio-stage-annotation'); annotation.append(el('span', '', '01 / A SMALL SYSTEM. ENDLESS POSSIBILITIES.'), el('span', 'studio-medium-label', 'CANVAS 2D + CSS 3D / NO WEBGL')); stageWrap.append(annotation);
  const controls = el('aside', 'studio-control-panel'); controls.append(el('p', 'studio-eyebrow', 'THE INSTRUMENTS'), el('h2', '', 'Make it yours.'));
  const controlsForm = el('form', 'studio-controls'); controlsForm.addEventListener('submit', e => e.preventDefault());
  function field(text, input) { const label = el('label', 'studio-label', text); label.append(input); return label; }
  const sceneSelect = el('select', 'field'); sceneSelect.name = 'scene'; for (const [value, text] of [['particles', '01 · Particle field'], ['orb', '02 · Spatial object'], ['grid', '03 · Woven grid']]) { const option = el('option', '', text); option.value = value; sceneSelect.append(option); } sceneSelect.value = state.scene;
  const density = el('input', 'studio-range'); density.type = 'range'; density.name = 'density'; density.min = '10'; density.max = '500'; density.value = String(state.density); const densityLabel = el('div', 'studio-range-heading'); const densityOutput = el('output', '', String(state.density)); densityOutput.htmlFor = 'studio-density'; density.id = 'studio-density'; densityLabel.append(el('span', '', 'Complexity'), densityOutput); const densityField = field('', density); densityField.prepend(densityLabel);
  const color = el('input', 'studio-color-input'); color.type = 'color'; color.name = 'color'; color.value = state.color; const colorRow = el('div', 'studio-color-row'); const colorText = el('span', '', state.color.toUpperCase()); colorRow.append(color, colorText); const colorLabel = field('Accent colour', colorRow);
  const seed = el('input', 'field'); seed.type = 'number'; seed.name = 'seed'; seed.min = '0'; seed.max = '4294967295'; seed.step = '1'; seed.value = String(state.seed);
  const seedRow = el('div', 'studio-seed-row'); const seedLabel = field('Random seed', seed); const remix = el('button', 'studio-remix', '↻'); remix.type = 'button'; remix.setAttribute('aria-label', 'Generate a new random seed'); seedRow.append(seedLabel, remix);
  const rotation = el('div', 'studio-rotation'); rotation.append(el('p', 'studio-subtitle', 'ROTATION / OR DRAG THE OBJECT'));
  const yawInput = el('input', 'studio-range'); yawInput.type = 'range'; yawInput.min = '-180'; yawInput.max = '180'; yawInput.value = String(yaw); yawInput.name = 'horizontal-rotation';
  const pitchInput = el('input', 'studio-range'); pitchInput.type = 'range'; pitchInput.min = '-85'; pitchInput.max = '85'; pitchInput.value = String(pitch); pitchInput.name = 'vertical-rotation'; rotation.append(field('Horizontal angle', yawInput), field('Vertical angle', pitchInput));
  const motionLabel = el('label', 'studio-motion-label'); const motion = el('input', ''); motion.type = 'checkbox'; motion.name = 'motion'; motion.checked = state.motion; motionLabel.append(motion, el('span', '', 'Gentle motion'));
  controlsForm.append(field('Composition', sceneSelect), densityField, colorLabel, seedRow, rotation, motionLabel); controls.append(controlsForm);
  const saveForm = el('form', 'studio-save-form'); const name = el('input', 'field'); name.name = 'name'; name.maxLength = 60; name.required = true; name.placeholder = 'e.g. Monday atmosphere'; const save = el('button', 'btn studio-save', 'Save this study ↗'); save.type = 'submit'; saveForm.append(field('Name your preset', name), save, el('p', 'studio-save-note', ctx.mode === 'preview' ? 'Live controls work here. Saving requires the Node + SQLite backend.' : 'Saved to your browser workspace in SQLite.')); controls.append(saveForm); workbench.append(stageWrap, controls); page.append(workbench);
  const chapters = el('section', 'studio-chapters'); chapters.setAttribute('aria-label', 'Three chapters of an unfolding visual story');
  const chapterData = [['I', 'A point of departure.', 'Everything begins with a small possibility. A single seed becomes an entire field of relationships.', 'particles'], ['II', 'A different perspective.', 'Move around an idea. What appeared flat reveals another face, another way to see.', 'orb'], ['III', 'A pattern emerges.', 'Structure gives the unexpected a place to land. Change the rules, then watch a new story unfold.', 'grid']];
  for (const [number, title, text, scene] of chapterData) { const chapter = el('article', 'studio-chapter'); chapter.dataset.scene = scene; chapter.append(el('span', 'studio-chapter-number', number), el('h2', '', title), el('p', '', text)); chapters.append(chapter); } page.append(chapters);
  const savedSection = el('section', 'studio-saved'); savedSection.id = 'saved-studies'; const savedHeader = el('div', 'studio-section-heading'); savedHeader.append(el('div', '', '02 / THE ARCHIVE'), el('h2', '', 'Keep the good experiments.')); const savedList = el('div', 'preset-grid'); savedList.setAttribute('aria-live', 'polite'); savedSection.append(savedHeader, savedList); page.append(savedSection);
  const inquirySection = el('section', 'studio-inquiry'); inquirySection.id = 'studio-inquiry'; const inquiryIntro = el('div', 'studio-inquiry-intro'); inquiryIntro.append(el('p', 'studio-eyebrow', '03 / START A CONVERSATION'), el('h2', '', 'Have something in mind?'), el('p', '', 'Try the project brief workflow. This demo stores your message in the local database; it does not send an email or contact anyone.'));
  const inquiryForm = el('form', 'studio-inquiry-form'); const alias = el('input', 'field'); alias.name = 'alias'; alias.required = true; alias.maxLength = 60; alias.placeholder = 'Your name'; const projectType = el('select', 'field'); projectType.name = 'projectType'; for (const text of ['Interactive website', 'Creative direction', 'Data visualisation', 'Applied AI prototype', 'Something unexpected']) { const option = el('option', '', text); option.value = text; projectType.append(option); } const message = el('textarea', 'field'); message.name = 'message'; message.required = true; message.minLength = 10; message.maxLength = 2000; message.rows = 4; message.placeholder = 'Tell us about the idea (at least 10 characters)…'; const inquiryRow = el('div', 'studio-inquiry-row'); inquiryRow.append(field('Your name', alias), field('Project type', projectType)); const inquirySubmit = el('button', 'btn', 'Store demo brief ↗'); inquirySubmit.type = 'submit'; inquiryForm.append(inquiryRow, field('The idea', message), inquirySubmit); inquirySection.append(inquiryIntro, inquiryForm); page.append(inquirySection);
  const footer = el('footer', 'studio-footer'); footer.append(el('strong', '', style.brand || 'FIELD'), el('span', '', 'SMALL RULES. NEW POSSIBILITIES.'), el('span', '', 'An original code-drawn experiment.')); page.append(footer);
  const context = canvas.getContext('2d');
  if (!context) { canvas.replaceWith(el('p', 'studio-canvas-fallback', 'Canvas is unavailable in this browser. Try the spatial object scene and its rotation controls.')); }
  function regenerate() {
    const random = seededRandom(state.seed); points = Array.from({ length: state.density }, (_, i) => ({ x: random(), y: random(), radius: 1 + random() * 3.2, phase: random() * Math.PI * 2, depth: random(), i })); phase = 0;
  }
  function render() {
    if (destroyed) return;
    if (context) {
      context.clearRect(0, 0, width, height); context.strokeStyle = state.color; context.fillStyle = state.color;
      if (state.scene === 'grid') {
        const columns = Math.max(5, Math.round(Math.sqrt(state.density) * 1.5)), rows = Math.max(5, Math.round(Math.sqrt(state.density)));
        context.lineWidth = .8;
        const point = (x, y) => { const px = width * .07 + x / columns * width * .86; const py = height * .16 + y / rows * height * .68; const wave = Math.sin(x * .55 + y * .32 + phase) * Math.cos(x * .18 - y * .3 + state.seed % 100) * 22; return [px, py + wave]; };
        context.globalAlpha = .55;
        for (let y = 0; y <= rows; y++) { context.beginPath(); for (let x = 0; x <= columns; x++) { const p = point(x, y); x ? context.lineTo(...p) : context.moveTo(...p); } context.stroke(); }
        for (let x = 0; x <= columns; x++) { context.beginPath(); for (let y = 0; y <= rows; y++) { const p = point(x, y); y ? context.lineTo(...p) : context.moveTo(...p); } context.stroke(); }
        context.globalAlpha = .9; for (let i = 0; i < Math.min(16, points.length); i++) { const p = point(Math.floor(points[i].x * columns), Math.floor(points[i].y * rows)); context.beginPath(); context.arc(...p, 2.5, 0, Math.PI * 2); context.fill(); }
      } else {
        const coords = points.map(p => ({ x: p.x * width + Math.sin(phase * .55 + p.phase) * 14, y: p.y * height + Math.cos(phase * .35 + p.phase) * 14 }));
        context.lineWidth = .7;
        for (let i = 0; i < points.length; i++) {
          const p = points[i], pos = coords[i]; context.globalAlpha = state.scene === 'orb' ? .18 : .25 + p.depth * .65;
          context.beginPath(); context.arc(pos.x, pos.y, state.scene === 'orb' ? p.radius * .45 : p.radius, 0, Math.PI * 2); context.fill();
          if (state.scene === 'particles' && i + 1 < points.length) { const next = coords[i + 1]; const distance = Math.hypot(pos.x - next.x, pos.y - next.y); if (distance < Math.min(width, height) * .28) { context.globalAlpha = .18; context.beginPath(); context.moveTo(pos.x, pos.y); context.lineTo(next.x, next.y); context.stroke(); } }
        }
        if (state.scene === 'orb') { context.globalAlpha = .2; context.lineWidth = 1; context.beginPath(); context.ellipse(width / 2, height / 2, Math.min(width, height) * .35, Math.min(width, height) * .13, -.35, 0, Math.PI * 2); context.stroke(); }
      }
      context.globalAlpha = 1;
    }
    cube.style.transform = `rotateX(${pitch}deg) rotateY(${yaw + (state.motion ? Math.sin(phase * .3) * 12 : 0)}deg)`;
  }
  function animate(now) { frameId = 0; if (destroyed || !state.motion || !visible || document.hidden || !page.isConnected) return; if (previousTime) phase += Math.min(now - previousTime, 80) * .00035; previousTime = now; render(); frameId = requestAnimationFrame(animate); }
  function schedule() { if (frameId) cancelAnimationFrame(frameId); frameId = 0; previousTime = 0; render(); if (state.motion && visible && !document.hidden && !destroyed) frameId = requestAnimationFrame(animate); }
  function sync() {
    stage.dataset.scene = state.scene; stage.style.setProperty('--studio-color', state.color); sceneSelect.value = state.scene; density.value = String(state.density); densityOutput.value = String(state.density); color.value = state.color; colorText.textContent = state.color.toUpperCase(); seed.value = String(state.seed); motion.checked = state.motion; rotation.hidden = state.scene !== 'orb'; cssSpace.hidden = state.scene !== 'orb';
    stateText.textContent = state.motion ? '● IN GENTLE MOTION' : '○ STILL FRAME'; sceneText.textContent = `${state.scene === 'orb' ? 'CSS 3D OBJECT · DRAG TO ROTATE' : state.scene === 'grid' ? 'SEEDED CANVAS WIREFRAME' : 'SEEDED CANVAS PARTICLES'} / SEED ${state.seed}`; pause.textContent = state.motion ? 'Ⅱ Pause' : '▷ Play'; pause.setAttribute('aria-pressed', String(!state.motion)); schedule();
  }
  function resize() { if (destroyed) return; const rect = stage.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height); const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); context?.setTransform(ratio, 0, 0, ratio, 0, 0); render(); }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: 0 }); visibilityObserver.observe(stage);
  document.addEventListener('visibilitychange', schedule, { signal: controller.signal });
  sceneSelect.addEventListener('change', () => { state.scene = sceneSelect.value; sync(); }); density.addEventListener('input', () => { state.density = Number(density.value); regenerate(); sync(); }); color.addEventListener('input', () => { state.color = color.value; sync(); }); seed.addEventListener('change', () => { if (!seed.checkValidity()) { seed.reportValidity(); return; } state.seed = Number(seed.value); regenerate(); sync(); });
  remix.addEventListener('click', () => { const numbers = new Uint32Array(1); crypto.getRandomValues(numbers); state.seed = numbers[0]; regenerate(); sync(); });
  motion.addEventListener('change', () => { state.motion = motion.checked; sync(); }); pause.addEventListener('click', () => { state.motion = !state.motion; sync(); });
  yawInput.addEventListener('input', () => { yaw = Number(yawInput.value); render(); }); pitchInput.addEventListener('input', () => { pitch = Number(pitchInput.value); render(); });
  let drag = null;
  cssSpace.addEventListener('pointerdown', event => { drag = { x: event.clientX, y: event.clientY, yaw, pitch }; cssSpace.setPointerCapture(event.pointerId); cssSpace.classList.add('is-dragging'); });
  cssSpace.addEventListener('pointermove', event => { if (!drag) return; yaw = Math.max(-180, Math.min(180, drag.yaw + (event.clientX - drag.x) * .5)); pitch = Math.max(-85, Math.min(85, drag.pitch - (event.clientY - drag.y) * .4)); yawInput.value = String(yaw); pitchInput.value = String(pitch); render(); });
  const endDrag = () => { drag = null; cssSpace.classList.remove('is-dragging'); }; cssSpace.addEventListener('pointerup', endDrag); cssSpace.addEventListener('pointercancel', endDrag);
  let chapterObserver;
  if (style.slug === 'cinematic') { chapterObserver = new IntersectionObserver(entries => { const active = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (!active) return; chapters.querySelectorAll('.studio-chapter').forEach(node => node.classList.toggle('is-active', node === active.target)); state.scene = active.target.dataset.scene; sync(); }, { threshold: [.2, .5, .8] }); chapters.querySelectorAll('.studio-chapter').forEach(node => chapterObserver.observe(node)); }
  function renderPresets() {
    savedList.replaceChildren();
    if (!presets.length) { const empty = el('div', 'studio-preset-empty'); empty.append(el('span', '', '◌'), el('p', '', 'Your next favourite experiment starts above.'), el('span', '', 'Give your study a name and save its recipe.')); savedList.append(empty); return; }
    for (const preset of presets) {
      const card = el('article', 'studio-preset'); const thumb = el('div', `studio-preset-thumbnail studio-thumb-${preset.scene}`); thumb.style.setProperty('--preset-color', preset.color); const symbol = preset.scene === 'orb' ? '◇' : preset.scene === 'grid' ? '▦' : '✳'; thumb.append(el('span', '', symbol), el('span', 'studio-preset-seed', String(preset.seed))); const cardBody = el('div', 'studio-preset-body'); cardBody.append(el('h3', '', preset.name), el('p', '', `${preset.scene} / ${preset.density} elements / ${preset.motion ? 'motion' : 'still'}`)); const actions = el('div', 'studio-preset-actions'); const load = el('button', '', 'Load study ↗'); load.type = 'button'; const remove = el('button', '', 'Delete'); remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${preset.name}`);
      load.addEventListener('click', () => { Object.assign(state, { seed: preset.seed, density: preset.density, color: preset.color, motion: reducedMotion ? false : preset.motion, scene: preset.scene }); regenerate(); sync(); stage.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }); notify(`Loaded “${preset.name}”.`); });
      remove.addEventListener('click', async () => { remove.disabled = true; try { await api(`/presets/${encodeURIComponent(preset.id)}`, { method: 'DELETE' }); presets = presets.filter(item => item.id !== preset.id); renderPresets(); notify('Demo preset deleted.'); } catch (error) { notify(error.message, 'error'); remove.disabled = false; } }); actions.append(load, remove); cardBody.append(actions); card.append(thumb, cardBody); savedList.append(card);
    }
  }
  saveForm.addEventListener('submit', async event => { event.preventDefault(); save.disabled = true; save.textContent = 'Saving study…'; try { const result = await api('/presets', { method: 'POST', body: { style: style.slug, name: name.value.trim(), ...state } }); presets.unshift(result.preset); renderPresets(); name.value = ''; notify('Study saved to SQLite.'); } catch (error) { notify(error.message, 'error'); } finally { save.disabled = false; save.textContent = 'Save this study ↗'; } });
  inquiryForm.addEventListener('submit', async event => { event.preventDefault(); inquirySubmit.disabled = true; inquirySubmit.textContent = 'Storing brief…'; try { await api('/inquiries', { method: 'POST', body: { style: style.slug, alias: alias.value.trim(), projectType: projectType.value, message: message.value.trim() } }); notify('Demo brief stored in SQLite. No email was sent.'); inquiryForm.reset(); } catch (error) { notify(error.message, 'error'); } finally { inquirySubmit.disabled = false; inquirySubmit.textContent = 'Store demo brief ↗'; } });
  function cleanup() { destroyed = true; if (frameId) cancelAnimationFrame(frameId); resizeObserver.disconnect(); visibilityObserver.disconnect(); chapterObserver?.disconnect(); controller.abort(); }
  window.addEventListener('pagehide', event => {
    if (event.persisted) { if (frameId) cancelAnimationFrame(frameId); frameId = null; }
    else cleanup();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) { resize(); schedule(); } }, { signal: controller.signal });
  regenerate(); resize(); sync(); savedList.append(el('p', 'studio-loading', 'Opening your archive…'));
  async function loadSaved() { try { const result = await api(`/presets?style=${encodeURIComponent(style.slug)}`); presets = result.presets; renderPresets(); } catch (error) { savedList.replaceChildren(el('p', 'studio-loading', error.message)); const retry = el('button', 'btn btn-secondary', 'Retry archive'); retry.type = 'button'; retry.addEventListener('click', loadSaved); savedList.append(retry); } }
  await loadSaved();
}
