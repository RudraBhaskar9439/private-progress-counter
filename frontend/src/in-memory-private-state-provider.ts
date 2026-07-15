import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type {
  ExportPrivateStatesOptions,
  ExportSigningKeysOptions,
  ImportPrivateStatesOptions,
  ImportPrivateStatesResult,
  ImportSigningKeysOptions,
  ImportSigningKeysResult,
  PrivateStateExport,
  PrivateStateId,
  PrivateStateProvider,
  SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';

export function inMemoryPrivateStateProvider<PSI extends PrivateStateId, PS>(): PrivateStateProvider<PSI, PS> {
  const privateStates = new Map<ContractAddress, Map<PSI, PS>>();
  const signingKeys = new Map<ContractAddress, SigningKey>();
  let contractAddress: ContractAddress | null = null;

  const requireAddress = (): ContractAddress => {
    if (contractAddress === null) throw new Error('Contract address has not been set.');
    return contractAddress;
  };

  const getStates = (address: ContractAddress): Map<PSI, PS> => {
    const existing = privateStates.get(address);
    if (existing) return existing;
    const created = new Map<PSI, PS>();
    privateStates.set(address, created);
    return created;
  };

  const encode = <T,>(value: T): string => JSON.stringify(value);
  const decode = <T,>(value: string): T => JSON.parse(value) as T;

  return {
    setContractAddress(address) { contractAddress = address; },
    set(key, value) { getStates(requireAddress()).set(key, value); return Promise.resolve(); },
    get(key) { return Promise.resolve(getStates(requireAddress()).get(key) ?? null); },
    remove(key) { getStates(requireAddress()).delete(key); return Promise.resolve(); },
    clear() { privateStates.delete(requireAddress()); return Promise.resolve(); },
    setSigningKey(address, key) { signingKeys.set(address, key); return Promise.resolve(); },
    getSigningKey(address) { return Promise.resolve(signingKeys.get(address) ?? null); },
    removeSigningKey(address) { signingKeys.delete(address); return Promise.resolve(); },
    clearSigningKeys() { signingKeys.clear(); return Promise.resolve(); },
    exportPrivateStates(_options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      const address = requireAddress();
      const states = Object.fromEntries(
        Array.from(getStates(address).entries()).map(([key, value]) => [key, encode(value)]),
      );
      return Promise.resolve({
        format: 'midnight-private-state-export',
        encryptedPayload: encode({ contractAddress: address, states }),
        salt: 'veilmark-browser-memory',
      });
    },
    async importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions,
    ): Promise<ImportPrivateStatesResult> {
      const strategy = options?.conflictStrategy ?? 'error';
      const payload = decode<{ states?: Record<string, string> }>(exportData.encryptedPayload);
      const scoped = getStates(requireAddress());
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;
      for (const [rawId, serialized] of Object.entries(payload.states ?? {})) {
        const id = rawId as PSI;
        if (scoped.has(id)) {
          if (strategy === 'skip') { skipped += 1; continue; }
          if (strategy === 'error') throw new Error(`Private-state conflict: ${rawId}`);
          overwritten += 1;
        } else {
          imported += 1;
        }
        scoped.set(id, decode<PS>(serialized));
      }
      return { imported, skipped, overwritten };
    },
    exportSigningKeys(_options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      return Promise.resolve({
        format: 'midnight-signing-key-export',
        encryptedPayload: encode({ keys: Object.fromEntries(signingKeys.entries()) }),
        salt: 'veilmark-browser-memory',
      });
    },
    async importSigningKeys(
      exportData: SigningKeyExport,
      options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      const strategy = options?.conflictStrategy ?? 'error';
      const payload = decode<{ keys?: Record<string, SigningKey> }>(exportData.encryptedPayload);
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;
      for (const [address, key] of Object.entries(payload.keys ?? {})) {
        if (signingKeys.has(address as ContractAddress)) {
          if (strategy === 'skip') { skipped += 1; continue; }
          if (strategy === 'error') throw new Error(`Signing-key conflict: ${address}`);
          overwritten += 1;
        } else {
          imported += 1;
        }
        signingKeys.set(address as ContractAddress, key);
      }
      return { imported, skipped, overwritten };
    },
  };
}
