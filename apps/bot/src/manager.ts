import { IBotProvider, IMessage } from './core/bot.interface.js';
import { BotProviderType } from './core/provider.enum.js';
import { apiService } from './services/api.service.js';

/**
 * Manages all bot providers and routes cross-platform messages/notifications
 */
export class BotManager {
    private providers: Map<string, IBotProvider> = new Map();

    /**
     * Register a new bot provider (Discord/Kook)
     */
    registerProvider(name: BotProviderType | string, provider: IBotProvider) {
        this.providers.set(name, provider);
        
        // Register common message handler for this provider
        provider.onMessage(this.handleMessage.bind(this));
    }

    /**
     * Start all registered bot providers
     */
    async startAll() {
        for (const [name, provider] of this.providers) {
            console.log(`[BotManager] Starting ${name} bot...`);
            await provider.start();
        }
    }

    /**
     * Stop all registered bot providers
     */
    async stopAll() {
        for (const [name, provider] of this.providers) {
            console.log(`[BotManager] Stopping ${name} bot...`);
            await provider.stop();
        }
    }

    /**
     * Send a push notification from the website to a specific channel
     */
    async pushNotification(providerName: string, channelId: string, content: string, quoteMsgId?: string) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} is not registered`);
        }
        await provider.sendMessage(channelId, content, quoteMsgId);
    }

    /**
     * Get all guilds the bot is in for a specific provider
     */
    async getGuilds(providerName: string) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} is not registered`);
        }
        return await provider.getGuilds();
    }

    /**
     * Get all channels for a specific guild and provider
     */
    async getChannels(providerName: string, guildId: string) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} is not registered`);
        }
        return await provider.getChannels(guildId);
    }

    /**
     * Get message history from a specific channel
     */
    async getChannelMessages(providerName: string, channelId: string, limit?: number, beforeMsgId?: string) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} is not registered`);
        }
        return await provider.getChannelMessages(channelId, limit, beforeMsgId);
    }

    /**
     * Add a reaction to a specific message
     */
    async addReaction(providerName: string, messageId: string, emoji: string) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} is not registered`);
        }
        await provider.addReaction(messageId, emoji);
    }

    /**
     * Get users who reacted to a message with a specific emoji
     */
    async getReactionUsers(providerName: string, messageId: string, emoji: string) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} is not registered`);
        }
        return await provider.getReactionUsers(messageId, emoji);
    }

    /**
     * Common message handler to process all incoming messages regardless of the platform
     */
    private async handleMessage(message: IMessage) {
        // Ignore messages from other bots
        if (message.author.isBot) return;

        console.log(`[${message.provider.toUpperCase()}] Msg from ${message.author.username} in ${message.guildId}/${message.channelId}: ${message.content}`);

        try {
            // Example Logic: Using API service instead of DB
            // const settings = await apiService.getGuildSettings(message.guildId!, message.provider);
            
            // Basic command handling example
            if (message.content.trim() === '!ping') {
                await message.reply('Pong! Connected to AlbionBox.');
            }
            
            // Delegate further handling to specific command handlers or module services
            
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
}
