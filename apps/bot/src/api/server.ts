import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { BotManager } from '../manager.js';

export function startControlPlane(manager: BotManager, port: number) {
    const app = new Hono();

    // Authentication Middleware
    // Ensures that only the authorized `apps/api` can trigger these endpoints
    app.use('*', async (c, next) => {
        const authHeader = c.req.header('Authorization');
        const expectedToken = process.env.BOT_API_TOKEN;

        if (!expectedToken) {
            console.warn('[ControlPlane] Warning: BOT_API_TOKEN is not set in environment. API is unsecured!');
        } else if (authHeader !== `Bearer ${expectedToken}`) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        await next();
    });

    // Health check endpoint
    app.get('/health', (c) => {
        return c.json({ 
            status: 'ok', 
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });

    // Push Notification endpoint
    // Called by `apps/api` to send messages to specific Discord/Kook channels
    app.post('/notify', async (c) => {
        try {
            const body = await c.req.json();
            const { provider, channelId, message, quoteMsgId } = body;
            
            if (!provider || !channelId || !message) {
                return c.json({ error: 'Missing required fields: provider, channelId, message' }, 400);
            }

            // Route the message through BotManager to the correct provider
            await manager.pushNotification(provider, channelId, message, quoteMsgId);
            
            return c.json({ success: true, message: 'Notification queued for sending' });
        } catch (error: any) {
            console.error('[ControlPlane] Failed to send notification:', error);
            return c.json({ error: error.message }, 500);
        }
    });

    // Get Guilds endpoint
    app.get('/guilds', async (c) => {
        try {
            const provider = c.req.query('provider');
            if (!provider) {
                return c.json({ error: 'Missing provider parameter' }, 400);
            }
            
            const guilds = await manager.getGuilds(provider);
            return c.json({ success: true, data: guilds });
        } catch (error: any) {
            console.error('[ControlPlane] Failed to fetch guilds:', error);
            return c.json({ error: error.message }, 500);
        }
    });

    // Get Channels endpoint
    app.get('/guilds/:guildId/channels', async (c) => {
        try {
            const provider = c.req.query('provider');
            const guildId = c.req.param('guildId');
            if (!provider) {
                return c.json({ error: 'Missing provider parameter' }, 400);
            }

            const channels = await manager.getChannels(provider, guildId);
            return c.json({ success: true, data: channels });
        } catch (error: any) {
            console.error('[ControlPlane] Failed to fetch channels:', error);
            return c.json({ error: error.message }, 500);
        }
    });

    // Get Channel Message History endpoint
    app.get('/channels/:channelId/messages', async (c) => {
        try {
            const provider = c.req.query('provider');
            const channelId = c.req.param('channelId');
            const limit = c.req.query('limit') ? parseInt(c.req.query('limit') as string, 10) : 50;
            const beforeMsgId = c.req.query('before');

            if (!provider) {
                return c.json({ error: 'Missing provider parameter' }, 400);
            }

            const messages = await manager.getChannelMessages(provider, channelId, limit, beforeMsgId);
            return c.json({ success: true, data: messages });
        } catch (error: any) {
            console.error('[ControlPlane] Failed to fetch message history:', error);
            return c.json({ error: error.message }, 500);
        }
    });

    // Add Reaction endpoint
    app.post('/messages/:messageId/reactions', async (c) => {
        try {
            const body = await c.req.json();
            const { provider, emoji } = body;
            const messageId = c.req.param('messageId');

            if (!provider || !emoji) {
                return c.json({ error: 'Missing required fields: provider, emoji' }, 400);
            }

            await manager.addReaction(provider, messageId, emoji);
            return c.json({ success: true, message: 'Reaction added successfully' });
        } catch (error: any) {
            console.error('[ControlPlane] Failed to add reaction:', error);
            return c.json({ error: error.message }, 500);
        }
    });

    // Get Reaction Users endpoint
    app.get('/messages/:messageId/reactions', async (c) => {
        try {
            const provider = c.req.query('provider');
            const emoji = c.req.query('emoji');
            const messageId = c.req.param('messageId');

            if (!provider || !emoji) {
                return c.json({ error: 'Missing required parameters: provider, emoji' }, 400);
            }

            const users = await manager.getReactionUsers(provider, messageId, emoji);
            return c.json({ success: true, data: users });
        } catch (error: any) {
            console.error('[ControlPlane] Failed to fetch reaction users:', error);
            return c.json({ error: error.message }, 500);
        }
    });

    console.log(`[ControlPlane] Starting API server on port ${port}...`);
    
    // Start the Node server
    return serve({
        fetch: app.fetch,
        port
    });
}
