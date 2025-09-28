import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const {
  AZURE_STORAGE_ACCOUNT,
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_SAS_KEY,
  AZURE_STORAGE_CONTAINER_PROFILES = 'profiles',
  AZURE_STORAGE_CONTAINER_MESSAGES = 'messages',
  MAX_IMAGE_MB = '5',
  MAX_AUDIO_MB = '15',
  SAS_EXPIRY_MINUTES = '10'
} = process.env;

if (!AZURE_STORAGE_ACCOUNT) {
  console.warn('AZURE_STORAGE_ACCOUNT not set - Azure services will fail until configured.');
}

const ensureSharedKey = () => {
  let accountKey = AZURE_STORAGE_SAS_KEY;
  if (!accountKey && AZURE_STORAGE_CONNECTION_STRING) {
    const parts = AZURE_STORAGE_CONNECTION_STRING.split(';');
    const keyPart = parts.find((p) => p.startsWith('AccountKey='));
    if (keyPart) {
      accountKey = keyPart.split('AccountKey=')[1];
    }
  }
  if (!accountKey) {
    throw new Error('Azure Storage account key not configured. Set AZURE_STORAGE_SAS_KEY or provide a connection string.');
  }
  return new StorageSharedKeyCredential(AZURE_STORAGE_ACCOUNT, accountKey);
};

let blobServiceClient;
let sharedKeyCredential;

const getBlobServiceClient = () => {
  if (!blobServiceClient) {
    if (AZURE_STORAGE_CONNECTION_STRING) {
      blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    } else {
      const url = `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`;
      sharedKeyCredential = ensureSharedKey();
      blobServiceClient = new BlobServiceClient(url, sharedKeyCredential);
    }
  }
  if (!sharedKeyCredential) {
    sharedKeyCredential = ensureSharedKey();
  }
  return blobServiceClient;
};

const getContainerClient = (name) => {
  const client = getBlobServiceClient().getContainerClient(name);
  return client;
};

export const ensureContainers = async () => {
  const client = getBlobServiceClient();
  const containers = [AZURE_STORAGE_CONTAINER_PROFILES, AZURE_STORAGE_CONTAINER_MESSAGES];
  for (const name of containers) {
    if (!name) continue;
    const containerClient = client.getContainerClient(name);
    await containerClient.createIfNotExists({ access: 'container' });
  }
};

const allowLists = {
  image: {
    mimes: ['image/jpeg', 'image/png'],
    maxBytes: parseInt(MAX_IMAGE_MB, 10) * 1024 * 1024
  },
  audio: {
    mimes: ['audio/webm', 'audio/mpeg'],
    maxBytes: parseInt(MAX_AUDIO_MB, 10) * 1024 * 1024
  }
};

const validateMedia = (category, mimeType, sizeBytes) => {
  const rules = allowLists[category];
  if (!rules) return;
  if (mimeType && !rules.mimes.includes(mimeType)) {
    const err = new Error(`Unsupported ${category} type`);
    err.status = 400;
    err.code = 'UNSUPPORTED_MEDIA';
    throw err;
  }
  if (sizeBytes && sizeBytes > rules.maxBytes) {
    const err = new Error(`${category} exceeds maximum size`);
    err.status = 400;
    err.code = 'MEDIA_TOO_LARGE';
    throw err;
  }
};

const buildSas = (containerName, blobName, contentType) => {
  const expires = new Date(Date.now() + parseInt(SAS_EXPIRY_MINUTES, 10) * 60 * 1000);
  const startsOn = new Date(Date.now() - 60 * 1000);
  const permissions = BlobSASPermissions.parse('cw');
  const credential = sharedKeyCredential || ensureSharedKey();
  sharedKeyCredential = credential;
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions,
      startsOn,
      expiresOn: expires,
      contentType
    },
    credential
  ).toString();
  const containerClient = getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(blobName);
  return {
    sasUrl: `${blobClient.url}?${sas}`,
    blobUrl: blobClient.url,
    blobPath: `${containerName}/${blobName}`
  };
};

export const createProfileUploadSas = ({ userId, contentType, sizeBytes }) => {
  validateMedia('image', contentType, sizeBytes);
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const blobName = `${userId}.${ext}`;
  return buildSas(AZURE_STORAGE_CONTAINER_PROFILES, blobName, contentType);
};

export const createMessageUploadSas = ({ yapId, extension, contentType, sizeBytes, category }) => {
  validateMedia(category, contentType, sizeBytes);
  const safeExt = extension.startsWith('.') ? extension.slice(1) : extension;
  const blobName = `${yapId}/${uuidv4()}.${safeExt}`;
  return buildSas(AZURE_STORAGE_CONTAINER_MESSAGES, blobName, contentType);
};

export const createGenericUploadSas = ({ container, blobName, contentType, sizeBytes, category }) => {
  if (category) {
    validateMedia(category, contentType, sizeBytes);
  }
  return buildSas(container, blobName, contentType);
};

export const containers = {
  profiles: AZURE_STORAGE_CONTAINER_PROFILES,
  messages: AZURE_STORAGE_CONTAINER_MESSAGES
};
