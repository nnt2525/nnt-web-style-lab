export async function mount(root, style, ctx) {
  root.className = 'app-journal';
  const { el, api, notify } = ctx;
  const state = { articles: [], bookmarks: [], category: 'All stories', saved: false, article: null, pending: new Set() };
  const button = (text, className, action) => { const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node; };
  root.replaceChildren(el('p', 'journal-loading', 'Finding a little inspiration…'));
  try { const [articles, bookmarks] = await Promise.all([api('/articles'), api(`/bookmarks?style=${encodeURIComponent(style.slug)}`)]); state.articles = articles.articles; state.bookmarks = bookmarks.bookmarks; }
  catch (error) { root.replaceChildren(el('h1', '', 'The journal is taking a moment.'), el('p', '', error.message), button('Try again', 'btn', () => mount(root, style, ctx))); return; }
  function isSaved(article) { return state.bookmarks.some(bookmark => bookmark.articleId === article.id); }
  function artwork(article, featured = false) {
    const wrapper = el('div', `journal-art ${featured ? 'journal-art-featured' : ''}`);
    wrapper.setAttribute('role', 'img'); wrapper.setAttribute('aria-label', `Abstract illustration for ${article.title}`);
    if (ctx.art) wrapper.append(ctx.art(article.art || 'plant', style.colors[2], article.title));
    else { const orb = el('span', 'journal-art-orb'); wrapper.append(orb, el('span', 'journal-art-line'), el('span', 'journal-art-word', article.category)); }
    return wrapper;
  }
  function bookmarkButton(article, large = false) {
    const node = button(isSaved(article) ? '✓ Saved' : '+ Save story', large ? 'btn btn-secondary' : 'journal-save', async () => {
      if (state.pending.has(article.id)) return; state.pending.add(article.id); node.disabled = true;
      try {
        const existing = state.bookmarks.find(bookmark => bookmark.articleId === article.id);
        if (existing) { await api(`/bookmarks/${encodeURIComponent(existing.id)}`, { method: 'DELETE' }); state.bookmarks = state.bookmarks.filter(bookmark => bookmark.id !== existing.id); notify('Story removed from your reading list.'); }
        else { const { bookmark } = await api('/bookmarks', { method: 'POST', body: { style: style.slug, articleId: article.id } }); state.bookmarks.push(bookmark); notify('Story saved to your reading list.'); }
        render();
      } catch (error) { notify(error.message, 'error'); node.disabled = false; }
      finally { state.pending.delete(article.id); }
    }); node.setAttribute('aria-label', `${isSaved(article) ? 'Unsave' : 'Save'} ${article.title}`); node.setAttribute('aria-pressed', String(isSaved(article))); return node;
  }
  function openArticle(article) { state.article = article; render(); const heading = root.querySelector('.journal-reader h1'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); heading.scrollIntoView({ behavior: 'instant', block: 'start' }); } }
  function render() {
    const wrap = el('div', 'journal-wrap');
    const top = el('header', 'journal-header'); const brand = el('a', 'journal-brand', style.brand || 'The Sunday Edit'); brand.href = '../../'; brand.setAttribute('aria-label', 'Back to style gallery');
    const nav = el('nav', 'journal-header-nav'); nav.setAttribute('aria-label', 'Journal navigation');
    const stories = button('The journal', !state.saved ? 'is-active' : '', () => { state.saved = false; state.article = null; render(); });
    const saved = button(`Reading list (${state.bookmarks.length})`, state.saved ? 'is-active' : '', () => { state.saved = true; state.article = null; render(); }); stories.setAttribute('aria-pressed', String(!state.saved)); saved.setAttribute('aria-pressed', String(state.saved)); nav.append(stories, saved); top.append(brand, nav); wrap.append(top);
    if (ctx.mode === 'preview') wrap.append(el('p', 'journal-preview', 'A read-only issue. To keep a reading list, run the Node backend locally.'));
    if (state.article) renderReader(wrap, state.article); else renderFrontpage(wrap);
    const footer = el('footer', 'journal-footer'); footer.append(el('strong', '', style.brand || 'The Sunday Edit'), el('p', '', 'A fictional journal for curious minds. Take a breath. Find your next idea.'), el('span', '', 'Independent perspectives · Thoughtfully collected')); wrap.append(footer); root.replaceChildren(wrap);
  }
  function renderFrontpage(wrap) {
    const masthead = el('section', 'journal-masthead');
    masthead.append(el('p', 'eyebrow', state.saved ? 'YOUR PERSONAL COLLECTION' : 'A JOURNAL FOR THE EVERYDAY CURIOUS'), el('h1', '', state.saved ? 'Worth coming back to.' : style.headline || 'A fresh perspective.'), el('p', 'journal-intro', state.saved ? 'The ideas you want to carry with you. Your saved stories live here.' : style.description || 'Slow stories, useful ideas, and a little space to see things differently.'));
    wrap.append(masthead);
    const categories = el('nav', 'journal-categories'); categories.setAttribute('aria-label', 'Filter stories by category');
    for (const category of ['All stories', ...new Set(state.articles.map(article => article.category))]) { const node = button(category, state.category === category ? 'is-active' : '', () => { state.category = category; render(); }); node.setAttribute('aria-pressed', String(state.category === category)); categories.append(node); }
    wrap.append(categories);
    const filtered = state.articles.filter(article => (state.category === 'All stories' || article.category === state.category) && (!state.saved || isSaved(article)));
    if (!filtered.length) { const empty = el('div', 'journal-empty'); empty.append(el('span', '', '↳'), el('h2', '', state.saved ? 'Your next good read is waiting.' : 'No stories in this section yet.'), el('p', '', state.saved ? 'Tap “Save story” on a story to add it to this reading list.' : 'Choose another category to keep exploring.')); wrap.append(empty); return; }
    const [featured, ...rest] = filtered; const feature = el('article', 'journal-feature');
    const open = button('', 'journal-open-art', () => openArticle(featured)); open.setAttribute('aria-label', `Read ${featured.title}`); open.append(artwork(featured, true));
    const featureText = el('div', 'journal-feature-text'); featureText.append(el('p', 'journal-meta', `THE FEATURE  /  ${featured.category}`));
    const title = button(featured.title, 'journal-title-link', () => openArticle(featured)); const titleHeading = el('h2'); titleHeading.append(title); featureText.append(titleHeading, el('p', 'journal-excerpt', featured.excerpt), el('p', 'journal-byline', `${featured.author} · ${featured.readMinutes} min read`));
    const actions = el('div', 'journal-feature-actions'); actions.append(button('Read the story ↗', 'journal-read', () => openArticle(featured)), bookmarkButton(featured)); featureText.append(actions); feature.append(open, featureText); wrap.append(feature);
    const sectionHeader = el('div', 'journal-section-header'); sectionHeader.append(el('h2', '', state.saved ? 'Your reading shelf' : 'More to explore'), el('span', '', `${filtered.length} ${filtered.length === 1 ? 'story' : 'stories'}`)); wrap.append(sectionHeader);
    const grid = el('div', 'journal-grid');
    for (const article of rest) {
      const card = el('article', 'journal-story'); const artButton = button('', 'journal-open-art', () => openArticle(article)); artButton.setAttribute('aria-label', `Read ${article.title}`); artButton.append(artwork(article));
      const heading = el('h3'); heading.append(button(article.title, 'journal-title-link', () => openArticle(article)));
      const actions = el('div', 'journal-story-actions'); actions.append(el('span', 'journal-byline', `${article.author} · ${article.readMinutes} min`), bookmarkButton(article)); card.append(artButton, el('p', 'journal-meta', article.category), heading, el('p', 'journal-excerpt', article.excerpt), actions); grid.append(card);
    }
    if (rest.length) wrap.append(grid);
    const note = el('aside', 'journal-note'); note.append(el('span', 'journal-note-star', '✳'), el('div', '', 'A small reminder: the best ideas often show up when we slow down.')); wrap.append(note);
  }
  function renderReader(wrap, article) {
    const reader = el('article', 'journal-reader');
    reader.append(button('← Back to the journal', 'journal-back', () => { state.article = null; render(); }), el('p', 'journal-meta', `${article.category}  /  ${article.readMinutes} MIN READ`), el('h1', '', article.title), el('p', 'journal-reader-deck', article.excerpt), el('p', 'journal-byline', `Words by ${article.author}`), artwork(article, true));
    const body = el('div', 'journal-reader-body'); const paragraphs = Array.isArray(article.body) ? article.body : [article.body];
    for (const paragraph of paragraphs) body.append(el('p', '', paragraph));
    reader.append(body); const bottom = el('div', 'journal-reader-bottom'); bottom.append(el('p', '', 'Keep this idea close.'), bookmarkButton(article, true)); reader.append(bottom); wrap.append(reader);
  }
  render();
}
