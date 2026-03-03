// SPDX-License-Identifier: MIT
pragma solidity >=0.8.2 <0.9.0;

/// @title ProofOfReality

contract ProofOfReality {
    /// @notice It represents a file recorded on-chain.
    struct FileRecord {
        address creator;
        string cid;
        bytes32 fileHash;
        uint256 timestamp;
        bool aiConsent;
    }

    // Storage

    /// @dev Maps hash → record. A hash is unique: duplicates cannot be registered.
    mapping(bytes32 => FileRecord) private _records;

    /// @notice Address of the contract owner, who can withdraw funds.
    address payable public owner;

    /// @notice Address of the pending owner during a two-step ownership transfer.
    address public pendingOwner;

    /// @notice Cost in wei to modify the aiConsent flag. Configurable by the owner.
    uint256 public consentFee;

    // Modifiers

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the owner can perform this operation"
        );
        _;
    }

    // Constructor

    uint256 public constant DEFAULT_CONSENT_FEE = 100 wei;

    constructor() {
        owner = payable(msg.sender);
        consentFee = DEFAULT_CONSENT_FEE;
    }

    // Events

    /// @notice Emitted every time a new file is successfully registered.
    event FileRegistered(
        bytes32 indexed fileHash,
        string cid,
        address indexed creator,
        uint256 timestamp,
        bool aiConsent
    );

    /// @notice Emitted every time the aiConsent flag is changed.
    event ConsentChanged(
        bytes32 indexed fileHash,
        string cid,
        address indexed creator,
        uint256 timestamp,
        bool oldConsent,
        bool newConsent
    );

    /// @notice Emitted when a new consentFee is set.
    event ConsentFeeUpdated(uint256 oldFee, uint256 newFee);

    // Custom errors

    error InvalidCID(string cid);
    error EmptyHash();
    error FileAlreadyRegistered(bytes32 fileHash);
    error FileNotFound(bytes32 fileHash);
    error NotFileCreator(bytes32 fileHash, address caller);
    error ZeroAddress();
    error NoPendingTransfer();

    // Helper functions

    /// @notice Validates the format of the IPFS CID (v0 or v1).
    function validateIPFSCID(string memory _cid) public pure returns (bool) {
        bytes memory b = bytes(_cid);

        if (b.length == 46 && b[0] == "Q" && b[1] == "m") {
            return true;
        }

        if (b.length >= 59 && b[0] == "b" && b[1] == "a" && b[2] == "f") {
            return true;
        }

        return false;
    }

    // Write functions

    /// @notice Registers a file on-chain.
    function registerFile(
        string memory _cid,
        bytes32 _fileHash,
        bool _aiConsent
    ) external {
        if (!validateIPFSCID(_cid)) revert InvalidCID(_cid);
        if (_fileHash == bytes32(0)) revert EmptyHash();
        if (_records[_fileHash].timestamp != 0)
            revert FileAlreadyRegistered(_fileHash);

        _records[_fileHash] = FileRecord({
            creator: msg.sender,
            cid: _cid,
            fileHash: _fileHash,
            timestamp: block.timestamp,
            aiConsent: _aiConsent
        });

        emit FileRegistered(
            _fileHash,
            _cid,
            msg.sender,
            block.timestamp,
            _aiConsent
        );
    }

    /// @notice Updates the `aiConsent` flag of an already registered file.
    function setAiConsent(
        bytes32 _fileHash,
        bool _newConsent
    ) external payable {
        require(
            msg.value >= consentFee,
            "Must send at least consentFee wei to change consent"
        );

        FileRecord storage record = _records[_fileHash];

        if (record.timestamp == 0) revert FileNotFound(_fileHash);
        if (record.creator != msg.sender)
            revert NotFileCreator(_fileHash, msg.sender);
        require(
            record.aiConsent != _newConsent,
            "aiConsent already set to this value"
        );

        bool oldConsent = record.aiConsent;
        record.aiConsent = _newConsent;

        emit ConsentChanged(
            _fileHash,
            record.cid,
            record.creator,
            block.timestamp,
            oldConsent,
            _newConsent
        );

        uint256 refund = msg.value - consentFee;
        if (refund > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: refund}(
                ""
            );
            require(refundSuccess, "Refund failed");
        }
    }

    // Owner functions

    /// @notice Allows the owner to update the consent fee.
    /// @param _newFee The new fee in wei.
    function setConsentFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = consentFee;
        consentFee = _newFee;
        emit ConsentFeeUpdated(oldFee, _newFee);
    }

    /// @notice Step 1 of 2 – initiates an ownership transfer.
    ///         The new owner must call `acceptOwnership()` to finalize.
    /// @param _newOwner The address of the proposed new owner.
    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert ZeroAddress();
        pendingOwner = _newOwner;
    }

    /// @notice Step 2 of 2 – the pending owner accepts and becomes the new owner.
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Only pending owner can accept");
        owner = payable(pendingOwner);
        pendingOwner = address(0);
    }

    /// @notice Cancels a pending ownership transfer. Only callable by the current owner.
    function cancelOwnershipTransfer() external onlyOwner {
        if (pendingOwner == address(0)) revert NoPendingTransfer();
        pendingOwner = address(0);
    }

    /// @notice Allows the owner to withdraw all funds accumulated
    ///         from consent modification fees.
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdraw failed");
    }

    // Read functions

    /// @notice Checks the existence of a file given its hash.
    function verifyFile(
        bytes32 _fileHash
    )
        external
        view
        returns (
            address creator,
            string memory cid,
            uint256 timestamp,
            bool aiConsent
        )
    {
        FileRecord storage record = _records[_fileHash];
        if (record.timestamp == 0) revert FileNotFound(_fileHash);
        return (record.creator, record.cid, record.timestamp, record.aiConsent);
    }

    // Fallback / Receive

    /// @notice Accepts direct ETH transfers.
    receive() external payable {}
}
