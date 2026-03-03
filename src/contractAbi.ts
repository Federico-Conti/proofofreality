export const CONTRACT_ABI = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  { inputs: [], name: 'EmptyHash', type: 'error' },
  { inputs: [{ internalType: 'bytes32', name: 'fileHash', type: 'bytes32' }], name: 'FileAlreadyRegistered', type: 'error' },
  { inputs: [{ internalType: 'bytes32', name: 'fileHash', type: 'bytes32' }], name: 'FileNotFound', type: 'error' },
  { inputs: [{ internalType: 'string', name: 'cid', type: 'string' }], name: 'InvalidCID', type: 'error' },
  { inputs: [], name: 'NoPendingTransfer', type: 'error' },
  { inputs: [{ internalType: 'bytes32', name: 'fileHash', type: 'bytes32' }, { internalType: 'address', name: 'caller', type: 'address' }], name: 'NotFileCreator', type: 'error' },
  { inputs: [], name: 'ZeroAddress', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'fileHash', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'cid', type: 'string' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { indexed: false, internalType: 'bool', name: 'oldConsent', type: 'bool' },
      { indexed: false, internalType: 'bool', name: 'newConsent', type: 'bool' }
    ],
    name: 'ConsentChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'oldFee', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'newFee', type: 'uint256' }
    ],
    name: 'ConsentFeeUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'fileHash', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'cid', type: 'string' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { indexed: false, internalType: 'bool', name: 'aiConsent', type: 'bool' }
    ],
    name: 'FileRegistered',
    type: 'event'
  },
  { inputs: [], name: 'DEFAULT_CONSENT_FEE', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'acceptOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'cancelOwnershipTransfer', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'consentFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address payable', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pendingOwner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [
      { internalType: 'string', name: '_cid', type: 'string' },
      { internalType: 'bytes32', name: '_fileHash', type: 'bytes32' },
      { internalType: 'bool', name: '_aiConsent', type: 'bool' }
    ],
    name: 'registerFile',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_fileHash', type: 'bytes32' },
      { internalType: 'bool', name: '_newConsent', type: 'bool' }
    ],
    name: 'setAiConsent',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  { inputs: [{ internalType: 'uint256', name: '_newFee', type: 'uint256' }], name: 'setConsentFee', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: '_newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'string', name: '_cid', type: 'string' }], name: 'validateIPFSCID', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'pure', type: 'function' },
  {
    inputs: [{ internalType: 'bytes32', name: '_fileHash', type: 'bytes32' }],
    name: 'verifyFile',
    outputs: [
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'string', name: 'cid', type: 'string' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'bool', name: 'aiConsent', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  { inputs: [], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { stateMutability: 'payable', type: 'receive' }
];
