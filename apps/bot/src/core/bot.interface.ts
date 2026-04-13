export interface IGuildInfo {
    id: string;
    name: string;
}

export interface IChannelInfo {
    id: string;
    name: string;
    type: number; // For KOOK: 1=Text, 2=Voice
}

export interface IMessageHistory {
    id: string;
    content: string;
    author: {
        id: string;
        username: string;
        isBot: boolean;
    };
    timestamp: number;
}

export interface IReactionUser {
    id: string;
    username: string;
    isBot: boolean;
}

export interface IBotProvider {
    /**
     * Start the bot and connect to the provider (Discord/Kook)
     */
    start(): Promise<void>;

    /**
     * Stop the bot and disconnect gracefully
     */
    stop(): Promise<void>;

    /**
     * Send a raw message to a specific channel
     * @param channelId The ID of the channel to send the message to
     * @param content The message content
     * @param quoteMsgId Optional ID of the message to reply to
     */
    sendMessage(channelId: string, content: string, quoteMsgId?: string): Promise<void>;
    
    /**
     * Get all guilds/servers the bot has joined
     */
    getGuilds(): Promise<IGuildInfo[]>;

    /**
     * Get all channels in a specific guild
     * @param guildId The ID of the guild/server
     */
    getChannels(guildId: string): Promise<IChannelInfo[]>;

    /**
     * Get message history from a specific channel
     * @param channelId The ID of the channel
     * @param limit Maximum number of messages to fetch (default: 50)
     * @param beforeMsgId Optional message ID to fetch messages before it
     */
    getChannelMessages(channelId: string, limit?: number, beforeMsgId?: string): Promise<IMessageHistory[]>;

    /**
     * Add a reaction (emoji) to a specific message
     * @param messageId The ID of the message
     * @param emoji The emoji to react with (Unicode character or Custom Emoji ID)
     */
    addReaction(messageId: string, emoji: string): Promise<void>;

    /**
     * Get users who reacted to a message with a specific emoji
     * @param messageId The ID of the message
     * @param emoji The emoji to check
     */
    getReactionUsers(messageId: string, emoji: string): Promise<IReactionUser[]>;

    /**
     * Register a callback to handle incoming messages
     * @param handler Function to execute when a message is received
     */
    onMessage(handler: (message: IMessage) => Promise<void>): void;
}

export interface IMessage {
    id: string;
    content: string;
    channelId: string;
    guildId?: string;
    author: {
        id: string;
        username: string;
        isBot: boolean;
    };
    provider: 'discord' | 'kook';
    
    /**
     * Send a reply to the current message
     */
    reply(content: string): Promise<void>;
}
