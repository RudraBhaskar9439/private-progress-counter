import { describe, expect, it } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

import { PrivateProgressSimulator } from './private-progress-counter-simulator.js';
import { createPeriodTag, decodePeriodTag } from '../src/witnesses.js';

setNetworkId('undeployed');

const secretA = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const secretB = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const july15 = createPeriodTag(new Date('2026-07-15T00:00:00.000Z'));
const july16 = createPeriodTag(new Date('2026-07-16T00:00:00.000Z'));

describe('Private Progress Counter contract', () => {
  it('initializes its public counter at zero', () => {
    const simulator = new PrivateProgressSimulator(secretA);

    expect(simulator.getLedger().verifiedCheckIns).toBe(0n);
  });

  it('increments public state after a valid private-witness proof', () => {
    const simulator = new PrivateProgressSimulator(secretA);

    expect(simulator.recordPrivateProgress(july15).verifiedCheckIns).toBe(1n);
    expect(simulator.recordPrivateProgress(july16).verifiedCheckIns).toBe(2n);
  });

  it('derives deterministic but secret-dependent public commitments', () => {
    const first = new PrivateProgressSimulator(secretA).recordPrivateProgress(july15).latestCommitment;
    const repeated = new PrivateProgressSimulator(secretA).recordPrivateProgress(july15).latestCommitment;
    const different = new PrivateProgressSimulator(secretB).recordPrivateProgress(july15).latestCommitment;

    expect(first).toEqual(repeated);
    expect(first).not.toEqual(different);
  });

  it('changes the public commitment across periods to reduce linkability', () => {
    const first = new PrivateProgressSimulator(secretA).recordPrivateProgress(july15).latestCommitment;
    const next = new PrivateProgressSimulator(secretA).recordPrivateProgress(july16).latestCommitment;

    expect(first).not.toEqual(next);
  });

  it('prevents the same private secret from proving twice in one period', () => {
    const simulator = new PrivateProgressSimulator(secretA);
    simulator.recordPrivateProgress(july15);

    expect(() => simulator.recordPrivateProgress(july15)).toThrow('Progress already proved for this period');
  });

  it('never exposes or mutates the raw private witness', () => {
    const simulator = new PrivateProgressSimulator(secretA);
    const ledger = simulator.recordPrivateProgress(july15);

    expect(ledger.latestCommitment).not.toEqual(secretA);
    expect(decodePeriodTag(ledger.latestPeriod)).toBe('2026-07-15');
    expect(simulator.getPrivateState().secret).toEqual(secretA);
    expect(Object.values(ledger)).not.toContainEqual(secretA);
  });
});
