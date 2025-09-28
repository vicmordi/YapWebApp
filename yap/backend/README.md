# Yap Backend

The Yap backend is a Node.js + Express API that powers the Yap MVP matching experience. It provides authentication, profile management, matching, chat, and Azure Blob Storage upload helpers.

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas Free Tier cluster
- Azure Storage Account with two private containers (`profiles`, `messages`)

## 1. MongoDB Atlas Setup

1. Create or sign in to your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
2. Create a new **Shared** (Free Tier) cluster.
3. Create a database user with a strong password and note the credentials.
4. Under **Network Access**, add your development machine IP (or `0.0.0.0/0` for testing only).
5. Copy the connection string from **Database Deployments → Connect → Drivers**. Replace the placeholders with your username, password, and desired database name (e.g., `yap`).
6. Paste the connection string into `MONGODB_URI` in your `.env` file.

## 2. Azure Storage Setup

1. Sign in to the [Azure Portal](https://portal.azure.com/).
2. Create a new **Storage Account** (Standard V2, locally redundant is fine for development).
3. In the storage account, create two **Blob containers**: `profiles` and `messages`. Set their access level to **Private**. (For the MVP you may temporarily set them to Blob access if you want public read access to the media.)
4. From **Access keys** or **Shared access signature**, copy the **connection string** and store it in the `.env` file as `AZURE_STORAGE_CONNECTION_STRING`.
5. Note your storage account name for `AZURE_STORAGE_ACCOUNT`.
6. Ensure the containers exist before running the app. The backend will attempt to create them if they do not.

## 3. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required values:

- `PORT`: API port (default `4000`).
- `NODE_ENV`: `development` or `production`.
- `CLIENT_ORIGIN`: URL of the frontend (development default `http://localhost:5173`).
- `MONGODB_URI`: Atlas connection string.
- `JWT_SECRET`: Strong secret for signing JWTs.
- `COOKIE_NAME`: Name for the auth cookie.
- `COOKIE_SECURE`: `true` in production when serving over HTTPS.
- `AZURE_STORAGE_ACCOUNT`: Storage account name.
- `AZURE_STORAGE_CONNECTION_STRING`: Azure connection string.
- `AZURE_STORAGE_CONTAINER_PROFILES`: Container for profile pictures (default `profiles`).
- `AZURE_STORAGE_CONTAINER_MESSAGES`: Container for message media (default `messages`).
- `MAX_IMAGE_MB`, `MAX_AUDIO_MB`: Size caps enforced before generating SAS tokens.
- `SAS_EXPIRY_MINUTES`: Lifetime for generated SAS tokens.

## 4. Install Dependencies

```bash
npm install
```

## 5. Run the Development Server

```bash
npm run dev
```

The API will start on `http://localhost:4000`. Requests should originate from the frontend origin defined in `CLIENT_ORIGIN`.

## 6. Production Notes

- Set `COOKIE_SECURE=true` to ensure the auth cookie is only sent over HTTPS.
- Change `CLIENT_ORIGIN` to your deployed frontend URL.
- Rotate `JWT_SECRET` regularly and keep it out of source control.
- Consider moving long-term media storage to private containers and generating read SAS tokens per request or proxy downloads through the backend.

## 7. Available Scripts

- `npm start`: Start the server in production mode.
- `npm run dev`: Start the server with nodemon for development.
- `npm run lint`: Placeholder (no linting configured yet).

## 8. Project Structure

```
src/
  server.js
  routes/
  models/
  middleware/
  services/
```

Each route module registers API endpoints and delegates to services and models. Shared middleware lives in `middleware/`, while external integrations (MongoDB, Azure, matching helpers) live in `services/`.
