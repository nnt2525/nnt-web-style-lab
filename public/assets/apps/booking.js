const price = cents => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(cents / 100);
function localDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}-${parts.find(part => part.type === 'day').value}`;
}
function landscape(el) {
  const node = el('div', 'booking-landscape'); node.setAttribute('aria-hidden', 'true');
  node.innerHTML = '<svg viewBox="0 0 800 740" preserveAspectRatio="xMidYMid slice" focusable="false"><defs><linearGradient id="booking-sky" x2="0" y2="1"><stop stop-color="#eee6c9"/><stop offset="1" stop-color="#d6d9b6"/></linearGradient><linearGradient id="booking-water" x2="0" y2="1"><stop stop-color="#8fa69a"/><stop offset="1" stop-color="#bcc3a3"/></linearGradient></defs><rect width="800" height="740" fill="url(#booking-sky)"/><circle cx="600" cy="150" r="66" fill="#f7f0d6"/><path d="M-90 440Q90 50 280 300T840 280V740H0" fill="#aeb99b"/><path d="M-70 490Q170 190 380 375T900 410V740H0" fill="#778e72"/><path d="M250 500q190-105 550-40v280H250z" fill="url(#booking-water)"/><path d="M-40 510Q150 410 330 560t470 160v50H0" fill="#546f55"/><path d="M0 615q200-130 370 125H0" fill="#3e5b46"/><path d="M330 740q40-85-20-170t90-112" fill="none" stroke="#d2c8a4" stroke-width="28"/><g fill="#f2e8c8"><path d="M485 432v-85h144v85z"/><path d="m468 349 92-69 88 69z"/></g><path d="m468 349 92-69 88 69" fill="none" stroke="#715b42" stroke-width="9"/><rect x="544" y="379" width="29" height="53" fill="#6c775b"/><path d="M501 375h23v22h-23zm91 0h23v22h-23z" fill="#9caa86"/><g stroke="#425e47" stroke-width="11"><path d="M123 520V280m-3 67-31-32m35 91 35-32M704 500V246m0 72 33-33m-33 92-35-39"/></g><g fill="#607953"><ellipse cx="122" cy="282" rx="56" ry="85"/><ellipse cx="704" cy="245" rx="49" ry="80"/></g><g stroke="#e2dfbd" stroke-width="2" opacity=".5"><path d="M451 522h140m28 35h138m-310 32h104m-4 37h191"/></g><g fill="#c3bc91"><circle cx="83" cy="643" r="5"/><circle cx="142" cy="670" r="4"/><circle cx="188" cy="635" r="5"/><circle cx="82" cy="697" r="4"/></g></svg>';
  return node;
}

export async function mount(root, style, ctx) {
  const { el, api, notify } = ctx;
  const page = el('div', 'app-booking'); root.replaceChildren(page);
  let services = [], bookings = [], selectedId = null, busy = false;
  const nav = el('header', 'booking-nav');
  const brand = el('a', 'booking-brand', style.brand || 'elsewhere'); brand.href = '#'; brand.addEventListener('click', e => { e.preventDefault(); page.scrollIntoView({ behavior: 'smooth' }); });
  const rightNav = el('nav', 'booking-nav-links'); rightNav.setAttribute('aria-label', 'Booking navigation');
  const experienceLink = el('a', '', 'Experiences'); experienceLink.href = '#experiences';
  const reservationsLink = el('a', '', 'My reservations ↗'); reservationsLink.href = '#my-reservations'; rightNav.append(experienceLink, reservationsLink); nav.append(brand, rightNav); page.append(nav);
  const hero = el('section', 'booking-hero'); const heroCopy = el('div', 'booking-hero-copy');
  const location = el('p', 'booking-location', '⟡ A SLOWER KIND OF SOMEWHERE');
  heroCopy.append(location, el('h1', '', style.headline || 'Find your little elsewhere.'), el('p', 'booking-intro', style.description || 'Step out of the everyday. Thoughtful stays, gentle adventures, and time well spent.'), el('p', 'booking-hero-note', 'Quiet mornings. Open skies. Room to breathe.'));
  const explore = el('a', 'btn booking-explore', 'Find your experience ↓'); explore.href = '#experiences'; heroCopy.append(explore);
  const visual = el('div', 'booking-hero-visual'); visual.append(landscape(el));
  const caption = el('div', 'booking-image-caption'); caption.append(el('span', '', 'A place to pause'), el('span', '', '18°47′ N / 98°59′ E')); visual.append(caption); hero.append(heroCopy, visual); page.append(hero);
  const intro = el('div', 'booking-intro-line'); intro.append(el('span', 'booking-star', '✳'), el('p', '', 'Come for a moment. Leave with a memory.'), el('span', '', 'FICTIONAL DESTINATION / REAL BOOKING DEMO')); page.append(intro);
  const content = el('section', 'booking-content'); content.id = 'experiences';
  const catalogue = el('div', 'booking-catalogue'); catalogue.append(el('p', 'eyebrow', 'MAKE A LITTLE SPACE'), el('h2', '', 'How will you spend your day?'));
  const serviceList = el('div', 'booking-services'); serviceList.setAttribute('aria-live', 'polite'); catalogue.append(serviceList);
  const panel = el('aside', 'booking-panel');
  panel.append(el('p', 'eyebrow', 'YOUR NEXT SLOW MOMENT'), el('h2', '', 'Save your spot.'));
  const selected = el('div', 'booking-selected');
  const form = el('form', 'booking-form');
  function field(text, input) { const label = el('label', 'booking-field-label', text); label.append(input); return label; }
  const date = el('input', 'field'); date.type = 'date'; date.name = 'date'; date.required = true; date.min = localDate(); date.value = localDate();
  const time = el('select', 'field'); time.name = 'time'; for (const [value, text] of [['10:00', '10:00 · Morning'], ['14:00', '14:00 · Afternoon'], ['17:00', '17:00 · Golden hour']]) { const option = el('option', '', text); option.value = value; time.append(option); }
  const guests = el('input', 'field'); guests.type = 'number'; guests.name = 'guests'; guests.min = '1'; guests.max = '10'; guests.step = '1'; guests.value = '1'; guests.required = true;
  const alias = el('input', 'field'); alias.name = 'alias'; alias.placeholder = 'Name for the reservation'; alias.maxLength = 60; alias.required = true; alias.autocomplete = 'given-name';
  const row = el('div', 'booking-form-row'); row.append(field('Time of day', time), field('Guests', guests));
  const total = el('div', 'booking-estimate'); const submit = el('button', 'btn booking-submit', 'Reserve this moment ↗'); submit.type = 'submit'; submit.disabled = true;
  form.append(field('When would you like to visit?', date), row, field('Your name', alias), total, submit, el('p', 'booking-small-note', 'Demo reservation only. No payment, travel or real-world service is included. Availability is checked by the server.'));
  panel.append(selected, form); content.append(catalogue, panel); page.append(content);
  const features = el('section', 'booking-features');
  for (const [icon, title, text] of [['◌', 'Small by intention', 'Intimate groups with capacity checked for every reservation.'], ['↺', 'Plans can change', 'Cancel your demo reservation here, whenever you need.'], ['⌂', 'Your own workspace', 'Your bookings persist in your anonymous browser workspace.']]) {
    const card = el('div', 'booking-feature'); card.append(el('span', 'booking-feature-icon', icon), el('h3', '', title), el('p', '', text)); features.append(card);
  } page.append(features);
  const history = el('section', 'booking-history'); history.id = 'my-reservations'; const historyHeading = el('div', 'booking-history-title'); historyHeading.append(el('p', 'eyebrow', 'SOMETHING TO LOOK FORWARD TO'), el('h2', '', 'Your reservations')); const historyList = el('div', 'booking-history-list'); history.append(historyHeading, historyList); page.append(history);
  const footer = el('footer', 'booking-footer'); footer.append(el('strong', '', style.brand || 'elsewhere'), el('p', '', 'Take your time. This place is a full-stack demonstration.')); page.append(footer);
  function updateSelection() {
    const service = services.find(s => s.id === selectedId); selected.replaceChildren();
    if (!service) { selected.append(el('p', 'muted', 'Select an experience to begin.')); submit.disabled = true; total.textContent = ''; return; }
    selected.append(el('span', 'booking-selected-caption', 'YOUR EXPERIENCE'), el('h3', '', service.name), el('p', '', `${service.durationMinutes} minutes · Up to ${service.capacity} guests per slot`));
    guests.max = String(Math.min(10, service.capacity)); if (Number(guests.value) > Number(guests.max)) guests.value = guests.max;
    total.replaceChildren(el('span', '', 'Estimated demo total'), el('strong', '', price(service.priceCents * Math.max(1, Number(guests.value) || 1))));
    submit.disabled = busy;
  }
  guests.addEventListener('input', updateSelection);
  function renderServices() {
    serviceList.replaceChildren();
    const symbols = ['☀', '♧', '◒', '✳', '⌂', '◌'];
    services.forEach((service, i) => {
      const card = el('button', `booking-service${selectedId === service.id ? ' is-selected' : ''}`); card.type = 'button'; card.setAttribute('aria-pressed', String(selectedId === service.id));
      const icon = el('span', 'booking-service-icon', symbols[i % symbols.length]); icon.setAttribute('aria-hidden', 'true'); const details = el('span', 'booking-service-details'); details.append(el('span', 'booking-service-number', `EXPERIENCE / ${String(i + 1).padStart(2, '0')}`), el('strong', '', service.name), el('span', 'booking-service-description', service.description), el('span', 'booking-service-meta', `${service.durationMinutes} min · ${price(service.priceCents)} / guest`));
      const check = el('span', 'booking-service-check', selectedId === service.id ? '✓' : '↗'); card.append(icon, details, check);
      card.addEventListener('click', () => { selectedId = service.id; renderServices(); updateSelection(); }); serviceList.append(card);
    });
    if (!services.length) serviceList.append(el('p', 'muted', 'No experiences are available right now.'));
  }
  function renderHistory() {
    historyList.replaceChildren();
    if (!bookings.length) { const empty = el('div', 'booking-history-empty'); empty.append(el('span', '', '◌'), el('p', '', 'A little adventure is waiting.'), el('span', 'muted', 'Choose an experience above. Your saved reservations will appear here.')); historyList.append(empty); }
    for (const booking of bookings) {
      const service = services.find(s => s.id === booking.serviceId);
      const card = el('article', 'booking-reservation'); const day = el('div', 'booking-reservation-date');
      const calendarDate = new Date(`${booking.date}T12:00:00`); day.append(el('strong', '', calendarDate.toLocaleDateString('en', { day: '2-digit' })), el('span', '', calendarDate.toLocaleDateString('en', { month: 'short' })));
      const info = el('div', 'booking-reservation-info'); info.append(el('p', 'booking-reference', booking.reference || `Booking ${booking.id}`), el('h3', '', service?.name || 'Saved experience'), el('p', 'muted', `${booking.date} · ${booking.time} · ${booking.guests} ${booking.guests === 1 ? 'guest' : 'guests'}`));
      const cancel = el('button', 'booking-cancel', 'Cancel reservation'); cancel.type = 'button'; cancel.setAttribute('aria-label', `Cancel reservation ${booking.reference || booking.id}`);
      cancel.addEventListener('click', async () => { cancel.disabled = true; cancel.textContent = 'Cancelling…'; try { await api(`/bookings/${encodeURIComponent(booking.id)}`, { method: 'DELETE' }); bookings = bookings.filter(b => b.id !== booking.id); renderHistory(); notify('Demo reservation cancelled.'); } catch (error) { notify(error.message, 'error'); cancel.disabled = false; cancel.textContent = 'Cancel reservation'; } });
      card.append(day, info, cancel); historyList.append(card);
    }
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (busy || selectedId === null) return; busy = true; updateSelection(); submit.textContent = 'Saving your spot…';
    try { const result = await api('/bookings', { method: 'POST', body: { style: style.slug, serviceId: selectedId, date: date.value, time: time.value, guests: Number(guests.value), alias: alias.value.trim() } }); bookings.unshift(result.booking); renderHistory(); notify(`Demo reservation ${result.booking.reference} saved.`); history.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (error) { notify(error.message, 'error'); }
    finally { busy = false; updateSelection(); submit.textContent = 'Reserve this moment ↗'; }
  });
  serviceList.append(el('p', 'muted', 'Finding your next slow moment…')); updateSelection(); renderHistory();
  async function load() {
    try { const [catalogue, saved] = await Promise.all([api('/services'), api(`/bookings?style=${encodeURIComponent(style.slug)}`)]); services = catalogue.services; bookings = saved.bookings; selectedId = services[0]?.id ?? null; renderServices(); updateSelection(); renderHistory(); }
    catch (error) { serviceList.replaceChildren(el('p', 'muted', error.message)); const retry = el('button', 'btn btn-secondary', 'Try again'); retry.type = 'button'; retry.addEventListener('click', load); serviceList.append(retry); }
  }
  await load();
}
