/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ADMIN_EMAILS: string;
  readonly VITE_KOOK_CLIENT_ID: string;
  readonly VITE_KOOK_AUTHORIZE_URL: string;
  readonly VITE_CONSUMER_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
