import { RestClient } from '@kookapp/js-sdk'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import dotenv from 'dotenv'

dotenv.config()

function extractImageUrlsFromApiMessage(message: any): string[] {
  const type = message?.type
  const content = message?.content

  if (type === 2) {
    if (typeof content === 'string' && content) return [content]
    return []
  }

  if (type !== 10) return []
  if (typeof content !== 'string' || !content) return []

  let cards: any
  try {
    cards = JSON.parse(content)
  } catch {
    return []
  }

  const cardList: any[] = Array.isArray(cards) ? cards : [cards]
  const urls: string[] = []

  for (const card of cardList) {
    const modules: any[] = Array.isArray(card?.modules) ? card.modules : []
    for (const module of modules) {
      if (module?.type !== 'container') continue
      const elements: any[] = Array.isArray(module?.elements) ? module.elements : []
      for (const element of elements) {
        const src = element?.src
        if (typeof src === 'string' && src) urls.push(src)
      }
    }
  }

  return urls
}

async function downloadImage(url: string, downloadDir: string, msgId: string): Promise<void> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to fetch image ${url}: ${response.statusText}`)
      return
    }

    const urlPath = new URL(url).pathname
    let ext = path.extname(urlPath)
    if (!ext) {
      const contentType = response.headers.get('content-type')
      if (contentType === 'image/jpeg') ext = '.jpg'
      else if (contentType === 'image/png') ext = '.png'
      else if (contentType === 'image/gif') ext = '.gif'
      else if (contentType === 'image/webp') ext = '.webp'
      else ext = '.jpg'
    }

    // fallback to a timestamp-based filename if we can't get a meaningful name
    const base = path.basename(urlPath, ext) || Date.now().toString()
    const filename = `${msgId}_${base}`
    const filePath = path.join(downloadDir, `${filename}${ext}`)

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    fs.writeFileSync(filePath, buffer)
    console.log(`Downloaded: ${filePath}`)
  } catch (error) {
    console.error(`Error downloading ${url}:`, error)
  }
}

async function checkDuplicates(directory: string): Promise<void> {
  const targetDir = path.resolve(process.cwd(), directory)
  if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`)
    process.exit(1)
  }

  console.log(`Checking for duplicate images in: ${targetDir}`)
  const files = fs.readdirSync(targetDir)
  const hashMap = new Map<string, string[]>()

  for (const file of files) {
    const filePath = path.join(targetDir, file)
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      const fileBuffer = fs.readFileSync(filePath)
      const hashSum = crypto.createHash('sha256').update(fileBuffer).digest('hex')

      if (!hashMap.has(hashSum)) {
        hashMap.set(hashSum, [])
      }
      hashMap.get(hashSum)!.push(file)
    }
  }

  let hasDuplicates = false
  for (const [hash, fileList] of hashMap.entries()) {
    if (fileList.length > 1) {
      hasDuplicates = true
      console.log(`\nDuplicate group found (Hash: ${hash.slice(0, 8)}...):`)
      fileList.forEach(f => console.log(`  - ${f}`))
    }
  }

  if (!hasDuplicates) {
    console.log('\nNo duplicates found.')
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === 'check') {
    const targetDir = args[1] || 'downloads'
    await checkDuplicates(targetDir)
    return
  }

  const token = process.env.KOOK_BOT_TOKEN
  const channelId = process.env.CHANNEL_ID

  if (!token || !channelId) {
    console.error('Missing KOOK_TOKEN or CHANNEL_ID in environment variables.')
    console.error('Usage for download: KOOK_BOT_TOKEN=xxx CHANNEL_ID=xxx npx tsx test-kookimage-download.ts')
    console.error('Usage for checking: npx tsx test-kookimage-download.ts check [directory]')
    process.exit(1)
  }

  const kook = new RestClient({ token })
  const downloadDir = path.resolve(process.cwd(), 'downloads')

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true })
  }

  console.log(`Starting to fetch messages from channel: ${channelId}`)
  console.log(`Images will be saved to: ${downloadDir}`)

  let lastMsgId: string | undefined = undefined
  let totalMessages = 0
  let totalImages = 0

  while (true) {
    console.log(`Fetching messages${lastMsgId ? ` before ${lastMsgId}` : ''}...`)
    
    try {
      const res: any = await kook.listMessages({
        target_id: channelId,
        msg_id: lastMsgId,
        flag: 'before',
        page_size: 50,
      })

      const items = res?.data?.items || []
      if (items.length === 0) {
        console.log('No more messages found.')
        break
      }

      for (const msg of items) {
        totalMessages++
        const urls = extractImageUrlsFromApiMessage(msg)
        
        for (const url of urls) {
          totalImages++
          console.log(`Found image URL: ${url} in message ${msg.id}`)
          await downloadImage(url, downloadDir, msg.id)
        }
      }

      // Kook API returns messages sorted chronologically or reverse chronologically.
      // Usually, when `flag: 'before'` is used, older messages are fetched.
      // We identify the oldest message in the batch by comparing its timestamp,
      // and use its ID for the next pagination request.
      
      // Let's find the minimum timestamp to determine the oldest message ID
      let oldestMsg = items[0]
      for (const msg of items) {
        // Some Kook APIs return create_at, some return msg_timestamp
        const t1 = msg.create_at || msg.msg_timestamp || 0
        const t2 = oldestMsg.create_at || oldestMsg.msg_timestamp || 0
        if (t1 < t2) {
          oldestMsg = msg
        }
      }
      
      // Fallback: if timestamps aren't available, just take the last item assuming descending order
      if ((oldestMsg.create_at || oldestMsg.msg_timestamp || 0) === 0) {
        oldestMsg = items[items.length - 1]
      }
      
      // If the API returns fewer than the page size or if we get stuck on the same ID, we should break
      if (lastMsgId === oldestMsg.id) {
        break
      }
      
      lastMsgId = oldestMsg.id
      
    } catch (error) {
      console.error('Error fetching messages:', error)
      break
    }
  }

  console.log(`Finished! Processed ${totalMessages} messages, downloaded ${totalImages} images.`)
}

main().catch(console.error)
