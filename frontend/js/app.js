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

/* Generated cover: title-specific artwork for books without a supplied image. Works offline. */
function cover(b) {
  if (b.coverUrl) return b.coverUrl;
  const code = b.category?.code || 'XX';
  const title = String(b.title || 'Untitled');
  const hash = [...`${title}|${b.author || ''}|${b.bookId || ''}`].reduce((n, c) => (Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
  const hue = hash % 360;
  const accent = (hue + 145) % 360;
  const topic = `${title} ${b.category?.name || ''}`.toLowerCase();
  const motifs = [
    [/cyber|security|protection|switchgear/, '<path d="M0-48 38-32v31c0 25-16 42-38 53C-22 41-38 24-38-1v-31z" fill="none"/><path d="m-18 0 12 12 25-28"/>'],
    [/artificial intelligence|machine learning|deep learning|neural|robot|vision|pattern recognition/, '<path d="M-42-10h18m48 0h18M-23-38v18m46 20v18M-23 20v18m46-20v20"/><circle cx="-24" cy="-10" r="8"/><circle cx="24" cy="-10" r="8"/><circle cy="-38" r="8"/><circle cy="20" r="8"/><circle cx="-23" cy="38" r="8"/><circle cx="23" cy="38" r="8"/><circle r="13"/>'],
    [/data|statistic|probability|analytics|management|marketing|financial|business|entrepreneur|operations research|strategic/, '<path d="M-45 38h90M-38 30V2h16v28m5 0v-48h16v48m7 0V-8h16v38"/><path d="m-35-12 20-16 17 10 31-27"/>'],
    [/signal|wave|communication|antenna|analog|digital|circuit|microprocessor|vlsi|electronics/, '<path d="M-48 0h16l10-25 16 50 14-50 13 50 10-25h17"/><circle r="45" fill="none" stroke-dasharray="3 9"/>'],
    [/electrical|power|renewable|electric|energy|drive/, '<path d="m8-48-34 51h24l-7 45 42-61H7z" fill="none"/>'],
    [/mechanic|thermodynamic|fluid|heat transfer|machine design|manufactur|automobile|mechatronic/, '<circle r="35"/><circle r="13"/><path d="M-5-49v14m10-14v14m30 30h14m-14 10h14m-63 0h14m-14-10h14M-5 35v14m10-14v14"/>'],
    [/civil|structur|concrete|geotechn|survey|transport|hydrolog|construction|steel structure|building material|environmental engineering/, '<path d="M-47 40h94M-40 40v-43h22v43m9 0v-68h22v68m9 0V9h22v31"/><path d="M-14-13h6m-6 13h6m-6 13h6m16-39h6m-6 13h6m-6 13h6m-6 13h6"/>'],
    [/mathemat|calculus|algebra|geometry|equation|numerical|analysis|complex|discrete|operations research/, '<circle r="42" fill="none"/><path d="M-30 20c18-54 42-54 60 0M-35-22h70M-35 22h70"/><text x="-18" y="12" font-size="42" stroke="none" fill="currentColor">∑</text>'],
    [/physics|chemistry|quantum|optics|classical mechanics|solid state|organic|inorganic|analytical/, '<ellipse rx="47" ry="19"/><ellipse rx="47" ry="19" transform="rotate(60)"/><ellipse rx="47" ry="19" transform="rotate(120)"/><circle r="8" fill="currentColor"/>'],
    [/computer|algorithm|software|database|compiler|network|web technolog|operating system|data structure/, '<rect x="-32" y="-32" width="64" height="64" rx="10"/><path d="M-15-15h30v30h-30zM-48-20h16m-16 20h16m-16 20h16m32-40h16m-16 20h16m-16 20h16M-20-48v16m20-16v16m20-16v16m-20 32v16m20-16v16"/>'],
  ];
  const motif = motifs.find(([pattern]) => pattern.test(topic))?.[1]
    || '<path d="M0-42 38-20v42L0 44-38 22v-42z"/><path d="M0-42v86m-38-64 38 22 38-22M-38 22l38-22 38 22"/>';
  const lines = []; let line = '';
  title.split(/\s+/).forEach((word) => {
    if ((line + ' ' + word).trim().length > 21 && line) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  });
  if (line) lines.push(line);
  const titleLines = lines.slice(0, 4);
  if (lines.length > 4) titleLines[3] = `${titleLines[3].slice(0, 17)}…`;
  const titleMarkup = titleLines.map((text, i) => `<text x="30" y="${268 + i * 23}" font-size="18" font-weight="800" fill="#fff">${esc(text)}</text>`).join('');
  const specks = Array.from({ length: 7 }, (_, i) => {
    const x = 35 + ((hash >>> (i * 3)) % 230);
    const y = 95 + ((hash >>> (i * 4 + 2)) % 135);
    const r = 2 + ((hash >>> (i + 5)) % 5);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="hsla(${accent},85%,80%,.45)"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" style="color:hsl(${accent},90%,82%)"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},68%,38%)"/><stop offset="1" stop-color="hsl(${(hue + 48) % 360},75%,13%)"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/><rect width="14" height="400" fill="rgba(0,0,0,.25)"/><circle cx="150" cy="158" r="${53 + (hash % 16)}" fill="none" stroke="hsla(${accent},80%,85%,.24)" stroke-width="1.5"/><circle cx="150" cy="158" r="67" fill="none" stroke="hsla(${accent},80%,85%,.16)" stroke-width="1" stroke-dasharray="${4 + (hash % 7)} 8"/>${specks}<g transform="translate(150 158) rotate(${hash % 36})" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${motif}</g><text x="30" y="43" font-size="12" font-weight="700" fill="rgba(255,255,255,.75)">${esc(code)} · UNILIB</text>${titleMarkup}</svg>`;
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
  else links += L('/login.html', 'Student login') + L('/admin/login.html', 'Librarian');
  $('#nav').innerHTML = `<div class="nav"><div class="nav-in"><a class="brand" href="/"><i>U</i>UniLib</a><button class="burger" aria-label="Menu" data-burger>☰</button><nav class="links">${links}</nav></div></div>`;
}
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-burger]')) $('.links').classList.toggle('open');
  if (e.target.closest('[data-logout]')) { await api('/auth/logout', { method: 'POST' }); location.href = '/'; }
  const bb = e.target.closest('[data-borrow]');
  if (bb) {
    if (!window.ME) {
      const next = `/book-details.html?id=${encodeURIComponent(bb.dataset.borrow)}&borrow=1`;
      location.href = '/register.html?next=' + encodeURIComponent(next);
      return;
    }
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
