export type AuthedUser = {
  id: string
  email: string | null
  emailVerified: boolean
  sessionsVersion: number
  activeGameAccountId: string | null
}

export type Bindings = {
  DB: D1Database;
  QUEUE: Queue;
  // KV: KVNamespace;
};

export interface Env {
  // Bindings
  DB: D1Database;
  QUEUE: Queue;
  KV: KVNamespace;

  // Variables
  API_BASE_URL: string;
  APP_BASE_URL: string;
  WEB_ORIGIN: string;
  INTERNAL_API_TOKEN: string;
  ADMIN_EMAILS: string;
  RESEND_API_KEY: string;
  KOOK_CLIENT_ID: string;
  KOOK_CLIENT_SECRET: string;
  
  KOOK_BOT_TOKEN: string;
  VOLC_ACCESS_KEY_ID: string;
  VOLC_SECRET_ACCESS_KEY: string;
  JWT_SECRET: string;
  SESSION_SECRET: string;
  
  // Cloudflare
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}

export type AppContext = {
  Bindings: Env
  Variables: {
    user: AuthedUser
    token: string
  }
}
