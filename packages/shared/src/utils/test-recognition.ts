import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { RestClient } from '@kookapp/js-sdk';
import { parseKillEventFromImage } from './api_image.ts';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the .env file in the current directory
dotenv.config({ path: path.join(__dirname, '.env') });

const {
  MODEL_ID,
  ARK_API_KEY,
  KOOK_BOT_TOKEN
} = process.env;

if (!MODEL_ID || !ARK_API_KEY || !KOOK_BOT_TOKEN) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const client = new RestClient({ token: KOOK_BOT_TOKEN });
const TARGET_GUILD_NAME = 'All The Villains 2';
const TARGET_CHANNEL_NAME = '输出-DPS-死亡截图';

async function main() {
  console.log(`Searching for guild: ${TARGET_GUILD_NAME}`);
  
  // 1. Get the guild ID
  const guildRes = await client.listGuilds();
  if (!guildRes.success) {
    console.error('Failed to list guilds:', guildRes.message);
    return;
  }
  
  const guild = guildRes.data.items.find(g => g.name === TARGET_GUILD_NAME);
  if (!guild) {
    console.error(`Guild "${TARGET_GUILD_NAME}" not found.`);
    return;
  }
  console.log(`Found guild: ${guild.name} (${guild.id})`);

  // 2. Get the channel ID
  const channelRes = await client.listChannels({ guild_id: guild.id });
  if (!channelRes.success) {
    console.error('Failed to list channels:', channelRes.message);
    return;
  }

  const channel = channelRes.data.items.find(c => c.name === TARGET_CHANNEL_NAME);
  if (!channel) {
    console.error(`Channel "${TARGET_CHANNEL_NAME}" not found in guild ${guild.name}.`);
    return;
  }
  console.log(`Found channel: ${channel.name} (${channel.id})`);

  // 3. Fetch messages from the channel (newest first) and keep fetching
  let allMessages: any[] = [];
  console.log(`Fetching messages from KOOK API...`);
  
  // For KOOK API, /api/v3/message/list uses 'msg_id' for pagination.
  // When fetching history, you usually pass the last message ID seen as 'msg_id',
  // and set 'flag' to 'before' (which is the default, but good to be explicit).
  let lastMsgId: string | undefined = undefined;
  let pageCount = 0;

  while (true) {
    pageCount++;
    const params: Record<string, any> = { target_id: channel.id, page_size: 50 };
    if (lastMsgId) {
      params.msg_id = lastMsgId;
      params.flag = 'before';
    }

    const msgRes = await client.request('/api/v3/message/list', 'GET', params) as any;
    if (!msgRes.success) {
      console.error(`Failed to fetch messages on iteration ${pageCount}:`, msgRes.message);
      break;
    }
    
    const items = msgRes.data.items;
    if (!items || items.length === 0) break;
    
    allMessages = allMessages.concat(items);
    console.log(`Fetched iteration ${pageCount}, got ${items.length} messages (total: ${allMessages.length})`);
    
    // Update lastMsgId to the oldest message in the current batch.
    // Assuming the API returns messages sorted from newest to oldest.
    lastMsgId = items[items.length - 1].id;
    
    // Stop if we have fetched a lot (prevent infinite loop just in case)
    if (allMessages.length >= 500) {
      console.log('Reached 500 messages limit for test.');
      break;
    }
  }

  console.log(`Finished fetching. Total messages: ${allMessages.length}. Filtering for images...`);

  // 4. Find messages with images
  // In KOOK, images might be sent directly or embedded in other ways. Let's inspect everything.
  const imageUrls: Set<string> = new Set();
  
  for (const msg of allMessages) {
    if (msg.type === 2) {
      // Type 2 is a direct image message
      imageUrls.add(msg.content);
    } else if (msg.type === 9) {
      // Type 9 is KMarkdown. It might contain images in the format: [image](url)
      const regex = /\[.*?\]\((https?:\/\/img\.kookapp\.cn\/attachments\/.*?)\)/g;
      let match;
      let foundImg = false;
      while ((match = regex.exec(msg.content)) !== null) {
        imageUrls.add(match[1]);
        foundImg = true;
      }
      
      if (!foundImg && msg.content.includes('http')) {
        console.log(`[Msg ${msg.id} | Type 9] Potential URL not parsed as image: ${msg.content}`);
      }
    } else if (msg.type === 10) {
      // Type 10 is Card Message
      try {
        const cards = JSON.parse(msg.content);
        for (const card of cards) {
          if (card.modules) {
            for (const module of card.modules) {
              if (module.type === 'image-group') {
                for (const element of module.elements) {
                  if (element.type === 'image' && element.src) {
                    imageUrls.add(element.src);
                  }
                }
              } else if (module.type === 'container') {
                for (const element of module.elements) {
                  if (element.type === 'image' && element.src) {
                    imageUrls.add(element.src);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.log(`[Msg ${msg.id} | Type 10] Failed to parse card JSON`);
      }
    }
  }

  const uniqueImages = Array.from(imageUrls);
  console.log(`Found ${uniqueImages.length} unique images.`);
  if (uniqueImages.length === 0) {
    console.log('No images to process.');
    return;
  }

  const imagesToProcess = uniqueImages.slice(0, 50);

  // 5. Create results directory
  const resultsDir = path.join(__dirname, 'test-results');
  await fs.mkdir(resultsDir, { recursive: true });
  console.log(`Results will be saved to ${resultsDir}`);

  const resultsData: { url: string; result: any }[] = [];

  // 6. Process images
  for (let i = 0; i < imagesToProcess.length; i++) {
    const imageUrl = imagesToProcess[i];
    console.log(`\nProcessing image ${i + 1}/${imagesToProcess.length}: ${imageUrl}`);
    try {
      // Call API
      const parsedData = await parseKillEventFromImage(imageUrl, ARK_API_KEY ?? '', MODEL_ID ?? '');
      console.log('Result:', JSON.stringify(parsedData, null, 2));
      
      resultsData.push({ url: imageUrl, result: parsedData });
    } catch (error) {
      console.error(`Failed to process image ${imageUrl}:`, error);
      resultsData.push({ url: imageUrl, result: { error: String(error) } });
    }
  }

  // 7. Save to JSON
  await fs.writeFile(
    path.join(resultsDir, 'results.json'), 
    JSON.stringify(resultsData, null, 2), 
    'utf-8'
  );

  // 8. Generate HTML
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kill Event Recognition Results</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #121212; color: #fff; }
    h1 { text-align: center; }
    .container { display: flex; flex-direction: column; gap: 40px; max-width: 1200px; margin: 0 auto; }
    .card { background: #1e1e1e; border-radius: 8px; overflow: hidden; display: flex; gap: 20px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 1px solid #333; }
    .img-container { flex: 1; min-width: 300px; }
    .img-container img { max-width: 100%; border-radius: 4px; border: 1px solid #444; }
    .data-container { flex: 1; font-size: 14px; }
    pre { background: #000; padding: 15px; border-radius: 4px; overflow-x: auto; color: #4ade80; border: 1px solid #333; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <h1>Kill Event Recognition Results</h1>
  <div class="container">
    ${resultsData.map((item, index) => `
      <div class="card">
        <div class="img-container">
          <h3>Image ${index + 1}</h3>
          <a href="${item.url}" target="_blank">
            <img src="${item.url}" alt="Screenshot ${index + 1}" loading="lazy" />
          </a>
        </div>
        <div class="data-container">
          <h3>Recognition Result</h3>
          ${item.result.error ? 
            `<pre class="error">${item.result.error}</pre>` : 
            `<pre>${JSON.stringify(item.result, null, 2)}</pre>`
          }
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
`;

  const htmlPath = path.join(resultsDir, 'index.html');
  await fs.writeFile(htmlPath, htmlContent, 'utf-8');
  console.log(`\nDone! Results saved to ${htmlPath}`);
}

main().catch(console.error);
