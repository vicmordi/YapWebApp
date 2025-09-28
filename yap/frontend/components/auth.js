import { apiFetch, setCsrfToken } from './utils.js';

export const mountAuth = (root, { onAuthenticated }) => {
  const tpl = document.getElementById('auth-template');
  const view = tpl.content.cloneNode(true);
  const loginForm = view.querySelector('#loginForm');
  const registerForm = view.querySelector('#registerForm');
  const statusEl = view.querySelector('#authStatus');
  const tabs = view.querySelectorAll('.tab');

  const switchTab = (tab) => {
    tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
    loginForm.classList.toggle('visible', tab === 'login');
    registerForm.classList.toggle('visible', tab === 'register');
    statusEl.textContent = '';
  };

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  const handleAuth = async (url, form) => {
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    try {
      statusEl.textContent = 'Loading…';
      const { user, csrfToken } = await apiFetch(url, { method: 'POST', body });
      setCsrfToken(csrfToken);
      onAuthenticated(user, csrfToken);
    } catch (err) {
      statusEl.textContent = err.message;
    }
  };

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleAuth('/api/auth/login', loginForm);
  });

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleAuth('/api/auth/register', registerForm);
  });

  root.innerHTML = '';
  root.appendChild(view);
};
