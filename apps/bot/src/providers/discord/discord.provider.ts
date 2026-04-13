import { Client, GatewayIntentBits, Message as DiscordMessage } from 'discord.js';
import { IBotProvider, IMessage, IGuildInfo, IChannelInfo, IMessageHistory, IReactionUser } from '../../core/bot.interface.js';
import { BotProviderType } from '../../core/provider.enum.js';

export class DiscordProvider implements IBotProvider {
    private client: Client;
    private messageHandlers: ((msg: IMessage) => Promise<void>)[] = [];
    private token: string;

    constructor(token: string) {
        this.token = token;
        
        // Define intents required to receive message events
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.client.on('messageCreate', this.handleMessageCreate.bind(this));
        this.client.once('ready', () => {
            console.log(`[DiscordProvider] Logged in as ${this.client.user?.tag}!`);
        });
    }

    async start(): Promise<void> {
        try {
            await this.client.login(this.token);
        } catch (error) {
            console.error('[DiscordProvider] Failed to connect to Discord', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        this.client.destroy();
        console.log('[DiscordProvider] Disconnected gracefully');
    }

    async sendMessage(channelId: string, content: string, quoteMsgId?: string): Promise<void> {
        const channel = await this.client.channels.fetch(channelId);
        if (channel && channel.isSendable()) {
            if (quoteMsgId) {
                await channel.send({ content, reply: { messageReference: quoteMsgId } });
            } else {
                await channel.send(content);
            }
        } else {
            throw new Error(`[DiscordProvider] Channel ${channelId} not found or is not sendable`);
        }
    }

    async getGuilds(): Promise<IGuildInfo[]> {
        const guilds = await this.client.guilds.fetch();
        return guilds.map(g => ({
            id: g.id,
            name: g.name
        }));
    }

    async getChannels(guildId: string): Promise<IChannelInfo[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();
        
        const result: IChannelInfo[] = [];
        for (const [id, channel] of channels) {
            if (channel) {
                // Approximate mapping: Discord TextChannel=0, VoiceChannel=2
                // We map them to generic 1=Text, 2=Voice for simplicity across platforms
                let type = 0;
                if (channel.isTextBased()) type = 1;
                if (channel.isVoiceBased()) type = 2;

                result.push({
                    id: channel.id,
                    name: channel.name,
                    type
                });
            }
        }
        return result;
    }

    async getChannelMessages(channelId: string, limit: number = 50, beforeMsgId?: string): Promise<IMessageHistory[]> {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            throw new Error(`[DiscordProvider] Channel ${channelId} not found or is not text-based`);
        }

        const options: any = { limit: Math.min(limit, 100) };
        if (beforeMsgId) {
            options.before = beforeMsgId;
        }

        const fetchedMessages: any = await channel.messages.fetch(options);
        
        // Handle both single message return or collection return safely
        const messagesArray: DiscordMessage[] = fetchedMessages instanceof DiscordMessage ? [fetchedMessages] : Array.from(fetchedMessages.values());

        return messagesArray.map((msg: DiscordMessage) => ({
            id: msg.id,
            content: msg.content,
            author: {
                id: msg.author.id,
                username: msg.author.username,
                isBot: msg.author.bot
            },
            timestamp: msg.createdTimestamp
        }));
    }

    async addReaction(messageId: string, emoji: string): Promise<void> {
        // We need to find the message first. To do this globally without a channel ID is tricky in Discord.
        // Usually we would need the channel ID. For simplicity, we assume we can iterate over cached channels 
        // or we need to require channelId in the interface.
        // Assuming we need to search through text channels (this is inefficient for large bots, 
        // ideally interface should accept channelId)
        for (const channel of this.client.channels.cache.values()) {
            if (channel.isTextBased()) {
                try {
                    const msg = await channel.messages.fetch(messageId);
                    if (msg) {
                        await msg.react(emoji);
                        return;
                    }
                } catch (e) {
                    // Ignore fetch errors, message not in this channel
                }
            }
        }
        throw new Error(`[DiscordProvider] Message ${messageId} not found to add reaction`);
    }

    async getReactionUsers(messageId: string, emoji: string): Promise<IReactionUser[]> {
        for (const channel of this.client.channels.cache.values()) {
            if (channel.isTextBased()) {
                try {
                    const msg = await channel.messages.fetch(messageId);
                    if (msg) {
                        const reaction = msg.reactions.cache.get(emoji);
                        if (!reaction) return [];

                        const users = await reaction.users.fetch();
                        return Array.from(users.values()).map(u => ({
                            id: u.id,
                            username: u.username,
                            isBot: u.bot
                        }));
                    }
                } catch (e) {
                    // Ignore
                }
            }
        }
        throw new Error(`[DiscordProvider] Message ${messageId} not found to get reaction users`);
    }

    onMessage(handler: (message: IMessage) => Promise<void>): void {
        this.messageHandlers.push(handler);
    }

    private async handleMessageCreate(msg: DiscordMessage) {
        // Map native discord.js Message to our generic IMessage
        const messagePayload: IMessage = {
            id: msg.id,
            content: msg.content,
            channelId: msg.channelId,
            guildId: msg.guildId ?? undefined,
            author: {
                id: msg.author.id,
                username: msg.author.username,
                isBot: msg.author.bot
            },
            provider: BotProviderType.DISCORD,
            reply: async (content: string) => {
                await msg.reply(content);
            }
        };

        // Forward to all registered handlers (e.g., BotManager)
        for (const handler of this.messageHandlers) {
            try {
                await handler(messagePayload);
            } catch (err) {
                console.error('[DiscordProvider] Error in message handler:', err);
            }
        }
    }
}
