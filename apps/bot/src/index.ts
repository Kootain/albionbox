import { BotManager } from './manager.js';
import { DiscordProvider } from './providers/discord/discord.provider.js';
import { KookProvider } from './providers/kook/kook.provider.js';
import { BotProviderType } from './core/provider.enum.js';
import { startControlPlane } from './api/server.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function bootstrap() {
    console.log('Initializing AlbionBox Bots...');
    
    const manager = new BotManager();

    // Setup Discord Bot
    const discordToken = process.env.DISCORD_TOKEN;
    if (discordToken) {
        manager.registerProvider(BotProviderType.DISCORD, new DiscordProvider(discordToken));
    } else {
        console.warn('DISCORD_TOKEN not found in environment, skipping Discord bot setup.');
    }

    // Setup Kook Bot
    const kookToken = process.env.KOOK_TOKEN;
    if (kookToken) {
        manager.registerProvider(BotProviderType.KOOK, new KookProvider(kookToken));
    } else {
        console.warn('KOOK_TOKEN not found in environment, skipping Kook bot setup.');
    }

    // Start all registered bots
    await manager.startAll();

    // Start internal Control Plane API
    const port = parseInt(process.env.BOT_API_PORT || '3000', 10);
    const server = startControlPlane(manager, port);

    // Handle graceful shutdown
    const shutdown = async () => {
        console.log('\nShutting down bot services...');
        // Stop HTTP server
        server.close();
        // Stop bots
        await manager.stopAll();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
    console.error('Fatal error during bot initialization:', error);
    process.exit(1);
});
