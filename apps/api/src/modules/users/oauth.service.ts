export interface OAuthProvider {
  getAccessToken(code: string, redirectUri: string): Promise<string>
  getUserInfo(accessToken: string): Promise<{
    providerAccountId: string
    providerUsername: string
    providerAvatar: string | null
  }>
}

export class KookOAuthProvider implements OAuthProvider {
  constructor(private clientId: string, private clientSecret: string) {}

  async getAccessToken(code: string, redirectUri: string): Promise<string> {
    const res = await fetch('https://www.kookapp.cn/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!res.ok) {
      throw new Error(`Kook getAccessToken error: ${res.status} ${await res.text()}`)
    }

    const data = await res.json() as any
    if (!data.access_token) {
      throw new Error(`Kook getAccessToken error: missing access_token in ${JSON.stringify(data)}`)
    }

    return data.access_token
  }

  async getUserInfo(accessToken: string) {
    const res = await fetch('https://www.kookapp.cn/api/v3/user/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!res.ok) {
      throw new Error(`Kook getUserInfo error: ${res.status} ${await res.text()}`)
    }

    const json = await res.json() as any
    if (json.code !== 0) {
      throw new Error(`Kook getUserInfo error: ${json.message}`)
    }

    const data = json.data
    return {
      providerAccountId: data.id,
      providerUsername: `${data.username}#${data.identify_num}`,
      providerAvatar: data.avatar || null,
    }
  }
}
