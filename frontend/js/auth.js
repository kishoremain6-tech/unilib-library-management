ready.then((me) => {
  const form = $('#authForm'); const mode = form.dataset.mode;
  if (me) { location.href = me.role === 'librarian' ? '/admin/dashboard.html' : '/student-dashboard.html'; return; }
  const next = new URLSearchParams(location.search).get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  const borrowTarget = (() => {
    if (!safeNext) return false;
    const target = new URL(safeNext, location.origin);
    return target.origin === location.origin && target.pathname === '/book-details.html'
      && target.searchParams.get('borrow') === '1' && /^[a-f\d]{24}$/i.test(target.searchParams.get('id') || '');
  })();
  if (mode === 'register' && !borrowTarget) { location.replace('/books.html'); return; }
  if (mode === 'register') {
    const loginLink = $('[data-register-login]');
    if (loginLink) loginLink.href = '/login.html?next=' + encodeURIComponent(safeNext);
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $$('.err', form).forEach((x) => (x.textContent = ''));
    const body = Object.fromEntries(new FormData(form).entries());
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try {
      if (mode === 'register') {
        if (body.password !== body.confirmPassword) { $('[data-err=confirmPassword]').textContent = 'Passwords do not match.'; btn.disabled = false; return; }
        await api('/auth/register', { method: 'POST', body }); toast('Account created. Welcome to UniLib!');
        setTimeout(() => (location.href = safeNext || '/student-dashboard.html'), 600);
      } else {
        body.role = mode === 'admin' ? 'librarian' : 'student';
        const { user } = await api('/auth/login', { method: 'POST', body });
        location.href = user.role === 'librarian' ? '/admin/dashboard.html' : (safeNext || '/student-dashboard.html');
      }
    } catch (er) {
      if (er.errors) Object.entries(er.errors).forEach(([k, v]) => { const t = $(`[data-err=${k}]`); if (t) t.textContent = v; });
      $('#formErr').textContent = er.message; btn.disabled = false;
    }
  });
});
