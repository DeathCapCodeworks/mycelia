import React, { useState, useEffect } from 'react';

interface Validator {
  pubkey: string;
  stake: bigint;
  isActive: boolean;
  registeredAt: number;
  totalDelegations: bigint;
}

interface Delegation {
  delegator: string;
  validator: string;
  amount: bigint;
  createdAt: number;
  lastUpdated: number;
}

interface EpochRewards {
  epoch: number;
  totalMinted: bigint;
  validatorRewards: Record<string, bigint>;
  delegatorRewards: Record<string, bigint>;
  blocked: boolean;
  reason?: string;
}

export default function StakingPage() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [rewards, setRewards] = useState<EpochRewards | null>(null);
  const [newValidatorPubkey, setNewValidatorPubkey] = useState<string>('');
  const [newValidatorStake, setNewValidatorStake] = useState<string>('1000');
  const [delegatorAddress, setDelegatorAddress] = useState<string>('');
  const [selectedValidator, setSelectedValidator] = useState<string>('');
  const [delegationAmount, setDelegationAmount] = useState<string>('500');

  // Mock data initialization
  useEffect(() => {
    const mockValidators: Validator[] = [
      {
        pubkey: 'validator-1',
        stake: 1000n,
        isActive: true,
        registeredAt: Date.now() - 86400000,
        totalDelegations: 1500n
      },
      {
        pubkey: 'validator-2',
        stake: 2000n,
        isActive: true,
        registeredAt: Date.now() - 172800000,
        totalDelegations: 800n
      }
    ];

    const mockDelegations: Delegation[] = [
      {
        delegator: 'delegator-1',
        validator: 'validator-1',
        amount: 500n,
        createdAt: Date.now() - 3600000,
        lastUpdated: Date.now() - 3600000
      },
      {
        delegator: 'delegator-2',
        validator: 'validator-1',
        amount: 1000n,
        createdAt: Date.now() - 7200000,
        lastUpdated: Date.now() - 7200000
      },
      {
        delegator: 'delegator-3',
        validator: 'validator-2',
        amount: 800n,
        createdAt: Date.now() - 10800000,
        lastUpdated: Date.now() - 10800000
      }
    ];

    setValidators(mockValidators);
    setDelegations(mockDelegations);
    setCurrentEpoch(42);
  }, []);

  const handleRegisterValidator = () => {
    if (!newValidatorPubkey || !newValidatorStake) return;

    const newValidator: Validator = {
      pubkey: newValidatorPubkey,
      stake: BigInt(newValidatorStake),
      isActive: true,
      registeredAt: Date.now(),
      totalDelegations: 0n
    };

    setValidators([...validators, newValidator]);
    setNewValidatorPubkey('');
    setNewValidatorStake('1000');
  };

  const handleDelegate = () => {
    if (!delegatorAddress || !selectedValidator || !delegationAmount) return;

    const existingDelegation = delegations.find(
      d => d.delegator === delegatorAddress && d.validator === selectedValidator
    );

    if (existingDelegation) {
      // Update existing delegation
      const updatedDelegations = delegations.map(d =>
        d.delegator === delegatorAddress && d.validator === selectedValidator
          ? { ...d, amount: d.amount + BigInt(delegationAmount), lastUpdated: Date.now() }
          : d
      );
      setDelegations(updatedDelegations);
    } else {
      // Create new delegation
      const newDelegation: Delegation = {
        delegator: delegatorAddress,
        validator: selectedValidator,
        amount: BigInt(delegationAmount),
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
      setDelegations([...delegations, newDelegation]);
    }

    // Update validator total delegations
    setValidators(validators.map(v =>
      v.pubkey === selectedValidator
        ? { ...v, totalDelegations: v.totalDelegations + BigInt(delegationAmount) }
        : v
    ));

    setDelegatorAddress('');
    setDelegationAmount('500');
  };

  const handleTickEpoch = () => {
    const totalStake = validators.reduce((sum, v) => sum + v.stake + v.totalDelegations, 0n);
    const rewardAmount = totalStake / 100n; // 1% reward rate

    const mockRewards: EpochRewards = {
      epoch: currentEpoch + 1,
      totalMinted: rewardAmount,
      validatorRewards: {},
      delegatorRewards: {},
      blocked: false
    };

    // Calculate validator rewards
    validators.forEach(validator => {
      const validatorStake = validator.stake + validator.totalDelegations;
      const validatorReward = (rewardAmount * validatorStake) / totalStake;
      mockRewards.validatorRewards[validator.pubkey] = validatorReward;
    });

    // Calculate delegator rewards
    delegations.forEach(delegation => {
      const delegatorReward = (rewardAmount * delegation.amount) / totalStake;
      mockRewards.delegatorRewards[delegation.delegator] = 
        (mockRewards.delegatorRewards[delegation.delegator] || 0n) + delegatorReward;
    });

    setRewards(mockRewards);
    setCurrentEpoch(currentEpoch + 1);
  };

  return (
    <div className="card">
      <h2>Staking Preview</h2>
      <p className="myc-muted">
        Manage validators and delegations. Epoch rewards are minted only when reserves allow.
        <strong> Testnet only - mainnet staking not yet available.</strong>
      </p>

      <div className="myc-grid">
        <div className="card">
          <h3>Register Validator</h3>
          <div className="form-group">
            <label>Validator Public Key:</label>
            <input
              type="text"
              value={newValidatorPubkey}
              onChange={(e) => setNewValidatorPubkey(e.target.value)}
              placeholder="validator-pubkey"
            />
          </div>
          <div className="form-group">
            <label>Initial Stake (BLOOM):</label>
            <input
              type="number"
              value={newValidatorStake}
              onChange={(e) => setNewValidatorStake(e.target.value)}
              placeholder="1000"
            />
          </div>
          <button onClick={handleRegisterValidator} className="btn btn-primary">
            Register Validator
          </button>
        </div>

        <div className="card">
          <h3>Create Delegation</h3>
          <div className="form-group">
            <label>Delegator Address:</label>
            <input
              type="text"
              value={delegatorAddress}
              onChange={(e) => setDelegatorAddress(e.target.value)}
              placeholder="delegator-address"
            />
          </div>
          <div className="form-group">
            <label>Validator:</label>
            <select
              value={selectedValidator}
              onChange={(e) => setSelectedValidator(e.target.value)}
            >
              <option value="">Select Validator</option>
              {validators.map(v => (
                <option key={v.pubkey} value={v.pubkey}>
                  {v.pubkey} (Stake: {v.stake.toString()})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Delegation Amount (BLOOM):</label>
            <input
              type="number"
              value={delegationAmount}
              onChange={(e) => setDelegationAmount(e.target.value)}
              placeholder="500"
            />
          </div>
          <button onClick={handleDelegate} className="btn btn-success">
            Delegate
          </button>
        </div>

        <div className="card">
          <h3>Epoch Management</h3>
          <div className="myc-grid">
            <div>
              <strong>Current Epoch:</strong> {currentEpoch}
            </div>
            <div>
              <strong>Total Stake:</strong> {validators.reduce((sum, v) => sum + v.stake + v.totalDelegations, 0n).toString()} BLOOM
            </div>
            <div>
              <strong>Active Validators:</strong> {validators.filter(v => v.isActive).length}
            </div>
            <div>
              <strong>Total Delegations:</strong> {delegations.length}
            </div>
          </div>
          <button onClick={handleTickEpoch} className="btn btn-warning">
            Tick Epoch
          </button>
        </div>
      </div>

      <div className="myc-grid">
        <div className="card">
          <h3>Validators</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Public Key</th>
                  <th>Stake</th>
                  <th>Delegations</th>
                  <th>Total Stake</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {validators.map(validator => (
                  <tr key={validator.pubkey}>
                    <td>{validator.pubkey}</td>
                    <td>{validator.stake.toString()}</td>
                    <td>{validator.totalDelegations.toString()}</td>
                    <td>{(validator.stake + validator.totalDelegations).toString()}</td>
                    <td>
                      <span className={`status-${validator.isActive ? 'active' : 'inactive'}`}>
                        {validator.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Delegations</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Delegator</th>
                  <th>Validator</th>
                  <th>Amount</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {delegations.map((delegation, index) => (
                  <tr key={index}>
                    <td>{delegation.delegator}</td>
                    <td>{delegation.validator}</td>
                    <td>{delegation.amount.toString()}</td>
                    <td>{new Date(delegation.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {rewards && (
        <div className="card">
          <h3>Epoch Rewards (Epoch {rewards.epoch})</h3>
          <div className="myc-grid">
            <div>
              <strong>Total Minted:</strong> {rewards.totalMinted.toString()} BLOOM
            </div>
            <div>
              <strong>Status:</strong> 
              <span className={`status-${rewards.blocked ? 'blocked' : 'success'}`}>
                {rewards.blocked ? 'Blocked' : 'Success'}
              </span>
            </div>
            {rewards.reason && (
              <div>
                <strong>Reason:</strong> {rewards.reason}
              </div>
            )}
          </div>

          <div className="myc-grid">
            <div>
              <h4>Validator Rewards</h4>
              {Object.entries(rewards.validatorRewards).map(([pubkey, amount]) => (
                <div key={pubkey}>
                  {pubkey}: {amount.toString()} BLOOM
                </div>
              ))}
            </div>
            <div>
              <h4>Delegator Rewards</h4>
              {Object.entries(rewards.delegatorRewards).map(([delegator, amount]) => (
                <div key={delegator}>
                  {delegator}: {amount.toString()} BLOOM
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>How Staking Works</h3>
        <ol>
          <li>Validators register with initial stake</li>
          <li>Delegators stake BLOOM with validators</li>
          <li>Epoch tick calculates rewards based on total stake</li>
          <li>Rewards are minted only if reserves allow (peg protection)</li>
          <li>Rewards distributed proportionally to stake</li>
        </ol>
        
        <div className="warning">
          <strong>Testnet Only:</strong> This is a demonstration of staking mechanics. 
          Mainnet staking will be available in future releases.
        </div>
      </div>
    </div>
  );
}
