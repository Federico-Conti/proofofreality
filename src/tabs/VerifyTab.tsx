import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { formatDate, getReadContract, hashFileSha256, toReadableError } from '../eth';

type VerifyResult = {
  creator: string;
  cid: string;
  timestamp: string;
  aiConsent: boolean;
};

type VerifyTabProps = {
  configError: string;
};

export default function VerifyTab({ configError }: VerifyTabProps) {
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const onVerifyFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setError('');
    setStatus('Calculating hash...');
    try {
      const hash = await hashFileSha256(file);
      setVerifyHash(hash);
      setStatus('Verification hash calculated.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onVerifyFile = async () => {
    setBusy(true);
    setError('');
    setStatus('Verifying file on-chain...');

    try {
      const contract = getReadContract();
      const result = await contract.verifyFile(verifyHash);
      const parsed: VerifyResult = {
        creator: result[0],
        cid: result[1],
        timestamp: formatDate(result[2]),
        aiConsent: result[3]
      };
      setVerifyResult(parsed);
      setStatus('File found in on-chain registry.');
    } catch (err) {
      setVerifyResult(null);
      setError(toReadableError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Verify File <span className="tag">READ</span></h2>
      {status ? <div className="result-box ok">{status}</div> : null}
      {error ? <div className="result-box err">{error}</div> : null}
      <div className="form-group">
          <label>Upload file (optional)</label>
        <input type="file" accept="image/*,video/*" onChange={onVerifyFileChange} />
      </div>
      <div className="form-group">
          <label>Or enter bytes32 hash</label>
        <input value={verifyHash} onChange={(e) => setVerifyHash(e.target.value.trim())} placeholder="0x..." />
      </div>
      {verifyHash ? <div className="hash-preview">SHA-256: {verifyHash}</div> : null}
      <button className="btn" disabled={busy || Boolean(configError) || !verifyHash} onClick={onVerifyFile}>Verify</button>
      {verifyResult ? (
        <div className="result-box info show-static">
          <p>Creator: <code>{verifyResult.creator}</code></p>
          <p>CID: <a href={`https://salmon-large-eel-579.mypinata.cloud/ipfs/${verifyResult.cid}`} target="_blank" rel="noopener noreferrer"><code>{verifyResult.cid}</code></a></p>
          <p>Timestamp: {verifyResult.timestamp}</p>
          <p>aiConsent: {verifyResult.aiConsent ? 'true' : 'false'}</p>
        </div>
      ) : null}
    </section>
  );
}
