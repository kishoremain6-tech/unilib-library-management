ready.then(async () => {
  const P = new URLSearchParams(location.search);
  const st = { q: P.get('q') || '', category: P.get('category') || '', available: P.get('available') === 'true', page: 1 };
  const sel = $('#cat');
  try {
    const { categories } = await api('/categories');
    sel.innerHTML = '<option value="">All categories</option>' + categories.map((c) => `<option value="${c._id}" ${c._id === st.category ? 'selected' : ''}>${esc(c.name)} (${c.bookCount})</option>`).join('');
  } catch (e) { toast(e.message, 'err'); }
  $('#q').value = st.q; $('#avail').checked = st.available;

  async function load() {
    $('#grid').innerHTML = spinner();
    try {
      const d = await api('/books?' + qs({ ...st, limit: 12 }));
      $('#count').textContent = `${d.total} book${d.total === 1 ? '' : 's'} found`;
      $('#grid').innerHTML = d.books.length ? d.books.map(bookCard).join('') : `<div style="grid-column:1/-1">${empty('No books match these filters. Try a shorter search or another category.')}</div>`;
      $('#pg').textContent = `Page ${d.page} of ${d.pages}`; $('#prev').disabled = d.page <= 1; $('#next').disabled = d.page >= d.pages;
    } catch (e) { $('#grid').innerHTML = empty(e.message); }
  }
  const live = debounce(() => { st.q = $('#q').value.trim(); st.page = 1; load(); }, 250);
  $('#q').addEventListener('input', live);
  sel.addEventListener('change', () => { st.category = sel.value; st.page = 1; load(); });
  $('#avail').addEventListener('change', (e) => { st.available = e.target.checked; st.page = 1; load(); });
  $('#prev').addEventListener('click', () => { st.page--; load(); scrollTo({ top: 0 }); });
  $('#next').addEventListener('click', () => { st.page++; load(); scrollTo({ top: 0 }); });
  window.onBorrowed = load; load();
});
