export async function mount(root, style, ctx) {
  root.className = 'app-tasks';
  const { el, api, notify } = ctx;
  const state = { tasks: [], query: '', filter: 'all', deleted: null, pending: new Set() };
  const button = (text, className, onClick) => {
    const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', onClick); return node;
  };
  const preview = () => ctx.mode === 'preview' ? el('p', 'tasks-preview', 'Preview workspace · Browse the sample board. Run the Node server to save your own tasks.') : null;
  const query = `?style=${encodeURIComponent(style.slug)}`;
  function showError(error) { notify(error.message || 'Something went wrong. Please try again.', 'error'); }
  root.append(el('p', 'tasks-loading', 'Opening your workspace…'));
  try { state.tasks = (await api(`/tasks${query}`)).tasks; }
  catch (error) {
    root.replaceChildren(el('h2', '', 'Workspace unavailable'), el('p', '', error.message), button('Try again', 'btn', () => mount(root, style, ctx))); return;
  }
  const shell = el('div', 'tasks-shell');
  const sidebar = el('aside', 'tasks-sidebar');
  const brand = el('a', 'tasks-logo', style.brand || 'Flowly'); brand.href = '../../'; brand.setAttribute('aria-label', 'Back to style gallery');
  sidebar.append(brand, el('p', 'eyebrow', 'YOUR WORKSPACE'));
  const nav = el('nav', 'tasks-navigation'); nav.setAttribute('aria-label', 'Task views');
  const filters = [['all', 'Overview', '01'], ['active', 'In progress', '02'], ['done', 'Completed', '03']];
  const navButtons = new Map();
  for (const [key, label, number] of filters) {
    const item = button('', 'tasks-nav-item', () => { state.filter = key; updateBoard(); });
    item.append(el('span', '', label), el('span', 'tasks-nav-number', number)); nav.append(item); navButtons.set(key, item);
  }
  sidebar.append(nav);
  const asideNote = el('div', 'tasks-aside-note');
  asideNote.append(el('div', 'tasks-mini-art', '↗'), el('h3', '', 'A little focus. A lot of flow.'), el('p', '', 'Make room for the work that matters. One small step at a time.'));
  sidebar.append(asideNote, el('p', 'tasks-workspace-label', '● Personal demo workspace'));
  const main = el('div', 'tasks-main');
  const header = el('header', 'tasks-heading');
  const headingText = el('div'); headingText.append(el('p', 'eyebrow', 'A CLEARER WAY TO WORK'), el('h1', '', style.headline || 'Good things take focus.'), el('p', 'muted', style.description || 'Your ideas, plans, and next steps — together in one calm space.'));
  header.append(headingText, el('div', 'tasks-avatar', 'N')); main.append(header);
  const previewNode = preview(); if (previewNode) main.append(previewNode);
  const statistics = el('div', 'tasks-statistics'); statistics.setAttribute('aria-label', 'Task totals'); main.append(statistics);
  const toolbar = el('div', 'tasks-toolbar');
  const searchLabel = el('label', 'tasks-search'); searchLabel.append(el('span', 'tasks-sr-only', 'Search tasks'));
  const search = el('input', 'field'); search.type = 'search'; search.placeholder = 'Search your tasks…'; search.addEventListener('input', () => { state.query = search.value; updateBoard(); }); searchLabel.append(search);
  toolbar.append(el('h2', '', 'Your board'), searchLabel); main.append(toolbar);
  const form = el('form', 'tasks-add-form');
  const titleLabel = el('label', 'tasks-add-label'); titleLabel.append(el('span', 'tasks-sr-only', 'New task title'));
  const titleInput = el('input', 'field'); titleInput.name = 'title'; titleInput.placeholder = 'What is your next small step?'; titleInput.required = true; titleInput.maxLength = 160; titleLabel.append(titleInput);
  const add = el('button', 'btn', '+ Add task'); add.type = 'submit'; form.append(titleLabel, add);
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const title = titleInput.value.trim(); if (!title) { titleInput.focus(); return; }
    add.disabled = true; add.textContent = 'Adding…';
    try { const { task } = await api('/tasks', { method: 'POST', body: { style: style.slug, title } }); state.tasks.unshift(task); titleInput.value = ''; updateBoard(); notify('Task added to your board.'); titleInput.focus(); }
    catch (error) { showError(error); }
    finally { add.disabled = false; add.textContent = '+ Add task'; }
  }); main.append(form);
  const undoArea = el('div', 'tasks-undo-area'); undoArea.setAttribute('aria-live', 'polite'); main.append(undoArea);
  const board = el('section', 'tasks-board'); board.setAttribute('aria-label', 'Task board'); main.append(board);
  const footer = el('footer', 'tasks-footer', 'Built for small steps and meaningful progress.'); main.append(footer);
  shell.append(sidebar, main); root.replaceChildren(shell);
  function updateBoard() {
    for (const [key, item] of navButtons) { item.classList.toggle('is-active', state.filter === key); item.setAttribute('aria-pressed', String(state.filter === key)); }
    statistics.replaceChildren();
    const total = state.tasks.length; const done = state.tasks.filter(task => task.status === 'done').length;
    for (const [value, label, hint] of [[total, 'Total tasks', 'Everything in one place'], [state.tasks.filter(t => t.status === 'doing').length, 'In progress', 'Keep your momentum'], [done, 'Completed', total ? `${Math.round(done / total * 100)}% of your board` : 'Your next win starts here']]) {
      const card = el('div', 'tasks-stat'); card.append(el('p', 'tasks-stat-label', label), el('strong', '', String(value).padStart(2, '0')), el('span', 'muted', hint)); statistics.append(card);
    }
    board.replaceChildren();
    const visible = state.tasks.filter(task => task.title.toLowerCase().includes(state.query.toLowerCase()) && (state.filter === 'all' || (state.filter === 'active' ? task.status !== 'done' : task.status === 'done')));
    for (const [status, label, subtitle] of [['todo', 'To do', 'A fresh place to begin'], ['doing', 'In progress', 'Good things are happening'], ['done', 'Done', 'Pause. Celebrate. Repeat.']]) {
      const column = el('section', `tasks-column tasks-column-${status}`); const heading = el('div', 'tasks-column-heading');
      const items = visible.filter(task => task.status === status); heading.append(el('h3', '', label), el('span', 'tasks-column-count', String(items.length))); column.append(heading, el('p', 'tasks-column-subtitle', subtitle));
      if (!items.length) column.append(el('div', 'tasks-empty', state.query ? 'No matching tasks here.' : 'A little breathing room.'));
      for (const task of items) {
        const card = el('article', 'tasks-task'); const top = el('div', 'tasks-task-top'); top.append(el('span', 'tasks-task-chip', status === 'done' ? 'COMPLETE' : 'PERSONAL'));
        const remove = button('×', 'tasks-delete', async () => {
          if (state.pending.has(task.id)) return; state.pending.add(task.id); remove.disabled = true;
          try { await api(`/tasks/${encodeURIComponent(task.id)}`, { method: 'DELETE' }); state.tasks = state.tasks.filter(t => t.id !== task.id); state.deleted = task; updateBoard(); renderUndo(); notify('Task removed. You can undo this below the add form.'); }
          catch (error) { showError(error); remove.disabled = false; }
          finally { state.pending.delete(task.id); }
        }); remove.setAttribute('aria-label', `Delete task: ${task.title}`); top.append(remove);
        card.append(top, el('h4', '', task.title));
        const selectLabel = el('label', 'tasks-status-label'); selectLabel.append(el('span', '', 'Move to'));
        const select = el('select', 'tasks-status'); select.setAttribute('aria-label', `Status for ${task.title}`);
        for (const [value, text] of [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']]) { const option = el('option', '', text); option.value = value; select.append(option); }
        select.value = task.status;
        select.addEventListener('change', async () => {
          const statusValue = select.value; select.disabled = true;
          try { const { task: updated } = await api(`/tasks/${encodeURIComponent(task.id)}`, { method: 'PATCH', body: { status: statusValue } }); state.tasks = state.tasks.map(t => t.id === updated.id ? updated : t); updateBoard(); notify(`Task moved to ${select.selectedOptions[0].textContent}.`); }
          catch (error) { select.value = task.status; select.disabled = false; showError(error); }
        }); selectLabel.append(select); card.append(selectLabel); column.append(card);
      }
      board.append(column);
    }
  }
  function renderUndo() {
    undoArea.replaceChildren(); if (!state.deleted) return;
    const deleted = state.deleted; const banner = el('div', 'tasks-undo'); banner.append(el('span', '', `Removed “${deleted.title}”.`));
    const undo = button('Undo', 'btn btn-secondary', async () => {
      undo.disabled = true;
      try { let { task } = await api('/tasks', { method: 'POST', body: { style: style.slug, title: deleted.title } }); if (deleted.status !== 'todo') ({ task } = await api(`/tasks/${encodeURIComponent(task.id)}`, { method: 'PATCH', body: { status: deleted.status } })); state.tasks.unshift(task); state.deleted = null; updateBoard(); renderUndo(); notify('Task restored.'); }
      catch (error) { showError(error); undo.disabled = false; }
    }); banner.append(undo); undoArea.append(banner);
  }
  updateBoard();
}
