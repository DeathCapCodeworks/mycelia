// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title MiningRewards
 * @dev Manages BLOOM token rewards for IPFS mining contributions
 * Integrates with peg system and enforces contribution-based rewards
 */
contract MiningRewards is Ownable, ReentrancyGuard, Pausable {
    // Contract addresses
    address public bloomToken;
    address public mintGuard;
    
    // Mining configuration
    uint256 public constant STORAGE_REWARD_PER_GB = 1e9; // 1 BLOOM per GB
    uint256 public constant BANDWIDTH_REWARD_PER_GB = 1e8; // 0.1 BLOOM per GB
    uint256 public constant CONTENT_REWARD = 1e7; // 0.01 BLOOM per content piece
    
    // Contribution tiers
    struct ContributionTier {
        uint256 minScore;
        uint256 multiplier; // Scaled by 1e18
    }
    
    ContributionTier[] public contributionTiers;
    
    // Miner data
    struct MinerData {
        uint256 totalContributed;
        uint256 totalRewards;
        uint256 lastContribution;
        uint256 contributionScore;
        bool isActive;
    }
    
    mapping(address => MinerData) public miners;
    address[] public minerList;
    
    // Events
    event MinerRegistered(address indexed miner, uint256 timestamp);
    event ContributionRecorded(
        address indexed miner,
        uint256 storageUsed,
        uint256 bandwidthUsed,
        uint256 contentCount,
        uint256 baseReward,
        uint256 adjustedReward
    );
    event RewardsClaimed(address indexed miner, uint256 amount);
    event MinerDeactivated(address indexed miner);
    event ContributionTierUpdated(uint256 tier, uint256 minScore, uint256 multiplier);
    
    // Modifiers
    modifier onlyActiveMiner() {
        require(miners[msg.sender].isActive, "MiningRewards: Miner not active");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _bloomToken Address of BLOOM token contract
     * @param _mintGuard Address of mint guard contract
     */
    constructor(address _bloomToken, address _mintGuard) {
        bloomToken = _bloomToken;
        mintGuard = _mintGuard;
        
        // Initialize contribution tiers
        contributionTiers.push(ContributionTier(0, 1e18)); // Tier 1: 1.0x multiplier
        contributionTiers.push(ContributionTier(100, 11e17)); // Tier 2: 1.1x multiplier
        contributionTiers.push(ContributionTier(200, 125e16)); // Tier 3: 1.25x multiplier
    }
    
    /**
     * @dev Set BLOOM token address
     * @param _bloomToken Address of BLOOM token contract
     */
    function setBloomToken(address _bloomToken) external onlyOwner {
        bloomToken = _bloomToken;
    }
    
    /**
     * @dev Set mint guard address
     * @param _mintGuard Address of mint guard contract
     */
    function setMintGuard(address _mintGuard) external onlyOwner {
        mintGuard = _mintGuard;
    }
    
    /**
     * @dev Register as a miner
     */
    function registerMiner() external {
        require(!miners[msg.sender].isActive, "MiningRewards: Already registered");
        
        miners[msg.sender] = MinerData({
            totalContributed: 0,
            totalRewards: 0,
            lastContribution: 0,
            contributionScore: 0,
            isActive: true
        });
        
        minerList.push(msg.sender);
        emit MinerRegistered(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Record mining contribution and calculate rewards
     * @param storageUsed Storage used in bytes
     * @param bandwidthUsed Bandwidth used in bytes
     * @param contentCount Number of content pieces contributed
     */
    function recordContribution(
        uint256 storageUsed,
        uint256 bandwidthUsed,
        uint256 contentCount
    ) external onlyActiveMiner nonReentrant whenNotPaused {
        MinerData storage miner = miners[msg.sender];
        
        // Calculate base reward
        uint256 baseReward = _calculateBaseReward(storageUsed, bandwidthUsed, contentCount);
        
        // Update contribution score
        uint256 newScore = _updateContributionScore(msg.sender, storageUsed, bandwidthUsed);
        miner.contributionScore = newScore;
        
        // Get tier multiplier
        uint256 multiplier = _getTierMultiplier(newScore);
        
        // Calculate adjusted reward
        uint256 adjustedReward = (baseReward * multiplier) / 1e18;
        
        // Update miner data
        miner.totalContributed += storageUsed + bandwidthUsed;
        miner.totalRewards += adjustedReward;
        miner.lastContribution = block.timestamp;
        
        // Mint BLOOM tokens
        if (adjustedReward > 0) {
            IBloomToken(bloomToken).mint(msg.sender, adjustedReward, "Mining reward");
        }
        
        emit ContributionRecorded(
            msg.sender,
            storageUsed,
            bandwidthUsed,
            contentCount,
            baseReward,
            adjustedReward
        );
    }
    
    /**
     * @dev Claim accumulated rewards (if any)
     */
    function claimRewards() external onlyActiveMiner nonReentrant whenNotPaused {
        MinerData storage miner = miners[msg.sender];
        require(miner.totalRewards > 0, "MiningRewards: No rewards to claim");
        
        uint256 rewards = miner.totalRewards;
        miner.totalRewards = 0;
        
        IBloomToken(bloomToken).mint(msg.sender, rewards, "Claimed mining rewards");
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    /**
     * @dev Deactivate miner (emergency function)
     * @param miner Address of miner to deactivate
     */
    function deactivateMiner(address miner) external onlyOwner {
        require(miners[miner].isActive, "MiningRewards: Miner not active");
        miners[miner].isActive = false;
        emit MinerDeactivated(miner);
    }
    
    /**
     * @dev Update contribution tier
     * @param tierIndex Index of tier to update
     * @param minScore Minimum score for tier
     * @param multiplier Multiplier for tier (scaled by 1e18)
     */
    function updateContributionTier(
        uint256 tierIndex,
        uint256 minScore,
        uint256 multiplier
    ) external onlyOwner {
        require(tierIndex < contributionTiers.length, "MiningRewards: Invalid tier index");
        require(multiplier >= 1e18, "MiningRewards: Multiplier must be >= 1.0");
        
        contributionTiers[tierIndex] = ContributionTier(minScore, multiplier);
        emit ContributionTierUpdated(tierIndex, minScore, multiplier);
    }
    
    /**
     * @dev Get miner statistics
     * @param miner Address of miner
     * @return data Miner data struct
     */
    function getMinerData(address miner) external view returns (MinerData memory data) {
        return miners[miner];
    }
    
    /**
     * @dev Get all active miners
     * @return activeMiners Array of active miner addresses
     */
    function getActiveMiners() external view returns (address[] memory activeMiners) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < minerList.length; i++) {
            if (miners[minerList[i]].isActive) {
                activeCount++;
            }
        }
        
        activeMiners = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < minerList.length; i++) {
            if (miners[minerList[i]].isActive) {
                activeMiners[index] = minerList[i];
                index++;
            }
        }
    }
    
    /**
     * @dev Get contribution tier information
     * @param tierIndex Index of tier
     * @return minScore Minimum score for tier
     * @return multiplier Multiplier for tier
     */
    function getContributionTier(uint256 tierIndex) external view returns (uint256 minScore, uint256 multiplier) {
        require(tierIndex < contributionTiers.length, "MiningRewards: Invalid tier index");
        ContributionTier memory tier = contributionTiers[tierIndex];
        return (tier.minScore, tier.multiplier);
    }
    
    /**
     * @dev Pause contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Calculate base reward for contribution
     * @param storageUsed Storage used in bytes
     * @param bandwidthUsed Bandwidth used in bytes
     * @param contentCount Number of content pieces
     * @return reward Base reward in BLOOM tokens
     */
    function _calculateBaseReward(
        uint256 storageUsed,
        uint256 bandwidthUsed,
        uint256 contentCount
    ) internal pure returns (uint256 reward) {
        // Storage reward: 1 BLOOM per GB
        uint256 storageGB = storageUsed / (1024 * 1024 * 1024);
        reward += storageGB * STORAGE_REWARD_PER_GB;
        
        // Bandwidth reward: 0.1 BLOOM per GB
        uint256 bandwidthGB = bandwidthUsed / (1024 * 1024 * 1024);
        reward += bandwidthGB * BANDWIDTH_REWARD_PER_GB;
        
        // Content reward: 0.01 BLOOM per piece
        reward += contentCount * CONTENT_REWARD;
    }
    
    /**
     * @dev Update contribution score based on resources
     * @param miner Address of miner
     * @param storageUsed Storage used in bytes
     * @param bandwidthUsed Bandwidth used in bytes
     * @return newScore Updated contribution score
     */
    function _updateContributionScore(
        address miner,
        uint256 storageUsed,
        uint256 bandwidthUsed
    ) internal view returns (uint256 newScore) {
        MinerData memory minerData = miners[miner];
        
        // Storage score: 1 point per GB
        uint256 storageScore = storageUsed / (1024 * 1024 * 1024);
        
        // Bandwidth score: 0.1 points per GB
        uint256 bandwidthScore = bandwidthUsed / (10 * 1024 * 1024 * 1024);
        
        // Uptime score: 1 point per day since last contribution
        uint256 uptimeScore = 0;
        if (minerData.lastContribution > 0) {
            uint256 timeSinceLastContribution = block.timestamp - minerData.lastContribution;
            uptimeScore = timeSinceLastContribution / (24 * 60 * 60); // Days
        }
        
        newScore = minerData.contributionScore + storageScore + bandwidthScore + uptimeScore;
    }
    
    /**
     * @dev Get tier multiplier based on contribution score
     * @param score Contribution score
     * @return multiplier Tier multiplier (scaled by 1e18)
     */
    function _getTierMultiplier(uint256 score) internal view returns (uint256 multiplier) {
        // Start with base multiplier
        multiplier = 1e18;
        
        // Find highest applicable tier
        for (uint256 i = contributionTiers.length; i > 0; i--) {
            if (score >= contributionTiers[i - 1].minScore) {
                multiplier = contributionTiers[i - 1].multiplier;
                break;
            }
        }
    }
}

/**
 * @title IBloomToken
 * @dev Interface for BLOOM token contract
 */
interface IBloomToken {
    function mint(address to, uint256 amount, string memory reason) external;
}
