import { useState } from 'react';
import type { FormEvent } from 'react';
import { ethers } from 'ethers';
import { formatDate, getReadContract, getReadProvider, toReadableError } from '../eth';

type FileRegisteredEvent = {
  fileHash: string;
  cid: string;
  creator: string;
  timestamp: string;
  aiConsent: boolean;
  txHash: string;
  blockNumber: number;
};

type ConsentChangedEvent = {
  fileHash: string;
  cid: string;
  creator: string;
  timestamp: string;
  oldConsent: boolean;
  newConsent: boolean;
  txHash: string;
  blockNumber: number;
};

export default function EventsTab() {
  const [inputValue, setInputValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [registrations, setRegistrations] = useState<FileRegisteredEvent[]>([]);
  const [consentChanges, setConsentChanges] = useState<ConsentChangedEvent[]>([]);
  const [searched, setSearched] = useState(false);

  const FROM_BLOCK = 10288806;
  const CHUNK_SIZE = 50000;

  const queryFilterChunked = async (
    contract: ethers.Contract,
    filter: ethers.DeferredTopicFilter,
    from: number,
    to: number,
    onProgress: (msg: string) => void
  ): Promise<ethers.Log[]> => {
    const allLogs: ethers.Log[] = [];
    const total = to - from + 1;
    let fetched = 0;

    for (let start = from; start <= to; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, to);
      const logs = await contract.queryFilter(filter, start, end);
      allLogs.push(...logs);
      fetched += end - start + 1;
      onProgress(`Scanning blocks ${start}-${end} (${Math.round((fetched / total) * 100)}%)... found ${allLogs.length} logs`);
    }

    return allLogs;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setRegistrations([]);
    setConsentChanges([]);
    setSearched(false);

    if (!inputValue.trim()) {
      setError('Please enter a valid hash.');
      return;
    }

    setBusy(true);
    setStatus('Connecting to node...');

    try {
      const provider = getReadProvider();
      const contract = getReadContract(provider);
      const raw = inputValue.trim();

      if (!raw.startsWith('0x') || raw.length !== 66) {
        throw new Error('Invalid hash: must be 0x followed by 64 hex characters (bytes32).');
      }

      const registeredFilter = contract.filters.FileRegistered(raw, null);
      const consentFilter = contract.filters.ConsentChanged(raw, null);

      const latestBlock = await provider.getBlockNumber();
      setStatus(`Current block: ${latestBlock}. Scanning from block ${FROM_BLOCK}...`);

      const rawRegistered = await queryFilterChunked(contract, registeredFilter, FROM_BLOCK, latestBlock, (msg) =>
        setStatus(`[FileRegistered] ${msg}`)
      );

      const rawConsent = await queryFilterChunked(contract, consentFilter, FROM_BLOCK, latestBlock, (msg) =>
        setStatus(`[ConsentChanged] ${msg}`)
      );

      const parsedRegistered = rawRegistered
        .map((log) => {
          const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
          if (!parsed) return null;
          return {
            fileHash: parsed.args.fileHash as string,
            cid: parsed.args.cid as string,
            creator: parsed.args.creator as string,
            timestamp: formatDate(parsed.args.timestamp as bigint),
            aiConsent: parsed.args.aiConsent as boolean,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber
          };
        })
        .filter(Boolean)
        .sort((a, b) => a!.blockNumber - b!.blockNumber) as FileRegisteredEvent[];

      const parsedConsent = rawConsent
        .map((log) => {
          const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
          if (!parsed) return null;
          return {
            fileHash: parsed.args.fileHash as string,
            cid: parsed.args.cid as string,
            creator: parsed.args.creator as string,
            timestamp: formatDate(parsed.args.timestamp as bigint),
            oldConsent: parsed.args.oldConsent as boolean,
            newConsent: parsed.args.newConsent as boolean,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber
          };
        })
        .filter(Boolean)
        .sort((a, b) => a!.blockNumber - b!.blockNumber) as ConsentChangedEvent[];

      setRegistrations(parsedRegistered);
      setConsentChanges(parsedConsent);
      setSearched(true);

      if (parsedRegistered.length === 0 && parsedConsent.length === 0) {
        setStatus('No events found for this search criteria.');
      } else {
        setStatus(`Found ${parsedRegistered.length} registration(s) and ${parsedConsent.length} consent change(s).`);
      }
    } catch (err) {
      setError(toReadableError(err));
    } finally {
      setBusy(false);
    }
  };

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const shortHash = (h: string) => `${h.slice(0, 10)}...${h.slice(-6)}`;
  const explorerTx = (txHash: string) => `https://etherscan.io/tx/${txHash}`;

  return (
    <section className="card events-tab">
      <h2>
        Event History <span className="tag">READ</span>
      </h2>

      <form onSubmit={onSubmit} className="events-form">
        <div className="form-group">
          <label>File hash (0x + 64 hex)</label>
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="0xabc123..."
            className="events-input-mono"
          />
        </div>

        <div className="action-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Searching...' : 'Search events'}
          </button>
        </div>
      </form>

      {status ? (
        <div className="result-box ok">
          <span className="events-status-line">{status}</span>
          {busy ? (
            <div className="events-progress-track">
              <div className="events-progress-bar" />
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="result-box err">{error}</div> : null}

      {searched ? (
        <div className="events-section">
          <h3 className="events-subtitle">
            File Registrations <span className="events-count">({registrations.length})</span>
          </h3>

          {registrations.length === 0 ? (
            <p className="events-empty">No registrations found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Hash File</th>
                    <th>CID IPFS</th>
                    <th>Creator</th>
                    <th>AI Consent</th>
                    <th>Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'events-row-even' : ''}>
                      <td>{r.timestamp}</td>
                      <td title={r.fileHash}>{shortHash(r.fileHash)}</td>
                      <td title={r.cid}>{r.cid.length > 16 ? `${r.cid.slice(0, 16)}...` : r.cid}</td>
                      <td title={r.creator}>{shortAddr(r.creator)}</td>
                      <td>
                        <span className={`badge ${r.aiConsent ? 'yes' : 'no'}`}>{r.aiConsent ? 'YES' : 'NO'}</span>
                      </td>
                      <td>
                        <a href={explorerTx(r.txHash)} target="_blank" rel="noopener noreferrer" className="events-link" title={r.txHash}>
                          {shortHash(r.txHash)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {searched ? (
        <div className="events-section">
          <h3 className="events-subtitle">
            AI Consent Changes <span className="events-count">({consentChanges.length})</span>
          </h3>

          {consentChanges.length === 0 ? (
            <p className="events-empty">No consent changes found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Hash File</th>
                    <th>CID IPFS</th>
                    <th>Creator</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {consentChanges.map((c, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'events-row-even' : ''}>
                      <td>{c.timestamp}</td>
                      <td title={c.fileHash}>{shortHash(c.fileHash)}</td>
                      <td title={c.cid}>{c.cid.length > 16 ? `${c.cid.slice(0, 16)}...` : c.cid}</td>
                      <td title={c.creator}>{shortAddr(c.creator)}</td>
                      <td>
                        <span className={`badge ${c.oldConsent ? 'yes' : 'no'}`}>{c.oldConsent ? 'YES' : 'NO'}</span>
                      </td>
                      <td>
                        <span className={`badge ${c.newConsent ? 'yes' : 'no'}`}>{c.newConsent ? 'YES' : 'NO'}</span>
                      </td>
                      <td>
                        <a href={explorerTx(c.txHash)} target="_blank" rel="noopener noreferrer" className="events-link" title={c.txHash}>
                          {shortHash(c.txHash)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
