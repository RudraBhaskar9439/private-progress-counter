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

export function createPeriodTag(date = new Date()): Uint8Array {
  const period = date.toISOString().slice(0, 10);
  const encoded = new TextEncoder().encode(period);
  const tag = new Uint8Array(32);
  tag.set(encoded);
  return tag;
}

export function decodePeriodTag(tag: Uint8Array): string {
  return new TextDecoder().decode(tag).replace(/\0+$/g, '');
}

export function createPrivateProgressWitnesses(): Witnesses<PrivateProgressPrivateState> {
  return {
    localSecret: ({ privateState }) => [privateState, new Uint8Array(privateState.secret)],
  };
}
