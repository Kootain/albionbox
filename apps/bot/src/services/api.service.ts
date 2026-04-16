import axios, { AxiosInstance } from 'axios';

/**
 * Service to interact with the central AlbionBox API.
 * This replaces direct DB access since the bot runs as a separate component.
 */
export class ApiService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.API_BASE_URL || 'http://localhost:8787',
            headers: {
                'Authorization': `Bearer ${process.env.BOT_API_TOKEN || ''}`
            }
        });
    }

    /**
     * Get guild settings from the API (e.g., registered channels, bot configs)
     */
    async getGuildSettings(guildId: string, provider: 'discord' | 'kook') {
        try {
            const response = await this.client.get(`/api/guilds/${guildId}/settings?provider=${provider}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch guild settings for ${guildId} (${provider})`, error);
            return null;
        }
    }

    /**
     * Send bot events/logs to the API
     */
    async reportBotEvent(eventData: any) {
        try {
            const response = await this.client.post('/api/bot/events', eventData);
            return response.data;
        } catch (error) {
            console.error('Failed to report bot event', error);
            return null;
        }
    }
}

export const apiService = new ApiService();
