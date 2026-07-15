import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import semver from 'semver';

import { NETWORK_ID } from '../lib/veilmark';

export type WalletStatus = 'detecting' | 'missing' | 'ready' | 'connecting' | 'connected';

export interface DetectedWallet {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly apiVersion: string;
  readonly api: InitialAPI;
}

function detectWallets(): DetectedWallet[] {
  return Object.entries(window.midnight ?? {}).map(([id, api]) => ({
    id,
    name: api.name,
    icon: api.icon,
    apiVersion: api.apiVersion,
    api,
  }));
}

function friendlyWalletError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/reject|declin|cancel/i.test(message)) return 'Connection was cancelled in Lace.';
  if (/network|preprod/i.test(message)) return 'Network mismatch. Switch Lace to Midnight Preprod and try again.';
  if (/timeout|respond/i.test(message)) return 'Lace did not respond. Unlock the wallet and try again.';
  return message || 'Could not connect to Lace.';
}

export function useMidnight() {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState<WalletStatus>('detecting');
  const [connectedAPI, setConnectedAPI] = useState<ConnectedAPI | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let elapsed = 0;
    const scan = () => {
      const detected = detectWallets();
      if (detected.length > 0) {
        setWallets(detected);
        setSelectedId((current) => current || detected[0].id);
        setStatus((current) => current === 'detecting' || current === 'missing' ? 'ready' : current);
        return true;
      }
      return false;
    };

    if (scan()) return;
    const timer = window.setInterval(() => {
      elapsed += 150;
      if (scan()) window.clearInterval(timer);
      else if (elapsed >= 4_500) {
        setStatus('missing');
        window.clearInterval(timer);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, []);

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === selectedId) ?? wallets[0],
    [selectedId, wallets],
  );

  const connect = useCallback(async () => {
    if (!selectedWallet) {
      setStatus('missing');
      return;
    }

    setStatus('connecting');
    setError(null);
    try {
      if (!semver.satisfies(selectedWallet.apiVersion, '^4.0.0')) {
        throw new Error(`Unsupported wallet connector ${selectedWallet.apiVersion}. Update Lace and try again.`);
      }
      const api = await selectedWallet.api.connect(NETWORK_ID);
      const configuration = await api.getConfiguration();
      if (configuration.networkId !== NETWORK_ID) {
        throw new Error(`Network mismatch: expected ${NETWORK_ID}.`);
      }
      const connection = await api.getConnectionStatus();
      if (connection.status !== 'connected') throw new Error('Lace did not authorize the connection.');
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setConnectedAPI(api);
      setAddress(unshieldedAddress);
      setStatus('connected');
    } catch (connectionError) {
      setError(friendlyWalletError(connectionError));
      setStatus('ready');
    }
  }, [selectedWallet]);

  // Lace's connector may close the Remote API channel after an approval
  // window finishes. Reconnecting through InitialAPI creates a fresh channel
  // without changing the visible wallet state or rebuilding the DApp client.
  const reconnect = useCallback(async (): Promise<ConnectedAPI> => {
    if (!selectedWallet) throw new Error('Lace is not available.');
    const api = await selectedWallet.api.connect(NETWORK_ID);
    const configuration = await api.getConfiguration();
    if (configuration.networkId !== NETWORK_ID) {
      throw new Error(`Network mismatch: expected ${NETWORK_ID}.`);
    }
    return api;
  }, [selectedWallet]);

  const disconnect = useCallback(() => {
    setConnectedAPI(null);
    setAddress(null);
    setError(null);
    setStatus(wallets.length > 0 ? 'ready' : 'missing');
  }, [wallets.length]);

  return {
    wallets,
    selectedId,
    setSelectedId,
    selectedWallet,
    status,
    connectedAPI,
    address,
    error,
    connect,
    reconnect,
    disconnect,
  };
}
