import { DiscordSDK } from "@discord/embedded-app-sdk";

const isDiscord = typeof window !== 'undefined' && window.location.search.includes('frame_id');

export const discordSdk = isDiscord
    ? new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID)
    : {
        ready: () => Promise.resolve(),
        commands: {
            authorize: () => Promise.resolve({ code: 'mock_code' }),
            authenticate: () => Promise.resolve({ user: { username: 'LocalUser' } })
        }
    };

export async function setupDiscordSdk() {
    await discordSdk.ready();

    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: [
            "identify",
            "guilds",
        ],
    });

    // Retrieve an access_token from your activity's server
    const response = await fetch(`${import.meta.env.VITE_SOCKET_URL || ''}/api/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            code,
        }),
    });
    const { access_token } = await response.json();

    // Authenticate with Discord Client (using the access_token)
    const auth = await discordSdk.commands.authenticate({
        access_token,
    });

    if (auth == null) {
        throw new Error("Authenticate command failed");
    }

    return auth;
}
