/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_HOST: string;
  readonly VITE_DEV_API_URL: string;
  readonly VITE_APP_BUILD_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __API_BASE_URL__: string;
