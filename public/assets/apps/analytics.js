export async function mount(root, style, ctx) {
  root.className = 'app-analytics';
  const { el, api, notify } = ctx;
  const query = `?style=${encodeURIComponent(style.slug)}`;
  const state = { entries: [], summary: {}, kind: 'all', category: 'all', search: '', deleted: null };
  const money = cents => new Intl.NumberFormat('en-TH', { style: 'currency', currency: 'THB', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }).format(cents / 100);
  const button = (text, className, action) => { const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node; };
  const svgNode = (tag, attributes = {}, text) => { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value)); if (text !== undefined) node.textContent = text; return node; };
  async function load() { const [ledger, summary] = await Promise.all([api(`/ledger${query}`), api(`/summary${query}`)]); state.entries = ledger.entries; state.summary = summary; }
  root.replaceChildren(el('p', 'analytics-loading', 'Opening your data workspace…'));
  try { await load(); } catch (error) { root.replaceChildren(el('h1', '', 'We could not load this workspace.'), el('p', '', error.message), button('Try again', 'btn', () => mount(root, style, ctx))); return; }
  const shell = el('div', 'analytics-shell'); const sidebar = el('aside', 'analytics-sidebar');
  const brand = el('a', 'analytics-brand', style.brand || 'Factor'); brand.href = '../../'; brand.setAttribute('aria-label', 'Back to style gallery'); sidebar.append(brand, el('p', 'analytics-sidebar-label', 'WORKSPACE'));
  const nav = el('nav', 'analytics-nav'); nav.setAttribute('aria-label', 'Transaction views'); const navButtons = new Map();
  for (const [key, symbol, text] of [['all', '▦', 'Overview'], ['income', '↗', 'Income'], ['expense', '↙', 'Expenses']]) {
    const item = button('', 'analytics-nav-item', () => { state.kind = key; kindSelect.value = key; renderData(); }); item.append(el('span', 'analytics-nav-icon', symbol), el('span', '', text)); nav.append(item); navButtons.set(key, item);
  }
  const sideNote = el('div', 'analytics-side-note'); sideNote.append(el('span', 'analytics-side-note-icon', '⌁'), el('strong', '', 'Every number has a story.'), el('p', '', 'A clear view of your fictional workspace, one entry at a time.')); sidebar.append(nav, sideNote, el('p', 'analytics-workspace', '● Personal demo workspace'));
  const main = el('div', 'analytics-main'); const topbar = el('div', 'analytics-topbar'); topbar.append(el('span', '', 'Workspace / Overview'), el('span', 'analytics-avatar', 'N')); main.append(topbar);
  const header = el('header', 'analytics-heading'); const heading = el('div'); heading.append(el('p', 'eyebrow', 'THE BIG PICTURE'), el('h1', '', style.headline || 'A little clarity goes a long way.'), el('p', 'muted', style.description || 'Keep your demo numbers in focus. Record, explore, and understand.'));
  header.append(heading, button('+ New entry', 'btn', () => { amountInput.focus(); form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); })); main.append(header);
  if (ctx.mode === 'preview') main.append(el('p', 'analytics-preview', 'Read-only preview · This personal ledger starts empty. Run the Node backend to save entries and explore real totals.'));
  const scope = el('p', 'analytics-scope', 'Workspace totals · All entries in this style’s workspace. Search and filters below affect the chart and table only.'); main.append(scope);
  const metrics = el('div', 'analytics-metrics'); metrics.setAttribute('aria-label', 'All workspace totals'); main.append(metrics);
  const upper = el('div', 'analytics-upper'); const chartCard = el('section', 'analytics-chart-card'); const chartHeading = el('div', 'analytics-panel-heading'); const chartTitle = el('div'); chartTitle.append(el('h2', '', 'Where it all goes'), el('p', 'muted', 'Income and expenses by category · filtered entries'));
  const legend = el('div', 'analytics-legend'); legend.append(el('span', 'analytics-legend-income', 'Income'), el('span', 'analytics-legend-expense', 'Expenses')); chartHeading.append(chartTitle, legend); chartCard.append(chartHeading); const chart = el('div', 'analytics-chart'); chartCard.append(chart);
  const form = el('form', 'analytics-entry-form'); form.append(el('p', 'eyebrow', 'KEEP THINGS UP TO DATE'), el('h2', '', 'A fresh entry'));
  function field(label, input) { const wrapper = el('label', 'field'); wrapper.append(el('span', '', label), input); return wrapper; }
  const entryKind = el('select'); entryKind.name = 'kind'; for (const [value, label] of [['income', 'Income'], ['expense', 'Expense']]) { const option = el('option', '', label); option.value = value; entryKind.append(option); }
  const amountInput = el('input'); amountInput.name = 'amount'; amountInput.type = 'number'; amountInput.inputMode = 'decimal'; amountInput.min = '0.01'; amountInput.max = '1000000'; amountInput.step = '0.01'; amountInput.placeholder = '0.00'; amountInput.required = true;
  const formRow = el('div', 'analytics-form-row'); formRow.append(field('Entry type', entryKind), field('Amount (THB)', amountInput)); form.append(formRow);
  const categoryInput = el('input'); categoryInput.name = 'category'; categoryInput.required = true; categoryInput.maxLength = 60; categoryInput.placeholder = 'e.g. Design, Supplies'; form.append(field('Category', categoryInput));
  const noteInput = el('input'); noteInput.name = 'note'; noteInput.maxLength = 240; noteInput.placeholder = 'What was this for?'; form.append(field('Note (optional)', noteInput));
  const submit = el('button', 'btn', 'Save entry'); submit.type = 'submit'; form.append(submit, el('p', 'analytics-form-note', 'Fictional demo records only. No payments are processed.'));
  form.addEventListener('submit', async event => {
    event.preventDefault(); const amount = Number(amountInput.value); const cents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || !Number.isSafeInteger(cents) || cents < 1 || cents > 100000000 || Math.abs(amount * 100 - cents) > 0.00001) { notify('Enter an amount from ฿0.01 to ฿1,000,000.00 with up to two decimal places.', 'error'); amountInput.focus(); return; }
    const category = categoryInput.value.trim(); if (!category) { categoryInput.focus(); notify('Please give this entry a category.', 'error'); return; }
    submit.disabled = true; submit.textContent = 'Saving…';
    try { await api('/ledger', { method: 'POST', body: { style: style.slug, kind: entryKind.value, category, amountCents: cents, note: noteInput.value.trim() } }); await load(); form.reset(); updateCategoryOptions(); renderMetrics(); renderData(); notify('Entry saved to your workspace.'); }
    catch (error) { notify(error.message, 'error'); }
    finally { submit.disabled = false; submit.textContent = 'Save entry'; }
  }); upper.append(chartCard, form); main.append(upper);
  const transactions = el('section', 'analytics-transactions'); const transactionHeading = el('div', 'analytics-panel-heading'); const transactionTitle = el('div'); transactionTitle.append(el('h2', '', 'Your ledger'), el('p', 'muted', 'The details behind the bigger picture.'));
  const exportButton = button('Export CSV ↓', 'btn btn-secondary', () => {
    const escape = value => { const text = String(value ?? ''); const safe = /^[\s]*[=+\-@]/.test(text) || /^[\t\r]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; };
    const rows = [['Date (UTC)', 'Type', 'Category', 'Amount (THB)', 'Note'], ...filteredEntries().map(entry => [entry.createdAt, entry.kind, entry.category, (entry.amountCents / 100).toFixed(2), entry.note])];
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = el('a'); link.href = url; link.download = 'demo-workspace-ledger.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Filtered ledger exported.');
  }); transactionHeading.append(transactionTitle, exportButton); transactions.append(transactionHeading);
  const filters = el('div', 'analytics-filters'); const searchInput = el('input'); searchInput.type = 'search'; searchInput.placeholder = 'Search category or note…'; searchInput.addEventListener('input', () => { state.search = searchInput.value; renderData(); });
  const kindSelect = el('select'); for (const [value, text] of [['all', 'All entry types'], ['income', 'Income'], ['expense', 'Expenses']]) { const option = el('option', '', text); option.value = value; kindSelect.append(option); } kindSelect.addEventListener('change', () => { state.kind = kindSelect.value; renderData(); });
  const categorySelect = el('select'); categorySelect.addEventListener('change', () => { state.category = categorySelect.value; renderData(); }); filters.append(field('Search entries', searchInput), field('Entry type', kindSelect), field('Category', categorySelect)); transactions.append(filters);
  const filterCount = el('p', 'analytics-filter-count'); filterCount.setAttribute('aria-live', 'polite'); const undoArea = el('div', 'analytics-undo-area'); const tableArea = el('div', 'analytics-table-area'); transactions.append(filterCount, undoArea, tableArea); main.append(transactions);
  const footer = el('footer', 'analytics-footer', 'A fictional data workspace · Integer amounts in the API, baht on your screen.'); main.append(footer); shell.append(sidebar, main); root.replaceChildren(shell);
  function updateCategoryOptions() {
    categorySelect.replaceChildren(); const all = el('option', '', 'All categories'); all.value = 'all'; categorySelect.append(all);
    const categories = [...new Set(state.entries.map(entry => entry.category))].sort(); for (const category of categories) { const option = el('option', '', category); option.value = category; categorySelect.append(option); }
    if (!categories.includes(state.category)) state.category = 'all'; categorySelect.value = state.category;
  }
  function renderMetrics() {
    metrics.replaceChildren();
    for (const [label, value, detail, symbol] of [['Total income', money(state.summary.incomeCents), 'All income entries', '↗'], ['Total expenses', money(state.summary.expenseCents), 'All expense entries', '↙'], ['Net balance', money(state.summary.balanceCents), 'Income minus expenses', '≈'], ['Total entries', String(state.summary.entryCount), 'Saved workspace records', '▦']]) {
      const card = el('section', 'analytics-metric'); const top = el('div', 'analytics-metric-top'); top.append(el('h2', '', label), el('span', 'analytics-metric-icon', symbol)); card.append(top, el('strong', 'analytics-metric-value', value), el('p', '', detail)); metrics.append(card);
    }
  }
  function filteredEntries() { const search = state.search.trim().toLowerCase(); return state.entries.filter(entry => (state.kind === 'all' || entry.kind === state.kind) && (state.category === 'all' || entry.category === state.category) && (!search || `${entry.category} ${entry.note}`.toLowerCase().includes(search))); }
  function renderData() {
    for (const [key, node] of navButtons) { node.classList.toggle('is-active', state.kind === key); node.setAttribute('aria-pressed', String(state.kind === key)); }
    const entries = filteredEntries(); filterCount.textContent = `${entries.length} of ${state.entries.length} entries shown · Amounts in THB · Dates in UTC`; exportButton.disabled = !entries.length;
    chart.replaceChildren(); tableArea.replaceChildren(); renderChart(entries);
    if (!entries.length) {
      const empty = el('div', 'analytics-empty'); empty.append(el('span', 'analytics-empty-icon', '▤'), el('h3', '', state.entries.length ? 'No entries match these filters.' : 'Your next insight starts with one entry.'), el('p', '', state.entries.length ? 'Try another category, entry type, or search term.' : 'Use the form above, or save a small set of fictional sample records to explore the dashboard.'));
      if (!state.entries.length) empty.append(button('Add 3 sample records', 'btn btn-secondary', addSamples)); tableArea.append(empty); return;
    }
    const table = el('table', 'analytics-table'); const caption = el('caption', 'analytics-sr-only', 'Filtered fictional workspace transactions'); table.append(caption); const thead = el('thead'); const headingRow = el('tr');
    for (const title of ['Entry', 'Type', 'Date (UTC)', 'Amount', 'Action']) { const th = el('th', '', title); th.scope = 'col'; headingRow.append(th); } thead.append(headingRow); table.append(thead); const tbody = el('tbody');
    for (const entry of entries) {
      const row = el('tr'); const detail = el('td', 'analytics-table-detail'); detail.append(el('strong', '', entry.category), el('span', '', entry.note || '—'));
      const kind = el('td'); kind.append(el('span', `analytics-kind analytics-kind-${entry.kind}`, entry.kind === 'income' ? '↗ Income' : '↙ Expense'));
      const date = el('td', 'analytics-table-date', new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }));
      const amount = el('td', 'analytics-table-amount', `${entry.kind === 'expense' ? '−' : '+'}${money(entry.amountCents)}`); const action = el('td');
      const remove = button('Remove', 'analytics-remove', async () => {
        remove.disabled = true;
        try { await api(`/ledger/${encodeURIComponent(entry.id)}`, { method: 'DELETE' }); state.deleted = entry; await load(); updateCategoryOptions(); renderMetrics(); renderData(); renderUndo(); notify('Entry removed. Undo is available above the ledger.'); }
        catch (error) { remove.disabled = false; notify(error.message, 'error'); }
      }); remove.setAttribute('aria-label', `Remove ${entry.category} entry of ${money(entry.amountCents)}`); action.append(remove); row.append(detail, kind, date, amount, action); tbody.append(row);
    }
    table.append(tbody); tableArea.append(table);
  }
  function renderChart(entries) {
    if (!entries.length) { const empty = el('div', 'analytics-chart-empty'); empty.append(el('div', 'analytics-chart-empty-bars', '▂ ▅ ▃ ▇ ▄'), el('strong', '', 'A clearer picture is on its way.'), el('p', '', 'Your filtered categories will appear here when you add entries.')); chart.append(empty); return; }
    const grouped = new Map(); for (const entry of entries) { if (!grouped.has(entry.category)) grouped.set(entry.category, { income: 0, expense: 0 }); grouped.get(entry.category)[entry.kind] += entry.amountCents; }
    const categories = [...grouped].sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense)).slice(0, 6); const max = Math.max(...categories.map(([, item]) => item.income + item.expense), 1);
    const height = Math.max(200, categories.length * 62 + 12); const svg = svgNode('svg', { viewBox: `0 0 620 ${height}`, role: 'img', 'aria-label': `Income and expense totals for the ${categories.length} largest filtered categories` }); svg.append(svgNode('title', {}, 'Category totals in Thai baht. Income and expenses are stacked within each category.'));
    categories.forEach(([category, values], index) => {
      const y = index * 62 + 15; const group = svgNode('g'); group.append(svgNode('title', {}, `${category}: income ${money(values.income)}, expenses ${money(values.expense)}`), svgNode('text', { x: 0, y, fill: 'currentColor', 'font-size': 13, 'font-family': 'inherit' }, category.length > 30 ? category.slice(0, 29) + '…' : category), svgNode('text', { x: 615, y, 'text-anchor': 'end', fill: 'currentColor', 'font-size': 12, 'font-family': 'inherit' }, money(values.income + values.expense)));
      group.append(svgNode('rect', { x: 0, y: y + 10, width: 620, height: 13, rx: 4, class: 'analytics-bar-track' }));
      const incomeWidth = values.income / max * 620; const expenseWidth = values.expense / max * 620;
      if (incomeWidth) group.append(svgNode('rect', { x: 0, y: y + 10, width: incomeWidth, height: 13, rx: 3, class: 'analytics-bar-income' }));
      if (expenseWidth) group.append(svgNode('rect', { x: incomeWidth, y: y + 10, width: expenseWidth, height: 13, rx: 3, class: 'analytics-bar-expense' })); svg.append(group);
    }); chart.append(svg); if (grouped.size > 6) chart.append(el('p', 'analytics-chart-limit', `Showing the 6 largest of ${grouped.size} categories. Filter a category to inspect it.`));
  }
  async function addSamples(event) {
    const node = event.currentTarget; node.disabled = true; node.textContent = 'Saving samples…'; let created = 0;
    try { for (const sample of [{ kind: 'income', category: 'Design', amountCents: 1500000, note: 'Fictional demo project' }, { kind: 'expense', category: 'Software', amountCents: 129000, note: 'Fictional demo tools' }, { kind: 'expense', category: 'Supplies', amountCents: 45000, note: 'Fictional demo materials' }]) { await api('/ledger', { method: 'POST', body: { style: style.slug, ...sample } }); created++; } await load(); updateCategoryOptions(); renderMetrics(); renderData(); notify('Three fictional sample entries saved to the database.'); }
    catch (error) { if (created) { try { await load(); updateCategoryOptions(); renderMetrics(); renderData(); } catch { /* Keep the earlier UI if the server is unavailable. */ } } notify(`${created ? `${created} sample entries were saved. ` : ''}${error.message}`, 'error'); node.disabled = false; node.textContent = 'Add 3 sample records'; }
  }
  function renderUndo() {
    undoArea.replaceChildren(); if (!state.deleted) return; const entry = state.deleted; const banner = el('div', 'analytics-undo'); banner.append(el('span', '', `Removed ${entry.category} · ${money(entry.amountCents)}`));
    const undo = button('Undo', 'btn btn-secondary', async () => { undo.disabled = true; try { await api('/ledger', { method: 'POST', body: { style: style.slug, kind: entry.kind, category: entry.category, amountCents: entry.amountCents, note: entry.note } }); state.deleted = null; await load(); updateCategoryOptions(); renderMetrics(); renderData(); renderUndo(); notify('Entry restored with a new timestamp.'); } catch (error) { undo.disabled = false; notify(error.message, 'error'); } }); banner.append(undo); undoArea.append(banner);
  }
  updateCategoryOptions(); renderMetrics(); renderData();
}
