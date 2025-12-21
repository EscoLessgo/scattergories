# Discord Developer Portal Settings

Go to [Discord Developer Portal](https://discord.com/developers/applications) and select your application "Letter Litter".

## 1. General Information
*   **Name:** Letter Litter
*   **Description:** A multiplayer categories game.
*   **Terms of Service URL:** `https://<YOUR_RAILWAY_URL>/terms`
*   **Privacy Policy URL:** `https://<YOUR_RAILWAY_URL>/privacy`

*(Note: Replace `<YOUR_RAILWAY_URL>` with your actual deployed URL, e.g., `https://letter-litter-production.up.railway.app`)*

## 2. OAuth2 (Side Menu)
*   **Client ID:** Copy this -> Add to Railway Environment Variable `VITE_DISCORD_CLIENT_ID`.
*   **Client Secret:** Copy this -> Add to Railway Environment Variable `DISCORD_CLIENT_SECRET`.
*   **Redirects:**
    *   Add your Railway URL: `https://<YOUR_RAILWAY_URL>`
    *   *(Optional for local dev)*: `http://localhost:3001` or `http://localhost:5173`

## 3. Bot (Side Menu)
*   *Optional:* You really only need this if you want a custom bot user to appear in the member list or if you plan to add slash commands later.
*   **User Name:** Letter Litter

## 4. Activities (Side Menu) -> Settings
This is the most critical section for getting the game to load inside Discord.

### URL Mappings
This links the Discord proxy to your web server.
*   Click **"Add Mapping"**
*   **Prefix:** `/` (Just a forward slash)
*   **Target URL:** `https://<YOUR_RAILWAY_URL>` (Your generic Railway deployment URL)

### Activity Configuration
*   **Supported Platforms:** Check **Desktop** and **Mobile**.
*   **Default Orientation:** **Landscape** (Recommended for this game).
*   **Grandfathered Activity:** No / Off.

## 5. How to Launch
Since you haven't built a specific "Slash Command" for launching yet, you must use the **App Launcher**:
1. Join a Voice Channel in a server where you are a Developer/Admin.
2. Click the **"Rocket Ship"** icon (Start an Activity).
3. You should see **Letter Litter** in the list. Click to launch!
