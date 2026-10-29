ready.then(async (me) => {
  if (!guard(me, 'librarian')) return;
  const main = $('#main'); let cats = [];
  const SECTIONS = { overview: 'Overview', books: 'Books', students: 'Students', borrows: 'Borrow & return', fines: 'Fines', reports: 'Reports', settings: 'Settings' };
  $('#side').innerHTML = Object.entries(SECTIONS).map(([k, v]) => `<a href="#${k}" data-s="${k}">${v}</a>`).join('');
  const pill = (s) => `<span class="pill ${/Paid|Returned/.test(s) ? 'ok' : /Waived/.test(s) ? 'info' : /Overdue|Unpaid|Unavailable|Accruing/.test(s) ? 'bad' : 'warn'}">${esc(s)}</span>`;
  const table = (head, rows) => rows.length ? `<div class="tbl"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : empty('No records match.');
  const loadCats = async () => { cats = (await api('/categories')).categories; };
  const catOpts = (sel) => cats.map((c) => `<option value="${c._id}" ${c._id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const DEPTS = ['Computer Science', 'Information Technology', 'AI & Data Science', 'Electronics & Communication', 'Electrical', 'Mechanical', 'Civil', 'Mathematics', 'Physics & Chemistry', 'Management'];

  const views = {
    async overview() {
      const s = await api('/admin/summary');
      const card = (l, v, c = '') => `<div class="card stat ${c}"><b>${v}</b><span>${l}</span></div>`;
      const max = Math.max(1, ...s.borrowsByCategory.map((c) => c.n)), max7 = Math.max(1, ...s.last7Days.map((d) => d.n));
      main.innerHTML = `<h2>Overview</h2><div class="grid g4">${card('Book titles', s.totalBooks)}${card('Total copies', s.totalCopies)}${card('Available copies', s.availableCopies, 'ok')}${card('Borrowed copies', s.borrowedCopies)}${card('Registered students', s.students)}${card('Active loans', s.activeBorrows)}${card('Overdue books', s.overdue, s.overdue ? 'bad' : '')}${card('Outstanding fines', money(s.outstandingFines), s.outstandingFines ? 'bad' : '')}</div>
      <div class="grid g2 sec"><div class="card"><h3>Borrows by category</h3>${s.borrowsByCategory.length ? s.borrowsByCategory.map((c) => `<div class="bar"><span title="${esc(c.name)}">${esc(c.name)}</span><i style="width:${(c.n / max) * 100}%"></i><b>${c.n}</b></div>`).join('') : '<p class="mute">No borrowing yet.</p>'}</div>
      <div class="card"><h3>Borrows in the last 7 days</h3><div class="cols">${s.last7Days.map((d) => `<div><b>${d.n}</b><i style="height:${(d.n / max7) * 85}%"></i>${d.day}</div>`).join('')}</div></div></div>`;
    },

    async books() {
      await loadCats();
      const st = { q: '', category: '', page: 1 };
      main.innerHTML = `<div class="sec-h"><h2>Books</h2><button class="btn" id="addBook">Add book</button></div><div class="toolbar"><input id="bq" placeholder="Search title, author, ISBN or book ID"><select id="bc"><option value="">All categories</option>${catOpts()}</select></div><div id="bt">${spinner()}</div><div class="pager"><button class="btn ghost sm" id="bp">Previous</button><span id="bn" class="mute"></span><button class="btn ghost sm" id="bnx">Next</button></div>`;
      const draw = async () => {
        const d = await api('/books?' + qs({ ...st, limit: 15 }));
        $('#bt').innerHTML = table(['ID', 'Title', 'Category', 'Rack', 'Copies', ''], d.books.map((b) => `<tr><td>${esc(b.bookId)}</td><td class="wrapc">${esc(b.title)}</td><td>${esc(b.category.name)}</td><td class="rack">${esc(b.shelf)}</td><td>${b.availableCopies}/${b.totalCopies}</td><td><button class="btn ghost sm" data-edit="${b._id}">Edit</button> <button class="btn danger sm" data-del="${b._id}">Delete</button></td></tr>`));
        $('#bn').textContent = `Page ${d.page} of ${d.pages} · ${d.total} books`; $('#bp').disabled = d.page <= 1; $('#bnx').disabled = d.page >= d.pages; main._books = d.books;
      };
      $('#bq').addEventListener('input', debounce((e) => { st.q = e.target.value.trim(); st.page = 1; draw(); }));
      $('#bc').addEventListener('change', (e) => { st.category = e.target.value; st.page = 1; draw(); });
      $('#bp').onclick = () => { st.page--; draw(); }; $('#bnx').onclick = () => { st.page++; draw(); };
      const form = (b = {}) => {
        const m = modal(`<div class="modal-h"><h2>${b._id ? 'Edit book' : 'Add book'}</h2><button class="x" data-close aria-label="Close">×</button></div><form id="bkf">
        <label>Title</label><input name="title" required value="${esc(b.title)}"><label>Author</label><input name="author" required value="${esc(b.author)}">
        <div class="row"><div><label>Category</label><select name="category">${catOpts(b.category?._id)}</select></div><div><label>Rack / shelf (e.g. CS-R2-L3)</label><input name="shelf" required value="${esc(b.shelf)}"></div>
        <div><label>Total copies</label><input name="totalCopies" type="number" min="1" required value="${esc(b.totalCopies || 1)}"></div><div><label>Year</label><input name="year" type="number" value="${esc(b.year)}"></div>
        <div><label>ISBN</label><input name="isbn" value="${esc(b.isbn)}"></div><div><label>Publisher</label><input name="publisher" value="${esc(b.publisher)}"></div></div>
        <label>Cover image link (https:// or /assets/…, blank = auto cover)</label><input name="coverUrl" value="${esc(b.coverUrl)}"><label>Description</label><textarea name="description" rows="3">${esc(b.description)}</textarea>
        <p class="err" id="bke"></p><button class="btn" type="submit">Save book</button></form>`);
        $('#bkf', m.el).addEventListener('submit', async (e) => {
          e.preventDefault();
          try { await api(b._id ? '/books/' + b._id : '/books', { method: b._id ? 'PUT' : 'POST', body: Object.fromEntries(new FormData(e.target)) }); m.close(); toast('Book saved.'); draw(); } catch (er) { $('#bke', m.el).textContent = er.message; }
        });
      };
      $('#addBook').onclick = () => form();
      main.onclick = async (e) => {
        const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
        if (ed) form(main._books.find((x) => x._id === ed.dataset.edit));
        if (dl && confirm('Delete this book permanently?')) { try { await api('/books/' + dl.dataset.del, { method: 'DELETE' }); toast('Book deleted.'); draw(); } catch (er) { toast(er.message, 'err'); } }
      };
      draw();
    },

    async students() {
      main.innerHTML = `<h2>Students</h2><div class="toolbar"><input id="sq" placeholder="Search by name, student ID or email"></div><div id="st">${spinner()}</div>`;
      const draw = async () => {
        const { students } = await api('/admin/students?' + qs({ q: $('#sq').value.trim() }));
        $('#st').innerHTML = table(['Name', 'Student ID', 'Department', 'Year', 'Email', 'Phone', 'Active loans', ''], students.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.studentId)}</td><td>${esc(s.department)}</td><td>${s.year}</td><td>${esc(s.email)}</td><td>${esc(s.phone)}</td><td>${s.activeLoans}</td><td><button class="btn ghost sm" data-view="${s._id}">View loans</button></td></tr>`));
      };
      $('#sq').addEventListener('input', debounce(draw));
      main.onclick = async (e) => {
        const v = e.target.closest('[data-view]'); if (!v) return;
        const d = await api(`/admin/students/${v.dataset.view}/borrows`);
        modal(`<div class="modal-h"><h2>${esc(d.student.name)}</h2><button class="x" data-close aria-label="Close">×</button></div><p class="mute small">${esc(d.student.studentId)} · ${esc(d.student.department)} · year ${d.student.year}</p>${table(['Book', 'Borrowed', 'Due', 'Status', 'Fine'], d.borrows.map((b) => `<tr><td class="wrapc">${esc(b.book?.title)}</td><td>${fmtDate(b.borrowDate)}</td><td>${fmtDate(b.dueDate)}</td><td>${pill(b.status === 'returned' ? 'Returned' : b.isOverdue ? 'Overdue' : 'Borrowed')}</td><td>${b.fineAmount ? money(b.fineAmount) : '—'}</td></tr>`))}`);
      };
      draw();
    },

    async borrows() {
      main.innerHTML = `<h2>Borrowing and returns</h2><div class="toolbar"><input id="tq" placeholder="Student name, ID or transaction"><select id="ts"><option value="">All</option><option value="active">Active</option><option value="overdue">Overdue</option><option value="returned">Returned</option></select></div><div id="tt">${spinner()}</div>`;
      const draw = async () => {
        const { borrows } = await api('/borrow?' + qs({ q: $('#tq').value.trim(), status: $('#ts').value }));
        $('#tt').innerHTML = table(['Transaction', 'Student', 'Book', 'Borrowed', 'Due', 'Returned', 'Status', 'Fine', ''], borrows.map((b) => `<tr><td>${esc(b.txnId)}</td><td>${esc(b.studentName)}<br><small class="mute">${esc(b.studentId)}</small></td><td class="wrapc">${esc(b.book?.title)}</td><td>${fmtDate(b.borrowDate)}</td><td>${fmtDate(b.dueDate)}</td><td>${fmtDate(b.returnDate)}</td><td>${pill(b.status === 'returned' ? 'Returned' : b.isOverdue ? 'Overdue' : 'Borrowed')}</td><td>${b.fineAmount ? money(b.fineAmount) : '—'}</td><td>${b.status === 'borrowed' ? `<button class="btn sm" data-ret="${b._id}">Record return</button>` : ''}</td></tr>`));
      };
      $('#tq').addEventListener('input', debounce(draw)); $('#ts').addEventListener('change', draw);
      main.onclick = async (e) => {
        const r = e.target.closest('[data-ret]'); if (!r || !confirm('Record this book as returned?')) return;
        try { const d = await api(`/borrow/${r.dataset.ret}/return`, { method: 'POST' }); toast(d.message, d.fineAmount ? 'err' : 'ok'); draw(); } catch (er) { toast(er.message, 'err'); }
      };
      draw();
    },

    async fines() {
      main.innerHTML = `<h2>Fines</h2><div class="toolbar"><select id="fs"><option value="">All fines</option><option>Unpaid</option><option>Paid</option><option>Waived</option></select></div><div id="ft">${spinner()}</div>`;
      const draw = async () => {
        const d = await api('/fines?' + qs({ status: $('#fs').value }));
        $('#ft').innerHTML = (d.accruing.length ? `<h3>Overdue now (fine still growing)</h3>${table(['Student', 'Book', 'Due', 'Overdue days', 'Fine so far'], d.accruing.map((b) => `<tr><td>${esc(b.studentName)} <small class="mute">${esc(b.studentId)}</small></td><td>${esc(b.book?.title)}</td><td>${fmtDate(b.dueDate)}</td><td>${b.overdueDays}</td><td>${money(b.fineAmount)}</td></tr>`))}<p class="small mute">Record the return to turn these into fine records.</p>` : '') +
          `<h3 style="margin-top:1.5rem">Fine records</h3>${table(['Student', 'Book', 'Days', 'Amount', 'Status', 'Reason', ''], d.fines.map((f) => `<tr><td>${esc(f.user?.name)} <small class="mute">${esc(f.user?.studentId)}</small></td><td class="wrapc">${esc(f.borrow?.book?.title)}</td><td>${f.overdueDays}</td><td>${money(f.amount)}</td><td>${pill(f.status)}</td><td class="wrapc">${esc(f.waiverReason || '')}</td><td>${f.status === 'Unpaid' ? `<button class="btn sm" data-pay="${f._id}">Mark paid</button> <button class="btn ghost sm" data-waive="${f._id}">Waive</button>` : ''}</td></tr>`))}`;
      };
      $('#fs').addEventListener('change', draw);
      main.onclick = async (e) => {
        const p = e.target.closest('[data-pay]'), w = e.target.closest('[data-waive]');
        try {
          if (p) { await api(`/fines/${p.dataset.pay}/pay`, { method: 'PATCH' }); toast('Fine marked as paid.'); draw(); }
          if (w) {
            const m = modal(`<div class="modal-h"><h2>Waive fine</h2><button class="x" data-close aria-label="Close">×</button></div><form id="wf"><label>Reason (recorded with the fine)</label><textarea name="reason" rows="3" required minlength="3"></textarea><p class="err" id="we"></p><button class="btn" type="submit">Waive fine</button></form>`);
            $('#wf', m.el).addEventListener('submit', async (ev) => { ev.preventDefault(); try { await api(`/fines/${w.dataset.waive}/waive`, { method: 'PATCH', body: { reason: new FormData(ev.target).get('reason') } }); m.close(); toast('Fine waived.'); draw(); } catch (er) { $('#we', m.el).textContent = er.message; } });
          }
        } catch (er) { toast(er.message, 'err'); }
      };
      draw();
    },

    async reports() {
      await loadCats();
      main.innerHTML = `<h2>Reports</h2><form id="rf" class="card"><div class="row"><div><label>From</label><input type="date" name="from"></div><div><label>To</label><input type="date" name="to"></div><div><label>Category</label><select name="category"><option value="">All</option>${catOpts()}</select></div><div><label>Department</label><select name="department"><option value="">All</option>${DEPTS.map((d) => `<option>${d}</option>`).join('')}</select></div><div><label>Status</label><select name="status"><option value="">All</option><option value="active">Active</option><option value="overdue">Overdue</option><option value="returned">Returned</option></select></div></div>
      <div style="display:flex;gap:.6rem;margin-top:1rem"><button class="btn" type="submit">Run report</button><a class="btn cyan" id="csv" href="#">Export CSV</a></div></form><div id="rt" style="margin-top:1rem"></div>`;
      const params = () => qs(Object.fromEntries(new FormData($('#rf'))));
      const run = async () => {
        $('#rt').innerHTML = spinner();
        const d = await api('/admin/reports/borrows?' + params());
        $('#rt').innerHTML = `<p class="mute">${d.total} record${d.total === 1 ? '' : 's'}${d.total > 500 ? ' (first 500 shown; the CSV has all)' : ''}</p>` + table(['Transaction', 'Student', 'Department', 'Book', 'Category', 'Borrowed', 'Due', 'Status', 'Fine'], d.rows.map((r) => `<tr><td>${esc(r.txnId)}</td><td>${esc(r.student)}</td><td>${esc(r.department)}</td><td class="wrapc">${esc(r.book)}</td><td>${esc(r.category)}</td><td>${fmtDate(r.borrowDate)}</td><td>${fmtDate(r.dueDate)}</td><td>${pill(r.status)}</td><td>${r.fine ? money(r.fine) : '—'}</td></tr>`));
      };
      $('#rf').addEventListener('submit', (e) => { e.preventDefault(); run().catch((er) => toast(er.message, 'err')); });
      $('#csv').addEventListener('click', (e) => { e.preventDefault(); location.href = '/api/admin/reports/borrows?' + params() + '&format=csv'; });
      run();
    },

    async settings() {
      await loadCats(); const s = await api('/settings');
      main.innerHTML = `<h2>Settings</h2><div class="card"><h3>Library rules</h3><p class="mute small">These are enforced by the server and set in <code>backend/.env</code> (LOAN_DAYS, FINE_PER_DAY, MAX_ACTIVE_BORROWS).</p><dl class="kv"><dt>Loan period</dt><dd>${s.loanDays} days</dd><dt>Late fine</dt><dd>${money(s.finePerDay)} per overdue day</dd><dt>Max books per student</dt><dd>${s.maxActive}</dd></dl></div>
      <div class="card sec"><h3>Categories</h3><form id="cf" class="row" style="align-items:end"><div><label>Name</label><input name="name" required></div><div><label>Code (2–5 letters)</label><input name="code" required pattern="[A-Za-z]{2,5}"></div><div><button class="btn" type="submit">Add category</button></div></form><p class="err" id="ce"></p>
      ${table(['Name', 'Code', 'Books', ''], cats.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.code)}</td><td>${c.bookCount}</td><td><button class="btn danger sm" data-cd="${c._id}">Delete</button></td></tr>`))}</div>`;
      $('#cf').addEventListener('submit', async (e) => { e.preventDefault(); try { await api('/categories', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('Category added.'); views.settings(); } catch (er) { $('#ce').textContent = er.message; } });
      main.onclick = async (e) => { const d = e.target.closest('[data-cd]'); if (d && confirm('Delete this category?')) { try { await api('/categories/' + d.dataset.cd, { method: 'DELETE' }); toast('Category deleted.'); views.settings(); } catch (er) { toast(er.message, 'err'); } } };
    },
  };

  async function route() {
    const k = (location.hash || '#overview').slice(1); const key = views[k] ? k : 'overview';
    $$('#side a').forEach((a) => a.classList.toggle('on', a.dataset.s === key));
    main.innerHTML = spinner(); main.onclick = null;
    try { await views[key](); } catch (e) { main.innerHTML = empty(e.message); }
  }
  window.addEventListener('hashchange', route); route();
});
