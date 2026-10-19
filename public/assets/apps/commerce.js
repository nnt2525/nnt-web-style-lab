const money = value => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value / 100);

function illustration(kind, el) {
  const art = el('div', `commerce-art art-${kind || 'chair'}`);
  art.setAttribute('aria-hidden', 'true');
  // Original vector product studies. All markup below is constant, never API input.
  const drawings = {
    chair: '<ellipse cx="180" cy="283" rx="95" ry="15" fill="#000" opacity=".09"/><path d="m119 196-12 84m128-84 13 84" stroke="#714d32" stroke-width="13" stroke-linecap="round"/><path d="M97 160q0-24 24-24h118q24 0 24 24v51H97z" fill="#b8663e"/><path d="M116 85q0-21 24-21h78q24 0 24 21v99H116z" fill="#ce885f"/><path d="M104 180h153v26H104z" fill="#dfa778"/><path d="M91 157h24v56H91zm156 0h24v56h-24z" fill="#9d5533"/>',
    lamp: '<ellipse cx="180" cy="284" rx="82" ry="13" fill="#000" opacity=".09"/><path d="M180 121v149" stroke="#7d693c" stroke-width="9"/><ellipse cx="180" cy="273" rx="49" ry="9" fill="#96834f"/><path d="m104 148 36-93h80l36 93z" fill="#f2dfa9"/><ellipse cx="180" cy="148" rx="76" ry="13" fill="#d6bc7b"/><ellipse cx="180" cy="147" rx="54" ry="7" fill="#fff5d4"/>',
    bag: '<ellipse cx="180" cy="284" rx="90" ry="14" fill="#000" opacity=".09"/><path d="M137 113V86q0-41 43-41t43 41v27" fill="none" stroke="#896442" stroke-width="12"/><path d="m100 105 17 167h126l17-167z" fill="#c8a57c"/><path d="m100 105 29 12h102l29-12" fill="none" stroke="#e3c6a0" stroke-width="6"/><path d="M137 109v141m86-141v141" stroke="#a47d55" stroke-width="9"/><rect x="158" y="169" width="44" height="30" rx="3" fill="#9d764f"/>',
    plant: '<ellipse cx="180" cy="283" rx="75" ry="12" fill="#000" opacity=".09"/><path d="M180 204V67" stroke="#526449" stroke-width="6"/><path d="M180 153q-84-6-75-73 71 0 75 73m2-31q1-74 71-74 9 69-71 74m-2 71q-71 1-76-58 73-8 76 58m2-16q12-59 70-49-3 56-70 49" fill="#70846b"/><path d="m128 201 15 75h74l15-75z" fill="#c48769"/><ellipse cx="180" cy="201" rx="52" ry="9" fill="#ac7057"/>',
    headphones: '<ellipse cx="180" cy="281" rx="87" ry="12" fill="#000" opacity=".09"/><path d="M108 194V133a72 72 0 0 1 144 0v61" fill="none" stroke="#43514b" stroke-width="23"/><path d="M112 126a68 68 0 0 1 136 0" fill="none" stroke="#a0aaa1" stroke-width="9"/><rect x="88" y="151" width="50" height="95" rx="24" fill="#66786d"/><rect x="222" y="151" width="50" height="95" rx="24" fill="#66786d"/><rect x="122" y="162" width="14" height="70" rx="7" fill="#303e36"/><rect x="224" y="162" width="14" height="70" rx="7" fill="#303e36"/>',
    speaker: '<ellipse cx="180" cy="281" rx="76" ry="12" fill="#000" opacity=".09"/><rect x="112" y="65" width="136" height="202" rx="24" fill="#797664"/><rect x="124" y="78" width="112" height="178" rx="17" fill="#a29d84"/><circle cx="180" cy="186" r="42" fill="#555a4c"/><circle cx="180" cy="186" r="29" fill="#777c6b"/><circle cx="180" cy="112" r="18" fill="#53584a"/><circle cx="180" cy="112" r="8" fill="#929783"/>'
  };
  art.innerHTML = `<svg viewBox="0 0 360 320" focusable="false">${drawings[kind] || drawings.chair}</svg>`;
  return art;
}

export async function mount(root, style, ctx) {
  const { el, api, notify } = ctx;
  const page = el('div', 'app-commerce');
  root.replaceChildren(page);
  let products = [], orders = [], category = 'All', cart = new Map(), busy = false;
  const header = el('header', 'commerce-nav');
  const brand = el('a', 'commerce-wordmark', style.brand || 'NORA'); brand.href = '#';
  brand.addEventListener('click', e => { e.preventDefault(); page.scrollIntoView({ behavior: 'smooth' }); });
  const nav = el('nav', 'commerce-links'); nav.setAttribute('aria-label', 'Store sections');
  for (const [text, id] of [['Collection', 'collection'], ['Our approach', 'approach']]) {
    const a = el('a', '', text); a.href = `#${id}`; nav.append(a);
  }
  const bag = el('button', 'commerce-bag', 'Bag (0)'); bag.type = 'button';
  header.append(brand, nav, bag); page.append(header);
  const hero = el('section', 'commerce-hero');
  const copy = el('div', 'commerce-hero-copy');
  copy.append(el('p', 'eyebrow', 'OBJECTS FOR A CONSIDERED LIFE'), el('h1', '', style.headline || 'A little less. A little better.'), el('p', 'commerce-intro', style.description || 'Thoughtful pieces, warm materials, and everyday rituals. Discover objects made to feel at home.'));
  const shop = el('a', 'btn commerce-shop', 'Explore the collection ↗'); shop.href = '#collection'; copy.append(shop);
  const heroArt = el('div', 'commerce-hero-art'); heroArt.append(illustration('chair', el), el('span', 'commerce-art-label', 'THE QUIET COLLECTION / 01'));
  hero.append(copy, heroArt); page.append(hero);
  const promise = el('div', 'commerce-promise');
  for (const item of ['01 / Thoughtful by design', '02 / Built for the everyday', '03 / A fictional concept store']) promise.append(el('span', '', item));
  page.append(promise);
  const collection = el('section', 'commerce-collection'); collection.id = 'collection';
  const title = el('div', 'commerce-section-title'); title.append(el('div', '', 'THE EDIT / 2026'), el('h2', '', 'Good things, chosen well.'));
  const filters = el('div', 'commerce-filters'); filters.setAttribute('aria-label', 'Product categories');
  const grid = el('div', 'commerce-grid'); grid.setAttribute('aria-live', 'polite');
  collection.append(title, filters, grid); page.append(collection);
  const approach = el('section', 'commerce-approach'); approach.id = 'approach';
  approach.append(el('p', 'eyebrow', 'LESS, WITH MORE MEANING'), el('h2', '', 'Room for what matters.'), el('p', '', 'A study in intentional design. This working storefront connects a product catalogue, a live cart and server-calculated orders to a persistent database. Every order is a demonstration; no payment is taken.'));
  page.append(approach);
  const historySection = el('section', 'commerce-history'); historySection.append(el('p', 'eyebrow', 'YOUR WORKSPACE'), el('h2', '', 'Previous demo orders'));
  const historyList = el('div', 'commerce-order-list'); historySection.append(historyList); page.append(historySection);
  const footer = el('footer', 'commerce-footer'); footer.append(el('strong', '', style.brand || 'NORA'), el('span', '', 'Original objects. Fictional store. Real full-stack demo.')); page.append(footer);
  const overlay = el('div', 'commerce-overlay'); overlay.hidden = true;
  const panel = el('section', 'commerce-cart'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Shopping bag'); panel.tabIndex = -1;
  const cartHead = el('div', 'commerce-cart-heading'); cartHead.append(el('h2', '', 'Your bag'));
  const close = el('button', 'commerce-close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Close shopping bag'); cartHead.append(close);
  const cartItems = el('div', 'commerce-cart-items');
  const total = el('p', 'commerce-total');
  const form = el('form', 'commerce-checkout'); const label = el('label', '', 'Name for this demo order');
  const alias = el('input', 'field'); alias.name = 'alias'; alias.required = true; alias.maxLength = 60; alias.placeholder = 'Your name'; label.append(alias);
  const checkout = el('button', 'btn', 'Place demo order →'); checkout.type = 'submit';
  form.append(label, el('p', 'muted', 'No payment or delivery. The backend validates stock and calculates the final price.'), checkout);
  panel.append(cartHead, cartItems, total, form); overlay.append(panel); page.append(overlay);
  const showCart = () => { overlay.hidden = false; panel.focus(); };
  const hideCart = () => { overlay.hidden = true; bag.focus(); };
  bag.addEventListener('click', showCart); close.addEventListener('click', hideCart);
  overlay.addEventListener('click', e => { if (e.target === overlay) hideCart(); });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideCart();
    if (e.key === 'Tab') {
      const nodes = [...panel.querySelectorAll('button:not([disabled]),input,a[href]')];
      const first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  });
  function renderCart() {
    let amount = 0, count = 0; cartItems.replaceChildren();
    for (const [id, quantity] of cart) {
      const p = products.find(p => p.id === id); if (!p) continue;
      amount += p.priceCents * quantity; count += quantity;
      const row = el('div', 'commerce-cart-row'); row.append(illustration(p.art, el));
      const info = el('div', 'commerce-cart-info'); info.append(el('h3', '', p.name), el('p', 'muted', money(p.priceCents)));
      const controls = el('div', 'commerce-quantity');
      const minus = el('button', '', '−'); minus.type = 'button'; minus.setAttribute('aria-label', `Remove one ${p.name}`);
      const plus = el('button', '', '+'); plus.type = 'button'; plus.setAttribute('aria-label', `Add one ${p.name}`); plus.disabled = quantity >= Math.min(10, p.stock);
      minus.addEventListener('click', () => { if (quantity === 1) cart.delete(id); else cart.set(id, quantity - 1); renderCart(); });
      plus.addEventListener('click', () => { cart.set(id, quantity + 1); renderCart(); });
      controls.append(minus, el('span', '', String(quantity)), plus); info.append(controls); row.append(info, el('strong', '', money(p.priceCents * quantity))); cartItems.append(row);
    }
    if (!count) cartItems.append(el('p', 'commerce-empty', 'Your bag is waiting for something good.'));
    bag.textContent = `Bag (${count})`; total.replaceChildren(el('span', '', 'Subtotal'), el('strong', '', money(amount))); checkout.disabled = !count || busy;
  }
  function renderProducts() {
    filters.replaceChildren();
    for (const name of ['All', ...new Set(products.map(p => p.category))]) {
      const button = el('button', name === category ? 'is-active' : '', name); button.type = 'button'; button.setAttribute('aria-pressed', String(name === category));
      button.addEventListener('click', () => { category = name; renderProducts(); }); filters.append(button);
    }
    grid.replaceChildren();
    const visible = products.filter(p => category === 'All' || p.category === category);
    for (const p of visible) {
      const card = el('article', 'commerce-product'); const image = el('div', 'commerce-product-image'); image.append(illustration(p.art, el));
      const add = el('button', 'commerce-add', p.stock > 0 ? '+' : 'Sold out'); add.type = 'button'; add.disabled = !p.stock; add.setAttribute('aria-label', `Add ${p.name} to bag`);
      add.addEventListener('click', () => { const quantity = cart.get(p.id) || 0; if (quantity >= Math.min(10, p.stock)) return notify('Maximum ten per product, subject to available stock.', 'error'); cart.set(p.id, quantity + 1); renderCart(); notify(`${p.name} added to your bag.`); }); image.append(add);
      const line = el('div', 'commerce-product-line'); line.append(el('h3', '', p.name), el('span', '', money(p.priceCents)));
      card.append(image, line, el('p', 'commerce-product-description', p.description), el('span', 'commerce-product-category', p.category)); grid.append(card);
    }
    if (!visible.length) grid.append(el('p', 'commerce-empty', 'No objects in this collection yet.'));
  }
  function renderOrders() {
    historyList.replaceChildren();
    if (!orders.length) historyList.append(el('p', 'muted', 'Your demo orders will appear here after checkout.'));
    for (const order of orders) {
      const row = el('div', 'commerce-order'); row.append(el('strong', '', order.reference || `Order ${order.id}`), el('span', '', new Date(order.createdAt).toLocaleDateString()), el('span', 'commerce-order-status', 'Demo order saved'), el('strong', '', money(order.totalCents))); historyList.append(row);
    }
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (busy || !cart.size) return; busy = true; renderCart(); checkout.textContent = 'Saving order…';
    try {
      const result = await api('/orders', { method: 'POST', body: { style: style.slug, alias: alias.value.trim(), items: [...cart].map(([productId, quantity]) => ({ productId, quantity })) } });
      cart.clear(); orders.unshift(result.order); renderOrders(); renderCart(); alias.value = ''; hideCart(); notify(`Demo order ${result.order.reference} saved. No payment was taken.`);
      const data = await api('/products'); products = data.products; renderProducts();
    } catch (error) { notify(error.message, 'error'); }
    finally { busy = false; checkout.textContent = 'Place demo order →'; renderCart(); }
  });
  grid.append(el('p', 'commerce-empty', 'Curating your collection…')); renderCart();
  async function load() {
    try { const [catalogue, history] = await Promise.all([api('/products'), api(`/orders?style=${encodeURIComponent(style.slug)}`)]); products = catalogue.products; orders = history.orders; renderProducts(); renderOrders(); }
    catch (error) { grid.replaceChildren(el('p', 'commerce-empty', error.message)); const retry = el('button', 'btn btn-secondary', 'Retry collection'); retry.type = 'button'; retry.addEventListener('click', load); grid.append(retry); }
  }
  await load();
}
