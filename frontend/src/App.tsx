import { CircuitCall } from './components/CircuitCall';
import { WalletConnect } from './components/WalletConnect';
import { useMidnight } from './hooks/useMidnight';
import { CONTRACT_ADDRESS } from './lib/veilmark';

function shortContract(address: string): string {
  return address ? `${address.slice(0, 10)}…${address.slice(-8)}` : 'Deploying';
}

export default function App() {
  const wallet = useMidnight();

  return (
    <main>
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="VeilMark home">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span>VeilMark</span>
        </a>
        <div className="network-chip"><span /> Midnight Preprod</div>
      </nav>

      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="hero" id="top">
        <p className="kicker"><span>Zero knowledge</span> · Daily progress ritual</p>
        <h1>Build consistency.<br /><em>Keep the reason private.</em></h1>
        <p className="hero-copy">VeilMark proves you showed up today without exposing what you worked on, why it matters, or the private key behind your commitment.</p>
        <div className="hero-proof">
          <span className="mini-moon" aria-hidden="true" />
          <div><strong>A public signal,</strong><span>backed by a private truth.</span></div>
        </div>
      </header>

      <div className="app-grid">
        <WalletConnect wallet={wallet} />
        <CircuitCall connectedAPI={wallet.connectedAPI} address={wallet.address} />
      </div>

      <section className="privacy-strip" aria-labelledby="privacy-title">
        <div className="privacy-intro">
          <span className="eyebrow">Privacy model</span>
          <h2 id="privacy-title">Only the proof crosses the veil.</h2>
        </div>
        <div className="privacy-item private-item"><span>Stays private</span><strong>Device key<br />Your context</strong></div>
        <div className="privacy-divider"><span>→</span></div>
        <div className="privacy-item public-item"><span>Becomes public</span><strong>UTC day<br />Commitment + count</strong></div>
      </section>

      <footer>
        <p>Built on Midnight · Your secret never enters the transaction.</p>
        <p>Contract <code>{shortContract(CONTRACT_ADDRESS)}</code></p>
      </footer>
    </main>
  );
}
