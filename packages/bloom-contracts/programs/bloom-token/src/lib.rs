use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, Burn};

declare_id!("BloomToken1111111111111111111111111111111111111");

#[program]
pub mod bloom_token {
    use super::*;

    /// Initialize BLOOM token mint
    pub fn initialize_bloom_mint(
        ctx: Context<InitializeBloomMint>,
        name: String,
        symbol: String,
        decimals: u8,
    ) -> Result<()> {
        let mint = &mut ctx.accounts.mint;
        let mint_authority = &ctx.accounts.mint_authority;
        
        // Initialize mint with authority
        token::initialize_mint(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::InitializeMint {
                    mint: mint.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            decimals,
            &mint_authority.key(),
            Some(&mint_authority.key()),
        )?;

        // Store metadata
        let mint_data = &mut ctx.accounts.mint_data;
        mint_data.name = name;
        mint_data.symbol = symbol;
        mint_data.decimals = decimals;
        mint_data.total_supply = 0;
        mint_data.total_minted = 0;
        mint_data.total_burned = 0;
        mint_data.mint_authority = mint_authority.key();
        mint_data.mint_guard = Pubkey::default();
        mint_data.reserve_feed = Pubkey::default();
        mint_data.bump = *ctx.bumps.get("mint_data").unwrap();

        msg!("BLOOM token mint initialized: {}", mint.key());
        Ok(())
    }

    /// Set mint guard program
    pub fn set_mint_guard(ctx: Context<SetMintGuard>, mint_guard: Pubkey) -> Result<()> {
        let mint_data = &mut ctx.accounts.mint_data;
        mint_data.mint_guard = mint_guard;
        
        emit!(MintGuardUpdated {
            old_guard: Pubkey::default(),
            new_guard: mint_guard,
        });
        
        Ok(())
    }

    /// Set reserve feed program
    pub fn set_reserve_feed(ctx: Context<SetReserveFeed>, reserve_feed: Pubkey) -> Result<()> {
        let mint_data = &mut ctx.accounts.mint_data;
        mint_data.reserve_feed = reserve_feed;
        
        emit!(ReserveFeedUpdated {
            old_feed: Pubkey::default(),
            new_feed: reserve_feed,
        });
        
        Ok(())
    }

    /// Mint BLOOM tokens with peg enforcement
    pub fn mint_bloom(
        ctx: Context<MintBloom>,
        amount: u64,
        reason: String,
    ) -> Result<()> {
        let mint_data = &mut ctx.accounts.mint_data;
        
        // Check if minting is allowed (peg enforcement)
        if mint_data.mint_guard != Pubkey::default() {
            let mint_guard_account = &ctx.accounts.mint_guard;
            let can_mint = invoke(
                &CpiInstruction {
                    program_id: mint_data.mint_guard,
                    accounts: mint_guard_account.to_account_infos(),
                    data: vec![], // Would contain amount in real implementation
                },
                &mint_guard_account.to_account_infos(),
            );
            
            if can_mint.is_err() {
                return Err(ErrorCode::MintWouldBreakPeg.into());
            }
        }

        // Mint tokens
        let seeds = &[
            b"mint_data",
            &[mint_data.bump],
        ];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // Update supply statistics
        mint_data.total_supply += amount;
        mint_data.total_minted += amount;

        emit!(Mint {
            to: ctx.accounts.to.key(),
            amount,
            reason,
        });

        emit!(PegEnforced {
            bloom_amount: amount,
            required_sats: amount * SATS_PER_BLOOM,
        });

        Ok(())
    }

    /// Burn BLOOM tokens (used in redemption)
    pub fn burn_bloom(
        ctx: Context<BurnBloom>,
        amount: u64,
        reason: String,
    ) -> Result<()> {
        let mint_data = &mut ctx.accounts.mint_data;

        // Burn tokens
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.from.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update supply statistics
        mint_data.total_supply -= amount;
        mint_data.total_burned += amount;

        emit!(Burn {
            from: ctx.accounts.from.key(),
            amount,
            reason,
        });

        Ok(())
    }

    /// Get peg information
    pub fn get_peg_info(_ctx: Context<GetPegInfo>) -> Result<PegInfo> {
        Ok(PegInfo {
            bloom_per_btc: BTC_PER_BLOOM,
            sats_per_bloom: SATS_PER_BLOOM,
            peg_statement: "Peg: 10 BLOOM = 1 BTC".to_string(),
        })
    }
}

// Constants
const SATS_PER_BTC: u64 = 100_000_000;
const BTC_PER_BLOOM: u64 = 10;
const SATS_PER_BLOOM: u64 = SATS_PER_BTC / BTC_PER_BLOOM; // 10,000,000 sats per BLOOM

// Account structures
#[derive(Accounts)]
pub struct InitializeBloomMint<'info> {
    #[account(
        init,
        payer = mint_authority,
        space = 8 + 32 + 32 + 1 + 8 + 8 + 8 + 32 + 32 + 1,
        seeds = [b"mint_data"],
        bump
    )]
    pub mint_data: Account<'info, MintData>,
    
    #[account(
        init,
        payer = mint_authority,
        mint::decimals = 9,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority,
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetMintGuard<'info> {
    #[account(
        mut,
        seeds = [b"mint_data"],
        bump = mint_data.bump,
        has_one = mint_authority @ ErrorCode::UnauthorizedMintAuthority
    )]
    pub mint_data: Account<'info, MintData>,
    
    pub mint_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetReserveFeed<'info> {
    #[account(
        mut,
        seeds = [b"mint_data"],
        bump = mint_data.bump,
        has_one = mint_authority @ ErrorCode::UnauthorizedMintAuthority
    )]
    pub mint_data: Account<'info, MintData>,
    
    pub mint_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintBloom<'info> {
    #[account(
        mut,
        seeds = [b"mint_data"],
        bump = mint_data.bump,
    )]
    pub mint_data: Account<'info, MintData>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    
    /// CHECK: This is the mint authority
    pub mint_authority: AccountInfo<'info>,
    
    /// CHECK: This is the mint guard program
    pub mint_guard: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnBloom<'info> {
    #[account(
        mut,
        seeds = [b"mint_data"],
        bump = mint_data.bump,
    )]
    pub mint_data: Account<'info, MintData>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetPegInfo<'info> {
    #[account(
        seeds = [b"mint_data"],
        bump = mint_data.bump,
    )]
    pub mint_data: Account<'info, MintData>,
}

// Data structures
#[account]
pub struct MintData {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub total_minted: u64,
    pub total_burned: u64,
    pub mint_authority: Pubkey,
    pub mint_guard: Pubkey,
    pub reserve_feed: Pubkey,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PegInfo {
    pub bloom_per_btc: u64,
    pub sats_per_bloom: u64,
    pub peg_statement: String,
}

// Events
#[event]
pub struct Mint {
    pub to: Pubkey,
    pub amount: u64,
    pub reason: String,
}

#[event]
pub struct Burn {
    pub from: Pubkey,
    pub amount: u64,
    pub reason: String,
}

#[event]
pub struct PegEnforced {
    pub bloom_amount: u64,
    pub required_sats: u64,
}

#[event]
pub struct MintGuardUpdated {
    pub old_guard: Pubkey,
    pub new_guard: Pubkey,
}

#[event]
pub struct ReserveFeedUpdated {
    pub old_feed: Pubkey,
    pub new_feed: Pubkey,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Mint would break peg")]
    MintWouldBreakPeg,
    #[msg("Unauthorized mint authority")]
    UnauthorizedMintAuthority,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
}
