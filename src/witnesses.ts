import type { Witnesses } from '../managed/private-progress-counter/contract/index.js';

export interface PrivateProgressPrivateState {
  readonly secret: Uint8Array;
  response: Uint8Array;
}

export const privateProgressStateId = 'veilmark-pulse-private-state-v1' as const;

export function createPrivateProgressState(secret: Uint8Array, response = 3): PrivateProgressPrivateState {
  if (secret.length !== 32) {
    throw new Error(`Private progress secrets must contain exactly 32 bytes; received ${secret.length}.`);
  }

  return { secret: new Uint8Array(secret), response: createResponseTag(response) };
}

export function createResponseTag(response: number): Uint8Array {
  if (!Number.isInteger(response) || response < 1 || response > 5) {
    throw new Error(`Pulse responses must be an integer from 1 to 5; received ${response}.`);
  }

  const tag = new Uint8Array(32);
  tag[0] = String(response).charCodeAt(0);
  return tag;
}

export function createCampaignTag(date = new Date()): Uint8Array {
  const campaign = `pulse-${date.toISOString().slice(0, 7)}`;
  const encoded = new TextEncoder().encode(campaign);
  const tag = new Uint8Array(32);
  tag.set(encoded);
  return tag;
}

export function decodeCampaignTag(tag: Uint8Array): string {
  return new TextDecoder().decode(tag).replace(/\0+$/g, '');
}

export function createPrivateProgressWitnesses(): Witnesses<PrivateProgressPrivateState> {
  return {
    localSecret: ({ privateState }) => [privateState, new Uint8Array(privateState.secret)],
    privateResponse: ({ privateState }) => [privateState, new Uint8Array(privateState.response)],
  };
}
