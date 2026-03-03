import { useMemo, useState } from 'react';
import './index.css';
import RegistryTab from './tabs/RegistryTab';
import VerifyTab from './tabs/VerifyTab';
import AiConsentTab from './tabs/AiConsentTab';
import EventsTab from './tabs/EventsTab';
import { ALCHEMY_RPC_URL, CONTRACT_ADDRESS, connectWallet, disconnectWallet } from './eth';
import type { WalletInfo } from './eth';

const shortAddr = (addr: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'not connected';

function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'verify' | 'consent' | 'events'>('register');
  const [walletAddress, setWalletAddress] = useState('');
  const [networkName, setNetworkName] = useState('not connected');
  const [walletError, setWalletError] = useState('');

  const configError = useMemo(() => {
    const missing: string[] = [];
    if (!ALCHEMY_RPC_URL) missing.push('VITE_ALCHEMY_RPC_URL');
    if (!CONTRACT_ADDRESS) missing.push('VITE_CONTRACT_ADDRESS');
    return missing.length ? `Missing variables: ${missing.join(', ')}` : '';
  }, []);

  const onWalletInfo = ({ address, networkName: network }: WalletInfo) => {
    setWalletAddress(address);
    setNetworkName(network);
  };

  const onConnectWallet = async () => {
    setWalletError('');
    try {
      await connectWallet(onWalletInfo);
    } catch (err) {
      setWalletError((err as Error).message);
    }
  };

  const onDisconnectWallet = async () => {
    await disconnectWallet();
    setWalletAddress('');
    setNetworkName('not connected');
    setWalletError('');
  };

  return (
    <main className="app-shell">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">P</div>
          <div>
            <h1>
              <a
                href="https://sepolia.etherscan.io/address/0xf1cb9961f87fc8f4ffa7b28ff4d5f067e0c41b8f"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                ProofOfReality
              </a>
            </h1>
            <p>Anti-Deepfake Authenticity Registry</p>
          </div>
        </div>

        <div className="header-right">
          <div className="net-badge">
            <span className={`net-dot ${walletAddress ? 'live' : ''}`} />
            <span>{networkName}</span>
          </div>
          <div className="wallet-pill">{shortAddr(walletAddress)}</div>
          {walletAddress ? (
            <button className="btn ghost" onClick={onDisconnectWallet}>Disconnect</button>
          ) : (
            <button className="btn ghost" onClick={onConnectWallet}>Connect Wallet</button>
          )}
        </div>
      </header>

      {walletError ? <div className="result-box err">{walletError}</div> : null}
      {configError ? <div className="result-box err">{configError}</div> : null}

      <div className="tabs">
        <button className={`tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>Register</button>
        <button className={`tab ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>Verify</button>
        <button className={`tab ${activeTab === 'consent' ? 'active' : ''}`} onClick={() => setActiveTab('consent')}>AI Consent</button>
        <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Event History</button>
      </div>

      {activeTab === 'register' ? <RegistryTab configError={configError} onWalletInfo={onWalletInfo} /> : null}
      {activeTab === 'verify' ? <VerifyTab configError={configError} /> : null}
      {activeTab === 'consent' ? <AiConsentTab configError={configError} onWalletInfo={onWalletInfo} /> : null}
      {activeTab === 'events' ? <EventsTab /> : null}
    </main>
  );
}

export default App;
