import React, { useState, useEffect } from 'react';
import { featureFlags } from '@mycelia/web4-feature-flags';
import { observability } from '@mycelia/observability';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'passed' | 'failed' | 'executed';
  quorumRequired: number;
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  createdAt: number;
  expiresAt: number;
  flags: FlagChange[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rollbackSteps: string[];
}

export interface FlagChange {
  flag: string;
  currentValue: boolean;
  proposedValue: boolean;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface HealthChecklist {
  porAge: { status: 'pass' | 'fail'; value: number; threshold: number };
  diagnostics: { status: 'pass' | 'fail'; value: number; threshold: number };
  slos: { status: 'pass' | 'fail'; value: number; threshold: number };
  rollouts: { status: 'pass' | 'fail'; value: number; threshold: number };
}

export interface SimulationResult {
  success: boolean;
  healthChecklist: HealthChecklist;
  affectedFlags: string[];
  rollbackPlan: string[];
  riskAssessment: string;
  canProceed: boolean;
}

export interface VotePackage {
  proposalId: string;
  vote: 'for' | 'against' | 'abstain';
  timestamp: number;
  signature: string;
  voterDid: string;
}

const P0001_PROPOSAL: Proposal = {
  id: 'P-0001',
  title: 'Enable Bitcoin Mainnet Redemption',
  description: 'This proposal enables the redemption of BLOOM tokens for Bitcoin on the mainnet, marking a critical milestone in the Mycelia ecosystem.',
  status: 'active',
  quorumRequired: 75,
  votesFor: 68,
  votesAgainst: 12,
  totalVotes: 80,
  createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
  expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
  flags: [
    {
      flag: 'btc_mainnet_redemption',
      currentValue: false,
      proposedValue: true,
      description: 'Enable Bitcoin mainnet redemption functionality',
      impact: 'critical'
    },
    {
      flag: 'btc_redemption_rate_limit',
      currentValue: false,
      proposedValue: true,
      description: 'Enable rate limiting for Bitcoin redemptions',
      impact: 'high'
    },
    {
      flag: 'btc_redemption_2fa',
      currentValue: false,
      proposedValue: true,
      description: 'Require 2FA for Bitcoin redemptions above threshold',
      impact: 'medium'
    }
  ],
  riskLevel: 'critical',
  rollbackSteps: [
    'Disable btc_mainnet_redemption flag',
    'Pause all pending Bitcoin redemptions',
    'Notify users of temporary suspension',
    'Review and fix any issues',
    'Re-enable with additional safeguards'
  ]
};

const GovernanceUI: React.FC = () => {
  const [proposal, setProposal] = useState<Proposal>(P0001_PROPOSAL);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [votePackage, setVotePackage] = useState<VotePackage | null>(null);
  const [userVote, setUserVote] = useState<'for' | 'against' | 'abstain' | null>(null);

  useEffect(() => {
    // Initialize governance state
    observability.logEvent('governance_ui_loaded', {
      proposal_id: proposal.id,
      proposal_status: proposal.status
    });
  }, [proposal]);

  const runSimulation = async () => {
    setIsSimulating(true);
    
    try {
      // Simulate health checklist
      const healthChecklist: HealthChecklist = {
        porAge: { status: 'pass', value: 45, threshold: 60 }, // 45 minutes
        diagnostics: { status: 'pass', value: 1.0, threshold: 0.9 },
        slos: { status: 'pass', value: 0.95, threshold: 0.9 },
        rollouts: { status: 'pass', value: 0.98, threshold: 0.95 }
      };

      // Check if all health checks pass
      const allPassed = Object.values(healthChecklist).every(check => check.status === 'pass');
      
      const result: SimulationResult = {
        success: allPassed,
        healthChecklist,
        affectedFlags: proposal.flags.map(f => f.flag),
        rollbackPlan: proposal.rollbackSteps,
        riskAssessment: proposal.riskLevel === 'critical' 
          ? 'Critical risk proposal. Ensure all safeguards are in place before execution.'
          : proposal.riskLevel === 'high'
          ? 'High risk proposal. Monitor closely during execution.'
          : 'Standard risk proposal. Proceed with normal monitoring.',
        canProceed: allPassed && proposal.riskLevel !== 'critical'
      };

      setSimulationResult(result);
      
      observability.logEvent('governance_simulation_completed', {
        proposal_id: proposal.id,
        simulation_success: result.success,
        can_proceed: result.canProceed,
        health_checks_passed: allPassed
      });

    } catch (error) {
      console.error('Simulation failed:', error);
      observability.logEvent('governance_simulation_failed', {
        proposal_id: proposal.id,
        error: (error as Error).message
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const generateVotePackage = () => {
    if (!userVote) {
      alert('Please select your vote first.');
      return;
    }

    if (!simulationResult?.canProceed) {
      alert('Cannot generate vote package. Health checks must pass and risk level must be acceptable.');
      return;
    }

    // Generate mock vote package
    const votePkg: VotePackage = {
      proposalId: proposal.id,
      vote: userVote,
      timestamp: Date.now(),
      signature: `mock-signature-${proposal.id}-${userVote}-${Date.now()}`,
      voterDid: 'did:mycelia:voter123'
    };

    setVotePackage(votePkg);
    
    observability.logEvent('governance_vote_package_generated', {
      proposal_id: proposal.id,
      vote: userVote,
      voter_did: votePkg.voterDid
    });

    alert('Vote package generated successfully!');
  };

  const calculateQuorumProgress = () => {
    const currentQuorum = (proposal.totalVotes / 100) * 100; // Assuming 100 total possible votes
    const requiredQuorum = proposal.quorumRequired;
    return Math.min((currentQuorum / requiredQuorum) * 100, 100);
  };

  const calculateVoteProgress = () => {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes === 0) return { for: 0, against: 0 };
    
    return {
      for: (proposal.votesFor / totalVotes) * 100,
      against: (proposal.votesAgainst / totalVotes) * 100
    };
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#00ff88';
      case 'medium': return '#ffaa00';
      case 'high': return '#ff6666';
      case 'critical': return '#ff0000';
      default: return '#888';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low': return '#00ff88';
      case 'medium': return '#ffaa00';
      case 'high': return '#ff6666';
      default: return '#888';
    }
  };

  const voteProgress = calculateVoteProgress();
  const quorumProgress = calculateQuorumProgress();

  return (
    <div className="governance-container">
      <h1>Governance UI - P-0001 Simulator</h1>
      <p>Safe path to P-0001 execution with comprehensive health checks and risk assessment.</p>

      {/* Proposal Overview */}
      <div className="proposal-section">
        <h2>Proposal Overview</h2>
        
        <div className="proposal-header">
          <div className="proposal-title">
            <h3>{proposal.title}</h3>
            <span className={`status ${proposal.status}`}>{proposal.status.toUpperCase()}</span>
          </div>
          
          <div className="proposal-meta">
            <div className="meta-item">
              <span>Proposal ID:</span>
              <span>{proposal.id}</span>
            </div>
            <div className="meta-item">
              <span>Risk Level:</span>
              <span style={{ color: getRiskColor(proposal.riskLevel) }}>
                {proposal.riskLevel.toUpperCase()}
              </span>
            </div>
            <div className="meta-item">
              <span>Expires:</span>
              <span>{new Date(proposal.expiresAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="proposal-description">
          <p>{proposal.description}</p>
        </div>

        {/* Voting Progress */}
        <div className="voting-progress">
          <h3>Voting Progress</h3>
          
          <div className="vote-bars">
            <div className="vote-bar">
              <div className="vote-label">
                <span>For</span>
                <span>{proposal.votesFor} votes</span>
              </div>
              <div className="vote-progress">
                <div 
                  className="vote-fill for" 
                  style={{ width: `${voteProgress.for}%` }}
                ></div>
              </div>
            </div>
            
            <div className="vote-bar">
              <div className="vote-label">
                <span>Against</span>
                <span>{proposal.votesAgainst} votes</span>
              </div>
              <div className="vote-progress">
                <div 
                  className="vote-fill against" 
                  style={{ width: `${voteProgress.against}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="quorum-progress">
            <div className="quorum-label">
              <span>Quorum Progress</span>
              <span>{proposal.totalVotes} / 100 votes ({proposal.quorumRequired}% required)</span>
            </div>
            <div className="quorum-bar">
              <div 
                className="quorum-fill" 
                style={{ width: `${quorumProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Flag Changes */}
      <div className="flags-section">
        <h2>Flag Changes</h2>
        
        <div className="flags-list">
          {proposal.flags.map((flag, index) => (
            <div key={index} className="flag-item">
              <div className="flag-header">
                <span className="flag-name">{flag.flag}</span>
                <span 
                  className="flag-impact" 
                  style={{ color: getImpactColor(flag.impact) }}
                >
                  {flag.impact.toUpperCase()} IMPACT
                </span>
              </div>
              
              <div className="flag-description">
                <p>{flag.description}</p>
              </div>
              
              <div className="flag-change">
                <span className="current-value">
                  Current: {flag.currentValue ? 'Enabled' : 'Disabled'}
                </span>
                <span className="arrow">→</span>
                <span className="proposed-value">
                  Proposed: {flag.proposedValue ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Health Checklist & Simulation */}
      <div className="simulation-section">
        <h2>Health Checklist & Simulation</h2>
        
        <div className="simulation-controls">
          <button 
            onClick={runSimulation}
            disabled={isSimulating}
            className="simulate-button"
          >
            {isSimulating ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </div>

        {simulationResult && (
          <div className="simulation-results">
            <div className="simulation-header">
              <h3>Simulation Results</h3>
              <span className={`simulation-status ${simulationResult.success ? 'success' : 'failed'}`}>
                {simulationResult.success ? 'PASSED' : 'FAILED'}
              </span>
            </div>

            {/* Health Checklist */}
            <div className="health-checklist">
              <h4>Health Checklist</h4>
              <div className="health-items">
                <div className={`health-item ${simulationResult.healthChecklist.porAge.status}`}>
                  <span>PoR Age:</span>
                  <span>{simulationResult.healthChecklist.porAge.value} min (≤ {simulationResult.healthChecklist.porAge.threshold} min)</span>
                </div>
                <div className={`health-item ${simulationResult.healthChecklist.diagnostics.status}`}>
                  <span>Diagnostics:</span>
                  <span>{simulationResult.healthChecklist.diagnostics.value} (≥ {simulationResult.healthChecklist.diagnostics.threshold})</span>
                </div>
                <div className={`health-item ${simulationResult.healthChecklist.slos.status}`}>
                  <span>SLOs:</span>
                  <span>{simulationResult.healthChecklist.slos.value} (≥ {simulationResult.healthChecklist.slos.threshold})</span>
                </div>
                <div className={`health-item ${simulationResult.healthChecklist.rollouts.status}`}>
                  <span>Rollouts:</span>
                  <span>{simulationResult.healthChecklist.rollouts.value} (≥ {simulationResult.healthChecklist.rollouts.threshold})</span>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="risk-assessment">
              <h4>Risk Assessment</h4>
              <p>{simulationResult.riskAssessment}</p>
            </div>

            {/* Rollback Plan */}
            <div className="rollback-plan">
              <h4>Rollback Plan</h4>
              <ol>
                {simulationResult.rollbackPlan.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>

            {/* Can Proceed */}
            <div className={`can-proceed ${simulationResult.canProceed ? 'yes' : 'no'}`}>
              <h4>Can Proceed:</h4>
              <span>{simulationResult.canProceed ? 'YES' : 'NO'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Vote Package Generation */}
      <div className="vote-section">
        <h2>Vote Package Generation</h2>
        
        <div className="vote-controls">
          <div className="vote-options">
            <label>
              <input 
                type="radio" 
                name="vote" 
                value="for"
                checked={userVote === 'for'}
                onChange={(e) => setUserVote(e.target.value as 'for')}
              />
              Vote For
            </label>
            <label>
              <input 
                type="radio" 
                name="vote" 
                value="against"
                checked={userVote === 'against'}
                onChange={(e) => setUserVote(e.target.value as 'against')}
              />
              Vote Against
            </label>
            <label>
              <input 
                type="radio" 
                name="vote" 
                value="abstain"
                checked={userVote === 'abstain'}
                onChange={(e) => setUserVote(e.target.value as 'abstain')}
              />
              Abstain
            </label>
          </div>

          <button 
            onClick={generateVotePackage}
            disabled={!userVote || !simulationResult?.canProceed}
            className="generate-vote-button"
          >
            Generate Vote Package
          </button>
        </div>

        {votePackage && (
          <div className="vote-package">
            <h3>Generated Vote Package</h3>
            <div className="vote-package-content">
              <div className="vote-package-item">
                <span>Proposal ID:</span>
                <span>{votePackage.proposalId}</span>
              </div>
              <div className="vote-package-item">
                <span>Vote:</span>
                <span className={`vote-${votePackage.vote}`}>{votePackage.vote.toUpperCase()}</span>
              </div>
              <div className="vote-package-item">
                <span>Timestamp:</span>
                <span>{new Date(votePackage.timestamp).toLocaleString()}</span>
              </div>
              <div className="vote-package-item">
                <span>Voter DID:</span>
                <span>{votePackage.voterDid}</span>
              </div>
              <div className="vote-package-item">
                <span>Signature:</span>
                <span className="signature">{votePackage.signature.substring(0, 60)}...</span>
              </div>
            </div>
            
            <button 
              onClick={() => navigator.clipboard.writeText(JSON.stringify(votePackage, null, 2))}
              className="copy-vote-button"
            >
              Copy Vote Package
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .governance-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          color: #eee;
        }

        h1 {
          color: #00d4ff;
          margin-bottom: 1rem;
          text-align: center;
        }

        p {
          text-align: center;
          color: #ccc;
          margin-bottom: 2rem;
        }

        h2 {
          color: #00ff88;
          margin-top: 2rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #333;
          padding-bottom: 0.5rem;
        }

        h3 {
          color: #00d4ff;
          margin-bottom: 1rem;
        }

        h4 {
          color: #ccc;
          margin-bottom: 0.5rem;
        }

        /* Proposal Section */
        .proposal-section {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 2rem;
        }

        .proposal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .proposal-title {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .proposal-title h3 {
          margin: 0;
          color: #00d4ff;
        }

        .status {
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .status.active {
          background: #00ff88;
          color: #1a1a1a;
        }

        .proposal-meta {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
        }

        .meta-item span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .proposal-description {
          margin-bottom: 20px;
        }

        .proposal-description p {
          color: #ccc;
          line-height: 1.6;
        }

        /* Voting Progress */
        .voting-progress {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 4px;
          padding: 15px;
        }

        .vote-bars {
          margin-bottom: 15px;
        }

        .vote-bar {
          margin-bottom: 10px;
        }

        .vote-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .vote-label span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .vote-progress {
          height: 20px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          overflow: hidden;
        }

        .vote-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .vote-fill.for {
          background: #00ff88;
        }

        .vote-fill.against {
          background: #ff6666;
        }

        .quorum-progress {
          margin-top: 15px;
        }

        .quorum-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .quorum-label span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .quorum-bar {
          height: 20px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          overflow: hidden;
        }

        .quorum-fill {
          height: 100%;
          background: #00d4ff;
          transition: width 0.3s ease;
        }

        /* Flags Section */
        .flags-section {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid #00ff88;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 2rem;
        }

        .flags-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .flag-item {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 4px;
          padding: 15px;
        }

        .flag-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .flag-name {
          color: #00d4ff;
          font-weight: bold;
          font-family: monospace;
        }

        .flag-impact {
          font-size: 0.8rem;
          font-weight: bold;
        }

        .flag-description {
          margin-bottom: 10px;
        }

        .flag-description p {
          color: #ccc;
          margin: 0;
        }

        .flag-change {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .current-value {
          color: #ff6666;
          font-weight: bold;
        }

        .arrow {
          color: #00d4ff;
          font-weight: bold;
        }

        .proposed-value {
          color: #00ff88;
          font-weight: bold;
        }

        /* Simulation Section */
        .simulation-section {
          background: rgba(255, 170, 0, 0.1);
          border: 1px solid #ffaa00;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 2rem;
        }

        .simulation-controls {
          margin-bottom: 20px;
        }

        .simulate-button {
          background: #ffaa00;
          color: #1a1a1a;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1.1rem;
          transition: background 0.3s ease;
        }

        .simulate-button:hover:not(:disabled) {
          background: #e69900;
        }

        .simulate-button:disabled {
          background: #555;
          cursor: not-allowed;
        }

        .simulation-results {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 170, 0, 0.2);
          border-radius: 4px;
          padding: 20px;
        }

        .simulation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .simulation-status {
          padding: 5px 15px;
          border-radius: 15px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .simulation-status.success {
          background: #00ff88;
          color: #1a1a1a;
        }

        .simulation-status.failed {
          background: #ff6666;
          color: #1a1a1a;
        }

        .health-checklist {
          margin-bottom: 20px;
        }

        .health-items {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }

        .health-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-radius: 4px;
          font-weight: bold;
        }

        .health-item.pass {
          background: rgba(0, 255, 136, 0.2);
          border: 1px solid #00ff88;
          color: #00ff88;
        }

        .health-item.fail {
          background: rgba(255, 102, 102, 0.2);
          border: 1px solid #ff6666;
          color: #ff6666;
        }

        .risk-assessment {
          margin-bottom: 20px;
          padding: 15px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          border-left: 4px solid #ffaa00;
        }

        .risk-assessment p {
          color: #ccc;
          margin: 0;
        }

        .rollback-plan {
          margin-bottom: 20px;
        }

        .rollback-plan ol {
          color: #ccc;
          padding-left: 20px;
        }

        .rollback-plan li {
          margin-bottom: 5px;
        }

        .can-proceed {
          padding: 15px;
          border-radius: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .can-proceed.yes {
          background: rgba(0, 255, 136, 0.2);
          border: 1px solid #00ff88;
          color: #00ff88;
        }

        .can-proceed.no {
          background: rgba(255, 102, 102, 0.2);
          border: 1px solid #ff6666;
          color: #ff6666;
        }

        /* Vote Section */
        .vote-section {
          background: rgba(255, 102, 102, 0.1);
          border: 1px solid #ff6666;
          border-radius: 8px;
          padding: 20px;
        }

        .vote-controls {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 20px;
        }

        .vote-options {
          display: flex;
          gap: 20px;
        }

        .vote-options label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ccc;
          font-weight: bold;
          cursor: pointer;
        }

        .vote-options input[type="radio"] {
          width: 18px;
          height: 18px;
        }

        .generate-vote-button {
          background: #ff6666;
          color: #1a1a1a;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1.1rem;
          transition: background 0.3s ease;
        }

        .generate-vote-button:hover:not(:disabled) {
          background: #e65c5c;
        }

        .generate-vote-button:disabled {
          background: #555;
          cursor: not-allowed;
        }

        .vote-package {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 102, 102, 0.2);
          border-radius: 4px;
          padding: 20px;
        }

        .vote-package-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 15px;
        }

        .vote-package-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .vote-package-item span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .vote-for {
          color: #00ff88;
          font-weight: bold;
        }

        .vote-against {
          color: #ff6666;
          font-weight: bold;
        }

        .vote-abstain {
          color: #ffaa00;
          font-weight: bold;
        }

        .signature {
          font-family: monospace;
          font-size: 0.9rem;
        }

        .copy-vote-button {
          background: #00d4ff;
          color: #1a1a1a;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s ease;
        }

        .copy-vote-button:hover {
          background: #00b3e6;
        }
      `}</style>
    </div>
  );
};

export default GovernanceUI;
