import type { useMidnight } from '../hooks/useMidnight';

type Wallet = ReturnType<typeof useMidnight>;

function shortAddress(address: string): string {
  return `${address.slice(0, 14)}…${address.slice(-10)}`;
}

export function WalletConnect({ wallet }: { readonly wallet: Wallet }) {
  const connected = wallet.status === 'connected' && wallet.address;

  return (
    <section className="wallet-card panel" aria-labelledby="wallet-title">
      <div className="section-heading">
        <span className="eyebrow">01 · Identity</span>
        <span className={`status-pill ${connected ? 'is-live' : ''}`}>
          <span className="status-dot" aria-hidden="true" />
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <h2 id="wallet-title">Your wallet is the doorway.</h2>
      <p className="muted">Lace authorizes the proof. Your pulse response and private device key stay in this browser.</p>

      {connected ? (
        <>
          <div className="address-block">
            <span>Midnight Preprod address</span>
            <code title={wallet.address ?? ''}>{shortAddress(wallet.address ?? '')}</code>
          </div>
          <button className="button button-secondary full-width" type="button" onClick={wallet.disconnect}>
            Disconnect wallet
          </button>
        </>
      ) : (
        <>
          {wallet.wallets.length > 1 && (
            <label className="wallet-picker">
              <span>Wallet</span>
              <select value={wallet.selectedId} onChange={(event) => wallet.setSelectedId(event.target.value)}>
                {wallet.wallets.map((detected) => (
                  <option key={detected.id} value={detected.id}>{detected.name}</option>
                ))}
              </select>
            </label>
          )}
          <button
            className="button button-primary full-width"
            type="button"
            onClick={wallet.connect}
            disabled={wallet.status === 'detecting' || wallet.status === 'connecting' || wallet.status === 'missing'}
          >
            {wallet.status === 'detecting' && 'Looking for Lace…'}
            {wallet.status === 'connecting' && 'Approve in Lace…'}
            {wallet.status === 'missing' && 'Lace not detected'}
            {wallet.status === 'ready' && `Connect ${wallet.selectedWallet?.name ?? 'wallet'}`}
          </button>
          {wallet.status === 'missing' && (
            <p className="inline-note">Install or open <a href="https://www.lace.io/" target="_blank" rel="noreferrer">Lace wallet</a>, then reload this page.</p>
          )}
        </>
      )}

      {wallet.error && <p className="error-message" role="alert">{wallet.error}</p>}
    </section>
  );
}
