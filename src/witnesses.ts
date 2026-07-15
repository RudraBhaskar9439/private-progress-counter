import type { Witnesses } from '../managed/private-progress-counter/contract/index.js';

export interface PrivateProgressPrivateState {
  readonly secret: Uint8Array;
}

export const privateProgressStateId = 'private-progress-state' as const;

export function createPrivateProgressState(secret: Uint8Array): PrivateProgressPrivateState {
  if (secret.length !== 32) {
    throw new Error(`Private progress secrets must contain exactly 32 bytes; received ${secret.length}.`);
  }

  return { secret: new Uint8Array(secret) };
}

export function createPrivateProgressWitnesses(): Witnesses<PrivateProgressPrivateState> {
  return {
    localSecret: ({ privateState }) => [privateState, new Uint8Array(privateState.secret)],
  };
}
