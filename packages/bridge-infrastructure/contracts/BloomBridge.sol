// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title BloomBridge
 * @dev Cross-chain bridge for BLOOM tokens between EVM and Solana
 * Features:
 * - Lock tokens for cross-chain transfers
 * - Unlock tokens with merkle proof verification
 * - Peg enforcement through mint guard
 * - Relayer coordination
 */
contract BloomBridge is Ownable, ReentrancyGuard, Pausable {
    // Bridge constants
    uint256 public constant SATS_PER_BTC = 100_000_000;
    uint256 public constant BTC_PER_BLOOM = 10;
    uint256 public constant SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM;
    
    // Contract addresses
    address public bloomToken;
    address public mintGuard;
    address public relayer;
    
    // Bridge state
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint256) public lockedBalances;
    uint256 public totalLocked;
    
    // Merkle tree management
    bytes32 public merkleRoot;
    uint256 public merkleRootUpdateTime;
    
    // Bridge limits
    uint256 public maxBridgeAmount = 1000 * 1e9; // 1000 BLOOM
    uint256 public minBridgeAmount = 1 * 1e9; // 1 BLOOM
    uint256 public bridgeFeeRate = 10; // 0.1% (10/10000)
    
    // Events
    event TokensLocked(
        address indexed user,
        uint256 amount,
        string solanaAddress,
        bytes32 indexed transactionId
    );
    event TokensUnlocked(
        address indexed user,
        uint256 amount,
        bytes32 indexed transactionId,
        bytes32 merkleRoot
    );
    event MerkleRootUpdated(bytes32 indexed newRoot, uint256 timestamp);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event BridgeLimitsUpdated(uint256 maxAmount, uint256 minAmount, uint256 feeRate);
    
    // Modifiers
    modifier onlyRelayer() {
        require(msg.sender == relayer, "BloomBridge: Only relayer can call this function");
        _;
    }
    
    modifier validBridgeAmount(uint256 amount) {
        require(amount >= minBridgeAmount, "BloomBridge: Amount below minimum");
        require(amount <= maxBridgeAmount, "BloomBridge: Amount above maximum");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _bloomToken Address of BLOOM token contract
     * @param _mintGuard Address of mint guard contract
     * @param _relayer Address of relayer
     */
    constructor(
        address _bloomToken,
        address _mintGuard,
        address _relayer
    ) {
        bloomToken = _bloomToken;
        mintGuard = _mintGuard;
        relayer = _relayer;
    }
    
    /**
     * @dev Set relayer address
     * @param _relayer Address of new relayer
     */
    function setRelayer(address _relayer) external onlyOwner {
        address oldRelayer = relayer;
        relayer = _relayer;
        emit RelayerUpdated(oldRelayer, _relayer);
    }
    
    /**
     * @dev Set bridge limits
     * @param _maxAmount Maximum bridge amount
     * @param _minAmount Minimum bridge amount
     * @param _feeRate Bridge fee rate (in basis points)
     */
    function setBridgeLimits(
        uint256 _maxAmount,
        uint256 _minAmount,
        uint256 _feeRate
    ) external onlyOwner {
        require(_maxAmount > _minAmount, "BloomBridge: Invalid limits");
        require(_feeRate <= 1000, "BloomBridge: Fee rate too high"); // Max 10%
        
        maxBridgeAmount = _maxAmount;
        minBridgeAmount = _minAmount;
        bridgeFeeRate = _feeRate;
        
        emit BridgeLimitsUpdated(_maxAmount, _minAmount, _feeRate);
    }
    
    /**
     * @dev Update merkle root (only relayer)
     * @param _merkleRoot New merkle root
     */
    function updateMerkleRoot(bytes32 _merkleRoot) external onlyRelayer {
        merkleRoot = _merkleRoot;
        merkleRootUpdateTime = block.timestamp;
        emit MerkleRootUpdated(_merkleRoot, block.timestamp);
    }
    
    /**
     * @dev Lock tokens for cross-chain transfer
     * @param amount Amount of BLOOM to lock
     * @param solanaAddress Solana address to receive tokens
     */
    function lockTokens(
        uint256 amount,
        string memory solanaAddress
    ) external nonReentrant whenNotPaused validBridgeAmount(amount) {
        require(bytes(solanaAddress).length > 0, "BloomBridge: Invalid Solana address");
        
        // Calculate bridge fee
        uint256 fee = (amount * bridgeFeeRate) / 10000;
        uint256 netAmount = amount - fee;
        
        // Transfer tokens from user to bridge
        IERC20(bloomToken).transferFrom(msg.sender, address(this), amount);
        
        // Update locked balances
        lockedBalances[msg.sender] += netAmount;
        totalLocked += netAmount;
        
        // Generate transaction ID
        bytes32 transactionId = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                solanaAddress,
                block.timestamp,
                block.number
            )
        );
        
        emit TokensLocked(msg.sender, netAmount, solanaAddress, transactionId);
    }
    
    /**
     * @dev Unlock tokens with merkle proof verification
     * @param user Address to unlock tokens for
     * @param amount Amount of BLOOM to unlock
     * @param transactionId Transaction ID from Solana
     * @param merkleProof Merkle proof for verification
     */
    function unlockTokens(
        address user,
        uint256 amount,
        bytes32 transactionId,
        bytes32[] calldata merkleProof
    ) external onlyRelayer nonReentrant whenNotPaused {
        require(!processedTransactions[transactionId], "BloomBridge: Transaction already processed");
        require(merkleRoot != bytes32(0), "BloomBridge: Merkle root not set");
        
        // Verify merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(user, amount, transactionId));
        require(
            MerkleProof.verify(merkleProof, merkleRoot, leaf),
            "BloomBridge: Invalid merkle proof"
        );
        
        // Mark transaction as processed
        processedTransactions[transactionId] = true;
        
        // Check if minting is allowed (peg enforcement)
        if (mintGuard != address(0)) {
            require(
                IMintGuard(mintGuard).canMint(amount),
                "BloomBridge: Mint would break peg"
            );
        }
        
        // Mint tokens to user
        IBloomToken(bloomToken).mint(user, amount, "Bridge unlock");
        
        emit TokensUnlocked(user, amount, transactionId, merkleRoot);
    }
    
    /**
     * @dev Emergency unlock (owner only)
     * @param user Address to unlock tokens for
     * @param amount Amount of BLOOM to unlock
     */
    function emergencyUnlock(
        address user,
        uint256 amount
    ) external onlyOwner {
        require(lockedBalances[user] >= amount, "BloomBridge: Insufficient locked balance");
        
        lockedBalances[user] -= amount;
        totalLocked -= amount;
        
        // Transfer tokens back to user
        IERC20(bloomToken).transfer(user, amount);
    }
    
    /**
     * @dev Get locked balance for user
     * @param user User address
     * @return balance Locked balance
     */
    function getLockedBalance(address user) external view returns (uint256 balance) {
        return lockedBalances[user];
    }
    
    /**
     * @dev Calculate bridge fee
     * @param amount Amount to bridge
     * @return fee Bridge fee
     */
    function calculateBridgeFee(uint256 amount) external view returns (uint256 fee) {
        return (amount * bridgeFeeRate) / 10000;
    }
    
    /**
     * @dev Get bridge statistics
     * @return _totalLocked Total locked amount
     * @return _merkleRoot Current merkle root
     * @return _merkleRootUpdateTime Merkle root update timestamp
     */
    function getBridgeStats() external view returns (
        uint256 _totalLocked,
        bytes32 _merkleRoot,
        uint256 _merkleRootUpdateTime
    ) {
        return (totalLocked, merkleRoot, merkleRootUpdateTime);
    }
    
    /**
     * @dev Check if transaction is processed
     * @param transactionId Transaction ID
     * @return processed Whether transaction is processed
     */
    function isTransactionProcessed(bytes32 transactionId) external view returns (bool processed) {
        return processedTransactions[transactionId];
    }
    
    /**
     * @dev Pause bridge (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause bridge
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Convert BLOOM amount to satoshis at peg rate
     * @param bloomAmount Amount of BLOOM in smallest unit
     * @return sats Equivalent satoshis
     */
    function bloomToSats(uint256 bloomAmount) public pure returns (uint256 sats) {
        return (bloomAmount * SATS_PER_BLOOM);
    }
    
    /**
     * @dev Convert satoshis to BLOOM amount at peg rate (floor division)
     * @param sats Amount of satoshis
     * @return bloom Equivalent BLOOM amount
     */
    function satsToBloom(uint256 sats) public pure returns (uint256 bloom) {
        return sats / SATS_PER_BLOOM;
    }
}

/**
 * @title IERC20
 * @dev Interface for ERC20 token
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title IBloomToken
 * @dev Interface for BLOOM token contract
 */
interface IBloomToken {
    function mint(address to, uint256 amount, string memory reason) external;
}

/**
 * @title IMintGuard
 * @dev Interface for mint guard contract
 */
interface IMintGuard {
    function canMint(uint256 amount) external view returns (bool);
}
