import { mountAuth } from './components/auth.js';
import { mountProfile } from './components/profile.js';
import { mountMatch } from './components/match.js';
import { mountChat } from './components/chat.js';
import { apiFetch, setCsrfToken } from './components/utils.js';

const appRoot = document.getElementById('app');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;
let activeCleanup = null;

const setUser = (user) => {
  currentUser = user;
  logoutBtn.style.display = user ? 'inline-flex' : 'none';
};

const shouldCompleteProfile = (user) => {
  return !user?.profileImageUrl || !user?.interests?.length;
};

const showAuth = () => {
  cleanup();
  mountAuth(appRoot, {
    onAuthenticated: (user, csrf) => {
      setCsrfToken(csrf);
      setUser(user);
      if (shouldCompleteProfile(user)) {
        showProfile();
      } else {
        showMatch();
      }
    }
  });
};

const showProfile = () => {
  cleanup();
  activeCleanup = null;
  mountProfile(appRoot, {
    user: currentUser,
    onUserUpdated: (user) => {
      setUser(user);
    },
    onNavigateMatch: () => {
      if (shouldCompleteProfile(currentUser)) {
        alert('Add a profile photo and at least one interest to start matching.');
      } else {
        showMatch();
      }
    }
  });
};

const showMatch = () => {
  cleanup();
  activeCleanup = null;
  mountMatch(appRoot, {
    onStartChat: ({ yap, partner }) => {
      showChat({ yap, partner });
    },
    onBack: () => showProfile()
  });
};

const showChat = ({ yap, partner }) => {
  cleanup();
  activeCleanup = mountChat(appRoot, {
    yap,
    partner,
    currentUser,
    onBack: () => {
      showMatch();
    }
  });
};

const cleanup = () => {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
};

const fetchSession = async () => {
  try {
    const { user, csrfToken } = await apiFetch('/api/auth/me');
    setCsrfToken(csrfToken);
    setUser(user);
    if (shouldCompleteProfile(user)) {
      showProfile();
    } else {
      showMatch();
    }
  } catch (err) {
    setUser(null);
    showAuth();
  }
};

logoutBtn.addEventListener('click', async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error(err);
  }
  setUser(null);
  showAuth();
});

setUser(null);
fetchSession();
