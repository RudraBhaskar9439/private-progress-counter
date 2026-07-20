import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

import {
  createVeilMarkClient,
  type ProofResult,
  type PublicProgressState,
} from '../lib/veilmark';

type Client = Awaited<ReturnType<typeof createVeilMarkClient>>;
type ActionState = 'idle' | 'loading' | 'proving' | 'success' | 'error';

const pulseOptions = [
  { value: 1, label: 'Blocked' },
  { value: 2, label: 'Strained' },
  { value: 3, label: 'Steady' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Thriving' },
] as const;

function compact(value: string | null, start = 12, end = 8): string {
  if (!value) return '—';
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function friendlyProofError(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  const visited = new Set<unknown>();
  while (current && !visited.has(current) && messages.length < 8) {
    visited.add(current);
    if (current instanceof Error) {
      messages.push(current.message);
      current = current.cause;
    } else if (typeof current === 'object') {
      const value = current as Record<string, unknown>;
      const details = [value.code, value.reason, value.message]
        .filter((part): part is string => typeof part === 'string' && part.length > 0);
      messages.push(details.join(': ') || JSON.stringify(value));
      current = value.cause ?? value.error;
    } else {
      messages.push(String(current));
      break;
    }
  }
  const message = messages.join(' — ');
  if (/assert|already|usedCommitments|duplicate/i.test(message)) {
    return 'This exact private pulse was already submitted for the current campaign.';
  }
  if (/ChargedState|runtime is out of sync/i.test(message)) {
    return 'The app runtime is out of sync. Hard-refresh this page and try once more.';
  }
  if (/reject|declin|cancel/i.test(message)) return 'The transaction was cancelled in Lace.';
  if (/balance|fund|dust|fee/i.test(message)) return 'Your Preprod wallet needs enough NIGHT/DUST to pay the transaction fee.';
  if (/proof|prover/i.test(message)) return 'The proof service could not finish. Wait a moment and try again.';
  return message || 'The proof could not be completed.';
}

export function CircuitCall({
  connectedAPI,
  reconnectAPI,
  address,
}: {
  readonly connectedAPI: ConnectedAPI | null;
  readonly reconnectAPI: () => Promise<ConnectedAPI>;
  readonly address: string | null;
}) {
  const clientRef = useRef<Client | null>(null);
  const clientPromiseRef = useRef<Promise<Client> | null>(null);
  const [publicState, setPublicState] = useState<PublicProgressState | null>(null);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState(3);

  const prepare = useCallback(async () => {
    if (!connectedAPI) return null;
    if (clientRef.current) return clientRef.current;
    if (!clientPromiseRef.current) {
      setActionState('loading');
      clientPromiseRef.current = createVeilMarkClient(connectedAPI, reconnectAPI);
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
  }, [connectedAPI, reconnectAPI]);

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

  const submitPulse = async () => {
    if (!connectedAPI) return;
    setError(null);
    setResult(null);
    setActionState('proving');
    try {
      const client = await prepare();
      if (!client) return;
      const proof = await client.submitPulse(response);
      setResult(proof);
      setPublicState(proof);
      setActionState('success');
    } catch (proofError) {
      setError(friendlyProofError(proofError));
      setActionState('error');
    }
  };

  const isBusy = actionState === 'loading' || actionState === 'proving';
  const campaign = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date());

  return (
    <section className="proof-card panel" aria-labelledby="proof-title">
      <div className="section-heading">
        <span className="eyebrow">02 · Proof</span>
        <span className="utc-badge">Campaign · {campaign}</span>
      </div>
      <h2 id="proof-title">How is your work really going?</h2>
      <p className="muted">Choose honestly. Midnight proves your answer is valid without publishing which option you selected.</p>

      <fieldset className="pulse-fieldset" disabled={isBusy}>
        <legend>Your private pulse</legend>
        <div className="pulse-options">
          {pulseOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`pulse-option ${response === option.value ? 'is-selected' : ''}`}
              aria-pressed={response === option.value}
              onClick={() => setResponse(option.value)}
            >
              <strong>{option.value}</strong>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <p><span aria-hidden="true">◉</span> Selected locally · never sent as public data</p>
      </fieldset>

      <div className="proof-orbit" aria-hidden="true">
        <div className={`moon-core ${actionState === 'proving' ? 'is-proving' : ''}`}>
          <span>{actionState === 'success' ? '✓' : 'ZK'}</span>
        </div>
        <span className="orbit-label orbit-private">private response</span>
        <span className="orbit-label orbit-public">validity proof</span>
      </div>

      <div className="proof-steps" aria-label="Proof process">
        <div><span>1</span><strong>Choose privately</strong></div>
        <div><span>2</span><strong>Prove 1–5</strong></div>
        <div><span>3</span><strong>Count response</strong></div>
      </div>

      <button
        className="button button-primary full-width proof-button"
        type="button"
        onClick={submitPulse}
        disabled={!connectedAPI || isBusy}
      >
        {!connectedAPI && 'Connect wallet to continue'}
        {connectedAPI && actionState === 'loading' && 'Loading the circuit…'}
        {connectedAPI && actionState === 'proving' && 'Proving your response privately…'}
        {connectedAPI && !isBusy && 'Submit anonymous pulse'}
      </button>

      {actionState === 'proving' && (
        <p className="process-note" role="status"><span className="spinner" /> Keep this tab open and approve the transaction in Lace.</p>
      )}
      {result && (
        <div className="success-message" role="status">
          <span className="success-icon">✓</span>
          <div>
            <strong>Valid pulse proved. Your answer stayed private.</strong>
            <span>Transaction {compact(result.transactionId, 14, 10)}</span>
          </div>
        </div>
      )}
      {error && <p className="error-message" role="alert">{error}</p>}

      <div className="public-ledger">
        <div><span>Verified responses</span><strong>{publicState ? publicState.totalProofs.toString() : '—'}</strong></div>
        <div><span>Campaign</span><strong>{publicState?.latestCampaign ?? '—'}</strong></div>
        <div><span>Commitment</span><code title={publicState?.latestCommitment ?? ''}>{compact(publicState?.latestCommitment ?? null)}</code></div>
      </div>
      {address && <span className="sr-only">Connected address: {address}</span>}
    </section>
  );
}
