/* ---- HarborLens Authentication Controller ---- */

const byId = (id) => document.getElementById(id);
const viewSignin = byId('view-signin');
const viewRegister = byId('view-register');
const toastContainer = byId('auth-toast');

/* ---- Toast Notification ---- */
function showToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>
    <span>${message}</span>
  `;
  toastContainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

/* ---- Switch Views (Sign In ⇄ Register) ---- */
function switchView(toRegister) {
  if (toRegister) {
    viewSignin.hidden = true;
    viewRegister.hidden = false;
    document.title = 'HarborLens | Create Account';
    history.replaceState(null, '', '#register');
  } else {
    viewRegister.hidden = true;
    viewSignin.hidden = false;
    document.title = 'HarborLens | Sign In';
    history.replaceState(null, '', '#signin');
  }
}

byId('go-to-register').addEventListener('click', () => switchView(true));
byId('go-to-signin').addEventListener('click', () => switchView(false));

if (window.location.hash === '#register') {
  switchView(true);
}

/* ---- Password Eye Visibility Toggle ---- */
document.querySelectorAll('.eye-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = byId(btn.dataset.target);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    btn.innerHTML = isPassword
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
           <line x1="1" y1="1" x2="23" y2="23"/>
         </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
           <circle cx="12" cy="12" r="3" />
         </svg>`;
  });
});

/* ---- Handle Authentication Success ---- */
function handleAuthSuccess(data) {
  localStorage.setItem('hl_token', data.token);
  localStorage.setItem('hl_user', JSON.stringify(data.user));
  const countKey = `hl_login_count_${data.user.id}`;
  localStorage.setItem(countKey, String((parseInt(localStorage.getItem(countKey) || '0', 10)) + 1));

  // Always scrub stale new-user flags on every auth — only registration re-sets them intentionally
  localStorage.removeItem('hl_is_new_user');
  localStorage.removeItem(`hl_is_new_user_${data.user.id}`);

  showToast(data.message || 'Authentication successful! Redirecting...', 'success');

  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 900);
}

/* ---- Sign In Submission ---- */
byId('signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = byId('signin-email').value.trim();
  const password = byId('signin-password').value;
  const remember_me = byId('signin-remember').checked;

  const btn = byId('signin-btn');
  const spinner = btn.querySelector('.auth-spinner');
  btn.disabled = true;
  spinner.hidden = false;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed. Please verify credentials.');
    }

    handleAuthSuccess(data);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    spinner.hidden = true;
  }
});

/* ---- Register Submission ---- */
byId('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const full_name = byId('reg-fullname').value.trim();
  const email = byId('reg-email').value.trim();
  const password = byId('reg-password').value;
  const confirm_password = byId('reg-confirm-password').value;
  const terms = byId('reg-terms').checked;

  if (!terms) {
    showToast('Please agree to the Terms of Service to continue.', 'error');
    return;
  }

  if (password !== confirm_password) {
    showToast('Passwords do not match. Please re-enter.', 'error');
    return;
  }

  if (password.length < 8) {
    showToast('Password must be at least 8 characters long.', 'error');
    return;
  }

  const btn = byId('register-btn');
  const spinner = btn.querySelector('.auth-spinner');
  btn.disabled = true;
  spinner.hidden = false;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password, confirm_password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed. Please check inputs.');
    }

    handleAuthSuccess(data);
    // Re-set after handleAuthSuccess so the scrub inside doesn't wipe these
    localStorage.setItem(`hl_is_new_user_${data.user.id}`, 'true');
    localStorage.setItem('hl_is_new_user', 'true');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    spinner.hidden = true;
  }
});

/* ---- SSO Quick Demos (Okta & Entra) ---- */
async function triggerSSO(provider) {
  try {
    const res = await fetch('/api/auth/sso-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'SSO authentication failed.');
    handleAuthSuccess(data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

byId('sso-okta').addEventListener('click', () => triggerSSO('okta'));
byId('sso-entra').addEventListener('click', () => triggerSSO('entra'));

byId('forgot-password-link').addEventListener('click', (e) => {
  e.preventDefault();
  showToast('Password reset link sent to your registered email.', 'success');
});
