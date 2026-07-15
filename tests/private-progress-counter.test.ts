import { describe, expect, it } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

import { PrivateProgressSimulator } from './private-progress-counter-simulator.js';

setNetworkId('undeployed');

const secretA = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const secretB = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);

describe('Private Progress Counter contract', () => {
  it('initializes its public counter at zero', () => {
    const simulator = new PrivateProgressSimulator(secretA);

    expect(simulator.getLedger().verifiedCheckIns).toBe(0n);
  });

  it('increments public state after a valid private-witness proof', () => {
    const simulator = new PrivateProgressSimulator(secretA);

    expect(simulator.recordPrivateProgress().verifiedCheckIns).toBe(1n);
    expect(simulator.recordPrivateProgress().verifiedCheckIns).toBe(2n);
  });

  it('derives deterministic but secret-dependent public commitments', () => {
    const first = new PrivateProgressSimulator(secretA).recordPrivateProgress().latestCommitment;
    const repeated = new PrivateProgressSimulator(secretA).recordPrivateProgress().latestCommitment;
    const different = new PrivateProgressSimulator(secretB).recordPrivateProgress().latestCommitment;

    expect(first).toEqual(repeated);
    expect(first).not.toEqual(different);
  });

  it('never exposes or mutates the raw private witness', () => {
    const simulator = new PrivateProgressSimulator(secretA);
    const ledger = simulator.recordPrivateProgress();

    expect(ledger.latestCommitment).not.toEqual(secretA);
    expect(simulator.getPrivateState().secret).toEqual(secretA);
    expect(Object.values(ledger)).not.toContainEqual(secretA);
  });
});
