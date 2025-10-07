// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MintGuard
 * @dev Enforces BLOOM token peg by preventing over-minting
 * Ensures locked BTC reserves >= outstanding BLOOM * 10 ratio
 */
contract MintGuard is Ownable, ReentrancyGuard {
    // Contract addresses
    address public bloomToken;
    address public reserveFeed;
    
    // State variables
    uint256 public constant SATS_PER_BTC = 100_000_000;
    uint256 public constant BTC_PER_BLOOM = 10;
    uint256 public constant SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM;
    
    // Events
    event MintAllowed(address indexed minter, uint256 amount, uint256 lockedSats, uint256 outstandingBloom);
    event MintDenied(address indexed minter, uint256 amount, string reason);
    event ReserveFeedUpdated(address indexed oldFeed, address indexed newFeed);
    event BloomTokenUpdated(address indexed oldToken, address indexed newToken);
    
    // Modifiers
    modifier onlyBloomToken() {
        require(msg.sender == bloomToken, "MintGuard: Only BLOOM token can call this");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _bloomToken Address of BLOOM token contract
     * @param _reserveFeed Address of reserve feed contract
     */
    constructor(address _bloomToken, address _reserveFeed) {
        bloomToken = _bloomToken;
        reserveFeed = _reserveFeed;
    }
    
    /**
     * @dev Set BLOOM token address
     * @param _bloomToken Address of BLOOM token contract
     */
    function setBloomToken(address _bloomToken) external onlyOwner {
        address oldToken = bloomToken;
        bloomToken = _bloomToken;
        emit BloomTokenUpdated(oldToken, _bloomToken);
    }
    
    /**
     * @dev Set reserve feed address
     * @param _reserveFeed Address of reserve feed contract
     */
    function setReserveFeed(address _reserveFeed) external onlyOwner {
        address oldFeed = reserveFeed;
        reserveFeed = _reserveFeed;
        emit ReserveFeedUpdated(oldFeed, _reserveFeed);
    }
    
    /**
     * @dev Check if minting is allowed (called by BLOOM token)
     * @param amount Amount of BLOOM to mint
     * @return allowed Whether minting is allowed
     */
    function canMint(uint256 amount) external view returns (bool allowed) {
        if (reserveFeed == address(0) || bloomToken == address(0)) {
            return false;
        }
        
        try this._checkMintEligibility(amount) returns (bool result) {
            return result;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Internal function to check mint eligibility
     * @param amount Amount of BLOOM to mint
     * @return allowed Whether minting is allowed
     */
    function _checkMintEligibility(uint256 amount) external view returns (bool allowed) {
        // Get current locked BTC satoshis
        uint256 lockedSats = IReserveFeed(reserveFeed).getLockedBtcSats();
        
        // Get current outstanding BLOOM supply
        uint256 outstandingBloom = IBloomToken(bloomToken).totalSupply();
        
        // Calculate new supply after mint
        uint256 newSupply = outstandingBloom + amount;
        
        // Calculate required satoshis for new supply
        uint256 requiredSats = bloomToSats(newSupply);
        
        // Check if we have enough reserves
        allowed = lockedSats >= requiredSats;
        
        if (allowed) {
            emit MintAllowed(msg.sender, amount, lockedSats, newSupply);
        } else {
            emit MintDenied(msg.sender, amount, "Insufficient BTC reserves");
        }
    }
    
    /**
     * @dev Get current collateralization ratio
     * @return ratio Collateralization ratio (scaled by 1e18)
     */
    function getCollateralizationRatio() external view returns (uint256 ratio) {
        if (reserveFeed == address(0) || bloomToken == address(0)) {
            return 0;
        }
        
        uint256 lockedSats = IReserveFeed(reserveFeed).getLockedBtcSats();
        uint256 outstandingBloom = IBloomToken(bloomToken).totalSupply();
        
        if (outstandingBloom == 0) {
            return type(uint256).max; // Infinite ratio
        }
        
        uint256 requiredSats = bloomToSats(outstandingBloom);
        return (lockedSats * 1e18) / requiredSats;
    }
    
    /**
     * @dev Check if system is fully reserved
     * @return fullyReserved Whether system is fully reserved
     */
    function isFullyReserved() external view returns (bool fullyReserved) {
        if (reserveFeed == address(0) || bloomToken == address(0)) {
            return false;
        }
        
        uint256 lockedSats = IReserveFeed(reserveFeed).getLockedBtcSats();
        uint256 outstandingBloom = IBloomToken(bloomToken).totalSupply();
        uint256 requiredSats = bloomToSats(outstandingBloom);
        
        return lockedSats >= requiredSats;
    }
    
    /**
     * @dev Get maximum mintable BLOOM given current reserves
     * @return maxMintable Maximum BLOOM that can be minted
     */
    function getMaxMintable() external view returns (uint256 maxMintable) {
        if (reserveFeed == address(0) || bloomToken == address(0)) {
            return 0;
        }
        
        uint256 lockedSats = IReserveFeed(reserveFeed).getLockedBtcSats();
        uint256 outstandingBloom = IBloomToken(bloomToken).totalSupply();
        uint256 requiredSats = bloomToSats(outstandingBloom);
        
        if (lockedSats <= requiredSats) {
            return 0; // No additional minting possible
        }
        
        uint256 excessSats = lockedSats - requiredSats;
        return satsToBloom(excessSats);
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
    
    /**
     * @dev Get peg information
     * @return bloomPerBtc BLOOM per BTC ratio
     * @return satsPerBloom Satoshis per BLOOM
     */
    function getPegInfo() external pure returns (uint256 bloomPerBtc, uint256 satsPerBloom) {
        return (BTC_PER_BLOOM, SATS_PER_BLOOM);
    }
}

/**
 * @title IReserveFeed
 * @dev Interface for reserve feed contract
 */
interface IReserveFeed {
    function getLockedBtcSats() external view returns (uint256);
}

/**
 * @title IBloomToken
 * @dev Interface for BLOOM token contract
 */
interface IBloomToken {
    function totalSupply() external view returns (uint256);
}
