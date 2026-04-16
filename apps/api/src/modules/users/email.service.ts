async function bufferToHex(buffer: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return bufferToHex(bits)
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'noreply@unibook.me', to, subject, html }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend API error: ${text}`)
  }
}

export function sendVerificationEmail(apiKey: string, baseUrl: string, to: string, token: string) {
  const link = `${baseUrl}/users/verify_email?token=${token}`
  return sendEmail(apiKey, to, '激活你的 AlbionBox 账号', `<p>点击链接激活账号：<a href="${link}">${link}</a></p>`)
}

export function sendPasswordResetEmail(apiKey: string, baseUrl: string, to: string, token: string) {
  const link = `${baseUrl}/users/reset_password?token=${token}`
  return sendEmail(apiKey, to, '重置 AlbionBox 密码', `<p>点击链接重置密码：<a href="${link}">${link}</a></p>`)
}
