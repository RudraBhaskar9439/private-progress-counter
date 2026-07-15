import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

import {
  createVeilMarkClient,
  type ProofResult,
  type PublicProgressState,
} from '../lib/veilmark';

type Client = Awaited<ReturnType<typeof createVeilMarkClient>>;
type ActionState = 'idle' | 'loading' | 'proving' | 'success' | 'error';

function compact(value: string | null, start = 12, end = 8): string {
  if (!value) return '—';
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function friendlyProofError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/assert|already|usedCommitments|duplicate/i.test(message)) {
    return 'Today is already sealed with this private key. Come back tomorrow for a fresh proof.';
  }
  if (/reject|declin|cancel/i.test(message)) return 'The transaction was cancelled in Lace.';
  if (/balance|fund|dust|fee/i.test(message)) return 'Your Preprod wallet needs enough NIGHT/DUST to pay the transaction fee.';
  if (/proof|prover/i.test(message)) return 'The proof service could not finish. Wait a moment and try again.';
  return message || 'The proof could not be completed.';
}

export function CircuitCall({
  connectedAPI,
  address,
}: {
  readonly connectedAPI: ConnectedAPI | null;
  readonly address: string | null;
}) {
  const clientRef = useRef<Client | null>(null);
  const clientPromiseRef = useRef<Promise<Client> | null>(null);
  const [publicState, setPublicState] = useState<PublicProgressState | null>(null);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const prepare = useCallback(async () => {
    if (!connectedAPI) return null;
    if (clientRef.current) return clientRef.current;
    if (!clientPromiseRef.current) {
      setActionState('loading');
      clientPromiseRef.current = createVeilMarkClient(connectedAPI);
    }
    try {
      const client = await clientPromiseRef.current;
      clientRef.current = client;
      setPublicState(await client.readPublicState());
      setActionState('idle');
      return client;
    } catch (initializationError) {
      clientPromiseRef.current = null;
      throw initializationError;
    }
  }, [connectedAPI]);

  useEffect(() => {
    clientRef.current = null;
    clientPromiseRef.current = null;
    setResult(null);
    setError(null);
    setPublicState(null);
    if (!connectedAPI) {
      setActionState('idle');
      return;
    }

    let active = true;
    prepare().catch((initializationError) => {
      if (!active) return;
      setError(friendlyProofError(initializationError));
      setActionState('error');
    });
    return () => { active = false; };
  }, [connectedAPI, prepare]);

  const proveToday = async () => {
    if (!connectedAPI) return;
    setError(null);
    setResult(null);
    setActionState('proving');
    try {
      const client = await prepare();
      if (!client) return;
      const proof = await client.proveToday();
      setResult(proof);
      setPublicState(proof);
      setActionState('success');
    } catch (proofError) {
      setError(friendlyProofError(proofError));
      setActionState('error');
    }
  };

  const isBusy = actionState === 'loading' || actionState === 'proving';
  const today = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date());

  return (
    <section className="proof-card panel" aria-labelledby="proof-title">
      <div className="section-heading">
        <span className="eyebrow">02 · Proof</span>
        <span className="utc-badge">UTC · {today}</span>
      </div>
      <h2 id="proof-title">Seal today’s progress.</h2>
      <p className="muted">One click creates a zero-knowledge proof from your device key and today’s date.</p>

      <div className="proof-orbit" aria-hidden="true">
        <div className={`moon-core ${actionState === 'proving' ? 'is-proving' : ''}`}>
          <span>{actionState === 'success' ? '✓' : 'ZK'}</span>
        </div>
        <span className="orbit-label orbit-private">private key</span>
        <span className="orbit-label orbit-public">public proof</span>
      </div>

      <div className="proof-steps" aria-label="Proof process">
        <div><span>1</span><strong>Prepare locally</strong></div>
        <div><span>2</span><strong>Prove privately</strong></div>
        <div><span>3</span><strong>Publish commitment</strong></div>
      </div>

      <button
        className="button button-primary full-width proof-button"
        type="button"
        onClick={proveToday}
        disabled={!connectedAPI || isBusy}
      >
        {!connectedAPI && 'Connect wallet to continue'}
        {connectedAPI && actionState === 'loading' && 'Loading the circuit…'}
        {connectedAPI && actionState === 'proving' && 'Generating private proof…'}
        {connectedAPI && !isBusy && 'Prove today’s progress'}
      </button>

      {actionState === 'proving' && (
        <p className="process-note" role="status"><span className="spinner" /> Keep this tab open and approve the transaction in Lace.</p>
      )}
      {result && (
        <div className="success-message" role="status">
          <span className="success-icon">✓</span>
          <div>
            <strong>Proved without revealing your input.</strong>
            <span>Transaction {compact(result.transactionId, 14, 10)}</span>
          </div>
        </div>
      )}
      {error && <p className="error-message" role="alert">{error}</p>}

      <div className="public-ledger">
        <div><span>Network proofs</span><strong>{publicState ? publicState.totalProofs.toString() : '—'}</strong></div>
        <div><span>Latest day</span><strong>{publicState?.latestPeriod ?? '—'}</strong></div>
        <div><span>Commitment</span><code title={publicState?.latestCommitment ?? ''}>{compact(publicState?.latestCommitment ?? null)}</code></div>
      </div>
      {address && <span className="sr-only">Connected address: {address}</span>}
    </section>
  );
}
