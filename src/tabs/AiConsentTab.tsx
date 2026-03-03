import { useState } from 'react';
import { ethers } from 'ethers';
import { getSignerContract, toReadableError } from '../eth';
import type { WalletInfo } from '../eth';

type AiConsentTabProps = {
  configError: string;
  onWalletInfo: (info: WalletInfo) => void;
};

export default function AiConsentTab({ configError, onWalletInfo }: AiConsentTabProps) {
  const [consentHash, setConsentHash] = useState('');
  const [newConsent, setNewConsent] = useState(false);
  const [consentFeeWei, setConsentFeeWei] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const onSetAiConsent = async () => {
    setBusy(true);
    setError('');
    setStatus('Reading fee and sending setAiConsent transaction...');

    try {
      const contract = await getSignerContract(onWalletInfo);
      const fee = (await contract.consentFee()) as bigint;
      setConsentFeeWei(fee);
      const tx = await contract.setAiConsent(consentHash, newConsent, { value: fee });
      setStatus(`Tx sent: ${tx.hash}. Waiting for confirmation...`);
      await tx.wait();
      setStatus(`aiConsent updated successfully. Tx: ${tx.hash}`);
    } catch (err) {
      let msg = toReadableError(err);
      if (msg.includes('invalid BytesLike value')) {
        msg = 'Error: the entered hash is not valid. Make sure it is a hexadecimal SHA-256 hash (0x... and 64 characters).';
      } else if (msg.includes('aiConsent already set to this value')) {
        msg = 'AI consent is already set to this value. No change needed.';
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Update AI Consent <span className="tag write">WRITE</span></h2>
      {status ? <div className="result-box ok">{status}</div> : null}
      {error ? <div className="result-box err">{error}</div> : null}

      <div className="result-box info show-static">
        Required fee: {consentFeeWei !== null ? `${ethers.formatEther(consentFeeWei)} ETH` : 'click update to read it on-chain'}
      </div>

      <div className="form-group">
        <label>Hash bytes32</label>
        <input value={consentHash} onChange={(e) => setConsentHash(e.target.value.trim())} placeholder="0x..." />
      </div>

      <label className="toggle-row">
        <span className="toggle">
          <input type="checkbox" checked={newConsent} onChange={(e) => setNewConsent(e.target.checked)} />
          <span className="slider" />
        </span>
        <span>{newConsent ? 'Authorize AI' : 'Revoke AI'}</span>
      </label>

      <button className="btn danger" disabled={busy || Boolean(configError) || !consentHash} onClick={onSetAiConsent}>
        Update aiConsent
      </button>
    </section>
  );
}
