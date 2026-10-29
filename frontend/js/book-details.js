ready.then(async () => {
  const id = new URLSearchParams(location.search).get('id'); const box = $('#detail');
  async function load() {
    try {
      const { book: b } = await api('/books/' + encodeURIComponent(id)); const av = b.availableCopies > 0;
      document.title = b.title + ' · UniLib';
      box.innerHTML = `<div class="detail"><div class="cover"><img src="${cover(b)}" alt="Cover of ${esc(b.title)}"></div><div>
      <span class="badge cat">${esc(b.category.name)}</span><h1 style="font-size:2rem;margin-top:.5rem">${esc(b.title)}</h1><p class="mute">by ${esc(b.author)}</p>
      <p>${esc(b.description || 'No description added.')}</p>${b.isDemo ? '<p class="notice info small">This is a sample demo record created for the project, not a verified publication.</p>' : ''}
      <dl class="kv"><dt>Book ID</dt><dd>${esc(b.bookId)}</dd><dt>ISBN</dt><dd>${esc(b.isbn || '—')}</dd><dt>Publisher</dt><dd>${esc(b.publisher || '—')}</dd><dt>Year</dt><dd>${esc(b.year || '—')}</dd>
      <dt>Shelf location</dt><dd class="rack">${esc(b.shelf)}</dd><dt>Copies</dt><dd>${b.availableCopies} of ${b.totalCopies} available</dd>
      <dt>Status</dt><dd><span class="pill ${av ? 'ok' : 'bad'}">${b.status}</span></dd></dl>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn" data-borrow="${esc(b._id)}" ${av ? '' : 'disabled'}>Borrow this book</button><a class="btn ghost" href="/shelf-finder.html?shelf=${encodeURIComponent(b.shelf.split('-').slice(0, 2).join('-'))}">Show rack on shelf map</a></div></div></div>`;
    } catch (e) { box.innerHTML = empty(e.status === 404 || e.status === 400 ? 'That book could not be found.' : e.message); }
  }
  window.onBorrowed = load; load();
});
