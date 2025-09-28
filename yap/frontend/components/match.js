import { apiFetch } from './utils.js';

const placeholderImage =
  'https://avatars.dicebear.com/api/initials/Yap.svg';

export const mountMatch = (root, { onStartChat, onBack }) => {
  const tpl = document.getElementById('match-template');
  const view = tpl.content.cloneNode(true);
  const findBtn = view.querySelector('#findMatch');
  const statusEl = view.querySelector('#matchStatus');
  const matchContent = view.querySelector('#matchContent');
  const backBtn = view.querySelector('#backToProfile');
  let currentMatch = null;

  const renderMatch = (match) => {
    if (!match) {
      matchContent.innerHTML = '<p>Tap the button to discover a new partner.</p>';
      findBtn.textContent = 'Find match';
      return;
    }
    matchContent.innerHTML = '';
    const img = document.createElement('img');
    img.src = match.profileImageUrl || placeholderImage;
    img.alt = match.displayName;
    const name = document.createElement('h3');
    name.textContent = match.displayName;
    const interests = document.createElement('p');
    const interestText = match.interests?.length ? match.interests.join(', ') : 'No interests shared yet';
    interests.textContent = `Interests: ${interestText}`;
    const startBtn = document.createElement('button');
    startBtn.className = 'primary';
    startBtn.textContent = 'Start yap';
    startBtn.addEventListener('click', () => {
      if (currentMatch) {
        startChat(currentMatch);
      }
    });
    matchContent.append(img, name, interests, startBtn);
    findBtn.textContent = 'Find someone else';
  };

  const startChat = async (match) => {
    try {
      statusEl.textContent = 'Starting…';
      const { yap, partner } = await apiFetch('/api/chat/start', {
        method: 'POST',
        body: { partnerUserId: match._id }
      });
      statusEl.textContent = '';
      onStartChat({ yap, partner });
    } catch (err) {
      statusEl.textContent = err.message;
    }
  };

  findBtn.addEventListener('click', async () => {
    try {
      statusEl.textContent = 'Looking for someone…';
      currentMatch = null;
      renderMatch(null);
      const { match } = await apiFetch('/api/match/find', { method: 'POST' });
      currentMatch = match;
      renderMatch(match);
      statusEl.textContent = 'Match found!';
    } catch (err) {
      statusEl.textContent = err.message;
      renderMatch(null);
    }
  });

  backBtn.addEventListener('click', onBack);

  root.innerHTML = '';
  root.appendChild(view);
  renderMatch(null);
};
