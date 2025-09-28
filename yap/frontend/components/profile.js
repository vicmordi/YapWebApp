import { apiFetch } from './utils.js';

const placeholderImage =
  'https://avatars.dicebear.com/api/initials/Yap.svg';

export const mountProfile = (root, { user, onUserUpdated, onNavigateMatch }) => {
  const tpl = document.getElementById('profile-template');
  const view = tpl.content.cloneNode(true);
  const form = view.querySelector('#profileForm');
  const statusEl = view.querySelector('#profileStatus');
  const imageEl = view.querySelector('#profileImage');
  const changePhotoBtn = view.querySelector('#changePhoto');
  const fileInput = view.querySelector('#profileImageInput');
  const toMatchBtn = view.querySelector('#toMatch');
  let profileState = user ? { ...user } : {};

  const renderUser = (current) => {
    form.displayName.value = current.displayName || '';
    form.interests.value = current.interests?.join(', ') || '';
    imageEl.src = current.profileImageUrl || placeholderImage;
  };

  const uploadProfileImage = async (file) => {
    try {
      statusEl.textContent = 'Preparing upload…';
      const sas = await apiFetch('/api/profile/image/sas', {
        method: 'POST',
        body: {
          contentType: file.type,
          sizeBytes: file.size
        }
      });
      statusEl.textContent = 'Uploading…';
      await fetch(sas.sasUrl, {
        method: 'PUT',
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': file.type
        },
        body: file
      });
      statusEl.textContent = 'Saving…';
      const { user: updated } = await apiFetch('/api/profile/image/confirm', {
        method: 'POST',
        body: { imageUrl: sas.blobUrl }
      });
      onUserUpdated(updated);
      profileState = updated;
      renderUser(profileState);
      statusEl.textContent = 'Profile picture updated!';
    } catch (err) {
      statusEl.textContent = err.message;
    }
  };

  changePhotoBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      uploadProfileImage(file);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const interests = (formData.get('interests') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    try {
      statusEl.textContent = 'Saving…';
      const { user: updated } = await apiFetch('/api/profile', {
        method: 'PUT',
        body: {
          displayName: formData.get('displayName'),
          interests
        }
      });
      onUserUpdated(updated);
      profileState = updated;
      statusEl.textContent = 'Profile saved!';
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });

  toMatchBtn.addEventListener('click', onNavigateMatch);

  root.innerHTML = '';
  root.appendChild(view);
  renderUser(profileState);
};
