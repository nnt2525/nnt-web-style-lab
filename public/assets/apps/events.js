const currency = cents => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(cents / 100);
const eventDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }); };
function poster(el, index) {
  const node = el('div', `events-poster events-poster-${index % 4}`); node.setAttribute('aria-hidden', 'true');
  const shapes = [
    '<g fill="none" stroke="currentColor" stroke-width="1.2"><ellipse cx="200" cy="160" rx="125" ry="125"/><ellipse cx="200" cy="160" rx="98" ry="125"/><ellipse cx="200" cy="160" rx="65" ry="125"/><ellipse cx="200" cy="160" rx="25" ry="125"/><ellipse cx="200" cy="160" rx="125" ry="98"/><ellipse cx="200" cy="160" rx="125" ry="65"/><ellipse cx="200" cy="160" rx="125" ry="25"/></g>',
    '<g fill="none" stroke="currentColor" stroke-width="12"><path d="m50 160 100-100 100 100-100 100z"/><path d="m150 160 100-100 100 100-100 100z"/></g><circle cx="200" cy="160" r="30" fill="currentColor"/>',
    '<g fill="currentColor"><path d="M200 22 222 114 288 48 258 138 350 116 275 174 363 210 266 209 304 295 233 235 210 322 188 230 114 295 146 208 50 223 128 166 38 126 139 132 101 46 174 107z"/></g><circle cx="200" cy="173" r="37" fill="#181722"/>',
    '<g fill="none" stroke="currentColor" stroke-width="2"><path d="M20 265 200 45 380 265zM43 265 200 70 357 265zM67 265 200 96 333 265zM92 265 200 123 308 265zM119 265 200 151 281 265zM147 265 200 180 253 265z"/><path d="M0 284h400M0 303h400M0 322h400"/></g>'
  ];
  node.innerHTML = `<svg viewBox="0 0 400 340" focusable="false">${shapes[index % shapes.length]}</svg>`;
  return node;
}

export async function mount(root, style, ctx) {
  const { el, api, notify } = ctx;
  const page = el('div', 'app-events'); root.replaceChildren(page);
  let events = [], reservations = [], category = 'ALL', selectedId = null, busy = false;
  const nav = el('header', 'events-nav');
  const brand = el('a', 'events-brand'); brand.href = '#'; brand.append(el('span', 'events-brand-symbol', '✳'), el('span', '', style.brand || 'AFTERHOURS')); brand.addEventListener('click', e => { e.preventDefault(); page.scrollIntoView({ behavior: 'smooth' }); });
  const links = el('nav', 'events-nav-links'); links.setAttribute('aria-label', 'Events navigation');
  const lineupLink = el('a', '', 'THE PROGRAM'); lineupLink.href = '#program'; const passes = el('a', 'events-pass-link', 'MY PASSES ↗'); passes.href = '#my-passes'; links.append(lineupLink, passes); nav.append(brand, links); page.append(nav);
  const hero = el('section', 'events-hero');
  const top = el('div', 'events-hero-top'); top.append(el('span', '', 'INDEPENDENT CULTURE / COLLECTIVE ENERGY'), el('span', 'events-live', '● DEMO SEASON 2026')); hero.append(top);
  const heroMain = el('div', 'events-hero-main');
  const text = el('div', 'events-hero-copy'); text.append(el('p', 'events-issue', 'TURN UP. TUNE IN. GO BEYOND.'), el('h1', '', style.headline || 'MEET YOU ON THE OTHER SIDE.'), el('p', 'events-hero-description', style.description || 'New sounds. Fresh perspectives. Unforgettable nights. Find your people in the program.'));
  const browse = el('a', 'events-cta', 'EXPLORE THE PROGRAM ↘'); browse.href = '#program'; text.append(browse);
  const sculpture = el('div', 'events-hero-sculpture'); sculpture.append(poster(el, 0), el('span', 'events-orbit-label', 'GOOD ENERGY / ALL FREQUENCIES WELCOME')); heroMain.append(text, sculpture); hero.append(heroMain);
  const bottom = el('div', 'events-hero-bottom'); bottom.append(el('span', '', 'SOUND / DESIGN / IDEAS / COMMUNITY'), el('span', '', 'FICTIONAL EVENTS. REAL CONNECTION TO THE BACKEND.')); hero.append(bottom); page.append(hero);
  const ticker = el('div', 'events-ticker'); ticker.setAttribute('aria-hidden', 'true'); ticker.textContent = 'SHOW UP FOR SOMETHING DIFFERENT  ✳  FIND YOUR FREQUENCY  ✳  SHOW UP FOR SOMETHING DIFFERENT  ✳  FIND YOUR FREQUENCY  ✳'; page.append(ticker);
  const program = el('section', 'events-program'); program.id = 'program';
  const programHeader = el('div', 'events-section-heading'); const phText = el('div', ''); phText.append(el('p', 'events-eyebrow', '01 / THE PROGRAM'), el('h2', '', 'PICK YOUR FREQUENCY.')); const eventCount = el('span', 'events-count', 'Loading events'); programHeader.append(phText, eventCount);
  const filters = el('div', 'events-filters'); filters.setAttribute('aria-label', 'Filter event categories');
  const grid = el('div', 'events-grid'); grid.setAttribute('aria-live', 'polite'); program.append(programHeader, filters, grid); page.append(program);
  const ticketSection = el('section', 'events-ticket-section'); ticketSection.id = 'reserve-pass';
  const ticketInfo = el('div', 'events-ticket-info'); ticketInfo.append(el('p', 'events-eyebrow', '02 / MAKE IT A PLAN'), el('h2', '', 'YOUR NEXT GOOD STORY STARTS HERE.'), el('p', '', 'Reserve a demo pass and try the complete flow. Ticket prices and availability are checked by the server, and your pass is saved to your workspace.'), el('span', 'events-demo-stamp', 'DEMO ONLY / NO PAYMENT / NO REAL ENTRY'));
  const ticket = el('div', 'events-ticket'); const ticketTop = el('div', 'events-ticket-top'); ticketTop.append(el('span', '', 'ADMIT GOOD ENERGY'), el('span', '', '↗')); const ticketSelected = el('div', 'events-ticket-selected');
  const form = el('form', 'events-form');
  const eventLabel = el('label', '', 'CHOOSE YOUR EVENT'); const eventSelect = el('select', 'field'); eventSelect.name = 'event'; eventSelect.required = true; eventLabel.append(eventSelect);
  const row = el('div', 'events-form-row'); const quantityLabel = el('label', '', 'PASSES'); const quantity = el('input', 'field'); quantity.type = 'number'; quantity.name = 'quantity'; quantity.min = '1'; quantity.max = '10'; quantity.value = '1'; quantity.required = true; quantityLabel.append(quantity);
  const aliasLabel = el('label', '', 'NAME ON RESERVATION'); const alias = el('input', 'field'); alias.name = 'alias'; alias.required = true; alias.maxLength = 60; alias.placeholder = 'Your name'; alias.autocomplete = 'given-name'; aliasLabel.append(alias); row.append(quantityLabel, aliasLabel);
  const total = el('div', 'events-ticket-total'); const submit = el('button', 'events-cta events-submit', 'RESERVE DEMO PASS ↗'); submit.type = 'submit'; submit.disabled = true;
  form.append(eventLabel, row, total, submit, el('p', 'events-form-note', 'Fictional events for a portfolio demo. No payment is collected and no real ticket is issued.'));
  const barcode = el('div', 'events-barcode'); barcode.setAttribute('aria-hidden', 'true'); ticket.append(ticketTop, ticketSelected, form, barcode); ticketSection.append(ticketInfo, ticket); page.append(ticketSection);
  const history = el('section', 'events-history'); history.id = 'my-passes'; const hh = el('div', 'events-section-heading'); const hhtext = el('div', ''); hhtext.append(el('p', 'events-eyebrow', '03 / YOUR SAVED PASSES'), el('h2', '', 'SEE YOU THERE.')); hh.append(hhtext); const historyList = el('div', 'events-reservations'); history.append(hh, historyList); page.append(history);
  const footer = el('footer', 'events-footer'); footer.append(el('strong', '', style.brand || 'AFTERHOURS'), el('span', '', 'A FICTIONAL CULTURE PLATFORM / A REAL FULL-STACK DEMO'), el('span', '', 'STAY CURIOUS. ↗')); page.append(footer);
  function updateTicket() {
    const event = events.find(event => event.id === selectedId); ticketSelected.replaceChildren();
    if (!event) { ticketSelected.append(el('h3', '', 'PICK A FREQUENCY')); submit.disabled = true; total.textContent = ''; return; }
    ticketSelected.append(el('p', 'events-ticket-category', event.category), el('h3', '', event.name), el('p', 'events-ticket-venue', `${eventDate(event.date)} / ${event.venue}`));
    eventSelect.value = String(event.id); quantity.max = String(Math.min(10, event.capacity)); if (Number(quantity.value) > Number(quantity.max)) quantity.value = quantity.max;
    const amount = event.priceCents * Math.max(1, Number(quantity.value) || 1); total.replaceChildren(el('span', '', 'DEMO TOTAL'), el('strong', '', currency(amount))); submit.disabled = busy || event.capacity < 1;
  }
  eventSelect.addEventListener('change', () => { const event = events.find(event => String(event.id) === eventSelect.value); selectedId = event?.id ?? null; updateTicket(); renderEvents(); }); quantity.addEventListener('input', updateTicket);
  function renderEvents() {
    filters.replaceChildren();
    for (const name of ['ALL', ...new Set(events.map(event => event.category))]) {
      const button = el('button', name === category ? 'is-active' : '', name); button.type = 'button'; button.setAttribute('aria-pressed', String(name === category)); button.addEventListener('click', () => { category = name; renderEvents(); }); filters.append(button);
    }
    grid.replaceChildren(); const visible = events.filter(event => category === 'ALL' || event.category === category); eventCount.textContent = `${String(visible.length).padStart(2, '0')} EVENTS IN THE MIX`;
    visible.forEach(event => {
      const index = events.indexOf(event); const card = el('article', `events-event-card${selectedId === event.id ? ' is-selected' : ''}`);
      const visual = el('div', 'events-card-visual'); visual.append(poster(el, index));
      const posterMeta = el('div', 'events-poster-meta'); posterMeta.append(el('span', '', event.category), el('span', '', String(index + 1).padStart(2, '0'))); visual.append(posterMeta);
      const posterName = el('strong', 'events-poster-name', event.name); visual.append(posterName);
      const info = el('div', 'events-card-info'); const dateLine = el('p', 'events-card-date', `${eventDate(event.date)} / ${event.venue}`); info.append(dateLine, el('h3', '', event.name), el('p', 'events-card-description', event.description));
      const action = el('div', 'events-card-action'); action.append(el('span', '', `${currency(event.priceCents)} / PASS`)); const select = el('button', '', event.capacity > 0 ? 'GET PASSES ↗' : 'AT CAPACITY'); select.type = 'button'; select.disabled = event.capacity < 1;
      select.addEventListener('click', () => { selectedId = event.id; updateTicket(); renderEvents(); ticketSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); eventSelect.focus({ preventScroll: true }); }); action.append(select); info.append(action); card.append(visual, info); grid.append(card);
    });
    if (!visible.length) grid.append(el('p', 'events-empty', 'NO EVENTS ON THIS FREQUENCY. TRY ANOTHER FILTER.'));
  }
  function renderHistory() {
    historyList.replaceChildren();
    if (!reservations.length) { historyList.append(el('p', 'events-empty', 'NO PASSES YET. YOUR NEXT GOOD STORY IS UP THERE. ↑')); return; }
    for (const reservation of reservations) {
      const event = events.find(event => event.id === reservation.eventId); const row = el('article', 'events-reservation');
      const icon = el('div', 'events-reservation-icon', '↗'); icon.setAttribute('aria-hidden', 'true'); const info = el('div', 'events-reservation-info'); info.append(el('span', 'events-reservation-ref', reservation.reference || `Pass ${reservation.id}`), el('h3', '', event?.name || 'Saved event'), el('span', '', `${reservation.quantity} ${reservation.quantity === 1 ? 'PASS' : 'PASSES'}${event ? ` / ${eventDate(event.date)}` : ''}`));
      const amount = el('div', 'events-reservation-amount'); amount.append(el('strong', '', currency(reservation.totalCents)), el('span', '', 'DEMO PASS SAVED')); row.append(icon, info, amount); historyList.append(row);
    }
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (busy || selectedId === null) return; busy = true; updateTicket(); submit.textContent = 'SAVING YOUR PASS…';
    try { const result = await api('/reservations', { method: 'POST', body: { style: style.slug, eventId: selectedId, quantity: Number(quantity.value), alias: alias.value.trim() } }); reservations.unshift(result.reservation); renderHistory(); notify(`Demo pass ${result.reservation.reference} saved. No real ticket is issued.`); history.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (error) { notify(error.message, 'error'); }
    finally { busy = false; updateTicket(); submit.textContent = 'RESERVE DEMO PASS ↗'; }
  });
  grid.append(el('p', 'events-empty', 'TUNING IN TO THE PROGRAM…')); updateTicket(); renderHistory();
  async function load() {
    try { const [programData, saved] = await Promise.all([api('/events'), api(`/reservations?style=${encodeURIComponent(style.slug)}`)]); events = programData.events; reservations = saved.reservations; selectedId = events[0]?.id ?? null; eventSelect.replaceChildren(); for (const event of events) { const option = el('option', '', event.name); option.value = String(event.id); eventSelect.append(option); } renderEvents(); updateTicket(); renderHistory(); }
    catch (error) { grid.replaceChildren(el('p', 'events-empty', error.message)); const retry = el('button', 'events-cta', 'RETRY PROGRAM ↗'); retry.type = 'button'; retry.addEventListener('click', load); grid.append(retry); }
  }
  await load();
}
