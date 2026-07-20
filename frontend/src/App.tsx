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
          <span>VeilMark <small>Pulse</small></span>
        </a>
        <div className="network-chip"><span /> Midnight Preprod</div>
      </nav>

      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="hero" id="top">
        <p className="kicker"><span>Anonymous feedback</span> · Zero-knowledge pulse survey</p>
        <h1>Speak honestly.<br /><em>Stay unexposed.</em></h1>
        <p className="hero-copy">VeilMark Pulse lets a team prove that a valid 1–5 response was submitted without revealing the answer. Leaders see participation; contributors keep their sentiment private.</p>
        <div className="hero-proof">
          <span className="mini-moon" aria-hidden="true" />
          <div><strong>Verifiable participation,</strong><span>without surveillance.</span></div>
        </div>
      </header>

      <div className="app-grid">
        <WalletConnect wallet={wallet} />
        <CircuitCall
          connectedAPI={wallet.connectedAPI}
          reconnectAPI={wallet.reconnect}
          address={wallet.address}
        />
      </div>

      <section className="privacy-strip" aria-labelledby="privacy-title">
        <div className="privacy-intro">
          <span className="eyebrow">Privacy model</span>
          <h2 id="privacy-title">Only the proof crosses the veil.</h2>
        </div>
        <div className="privacy-item private-item"><span>Stays private</span><strong>1–5 response<br />Device key</strong></div>
        <div className="privacy-divider"><span>→</span></div>
        <div className="privacy-item public-item"><span>Becomes public</span><strong>Campaign tag<br />Commitment + count</strong></div>
      </section>

      <footer>
        <p>Built on Midnight · Your response never becomes public transaction data.</p>
        <p>Contract <code>{shortContract(CONTRACT_ADDRESS)}</code></p>
      </footer>
    </main>
  );
}
