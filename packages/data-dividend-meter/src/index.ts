import React, { useState, useEffect } from 'react';
import { isEnabled } from '@mycelia/web4-feature-flags';

export interface DataDividendEarning {
  id: string;
  timestamp: number;
  amount: number; // in BLOOM
  source: 'data_contribution' | 'mining' | 'staking' | 'referral';
  description: string;
  status: 'pending' | 'confirmed' | 'paid';
}

export interface DataDividendMeterProps {
  userId?: string;
  onEarningUpdate?: (earnings: DataDividendEarning[]) => void;
  showHistory?: boolean;
}

/**
 * Data Dividend Meter Component
 * 
 * Displays earnings from data contributions and other sources.
 * Behind feature flag: data_dividend_meter_v1
 */
export function DataDividendMeter({
  userId,
  onEarningUpdate,
  showHistory = true
}: DataDividendMeterProps): React.ReactElement | null {
  const [earnings, setEarnings] = useState<DataDividendEarning[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);

  // Feature flag gate
  if (!isEnabled('data_dividend_meter_v1')) {
    return null;
  }

  useEffect(() => {
    // Mock data - in production would fetch from API
    const mockEarnings: DataDividendEarning[] = [
      {
        id: '1',
        timestamp: Date.now() - 86400000, // 1 day ago
        amount: 0.5,
        source: 'data_contribution',
        description: 'Data contribution reward',
        status: 'confirmed'
      },
      {
        id: '2',
        timestamp: Date.now() - 3600000, // 1 hour ago
        amount: 0.2,
        source: 'mining',
        description: 'Mining reward',
        status: 'pending'
      }
    ];

    setEarnings(mockEarnings);
    
    const total = mockEarnings.reduce((sum, earning) => sum + earning.amount, 0);
    const pending = mockEarnings
      .filter(e => e.status === 'pending')
      .reduce((sum, earning) => sum + earning.amount, 0);
    
    setTotalEarnings(total);
    setPendingEarnings(pending);

    onEarningUpdate?.(mockEarnings);
  }, [userId, onEarningUpdate]);

  const formatAmount = (amount: number): string => {
    return `${amount.toFixed(4)} BLOOM`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="data-dividend-meter">
      <div className="meter-header">
        <h3>Data Dividend Meter</h3>
        <div className="total-earnings">
          Total: {formatAmount(totalEarnings)}
        </div>
      </div>

      <div className="meter-summary">
        <div className="summary-item">
          <span className="label">Confirmed:</span>
          <span className="value">{formatAmount(totalEarnings - pendingEarnings)}</span>
        </div>
        <div className="summary-item">
          <span className="label">Pending:</span>
          <span className="value pending">{formatAmount(pendingEarnings)}</span>
        </div>
      </div>

      {showHistory && (
        <div className="earnings-history">
          <h4>Recent Earnings</h4>
          <div className="earnings-list">
            {earnings.map(earning => (
              <div key={earning.id} className={`earning-item ${earning.status}`}>
                <div className="earning-header">
                  <span className="amount">{formatAmount(earning.amount)}</span>
                  <span className="status">{earning.status}</span>
                </div>
                <div className="earning-details">
                  <span className="source">{earning.source}</span>
                  <span className="timestamp">{formatTimestamp(earning.timestamp)}</span>
                </div>
                <div className="earning-description">
                  {earning.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Headless API for data dividend management
 */
export class DataDividendManager {
  private earnings: Map<string, DataDividendEarning> = new Map();

  addEarning(earning: DataDividendEarning): void {
    this.earnings.set(earning.id, earning);
  }

  updateEarningStatus(earningId: string, status: DataDividendEarning['status']): boolean {
    const earning = this.earnings.get(earningId);
    if (!earning) {
      return false;
    }

    earning.status = status;
    return true;
  }

  getEarningsBySource(source: DataDividendEarning['source']): DataDividendEarning[] {
    return Array.from(this.earnings.values()).filter(e => e.source === source);
  }

  getEarningsByStatus(status: DataDividendEarning['status']): DataDividendEarning[] {
    return Array.from(this.earnings.values()).filter(e => e.status === status);
  }

  getTotalEarnings(): number {
    return Array.from(this.earnings.values()).reduce((sum, e) => sum + e.amount, 0);
  }

  getPendingEarnings(): number {
    return this.getEarningsByStatus('pending').reduce((sum, e) => sum + e.amount, 0);
  }

  getConfirmedEarnings(): number {
    return this.getEarningsByStatus('confirmed').reduce((sum, e) => sum + e.amount, 0);
  }

  getAllEarnings(): DataDividendEarning[] {
    return Array.from(this.earnings.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
}

// Default export for convenience
export default DataDividendMeter;