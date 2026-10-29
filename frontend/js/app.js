/* Shared helpers: API client, nav, toasts, modal, book cards, borrow flow */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== false)).toString();

async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch('/api' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = await r.json(); } catch { /* non-JSON */ }
  if (!r.ok) { const e = new Error(data.message || 'Something went wrong. Please try again.'); e.status = r.status; e.errors = data.errors; throw e; }
  return data;
}

function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; t.setAttribute('role', 'status');
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4500);
}
const spinner = () => '<div class="spin" role="status" aria-label="Loading"></div>';
const empty = (m) => `<div class="empty">${esc(m)}</div>`;

function modal(html) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  bg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey); document.body.appendChild(bg);
  const f = bg.querySelector('input,select,textarea,button'); if (f) f.focus();
  return { el: bg.firstElementChild, close };
}

/* Generated cover: used when a book has no cover image. Works offline. */
function cover(b) {
  if (b.coverUrl) return b.coverUrl;
  const code = b.category?.code || 'XX';
  const hue = ([...code].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) * 13) % 360;
  const words = String(b.title).split(' '); const lines = []; let cur = '';
  words.forEach((w) => { if ((cur + ' ' + w).trim().length > 15) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  const t = lines.slice(0, 5).map((l, i) => `<text x="34" y="${120 + i * 26}" font-size="20" font-weight="800" fill="#fff">${esc(l)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,38%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},75%,16%)"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/><rect x="0" y="0" width="14" height="400" fill="rgba(0,0,0,.28)"/><text x="34" y="64" font-size="14" font-weight="700" fill="rgba(255,255,255,.7)">${esc(code)} · UNILIB</text>${t}<text x="34" y="368" font-size="13" fill="rgba(255,255,255,.75)">${esc(String(b.author || '').slice(0, 28))}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function bookCard(b) {
  const av = b.availableCopies > 0;
  return `<article class="book"><a class="cover" href="/book-details.html?id=${esc(b._id)}"><img src="${cover(b)}" alt="Cover of ${esc(b.title)}" loading="lazy"></a>
  <div class="bk-body"><span class="badge cat">${esc(b.category?.name || '')}</span><h3><a href="/book-details.html?id=${esc(b._id)}">${esc(b.title)}</a></h3>
  <p class="mute">${esc(b.author)}</p><p class="rack">Rack ${esc(b.shelf)}</p>
  ${b.borrows ? `<p class="small mute">${b.borrows} borrow${b.borrows > 1 ? 's' : ''}</p>` : ''}${b.reason ? `<p class="small mute">${esc(b.reason)}</p>` : ''}
  <div class="bk-foot"><span class="pill ${av ? 'ok' : 'bad'}">${av ? b.availableCopies + ' available' : 'Unavailable'}</span><button class="btn sm" data-borrow="${esc(b._id)}" ${av ? '' : 'disabled'}>Borrow</button></div></div></article>`;
}

/* ---------- navigation ---------- */
function renderNav(me) {
  const p = location.pathname;
  const L = (href, label) => `<a href="${href}" class="${p === href ? 'on' : ''}">${label}</a>`;
  let links = L('/', 'Home') + L('/books.html', 'Catalogue') + L('/shelf-finder.html', 'Shelf Finder');
  if (me && me.role === 'student') links += L('/student-dashboard.html', 'Dashboard') + L('/my-books.html', 'My Books') + L('/history.html', 'History') + L('/fines.html', 'Fines') + `<button data-logout>Log out</button>`;
  else if (me) links += L('/admin/dashboard.html', 'Admin') + `<button data-logout>Log out</button>`;
  else links += L('/login.html', 'Student login') + L('/admin/login.html', 'Librarian') + `<a href="/register.html" class="btn sm" style="color:#fff">Register</a>`;
  $('#nav').innerHTML = `<div class="nav"><div class="nav-in"><a class="brand" href="/"><i>U</i>UniLib</a><button class="burger" aria-label="Menu" data-burger>☰</button><nav class="links">${links}</nav></div></div>`;
}
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-burger]')) $('.links').classList.toggle('open');
  if (e.target.closest('[data-logout]')) { await api('/auth/logout', { method: 'POST' }); location.href = '/'; }
  const bb = e.target.closest('[data-borrow]');
  if (bb) {
    if (!window.ME) { location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search); return; }
    if (window.ME.role !== 'student') return toast('Librarian accounts cannot borrow books.', 'err');
    bb.disabled = true;
    try { openBorrow((await api('/books/' + bb.dataset.borrow)).book); } catch (er) { toast(er.message, 'err'); }
    bb.disabled = false;
  }
});

function guard(me, role) {
  if (!me) { location.href = (role === 'librarian' ? '/admin/login.html' : '/login.html') + '?next=' + encodeURIComponent(location.pathname + location.search); return false; }
  if (me.role !== role) { location.href = me.role === 'librarian' ? '/admin/dashboard.html' : '/student-dashboard.html'; return false; }
  return true;
}

/* ---------- borrow flow ---------- */
function openBorrow(book) {
  const me = window.ME; const today = new Date(); const due = new Date(today); due.setDate(due.getDate() + 3);
  const f = (l, v) => `<div><label>${l}</label><input value="${esc(v)}" readonly></div>`;
  const m = modal(`<div class="modal-h"><h2>Borrow this book</h2><button class="x" data-close aria-label="Close">×</button></div>
  <p class="mute small">Check your details, then confirm. Your due date is set by the server when you confirm.</p>
  <form id="bf"><div class="row">${f('Student name', me.name)}${f('Student ID', me.studentId)}${f('Department', me.department)}${f('Year', 'Year ' + me.year)}${f('Email', me.email)}${f('Phone', me.phone)}</div>
  <div class="row">${f('Book', book.title)}${f('Book ID', book.bookId)}${f('Borrow date', fmtDate(today))}${f('Due date (3 days)', fmtDate(due))}</div>
  <div class="notice info small" style="margin-top:1rem">Rules: 3-day loan · fine of ₹10 per overdue day · return before borrowing again if anything is overdue.</div>
  <div class="chk"><input type="checkbox" id="agree"><label for="agree">I have read and agree to the library rules.</label></div>
  <p class="err" id="bferr"></p><div style="display:flex;gap:.6rem;margin-top:1rem"><button class="btn" id="bgo">Confirm borrowing</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>`);
  $('#bf', m.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!$('#agree', m.el).checked) { $('#bferr', m.el).textContent = 'Please agree to the library rules.'; return; }
    $('#bgo', m.el).disabled = true;
    try {
      const { transaction: t } = await api('/borrow', { method: 'POST', body: { bookId: book._id, agree: true } });
      m.el.innerHTML = `<h2>Borrowing confirmed ✓</h2><dl class="kv"><dt>Transaction ID</dt><dd>${esc(t.txnId)}</dd><dt>Book</dt><dd>${esc(t.book.title)}</dd><dt>Collect from rack</dt><dd class="rack">${esc(t.book.shelf)}</dd><dt>Borrow date</dt><dd>${fmtDate(t.borrowDate)}</dd><dt>Due date</dt><dd>${fmtDate(t.dueDate)}</dd></dl><div style="display:flex;gap:.6rem"><a class="btn" href="/my-books.html">View my books</a><button class="btn ghost" data-close>Close</button></div>`;
      if (typeof window.onBorrowed === 'function') window.onBorrowed();
    } catch (er) { $('#bferr', m.el).textContent = er.message; $('#bgo', m.el).disabled = false; }
  });
}

window.ready = (async () => {
  let me = null; try { me = (await api('/auth/me')).user; } catch { /* offline */ }
  window.ME = me; renderNav(me); return me;
})();
