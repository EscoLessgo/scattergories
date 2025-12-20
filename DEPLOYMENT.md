# Deployment Guide for Railway + Discord Activity

Yes, you can deploy this on Railway! Here is the exact configuration you need.

## 1. Environment Variables
You need to set these variables in your Railway project settings (or `.env` file locally):

### Frontend (Client)
| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SOCKET_URL` | `https://your-backend-url.up.railway.app` | The URL of your deployed backend. |
| `VITE_DISCORD_CLIENT_ID` | `123456789...` | Your Application ID from Discord Developer Portal. |

### Backend (Server)
| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `3001` (or let Railway set it) | Railway sets this automatically. |
| `DISCORD_CLIENT_SECRET` | `abcdef...` | Your Client Secret from Discord Developer Portal. |
| `VITE_DISCORD_CLIENT_ID` | `123456789...` | Same as frontend (used for token exchange). |

## 2. Discord Developer Portal Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an Application.
3. Keep the **Client ID** and **Client Secret** handy.
4. Go to **URL Mappings** (under Activity Settings? or General information if creating a generic app, but for Activities specifically):
   - You might need to set the **Interaction Endpoint URL** if you are doing a bot, but for an embedded Activity:
   - Go to **Activities** -> **URL Mappings**.
   - Add your Frontend URL (e.g., `https://your-frontend.up.railway.app`) as the Root Mapping `/`.

## 3. Deployment Steps
1. **Push your code** to GitHub.
2. **Create a New Project** on Railway from GitHub.
3. Railway might try to deploy the root as one service.
   - **Recommended**: Deploy TWO services from the same repo.
     - **Service 1 (Backend)**: Root Directory: `/server`. Build Command: `npm install`. Start Command: `node index.js`.
     - **Service 2 (Frontend)**: Root Directory: `/`. Build Command: `npm run build`. Start Command: `npm run preview -- --port $PORT --host` (or use a static site host like Vercel for the frontend).

**Note on Frontend Serving:**
Vite's `npm run dev` is not for production.
For Railway, use: `npm run build` then `npm run preview` (simple) or serve the `dist` folder.

If you deploy the frontend to Vercel (easier for static sites), just set the `VITE_SOCKET_URL` to your Railway backend.
