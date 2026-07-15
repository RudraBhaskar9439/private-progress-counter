/// <reference types="vite/client" />

import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

interface ImportMetaEnv {
  readonly VITE_NETWORK_ID: string;
  readonly VITE_DEFAULT_CONTRACT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
