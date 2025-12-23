import { DiscordSDK } from "@discord/embedded-app-sdk";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;

let discordSdk;

if (DISCORD_CLIENT_ID) {
    // Only init if we are likely in Discord (have frame_id) or willing to try
    // The SDK constructor throws if frame_id/instance_id are missing, so we wrap it.
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('frame_id')) {
            discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
        }
    } catch (e) {
        console.warn("Discord SDK Init skipped (not in Discord iframe):", e);
    }
} else {
    console.warn("VITE_DISCORD_CLIENT_ID not found in environment variables. Discord SDK will not be initialized.");
}

export const discord = discordSdk;

// Helper to authenticate (basic flow)
export async function authenticateDiscord() {
    if (!discord) return null;

    await discordSdk.ready();

    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
        client_id: DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: [
            "identify",
            "guilds",
            "rpc.voice.read",
        ],
    });

    // Exchange code for token via backend
    const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
    });

    const { access_token } = await response.json();

    if (!access_token) {
        throw new Error('Failed to exchange access token');
    }

    // Authenticate with Discord Client
    const authResult = await discordSdk.commands.authenticate({
        access_token,
    });

    return authResult;
}
