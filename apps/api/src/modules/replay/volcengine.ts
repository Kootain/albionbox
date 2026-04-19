async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(data)
  )
  return new Uint8Array(signature)
}

async function sha256(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function toHex(data: Uint8Array): string {
  return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function getPlayInfo(vid: string, akRaw: string, skRaw: string): Promise<string | null> {
  const ak = akRaw.trim().replace(/^["']|["']$/g, '')
  const sk = skRaw.trim().replace(/^["']|["']$/g, '')

  if (!ak || !sk) {
    return null
  }
  const host = 'vod.volcengineapi.com'
  const service = 'vod'
  const region = 'cn-north-1'
  const action = 'GetPlayInfo'
  const version = '2020-08-01'
  const now = new Date()
  // Ensure date is formatted exactly as YYYYMMDDThhmmssZ
  const amzDate = now.toISOString().split('.')[0].replace(/[:-]/g, '') + 'Z'
  const dateStamp = amzDate.substring(0, 8)

  // Use a custom URI escape to ensure exact match with Volcengine's requirements
  const uriEscape = (str: string) => encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

  const params: Record<string, string> = {
    Action: action,
    Ssl: '1',
    Version: version,
    Vid: vid,
  }

  const canonicalQueryString = Object.keys(params)
    .sort()
    .map(k => `${uriEscape(k)}=${uriEscape(params[k])}`)
    .join('&')

  const canonicalUri = '/'
  const payloadHash = await sha256('') // GET request has no payload
  
  const headers = new Headers()
  headers.set('X-Date', amzDate)
  headers.set('Host', host) // Setting Host directly is sometimes ignored by fetch, but we sign it anyway

  const signedHeaders = 'host;x-date'
  const canonicalHeaders = `host:${host}\nx-date:${amzDate}\n`

  const canonicalRequest = `GET\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  const canonicalRequestHash = await sha256(canonicalRequest)

  const algorithm = 'HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/request`
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`

  const kDate = await hmacSha256(new TextEncoder().encode(sk), dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  const kSigning = await hmacSha256(kService, 'request')
  const signature = toHex(await hmacSha256(kSigning, stringToSign))

  const authorization = `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  headers.set('Authorization', authorization)

  const url = `https://${host}${canonicalUri}?${canonicalQueryString}`

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers
    })
    
    if (!res.ok) {
      console.error(`GetPlayInfo failed with status ${res.status}:`, await res.text())
      return null
    }

    const data = await res.json() as any
    const playInfoList = data?.Result?.PlayInfoList
    if (Array.isArray(playInfoList) && playInfoList.length > 0) {
      return playInfoList[0].MainPlayUrl
    }
    return null
  } catch (error) {
    console.error('Error fetching GetPlayInfo:', error)
    return null
  }
}
