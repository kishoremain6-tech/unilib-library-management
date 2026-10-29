ready.then(async (me) => {
  if (!guard(me, 'student')) return;
  const page = document.body.dataset.page;
  window.ME = me;
  const statusPill = (b) => b.status === 'returned' ? '<span class="pill info">Returned</span>' : b.isOverdue ? '<span class="pill bad">Overdue</span>' : b.dueSoon ? '<span class="pill warn">Due soon</span>' : '<span class="pill ok">On loan</span>';
  const fineCell = (b) => b.fineAmount > 0 ? `${money(b.fineAmount)} <span class="pill ${b.fineStatus === 'Paid' ? 'ok' : b.fineStatus === 'Waived' ? 'info' : 'bad'}">${esc(b.fineStatus)}</span>` : '—';

  const rows = (list, withReturn) => list.length ? `<div class="tbl"><table><thead><tr><th>Book</th><th>Rack</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Status</th><th>Overdue</th><th>Fine</th>${withReturn ? '<th></th>' : ''}</tr></thead><tbody>${list.map((b) => `<tr><td class="wrapc"><a href="/book-details.html?id=${esc(b.book?._id)}">${esc(b.book?.title || 'Removed book')}</a><br><small class="mute">${esc(b.txnId)}</small></td><td class="rack">${esc(b.book?.shelf || '')}</td><td>${fmtDate(b.borrowDate)}</td><td>${fmtDate(b.dueDate)}</td><td>${fmtDate(b.returnDate)}</td><td>${statusPill(b)}</td><td>${b.overdueDays ? b.overdueDays + ' day' + (b.overdueDays > 1 ? 's' : '') : '—'}</td><td>${fineCell(b)}</td>${withReturn ? `<td>${b.status === 'borrowed' ? `<button class="btn sm" data-return="${esc(b._id)}">Return</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table></div>` : empty('Nothing to show here yet.');

  let all = [];
  async function load() {
    try {
      all = (await api('/borrow/mine')).borrows;
      if (page === 'fines') return loadFines();
      const active = all.filter((b) => b.status === 'borrowed');
      if (page === 'dashboard') {
        const over = active.filter((b) => b.isOverdue), soon = active.filter((b) => b.dueSoon);
        const owed = over.reduce((s, b) => s + b.fineAmount, 0) + all.filter((b) => b.fineStatus === 'Unpaid').reduce((s, b) => s + b.fineAmount, 0);
        $('#stats').innerHTML = [['Currently borrowed', active.length, ''], ['Due soon', soon.length, soon.length ? 'warn' : ''], ['Overdue', over.length, over.length ? 'bad' : ''], ['Outstanding fines', money(owed), owed ? 'bad' : 'ok']].map(([l, v, c]) => `<div class="card stat ${c}"><b>${v}</b><span>${l}</span></div>`).join('');
        const notes = [...over.map((b) => `<div class="notice bad"><strong>${esc(b.book.title)}</strong> is ${b.overdueDays} day${b.overdueDays > 1 ? 's' : ''} overdue. Fine so far: ${money(b.fineAmount)}. Return it at the desk.</div>`), ...soon.map((b) => `<div class="notice"><strong>${esc(b.book.title)}</strong> is due ${b.daysLeft === 0 ? 'today' : 'tomorrow'} (${fmtDate(b.dueDate)}).</div>`)];
        $('#notes').innerHTML = notes.join('') || '<p class="mute">No alerts. Nothing is due soon or overdue.</p>';
        $('#nbadge').textContent = notes.length; $('#nbadge').hidden = !notes.length;
        $('#active').innerHTML = rows(active, true);
        $('#welcome').textContent = `Welcome back, ${me.name.split(' ')[0]}`;
        $('#profile').innerHTML = `${esc(me.studentId)} · ${esc(me.department)}, year ${me.year} · ${esc(me.email)}`;
      } else draw();
    } catch (e) { $('#list') && ($('#list').innerHTML = empty(e.message)); toast(e.message, 'err'); }
  }
  function draw() {
    const q = ($('#fq')?.value || '').toLowerCase(), s = $('#fs')?.value || '';
    let list = page === 'mybooks' ? all.filter((b) => b.status === 'borrowed') : all;
    list = list.filter((b) => (!q || (b.book?.title || '').toLowerCase().includes(q) || b.txnId.toLowerCase().includes(q)) && (!s || (s === 'overdue' ? b.isOverdue : s === 'returned' ? b.status === 'returned' : s === 'active' ? b.status === 'borrowed' : true)));
    $('#list').innerHTML = rows(list, page === 'mybooks');
  }
  async function loadFines() {
    const d = await api('/fines/mine');
    $('#owed').textContent = money(d.outstanding);
    const acc = d.accruing.length ? `<h3>Growing now (overdue books)</h3><div class="tbl"><table><thead><tr><th>Book</th><th>Due</th><th>Overdue days</th><th>Fine so far</th></tr></thead><tbody>${d.accruing.map((b) => `<tr><td>${esc(b.book.title)}</td><td>${fmtDate(b.dueDate)}</td><td>${b.overdueDays}</td><td>${money(b.fineAmount)}</td></tr>`).join('')}</tbody></table></div><p class="small mute">This amount rises ₹10 each day until you return the book.</p>` : '<p class="mute">No books are overdue right now.</p>';
    const rec = d.fines.length ? `<h3 style="margin-top:1.5rem">Fine records</h3><div class="tbl"><table><thead><tr><th>Book</th><th>Overdue days</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead><tbody>${d.fines.map((f) => `<tr><td>${esc(f.borrow?.book?.title || '')}</td><td>${f.overdueDays}</td><td>${money(f.amount)}</td><td><span class="pill ${f.status === 'Paid' ? 'ok' : f.status === 'Waived' ? 'info' : 'bad'}">${f.status}</span></td><td class="wrapc">${esc(f.waiverReason || '')}</td></tr>`).join('')}</tbody></table></div>` : '';
    $('#fineList').innerHTML = acc + rec;
  }
  document.addEventListener('click', async (e) => {
    const r = e.target.closest('[data-return]'); if (!r) return;
    if (!confirm('Mark this book as returned?')) return;
    r.disabled = true;
    try { const d = await api(`/borrow/${r.dataset.return}/return`, { method: 'POST' }); toast(d.message, d.fineAmount ? 'err' : 'ok'); load(); } catch (er) { toast(er.message, 'err'); r.disabled = false; }
  });
  $('#fq')?.addEventListener('input', debounce(draw)); $('#fs')?.addEventListener('change', draw);
  if (page === 'dashboard') {
    api('/books/recommendations').then((d) => { $('#recs').innerHTML = d.books.length ? d.books.slice(0, 4).map(bookCard).join('') : `<div style="grid-column:1/-1">${empty('Choose interests on the Shelf Finder page to see suggestions here.')}</div>`; }).catch(() => {});
  }
  load(); setInterval(load, 60000); // fines refresh every minute (server recalculates each time)
});
