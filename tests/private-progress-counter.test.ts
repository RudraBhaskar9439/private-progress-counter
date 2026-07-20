import { describe, expect, it } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

import { PrivateProgressSimulator } from './private-progress-counter-simulator.js';
import { createCampaignTag, createResponseTag, decodeCampaignTag } from '../src/witnesses.js';

setNetworkId('undeployed');

const secretA = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const secretB = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const july = createCampaignTag(new Date('2026-07-15T00:00:00.000Z'));
const august = createCampaignTag(new Date('2026-08-01T00:00:00.000Z'));

describe('VeilMark anonymous pulse contract', () => {
  it('initializes its public response counter at zero', () => {
    const simulator = new PrivateProgressSimulator(secretA);
    expect(simulator.getLedger().verifiedResponses).toBe(0n);
  });

  it('increments public state after valid private 1-5 responses', () => {
    const simulator = new PrivateProgressSimulator(secretA);
    expect(simulator.submitAnonymousPulse(july, 1).verifiedResponses).toBe(1n);
    expect(simulator.submitAnonymousPulse(august, 5).verifiedResponses).toBe(2n);
  });

  it('binds commitments to the private response without revealing it', () => {
    const low = new PrivateProgressSimulator(secretA).submitAnonymousPulse(july, 1).latestCommitment;
    const repeated = new PrivateProgressSimulator(secretA).submitAnonymousPulse(july, 1).latestCommitment;
    const high = new PrivateProgressSimulator(secretA).submitAnonymousPulse(july, 5).latestCommitment;
    expect(low).toEqual(repeated);
    expect(low).not.toEqual(high);
  });

  it('derives secret-dependent commitments for the same answer', () => {
    const first = new PrivateProgressSimulator(secretA).submitAnonymousPulse(july, 3).latestCommitment;
    const different = new PrivateProgressSimulator(secretB).submitAnonymousPulse(july, 3).latestCommitment;
    expect(first).not.toEqual(different);
  });

  it('changes the commitment between campaigns to reduce linkability', () => {
    const first = new PrivateProgressSimulator(secretA).submitAnonymousPulse(july, 3).latestCommitment;
    const next = new PrivateProgressSimulator(secretA).submitAnonymousPulse(august, 3).latestCommitment;
    expect(first).not.toEqual(next);
  });

  it('prevents the same private response proof twice in one campaign', () => {
    const simulator = new PrivateProgressSimulator(secretA);
    simulator.submitAnonymousPulse(july, 4);
    expect(() => simulator.submitAnonymousPulse(july, 4)).toThrow('Pulse already submitted for this campaign');
  });

  it('rejects responses outside the allowed 1-5 range before proving', () => {
    expect(() => createResponseTag(0)).toThrow('integer from 1 to 5');
    expect(() => createResponseTag(6)).toThrow('integer from 1 to 5');
  });

  it('never exposes the raw secret or selected response', () => {
    const simulator = new PrivateProgressSimulator(secretA);
    const ledger = simulator.submitAnonymousPulse(july, 2);
    expect(ledger.latestCommitment).not.toEqual(secretA);
    expect(decodeCampaignTag(ledger.latestCampaign)).toBe('pulse-2026-07');
    expect(simulator.getPrivateState().secret).toEqual(secretA);
    expect(simulator.getPrivateState().response).toEqual(createResponseTag(2));
    expect(Object.values(ledger)).not.toContainEqual(secretA);
    expect(Object.values(ledger)).not.toContainEqual(createResponseTag(2));
  });
});
