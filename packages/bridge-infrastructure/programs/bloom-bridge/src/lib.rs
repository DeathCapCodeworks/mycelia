use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, Burn};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

declare_id!("BloomBridge1111111111111111111111111111111111111");

#[program]
pub mod bloom_bridge {
    use super::*;

    /// Initialize bridge program
    pub fn initialize_bridge(
        ctx: Context<InitializeBridge>,
        max_bridge_amount: u64,
        min_bridge_amount: u64,
        fee_rate: u16,
    ) -> Result<()> {
        let bridge_data = &mut ctx.accounts.bridge_data;
        
        bridge_data.bloom_token_mint = ctx.accounts.bloom_token_mint.key();
        bridge_data.mint_guard = ctx.accounts.mint_guard.key();
        bridge_data.relayer = ctx.accounts.relayer.key();
        bridge_data.max_bridge_amount = max_bridge_amount;
        bridge_data.min_bridge_amount = min_bridge_amount;
        bridge_data.fee_rate = fee_rate;
        bridge_data.total_locked = 0;
        bridge_data.merkle_root = [0u8; 32];
        bridge_data.merkle_root_update_time = 0;
        bridge_data.bump = *ctx.bumps.get("bridge_data").unwrap();

        msg!("Bridge program initialized");
        Ok(())
    }

    /// Set relayer authority
    pub fn set_relayer(ctx: Context<SetRelayer>, new_relayer: Pubkey) -> Result<()> {
        let bridge_data = &mut ctx.accounts.bridge_data;
        bridge_data.relayer = new_relayer;
        
        emit!(RelayerUpdated {
            old_relayer: ctx.accounts.relayer.key(),
            new_relayer,
        });
        
        Ok(())
    }

    /// Update merkle root (only relayer)
    pub fn update_merkle_root(ctx: Context<UpdateMerkleRoot>, new_root: [u8; 32]) -> Result<()> {
        let bridge_data = &mut ctx.accounts.bridge_data;
        bridge_data.merkle_root = new_root;
        bridge_data.merkle_root_update_time = Clock::get()?.unix_timestamp;
        
        emit!(MerkleRootUpdated {
            new_root,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Lock tokens for cross-chain transfer
    pub fn lock_tokens(
        ctx: Context<LockTokens>,
        amount: u64,
        evm_address: String,
    ) -> Result<()> {
        let bridge_data = &ctx.accounts.bridge_data;
        
        // Validate amount
        require!(amount >= bridge_data.min_bridge_amount, ErrorCode::AmountBelowMinimum);
        require!(amount <= bridge_data.max_bridge_amount, ErrorCode::AmountAboveMaximum);
        
        // Calculate bridge fee
        let fee = (amount * bridge_data.fee_rate as u64) / 10000;
        let net_amount = amount - fee;
        
        // Transfer tokens from user to bridge
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.bridge_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        
        // Update locked balance
        let user_locked = &mut ctx.accounts.user_locked;
        user_locked.amount += net_amount;
        user_locked.last_update = Clock::get()?.unix_timestamp;
        
        // Generate transaction ID
        let transaction_id = generate_transaction_id(
            ctx.accounts.user.key(),
            amount,
            evm_address.clone(),
        );
        
        emit!(TokensLocked {
            user: ctx.accounts.user.key(),
            amount: net_amount,
            evm_address,
            transaction_id,
        });
        
        Ok(())
    }

    /// Unlock tokens with merkle proof verification
    pub fn unlock_tokens(
        ctx: Context<UnlockTokens>,
        user: Pubkey,
        amount: u64,
        transaction_id: [u8; 32],
        merkle_proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let bridge_data = &ctx.accounts.bridge_data;
        
        // Check if transaction is already processed
        require!(
            !ctx.accounts.processed_transaction.is_processed,
            ErrorCode::TransactionAlreadyProcessed
        );
        
        // Verify merkle proof
        let leaf = generate_leaf(user, amount, transaction_id);
        require!(
            verify_merkle_proof(leaf, merkle_proof, bridge_data.merkle_root),
            ErrorCode::InvalidMerkleProof
        );
        
        // Mark transaction as processed
        let processed_tx = &mut ctx.accounts.processed_transaction;
        processed_tx.is_processed = true;
        processed_tx.processed_at = Clock::get()?.unix_timestamp;
        
        // Mint tokens to user
        let seeds = &[
            b"bridge_data",
            &[bridge_data.bump],
        ];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.bloom_token_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.bridge_data.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        emit!(TokensUnlocked {
            user,
            amount,
            transaction_id,
            merkle_root: bridge_data.merkle_root,
        });

        Ok(())
    }

    /// Emergency unlock (authority only)
    pub fn emergency_unlock(
        ctx: Context<EmergencyUnlock>,
        amount: u64,
    ) -> Result<()> {
        let user_locked = &mut ctx.accounts.user_locked;
        
        require!(user_locked.amount >= amount, ErrorCode::InsufficientLockedBalance);
        
        user_locked.amount -= amount;
        user_locked.last_update = Clock::get()?.unix_timestamp;
        
        // Transfer tokens back to user
        let seeds = &[
            b"bridge_data",
            &[ctx.accounts.bridge_data.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.bridge_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.bridge_data.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        Ok(())
    }

    /// Get bridge statistics
    pub fn get_bridge_stats(_ctx: Context<GetBridgeStats>) -> Result<BridgeStats> {
        // This would return bridge statistics
        // Implementation depends on specific requirements
        Ok(BridgeStats {
            total_locked: 0,
            merkle_root: [0u8; 32],
            merkle_root_update_time: 0,
        })
    }
}

// Account structures
#[derive(Accounts)]
pub struct InitializeBridge<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 2 + 8 + 32 + 8 + 1,
        seeds = [b"bridge_data"],
        bump
    )]
    pub bridge_data: Account<'info, BridgeData>,
    
    /// CHECK: This is the bloom token mint
    pub bloom_token_mint: AccountInfo<'info>,
    
    /// CHECK: This is the mint guard program
    pub mint_guard: AccountInfo<'info>,
    
    /// CHECK: This is the relayer
    pub relayer: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetRelayer<'info> {
    #[account(
        mut,
        seeds = [b"bridge_data"],
        bump = bridge_data.bump,
        has_one = authority @ ErrorCode::UnauthorizedAuthority
    )]
    pub bridge_data: Account<'info, BridgeData>,
    
    /// CHECK: This is the current relayer
    pub relayer: AccountInfo<'info>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateMerkleRoot<'info> {
    #[account(
        mut,
        seeds = [b"bridge_data"],
        bump = bridge_data.bump,
        has_one = relayer @ ErrorCode::UnauthorizedRelayer
    )]
    pub bridge_data: Account<'info, BridgeData>,
    
    pub relayer: Signer<'info>,
}

#[derive(Accounts)]
pub struct LockTokens<'info> {
    #[account(
        seeds = [b"bridge_data"],
        bump = bridge_data.bump,
    )]
    pub bridge_data: Account<'info, BridgeData>,
    
    #[account(mut)]
    pub bloom_token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bridge_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 1,
        seeds = [b"user_locked", user.key().as_ref()],
        bump
    )]
    pub user_locked: Account<'info, UserLocked>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnlockTokens<'info> {
    #[account(
        seeds = [b"bridge_data"],
        bump = bridge_data.bump,
        has_one = relayer @ ErrorCode::UnauthorizedRelayer
    )]
    pub bridge_data: Account<'info, BridgeData>,
    
    #[account(mut)]
    pub bloom_token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = relayer,
        space = 8 + 32 + 1 + 8 + 1,
        seeds = [b"processed_transaction", transaction_id.as_ref()],
        bump
    )]
    pub processed_transaction: Account<'info, ProcessedTransaction>,
    
    pub relayer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyUnlock<'info> {
    #[account(
        seeds = [b"bridge_data"],
        bump = bridge_data.bump,
        has_one = authority @ ErrorCode::UnauthorizedAuthority
    )]
    pub bridge_data: Account<'info, BridgeData>,
    
    #[account(mut)]
    pub bridge_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"user_locked", user.key().as_ref()],
        bump
    )]
    pub user_locked: Account<'info, UserLocked>,
    
    pub user: AccountInfo<'info>,
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetBridgeStats<'info> {
    #[account(
        seeds = [b"bridge_data"],
        bump = bridge_data.bump,
    )]
    pub bridge_data: Account<'info, BridgeData>,
}

// Data structures
#[account]
pub struct BridgeData {
    pub bloom_token_mint: Pubkey,
    pub mint_guard: Pubkey,
    pub relayer: Pubkey,
    pub max_bridge_amount: u64,
    pub min_bridge_amount: u64,
    pub fee_rate: u16,
    pub total_locked: u64,
    pub merkle_root: [u8; 32],
    pub merkle_root_update_time: i64,
    pub bump: u8,
}

#[account]
pub struct UserLocked {
    pub user: Pubkey,
    pub amount: u64,
    pub last_update: i64,
    pub bump: u8,
}

#[account]
pub struct ProcessedTransaction {
    pub transaction_id: [u8; 32],
    pub is_processed: bool,
    pub processed_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BridgeStats {
    pub total_locked: u64,
    pub merkle_root: [u8; 32],
    pub merkle_root_update_time: i64,
}

// Events
#[event]
pub struct TokensLocked {
    pub user: Pubkey,
    pub amount: u64,
    pub evm_address: String,
    pub transaction_id: [u8; 32],
}

#[event]
pub struct TokensUnlocked {
    pub user: Pubkey,
    pub amount: u64,
    pub transaction_id: [u8; 32],
    pub merkle_root: [u8; 32],
}

#[event]
pub struct MerkleRootUpdated {
    pub new_root: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct RelayerUpdated {
    pub old_relayer: Pubkey,
    pub new_relayer: Pubkey,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Amount below minimum")]
    AmountBelowMinimum,
    #[msg("Amount above maximum")]
    AmountAboveMaximum,
    #[msg("Transaction already processed")]
    TransactionAlreadyProcessed,
    #[msg("Invalid merkle proof")]
    InvalidMerkleProof,
    #[msg("Insufficient locked balance")]
    InsufficientLockedBalance,
    #[msg("Unauthorized authority")]
    UnauthorizedAuthority,
    #[msg("Unauthorized relayer")]
    UnauthorizedRelayer,
}

// Helper functions
fn generate_transaction_id(user: Pubkey, amount: u64, evm_address: String) -> [u8; 32] {
    let mut hasher = DefaultHasher::new();
    user.hash(&mut hasher);
    amount.hash(&mut hasher);
    evm_address.hash(&mut hasher);
    Clock::get().unwrap().unix_timestamp.hash(&mut hasher);
    
    let hash = hasher.finish();
    let mut result = [0u8; 32];
    result[..8].copy_from_slice(&hash.to_le_bytes());
    result
}

fn generate_leaf(user: Pubkey, amount: u64, transaction_id: [u8; 32]) -> [u8; 32] {
    let mut hasher = DefaultHasher::new();
    user.hash(&mut hasher);
    amount.hash(&mut hasher);
    transaction_id.hash(&mut hasher);
    
    let hash = hasher.finish();
    let mut result = [0u8; 32];
    result[..8].copy_from_slice(&hash.to_le_bytes());
    result
}

fn verify_merkle_proof(leaf: [u8; 32], proof: Vec<[u8; 32]>, root: [u8; 32]) -> bool {
    // Simplified merkle proof verification
    // In production, use a proper merkle tree implementation
    let mut current = leaf;
    for sibling in proof {
        current = hash_pair(current, sibling);
    }
    current == root
}

fn hash_pair(left: [u8; 32], right: [u8; 32]) -> [u8; 32] {
    let mut hasher = DefaultHasher::new();
    left.hash(&mut hasher);
    right.hash(&mut hasher);
    
    let hash = hasher.finish();
    let mut result = [0u8; 32];
    result[..8].copy_from_slice(&hash.to_le_bytes());
    result
}
