import { IBotProvider, IMessage, IGuildInfo, IChannelInfo, IMessageHistory, IReactionUser } from '../../core/bot.interface.js';
import { BotProviderType } from '../../core/provider.enum.js';
import { KookClient, extractContent } from '@kookapp/js-sdk';

export class KookProvider implements IBotProvider {
    private client: KookClient;
    private messageHandlers: ((msg: IMessage) => Promise<void>)[] = [];

    constructor(token: string) {
        this.client = new KookClient({
            botToken: token,
            autoReconnect: true,
            compression: true
        });
    }

    async start(): Promise<void> {
        this.client.on('open', () => {
            console.log('[KookProvider] Connected');
        });

        this.client.on('close', () => {
            console.log('[KookProvider] Disconnected');
        });

        this.client.on('textChannelEvent', async (event) => {
            const raw = event as unknown as {
                msg_id: string;
                content: string;
                target_id: string;
                author_id: string;
                extra?: {
                    guild_id?: string;
                    author?: { username?: string; bot?: boolean };
                };
            };

            const messagePayload: IMessage = {
                id: raw.msg_id,
                content: extractContent(event as any) ?? raw.content,
                channelId: raw.target_id,
                guildId: raw.extra?.guild_id,
                author: {
                    id: raw.author_id,
                    username: raw.extra?.author?.username ?? 'Unknown',
                    isBot: raw.extra?.author?.bot ?? false
                },
                provider: BotProviderType.KOOK,
                reply: async (content: string) => {
                    const res = await this.client.api.createMessage({
                        type: 9,
                        target_id: raw.target_id,
                        content,
                        quote: raw.msg_id
                    });
                    if (!res.success) {
                        throw new Error(`[KookProvider] Reply failed: ${res.code} ${res.message}`);
                    }
                }
            };

            for (const handler of this.messageHandlers) {
                try {
                    await handler(messagePayload);
                } catch (err) {
                    console.error('[KookProvider] Error in message handler:', err);
                }
            }
        });

        await this.client.connect();
    }

    async stop(): Promise<void> {
        this.client.disconnect();
    }

    async sendMessage(channelId: string, content: string, quoteMsgId?: string): Promise<void> {
        const res = await this.client.api.createMessage({
            type: 9,
            target_id: channelId,
            content,
            ...(quoteMsgId ? { quote: quoteMsgId } : {})
        });
        if (!res.success) {
            throw new Error(`[KookProvider] Failed to send message: ${res.code} ${res.message}`);
        }
    }

    async getGuilds(): Promise<IGuildInfo[]> {
        const res = await this.client.api.listGuilds();
        if (!res.success) {
            throw new Error(`[KookProvider] Failed to fetch guilds: ${res.code} ${res.message}`);
        }
        
        return res.data.items.map(g => ({
            id: g.id,
            name: g.name
        }));
    }

    async getChannels(guildId: string): Promise<IChannelInfo[]> {
        const res = await this.client.api.listChannels({ guild_id: guildId });
        if (!res.success) {
            throw new Error(`[KookProvider] Failed to fetch channels: ${res.code} ${res.message}`);
        }

        return res.data.items.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type
        }));
    }

    async getChannelMessages(channelId: string, limit: number = 50, beforeMsgId?: string): Promise<IMessageHistory[]> {
        // Prepare request parameters for KOOK API
        const params: any = {
            target_id: channelId,
            page_size: Math.min(limit, 100) // KOOK API typically limits to 100 per page
        };

        if (beforeMsgId) {
            params.msg_id = beforeMsgId;
            params.flag = 'before';
        }

        const res = await this.client.api.request('/api/v3/message/list', 'GET', params);
        if (!res.success) {
            throw new Error(`[KookProvider] Failed to fetch message history: ${res.code} ${res.message}`);
        }

        const data = res.data as { items: any[] };
        return data.items.map((msg: any) => ({
            id: msg.id,
            content: extractContent(msg) ?? msg.content,
            author: {
                id: msg.author.id,
                username: msg.author.username,
                isBot: msg.author.bot || false
            },
            timestamp: msg.create_at
        }));
    }

    async addReaction(messageId: string, emoji: string): Promise<void> {
        const res = await this.client.api.addReaction({
            msg_id: messageId,
            emoji
        });
        if (!res.success) {
            throw new Error(`[KookProvider] Failed to add reaction: ${res.code} ${res.message}`);
        }
    }

    async getReactionUsers(messageId: string, emoji: string): Promise<IReactionUser[]> {
        const res = await this.client.api.request('/api/v3/message/reaction-list', 'GET', {
            msg_id: messageId,
            emoji
        });
        if (!res.success) {
            throw new Error(`[KookProvider] Failed to fetch reaction users: ${res.code} ${res.message}`);
        }
        
        // The endpoint returns an array of user objects directly in res.data
        const users = res.data as any[];
        return users.map(u => ({
            id: u.id,
            username: u.username,
            isBot: u.bot || false
        }));
    }

    onMessage(handler: (message: IMessage) => Promise<void>): void {
        this.messageHandlers.push(handler);
    }
}
