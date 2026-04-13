export type AuthedUser = {
  id: string
  email: string | null
  emailVerified: boolean
  sessionsVersion: number
  activeGameAccountId: string | null
}

export type AppContext = {
  Bindings: Env
  Variables: {
    user: AuthedUser
    token: string
  }
}
