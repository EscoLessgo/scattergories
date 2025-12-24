import { DiscordSDK } from "@discord/embedded-app-sdk";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;

let discordSdk = null;
let initError = null;

// Check if we're in Discord iframe
const params = new URLSearchParams(window.location.search);
const frameId = params.get('frame_id');
const instanceId = params.get('instance_id');

console.log('[Discord] Init check:', {
    hasClientId: !!DISCORD_CLIENT_ID,
    frameId,
    instanceId,
    href: window.location.href
});

if (DISCORD_CLIENT_ID && frameId) {
    try {
        console.log('[Discord] Creating SDK instance...');
        discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
        console.log('[Discord] SDK created successfully');
    } catch (e) {
        initError = e;
        console.error('[Discord] SDK Init FAILED:', e);
    }
} else {
    console.log('[Discord] Skipping SDK init - not in Discord or missing Client ID');
}

export const discord = discordSdk;
export const discordInitError = initError;

// Helper to authenticate (basic flow)
export async function authenticateDiscord() {
    if (!discord) {
        console.log('[Discord] Auth skipped - no SDK instance');
        return null;
    }

    try {
        console.log('[Discord] Waiting for SDK ready...');
        await discordSdk.ready();
        console.log('[Discord] SDK ready!');

        // Authorize with Discord Client
        console.log('[Discord] Requesting authorization...');
        const { code } = await discordSdk.commands.authorize({
            client_id: DISCORD_CLIENT_ID,
            response_type: "code",
            state: "",
            prompt: "none",
            scope: [
                "identify",
                "guilds",
            ],
        });
        console.log('[Discord] Got auth code');

        // Exchange code for token via backend
        console.log('[Discord] Exchanging code for token...');
        const response = await fetch('/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        const data = await response.json();
        console.log('[Discord] Token response:', { ok: response.ok, hasToken: !!data.access_token });

        if (!data.access_token) {
            throw new Error('Failed to exchange access token: ' + JSON.stringify(data));
        }

        // Authenticate with Discord Client
        console.log('[Discord] Authenticating with token...');
        const authResult = await discordSdk.commands.authenticate({
            access_token: data.access_token,
        });
        console.log('[Discord] Auth complete!', authResult?.user?.username);

        return authResult;
    } catch (e) {
        console.error('[Discord] Auth error:', e);
        throw e;
    }
}
