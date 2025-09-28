let csrfToken = null;

export const setCsrfToken = (token) => {
  csrfToken = token;
};

export const getCsrfToken = () => csrfToken;

export const apiFetch = async (path, { method = 'GET', body, headers = {}, ...rest } = {}) => {
  const opts = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    ...rest
  };
  if (body !== undefined) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  if (method !== 'GET' && csrfToken) {
    opts.headers['x-csrf-token'] = csrfToken;
  }
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || 'Request failed';
    throw new Error(message);
  }
  if (data?.csrfToken) {
    setCsrfToken(data.csrfToken);
  }
  return data;
};

export const formatTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const renderMessage = (message, currentUserId) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'message';
  if (message.senderId === currentUserId) {
    wrapper.classList.add('mine');
  }
  if (message.type === 'text' && message.text) {
    const text = document.createElement('p');
    text.textContent = message.text;
    wrapper.appendChild(text);
  }
  if (message.type === 'image' && message.mediaUrl) {
    const img = document.createElement('img');
    img.src = message.mediaUrl;
    img.alt = 'Shared image';
    wrapper.appendChild(img);
  }
  if (message.type === 'audio' && message.mediaUrl) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = message.mediaUrl;
    wrapper.appendChild(audio);
  }
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = formatTime(message.createdAt);
  wrapper.appendChild(meta);
  return wrapper;
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
