ready.then(async () => {
  const input = $('#heroSearch'), hits = $('#heroHits');
  const run = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { hits.innerHTML = '<p class="mute small">Type a title, author or ISBN. You will see the rack number straight away.</p>'; return; }
    try {
      const { books } = await api('/books?' + qs({ q, limit: 5 }));
      hits.innerHTML = books.length ? books.map((b) => `<a class="hit" href="/book-details.html?id=${esc(b._id)}"><span><strong>${esc(b.title)}</strong><br><small class="mute">${esc(b.category.name)} · ${b.availableCopies > 0 ? b.availableCopies + ' available' : 'all copies out'}</small></span><span class="rack">${esc(b.shelf)}</span></a>`).join('') : empty('No book matches that search yet.');
    } catch (e) { hits.innerHTML = empty(e.message); }
  });
  input.addEventListener('input', run); run();

  api('/stats').then((s) => {
    const set = { sBooks: s.books, sCopies: s.copies, sCats: s.categories, sStudents: s.students, sBorrows: s.borrows };
    Object.entries(set).forEach(([id, v]) => {
      const el = document.getElementById(id); let n = 0; const step = Math.max(1, Math.ceil(v / 40));
      const t = setInterval(() => { n = Math.min(v, n + step); el.textContent = n.toLocaleString('en-IN'); if (n >= v) clearInterval(t); }, 25);
    });
  }).catch(() => {});

  const fill = async (path, el, none) => {
    try { const { books } = await api(path); el.innerHTML = books.length ? books.map(bookCard).join('') : `<div style="grid-column:1/-1">${empty(none)}</div>`; }
    catch (e) { el.innerHTML = empty(e.message); }
  };
  fill('/books/recent', $('#recent'), 'No books have been added yet. Run the seed script.');
  fill('/books/popular', $('#popular'), 'No borrowing activity yet. Popular books appear once students start borrowing.');
});
