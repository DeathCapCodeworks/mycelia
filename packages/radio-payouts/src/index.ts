import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface DistributionReceipt {
  roomId: string;
  trackId: string;
  contributors: string[];
  bytesOut: number;
  timestamp: number;
}

export interface PayoutShare {
  recipientDid: string;
  share: number;
  reason: 'uploader' | 'seeder' | 'moderator';
  trackId?: string;
}

export interface PayoutCalculation {
  totalAmount: number;
  shares: PayoutShare[];
  breakdown: {
    uploaderShare: number;
    seederShare: number;
    moderatorShare: number;
  };
}

export interface TrackContribution {
  trackId: string;
  uploaderDid: string;
  seeders: string[];
  totalBytes: number;
  duration: number;
}

export class RadioPayouts {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.isInitialized = true;
      observability.logEvent('radio_payouts_initialized');
    } catch (error) {
      console.error('Failed to initialize Radio Payouts:', error);
      observability.logEvent('radio_payouts_init_failed', {
        error: (error as Error).message
      });
    }
  }

  async calculatePayouts(receipts: DistributionReceipt[], trackContributions: TrackContribution[]): Promise<PayoutCalculation> {
    if (!featureFlags.isFlagEnabled('radio_payouts_demo')) {
      throw new Error('Radio payouts demo feature flag disabled');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Calculate total distribution amount (mock calculation)
      const totalAmount = this.calculateTotalAmount(receipts);
      
      // Calculate shares for each contributor
      const shares = this.calculateShares(receipts, trackContributions, totalAmount);
      
      // Calculate breakdown
      const breakdown = this.calculateBreakdown(shares);

      const calculation: PayoutCalculation = {
        totalAmount,
        shares,
        breakdown
      };

      observability.logEvent('radio_payouts_calculated', {
        total_amount: totalAmount,
        shares_count: shares.length,
        receipts_count: receipts.length
      });

      return calculation;

    } catch (error) {
      console.error('Failed to calculate payouts:', error);
      observability.logEvent('radio_payouts_calculation_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  private calculateTotalAmount(receipts: DistributionReceipt[]): number {
    // Mock calculation: 1 BLOOM per 1MB distributed
    const totalBytes = receipts.reduce((sum, receipt) => sum + receipt.bytesOut, 0);
    const totalMB = totalBytes / (1024 * 1024);
    return Math.max(1, Math.floor(totalMB)); // Minimum 1 BLOOM
  }

  private calculateShares(receipts: DistributionReceipt[], trackContributions: TrackContribution[], totalAmount: number): PayoutShare[] {
    const shares: PayoutShare[] = [];
    const contributorMap = new Map<string, { uploader: number; seeder: number; moderator: number }>();

    // Process each receipt
    for (const receipt of receipts) {
      const trackContribution = trackContributions.find(tc => tc.trackId === receipt.trackId);
      if (!trackContribution) continue;

      // Calculate share for this receipt
      const receiptShare = (receipt.bytesOut / trackContribution.totalBytes) * totalAmount;

      // Uploader gets 70% of track share
      const uploaderShare = receiptShare * 0.7;
      const uploaderDid = trackContribution.uploaderDid;
      
      if (!contributorMap.has(uploaderDid)) {
        contributorMap.set(uploaderDid, { uploader: 0, seeder: 0, moderator: 0 });
      }
      contributorMap.get(uploaderDid)!.uploader += uploaderShare;

      // Seeders get 30% of track share, divided equally
      const seederShare = receiptShare * 0.3;
      const seederCount = trackContribution.seeders.length;
      
      if (seederCount > 0) {
        const seederIndividualShare = seederShare / seederCount;
        
        for (const seederDid of trackContribution.seeders) {
          if (!contributorMap.has(seederDid)) {
            contributorMap.set(seederDid, { uploader: 0, seeder: 0, moderator: 0 });
          }
          contributorMap.get(seederDid)!.seeder += seederIndividualShare;
        }
      }
    }

    // Convert map to shares array
    for (const [recipientDid, amounts] of contributorMap.entries()) {
      const totalShare = amounts.uploader + amounts.seeder + amounts.moderator;
      
      if (totalShare > 0) {
        shares.push({
          recipientDid,
          share: totalShare,
          reason: amounts.uploader > amounts.seeder ? 'uploader' : 'seeder'
        });
      }
    }

    return shares.sort((a, b) => b.share - a.share);
  }

  private calculateBreakdown(shares: PayoutShare[]): { uploaderShare: number; seederShare: number; moderatorShare: number } {
    let uploaderShare = 0;
    let seederShare = 0;
    let moderatorShare = 0;

    for (const share of shares) {
      switch (share.reason) {
        case 'uploader':
          uploaderShare += share.share;
          break;
        case 'seeder':
          seederShare += share.share;
          break;
        case 'moderator':
          moderatorShare += share.share;
          break;
      }
    }

    return {
      uploaderShare,
      seederShare,
      moderatorShare
    };
  }

  async generatePayoutReceipt(calculation: PayoutCalculation, roomId: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const receipt = {
        roomId,
        calculation,
        generatedAt: Date.now(),
        version: '1.0',
        note: 'This is a provisional payout calculation for demo purposes only. No mainnet payouts until governance flag is enabled.'
      };

      const receiptString = JSON.stringify(receipt, null, 2);

      observability.logEvent('radio_payout_receipt_generated', {
        room_id: roomId,
        total_amount: calculation.totalAmount,
        shares_count: calculation.shares.length
      });

      return receiptString;

    } catch (error) {
      console.error('Failed to generate payout receipt:', error);
      observability.logEvent('radio_payout_receipt_failed', {
        room_id: roomId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async validateReceipt(receiptString: string): Promise<boolean> {
    try {
      const receipt = JSON.parse(receiptString);
      
      // Basic validation
      if (!receipt.roomId || !receipt.calculation || !receipt.generatedAt) {
        return false;
      }

      if (!receipt.calculation.totalAmount || !receipt.calculation.shares) {
        return false;
      }

      // Validate shares
      const totalShares = receipt.calculation.shares.reduce((sum: number, share: PayoutShare) => sum + share.share, 0);
      const tolerance = 0.01; // 1% tolerance for rounding
      
      if (Math.abs(totalShares - receipt.calculation.totalAmount) > tolerance) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('Failed to validate receipt:', error);
      return false;
    }
  }

  async getPayoutHistory(roomId: string): Promise<PayoutCalculation[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Mock implementation - in real app, this would query a database
      const mockHistory: PayoutCalculation[] = [
        {
          totalAmount: 10.5,
          shares: [
            { recipientDid: 'did:mycelia:uploader1', share: 7.35, reason: 'uploader' },
            { recipientDid: 'did:mycelia:seeder1', share: 1.05, reason: 'seeder' },
            { recipientDid: 'did:mycelia:seeder2', share: 1.05, reason: 'seeder' },
            { recipientDid: 'did:mycelia:seeder3', share: 1.05, reason: 'seeder' }
          ],
          breakdown: {
            uploaderShare: 7.35,
            seederShare: 3.15,
            moderatorShare: 0
          }
        }
      ];

      observability.logEvent('radio_payout_history_retrieved', {
        room_id: roomId,
        history_count: mockHistory.length
      });

      return mockHistory;

    } catch (error) {
      console.error('Failed to get payout history:', error);
      observability.logEvent('radio_payout_history_failed', {
        room_id: roomId,
        error: (error as Error).message
      });
      return [];
    }
  }

  async estimatePayouts(roomId: string, estimatedBytes: number, estimatedListeners: number): Promise<PayoutCalculation> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Mock estimation based on projected metrics
      const estimatedAmount = Math.max(1, Math.floor(estimatedBytes / (1024 * 1024)));
      
      const mockReceipts: DistributionReceipt[] = [{
        roomId,
        trackId: 'estimated_track',
        contributors: Array(estimatedListeners).fill(0).map((_, i) => `did:mycelia:listener${i}`),
        bytesOut: estimatedBytes,
        timestamp: Date.now()
      }];

      const mockTrackContributions: TrackContribution[] = [{
        trackId: 'estimated_track',
        uploaderDid: 'did:mycelia:uploader',
        seeders: Array(estimatedListeners - 1).fill(0).map((_, i) => `did:mycelia:seeder${i}`),
        totalBytes: estimatedBytes,
        duration: 180 // 3 minutes
      }];

      const calculation = await this.calculatePayouts(mockReceipts, mockTrackContributions);

      observability.logEvent('radio_payouts_estimated', {
        room_id: roomId,
        estimated_bytes: estimatedBytes,
        estimated_listeners: estimatedListeners,
        estimated_amount: estimatedAmount
      });

      return calculation;

    } catch (error) {
      console.error('Failed to estimate payouts:', error);
      observability.logEvent('radio_payouts_estimation_failed', {
        room_id: roomId,
        error: (error as Error).message
      });
      throw error;
    }
  }
}

// Global instance
let globalRadioPayouts: RadioPayouts | null = null;

export function getRadioPayouts(): RadioPayouts {
  if (!globalRadioPayouts) {
    globalRadioPayouts = new RadioPayouts();
  }
  return globalRadioPayouts;
}

// Convenience exports
export const radioPayouts = {
  calculatePayouts: (receipts: DistributionReceipt[], trackContributions: TrackContribution[]) => 
    getRadioPayouts().calculatePayouts(receipts, trackContributions),
  generatePayoutReceipt: (calculation: PayoutCalculation, roomId: string) => 
    getRadioPayouts().generatePayoutReceipt(calculation, roomId),
  validateReceipt: (receiptString: string) => 
    getRadioPayouts().validateReceipt(receiptString),
  getPayoutHistory: (roomId: string) => 
    getRadioPayouts().getPayoutHistory(roomId),
  estimatePayouts: (roomId: string, estimatedBytes: number, estimatedListeners: number) => 
    getRadioPayouts().estimatePayouts(roomId, estimatedBytes, estimatedListeners)
};
