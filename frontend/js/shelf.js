ready.then(async (me) => {
  const P = new URLSearchParams(location.search);
  const st = { q: '', available: false, shelf: P.get('shelf') || '' };
  const list = $('#results');

  async function find() {
    list.innerHTML = spinner();
    try {
      const { books, total } = await api('/books?' + qs({ ...st, limit: 20 }));
      $('#rcount').textContent = st.shelf ? `${total} book${total === 1 ? '' : 's'} on rack ${st.shelf}` : `${total} result${total === 1 ? '' : 's'}`;
      list.innerHTML = books.length ? `<div class="tbl"><table><thead><tr><th>Title</th><th>Category</th><th>Rack</th><th>Availability</th></tr></thead><tbody>${books.map((b) => `<tr><td class="wrapc"><a href="/book-details.html?id=${esc(b._id)}">${esc(b.title)}</a></td><td>${esc(b.category.name)}</td><td class="rack">${esc(b.shelf)}</td><td><span class="pill ${b.availableCopies ? 'ok' : 'bad'}">${b.availableCopies ? b.availableCopies + ' available' : 'Unavailable'}</span></td></tr>`).join('')}</tbody></table></div>` : empty('Nothing found. Check the spelling or clear the rack filter.');
    } catch (e) { list.innerHTML = empty(e.message); }
  }
  $('#sq').addEventListener('input', debounce((e) => { st.q = e.target.value.trim(); find(); }));
  $('#sav').addEventListener('change', (e) => { st.available = e.target.checked; find(); });
  $('#clearRack').addEventListener('click', () => { st.shelf = ''; $$('.rk.on').forEach((x) => x.classList.remove('on')); find(); });

  try {
    const { shelves } = await api('/books/shelves');
    $('#map').innerHTML = shelves.map((s) => `<div class="shelf-cat card"><h3>${esc(s.category.name)} <span class="mute small">· section ${esc(s.category.code)}</span></h3><div class="racks">${s.racks.map((r) => `<button class="rk ${st.shelf === r.rack ? 'on' : ''}" data-rack="${esc(r.rack)}" style="--fill:${Math.round((r.available / r.books) * 100)}%">${esc(r.rack)}<small>${r.available}/${r.books} available</small></button>`).join('')}</div></div>`).join('') || empty('No shelves yet. Run the seed script.');
  } catch (e) { $('#map').innerHTML = empty(e.message); }
  $('#map').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rack]'); if (!b) return;
    st.shelf = b.dataset.rack; $$('.rk').forEach((x) => x.classList.toggle('on', x === b)); find(); $('#results').scrollIntoView({ behavior: 'smooth' });
  });

  const fill = async (path, el, none) => { try { const { books } = await api(path); el.innerHTML = books.length ? books.map(bookCard).join('') : `<div style="grid-column:1/-1">${empty(none)}</div>`; } catch (e) { el.innerHTML = empty(e.message); } };
  fill('/books/recent', $('#recent'), 'No books yet.');
  fill('/books/popular', $('#popular'), 'No borrowing activity yet. Borrow a book and it will show here.');

  // Personalised suggestions (students only)
  const rec = $('#recSection');
  if (me && me.role === 'student') {
    rec.hidden = false;
    const { categories } = await api('/categories'); let mine = new Set((me.interests || []).map(String));
    const draw = () => { $('#chips').innerHTML = categories.map((c) => `<button class="chip ${mine.has(c._id) ? 'on' : ''}" data-int="${c._id}">${esc(c.name)}</button>`).join(''); };
    const load = async () => { try { const d = await api('/books/recommendations'); $('#recNote').textContent = d.note || ''; $('#recs').innerHTML = d.books.length ? d.books.map(bookCard).join('') : `<div style="grid-column:1/-1">${empty('Pick a few interests above to get suggestions.')}</div>`; } catch (e) { $('#recs').innerHTML = empty(e.message); } };
    draw(); load();
    $('#chips').addEventListener('click', async (e) => {
      const c = e.target.closest('[data-int]'); if (!c) return;
      mine.has(c.dataset.int) ? mine.delete(c.dataset.int) : mine.add(c.dataset.int); draw();
      try { await api('/auth/interests', { method: 'PUT', body: { interests: [...mine] } }); load(); } catch (er) { toast(er.message, 'err'); }
    });
  }
  window.onBorrowed = find; find();
});
