import { ethers } from 'ethers';
import { CONTRACT_ABI } from './contractAbi';

export type WalletInfo = {
  address: string;
  networkName: string;
};

export const ALCHEMY_RPC_URL = import.meta.env.VITE_ALCHEMY_RPC_URL as string | undefined;
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined;
export const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;

const contractInterface = new ethers.Interface(CONTRACT_ABI);

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export const hashFileSha256 = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', data);
  return `0x${toHex(digest)}`;
};

export const formatDate = (unixSeconds: bigint | number): string => {
  const value = Number(unixSeconds) * 1000;
  return Number.isFinite(value) ? new Date(value).toLocaleString() : 'N/A';
};

export const toReadableError = (err: unknown): string => {
  const e = err as {
    message?: string;
    data?: string;
    error?: { data?: string };
    info?: { error?: { data?: string; message?: string } };
  };

  const rawData = e?.data ?? e?.error?.data ?? e?.info?.error?.data;

  if (typeof rawData === 'string' && rawData.startsWith('0x')) {
    try {
      const decoded = contractInterface.parseError(rawData);
      if (decoded) {
        if (decoded.name === 'FileNotFound') {
          return `File not found in on-chain registry (FileNotFound). Requested hash: ${decoded.args.fileHash}`;
        }
        if (decoded.name === 'FileAlreadyRegistered') {
          return `File already registered (FileAlreadyRegistered). Hash: ${decoded.args.fileHash}`;
        }
        if (decoded.name === 'InvalidCID') {
          return `Invalid CID (InvalidCID): ${decoded.args.cid}`;
        }
        if (decoded.name === 'NotFileCreator') {
          return 'Unauthorized operation: only the creator can modify the consent (NotFileCreator).';
        }
        if (decoded.name === 'EmptyHash') {
          return 'Invalid empty hash (EmptyHash).';
        }
        if (decoded.name === 'NoPendingTransfer') {
          return 'No pending ownership transfer (NoPendingTransfer).';
        }
        if (decoded.name === 'ZeroAddress') {
          return 'Invalid zero address (ZeroAddress).';
        }
        return `${decoded.name}: ${String(decoded.args)}`;
      }
    } catch {
      // fallback
    }
  }

  const msg = e?.message ?? e?.info?.error?.message ?? String(err);
  if (msg.includes('unknown custom error') || msg.includes('CALL_EXCEPTION')) {
    return 'On-chain call failed with undecodable custom error. Make sure the hash exists and is in bytes32 format (0x + 64 hex).';
  }
  return msg;
};

export const getReadProvider = (): ethers.BrowserProvider => {
  const ethereum = (window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum;
  if (!ethereum) {
    throw new Error('Wallet not found. Please install MetaMask.');
  }
  
  return new ethers.BrowserProvider(ethereum);
};


export const getReadContract = (provider?: ethers.BrowserProvider): ethers.Contract => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('VITE_CONTRACT_ADDRESS is missing.');
  }
  const resolvedProvider = provider ?? getReadProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, resolvedProvider);
};

export const getReadContractFromAlchemy = (): ethers.Contract => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('VITE_CONTRACT_ADDRESS is missing.');
  }
  if (!ALCHEMY_RPC_URL) {
    throw new Error('VITE_ALCHEMY_RPC_URL is missing.');
  }
  const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
};

export const connectWallet = async (onWalletInfo: (info: WalletInfo) => void): Promise<ethers.Signer> => {
  const ethereum = (window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum;
  if (!ethereum) {
    throw new Error('Wallet not found. Please install MetaMask.');
  }

  const browserProvider = new ethers.BrowserProvider(ethereum);
  // open MetaMask pop-up.
  await browserProvider.send('eth_requestAccounts', []);
  const signer = await browserProvider.getSigner();
  const address = await signer.getAddress();
  const network = await browserProvider.getNetwork();

  onWalletInfo({ address, networkName: network.name });
  return signer;
};

export const disconnectWallet = async (): Promise<void> => {
  const ethereum = (window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum;
  if (!ethereum) return;
  try {
    await (ethereum as ethers.Eip1193Provider).request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }]
    });
  } catch {
    
  }
};

export const getSignerContract = async (onWalletInfo: (info: WalletInfo) => void): Promise<ethers.Contract> => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('VITE_CONTRACT_ADDRESS is missing.');
  }
  const signer = await connectWallet(onWalletInfo);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};
