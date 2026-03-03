import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getSignerContract, hashFileSha256, PINATA_JWT } from '../eth';
import type { WalletInfo } from '../eth';
import { toReadableError } from '../eth';

type RegistryTabProps = {
  configError: string;
  onWalletInfo: (info: WalletInfo) => void;
};

export default function RegistryTab({ configError, onWalletInfo }: RegistryTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [pinataCid, setPinataCid] = useState('');
  const [registerAiConsent, setRegisterAiConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setStatus('');
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPinataCid('');

    if (!file) {
      setFileHash('');
      return;
    }

    try {
      const hash = await hashFileSha256(file);
      setFileHash(hash);
      setStatus('SHA-256 hash calculated successfully.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const uploadToPinata = async (): Promise<string> => {
    if (!selectedFile) throw new Error('Please select a file before uploading.');
    if (!PINATA_JWT) throw new Error('VITE_PINATA_JWT missing in .env file.');

    const formData = new FormData();
    formData.append('file', selectedFile);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pinata upload failed: ${res.status} ${body}`);
    }

    const data = (await res.json()) as { IpfsHash?: string };
    if (!data.IpfsHash) {
      throw new Error('Invalid Pinata response: CID missing.');
    }

    return data.IpfsHash;
  };

  const onUploadPinata = async () => {
    setBusy(true);
    setError('');
    setStatus('Uploading to Pinata...');
    try {
      const cid = await uploadToPinata();
      setPinataCid(cid);
      setStatus(`Upload complete. CID: ${cid}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRegisterFile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setStatus('Sending registerFile transaction...');

    try {
      if (!fileHash) throw new Error('File hash not available.');
      if (!pinataCid) throw new Error('CID missing. Please upload to Pinata first.');
      
      //contract instance linked to the user's wallet
      const contract = await getSignerContract(onWalletInfo);
      const tx = await contract.registerFile(pinataCid, fileHash, registerAiConsent);
      setStatus(`Tx sent: ${tx.hash}. Waiting for confirmation...`);
      await tx.wait();
      setStatus(`File registered on-chain successfully. Tx: ${tx.hash}`);
    } catch (err) {
      setError(toReadableError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Register File <span className="tag write">WRITE</span></h2>
      {status ? <div className="result-box ok">{status}</div> : null}
      {error ? <div className="result-box err">{error}</div> : null}
      <form onSubmit={onRegisterFile}>
        <div className="form-group">
          <label>File to register</label>
          <input type="file" accept="image/*,video/*" onChange={onFileChange} />
        </div>
        {fileHash ? <div className="hash-preview">SHA-256: {fileHash}</div> : null}

        <div className="form-group">
          <label>CID IPFS</label>
          <input value={pinataCid} readOnly placeholder="Qm... oppure bafy..." />
        </div>

        <label className="toggle-row">
          <span className="toggle">
            <input type="checkbox" checked={registerAiConsent} onChange={(e) => setRegisterAiConsent(e.target.checked)} />
            <span className="slider" />
          </span>
          <span>I consent to AI training use</span>
        </label>

        <div className="action-row">
          <button className="btn" type="button" onClick={onUploadPinata} disabled={busy || !selectedFile}>Upload to Pinata</button>
          <button className="btn danger" disabled={busy || Boolean(configError)} type="submit">Register on-chain</button>
        </div>
      </form>
    </section>
  );
}
