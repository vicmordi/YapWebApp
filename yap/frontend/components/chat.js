import { apiFetch, renderMessage } from './utils.js';

export const mountChat = (root, { yap, partner, currentUser, onBack }) => {
  const tpl = document.getElementById('chat-template');
  const view = tpl.content.cloneNode(true);
  const backBtn = view.querySelector('#chatBack');
  const partnerName = view.querySelector('#chatPartnerName');
  const partnerImage = view.querySelector('#chatPartnerImage');
  const partnerInterests = view.querySelector('#chatPartnerInterests');
  const messagesEl = view.querySelector('#chatMessages');
  const chatForm = view.querySelector('#chatForm');
  const textInput = view.querySelector('#chatText');
  const imageBtn = view.querySelector('#imageBtn');
  const imageInput = view.querySelector('#chatImage');
  const recordBtn = view.querySelector('#recordBtn');
  const statusEl = view.querySelector('#chatStatus');

  partnerName.textContent = partner.displayName;
  partnerImage.src = partner.profileImageUrl || 'https://avatars.dicebear.com/api/initials/Partner.svg';
  partnerInterests.textContent = partner.interests?.length
    ? `Interests: ${partner.interests.join(', ')}`
    : 'No interests shared yet';

  let pollTimer = null;
  let messagesCache = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let recording = false;

  const renderMessages = (messages) => {
    messagesEl.innerHTML = '';
    messages.forEach((message) => {
      messagesEl.appendChild(renderMessage(message, currentUser._id));
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const loadMessages = async () => {
    try {
      const { messages } = await apiFetch(`/api/chat/${yap._id}/messages`);
      const prevLength = messagesCache ? messagesCache.length : -1;
      const prevLast = messagesCache ? messagesCache[prevLength - 1]?._id : null;
      const nextLength = messages.length;
      const nextLast = messages[nextLength - 1]?._id;
      messagesCache = messages;
      if (prevLength !== nextLength || prevLast !== nextLast || prevLength === -1) {
        renderMessages(messages);
      }
    } catch (err) {
      statusEl.textContent = err.message;
    }
  };

  const startPolling = () => {
    pollTimer = setInterval(loadMessages, 4000);
  };

  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  };

  const sendTextMessage = async () => {
    const text = textInput.value.trim();
    if (!text) return;
    try {
      statusEl.textContent = '';
      await apiFetch(`/api/chat/${yap._id}/messages`, {
        method: 'POST',
        body: { type: 'text', text }
      });
      textInput.value = '';
      await loadMessages();
    } catch (err) {
      statusEl.textContent = err.message;
    }
  };

  const uploadAndSendMedia = async (type, blob) => {
    try {
      statusEl.textContent = 'Uploading…';
      const sas = await apiFetch(`/api/chat/${yap._id}/media/sas`, {
        method: 'POST',
        body: {
          type,
          contentType: blob.type,
          sizeBytes: blob.size
        }
      });
      await fetch(sas.sasUrl, {
        method: 'PUT',
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': blob.type
        },
        body: blob
      });
      await apiFetch(`/api/chat/${yap._id}/messages`, {
        method: 'POST',
        body: {
          type,
          mediaUrl: sas.blobUrl
        }
      });
      statusEl.textContent = '';
      await loadMessages();
    } catch (err) {
      statusEl.textContent = err.message;
    }
  };

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendTextMessage();
  });

  imageBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (file) {
      uploadAndSendMedia('image', file);
    }
    imageInput.value = '';
  });

  const stopRecording = async () => {
    recording = false;
    recordBtn.textContent = '🎤';
    recordBtn.classList.remove('recording');
    const recorder = mediaRecorder;
    if (recorder) {
      recorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  };

  const startRecording = async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mpeg';
      const recorder = new MediaRecorder(mediaStream, mimeType === 'audio/webm' ? { mimeType } : undefined);
      mediaRecorder = recorder;
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || 'audio/webm';
        if (chunks.length) {
          const blob = new Blob(chunks, { type });
          await uploadAndSendMedia('audio', blob);
        }
        mediaRecorder = null;
      };
      recorder.start();
      recording = true;
      recordBtn.textContent = '⏹';
      recordBtn.classList.add('recording');
    } catch (err) {
      statusEl.textContent = err.message || 'Microphone access denied';
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
    }
  };

  recordBtn.addEventListener('click', () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  backBtn.addEventListener('click', () => {
    stopPolling();
    stopRecording();
    onBack();
  });

  root.innerHTML = '';
  root.appendChild(view);

  loadMessages().then(() => startPolling());

  return () => {
    stopPolling();
    stopRecording();
  };
};
