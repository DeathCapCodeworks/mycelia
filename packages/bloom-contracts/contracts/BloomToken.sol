// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BloomToken
 * @dev BLOOM token with hard peg to Bitcoin (10 BLOOM = 1 BTC)
 * Features:
 * - ERC20 compatible with burn functionality
 * - Peg enforcement through mint guard
 * - Mining rewards integration
 * - Redemption system
 */
contract BloomToken is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
    // Peg constants
    uint256 public constant SATS_PER_BTC = 100_000_000;
    uint256 public constant BTC_PER_BLOOM = 10;
    uint256 public constant SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM; // 10,000,000 sats per BLOOM
    
    // Contract addresses
    address public reserveFeed;
    address public mintGuard;
    address public miningRewards;
    address public redemptionEngine;
    
    // State variables
    uint256 public totalMinted;
    uint256 public totalBurned;
    uint256 public maxSupply;
    
    // Events
    event Mint(address indexed to, uint256 amount, string reason);
    event Burn(address indexed from, uint256 amount, string reason);
    event PegEnforced(uint256 bloomAmount, uint256 requiredSats);
    event ReserveFeedUpdated(address indexed oldFeed, address indexed newFeed);
    event MintGuardUpdated(address indexed oldGuard, address indexed newGuard);
    
    // Modifiers
    modifier onlyMinter() {
        require(
            msg.sender == miningRewards || msg.sender == owner(),
            "BloomToken: Only minter can call this function"
        );
        _;
    }
    
    modifier onlyRedemptionEngine() {
        require(
            msg.sender == redemptionEngine || msg.sender == owner(),
            "BloomToken: Only redemption engine can call this function"
        );
        _;
    }
    
    /**
     * @dev Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _maxSupply Maximum supply (0 = unlimited)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply
    ) ERC20(_name, _symbol) {
        maxSupply = _maxSupply;
        totalMinted = 0;
        totalBurned = 0;
    }
    
    /**
     * @dev Set reserve feed address
     * @param _reserveFeed Address of the reserve feed contract
     */
    function setReserveFeed(address _reserveFeed) external onlyOwner {
        address oldFeed = reserveFeed;
        reserveFeed = _reserveFeed;
        emit ReserveFeedUpdated(oldFeed, _reserveFeed);
    }
    
    /**
     * @dev Set mint guard address
     * @param _mintGuard Address of the mint guard contract
     */
    function setMintGuard(address _mintGuard) external onlyOwner {
        address oldGuard = mintGuard;
        mintGuard = _mintGuard;
        emit MintGuardUpdated(oldGuard, _mintGuard);
    }
    
    /**
     * @dev Set mining rewards contract address
     * @param _miningRewards Address of the mining rewards contract
     */
    function setMiningRewards(address _miningRewards) external onlyOwner {
        miningRewards = _miningRewards;
    }
    
    /**
     * @dev Set redemption engine address
     * @param _redemptionEngine Address of the redemption engine contract
     */
    function setRedemptionEngine(address _redemptionEngine) external onlyOwner {
        redemptionEngine = _redemptionEngine;
    }
    
    /**
     * @dev Mint BLOOM tokens with peg enforcement
     * @param to Address to mint tokens to
     * @param amount Amount of BLOOM to mint (in smallest unit)
     * @param reason Reason for minting (for event logging)
     */
    function mint(
        address to,
        uint256 amount,
        string memory reason
    ) external onlyMinter nonReentrant whenNotPaused {
        require(to != address(0), "BloomToken: Cannot mint to zero address");
        require(amount > 0, "BloomToken: Amount must be greater than zero");
        
        // Check max supply
        if (maxSupply > 0) {
            require(
                totalSupply() + amount <= maxSupply,
                "BloomToken: Would exceed max supply"
            );
        }
        
        // Enforce peg through mint guard
        if (mintGuard != address(0)) {
            require(
                IMintGuard(mintGuard).canMint(amount),
                "BloomToken: Mint would break peg"
            );
        }
        
        totalMinted += amount;
        _mint(to, amount);
        
        emit Mint(to, amount, reason);
        emit PegEnforced(amount, bloomToSats(amount));
    }
    
    /**
     * @dev Burn BLOOM tokens (used in redemption)
     * @param from Address to burn tokens from
     * @param amount Amount of BLOOM to burn
     * @param reason Reason for burning (for event logging)
     */
    function burnFrom(
        address from,
        uint256 amount,
        string memory reason
    ) external onlyRedemptionEngine nonReentrant {
        require(from != address(0), "BloomToken: Cannot burn from zero address");
        require(amount > 0, "BloomToken: Amount must be greater than zero");
        require(balanceOf(from) >= amount, "BloomToken: Insufficient balance");
        
        totalBurned += amount;
        _burn(from, amount);
        
        emit Burn(from, amount, reason);
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
     * @dev Get current peg status
     * @return pegStatement Canonical peg statement
     */
    function getPegStatement() public pure returns (string memory pegStatement) {
        return "Peg: 10 BLOOM = 1 BTC";
    }
    
    /**
     * @dev Get total supply statistics
     * @return _totalSupply Current total supply
     * @return _totalMinted Total amount ever minted
     * @return _totalBurned Total amount ever burned
     * @return _maxSupply Maximum supply limit
     */
    function getSupplyStats() external view returns (
        uint256 _totalSupply,
        uint256 _totalMinted,
        uint256 _totalBurned,
        uint256 _maxSupply
    ) {
        return (totalSupply(), totalMinted, totalBurned, maxSupply);
    }
    
    /**
     * @dev Pause token operations (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Override transfer to include pause check
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}

/**
 * @title IMintGuard
 * @dev Interface for mint guard contract
 */
interface IMintGuard {
    function canMint(uint256 amount) external view returns (bool);
}
