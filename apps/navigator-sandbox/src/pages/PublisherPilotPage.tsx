// Publisher Pilot Page

import React, { useState, useEffect } from 'react';
import { pilotKit, PilotConfig, PilotParticipant } from '@mycelia/pilot-kit';
import { featureFlags } from '@mycelia/web4-feature-flags';

export default function PublisherPilotPage() {
  const [pilot, setPilot] = useState<PilotConfig | null>(null);
  const [participant, setParticipant] = useState<PilotParticipant | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comments: '',
    feature: 'bloom_rewards'
  });

  useEffect(() => {
    // Check if already in a pilot
    const currentPilot = pilotKit.getCurrentPilot();
    if (currentPilot && currentPilot.pilotType === 'publisher') {
      setPilot(currentPilot);
      setIsJoined(true);
    }
  }, []);

  const createPilot = () => {
    const newPilot = pilotKit.createPublisherPilot({
      maxParticipants: 10,
      duration: 7 // 1 week for demo
    });
    setPilot(newPilot);
  };

  const joinPilot = () => {
    if (!pilot) return;
    
    const participantId = `participant_${Date.now()}`;
    const success = pilotKit.joinPilot(pilot.pilotId, participantId);
    
    if (success) {
      const newParticipant: PilotParticipant = {
        id: participantId,
        pilotId: pilot.pilotId,
        joinedAt: Date.now(),
        lastActive: Date.now(),
        feedbackCount: 0,
        metrics: {},
        status: 'active'
      };
      setParticipant(newParticipant);
      setIsJoined(true);
    }
  };

  const submitFeedback = () => {
    if (!pilot || !participant) return;

    pilotKit.submitFeedback({
      pilotId: pilot.pilotId,
      participantId: participant.id,
      timestamp: Date.now(),
      rating: feedback.rating,
      comments: feedback.comments,
      feature: feedback.feature,
      category: 'usability',
      tags: []
    });

    // Record metric
    pilotKit.recordMetric({
      pilotId: pilot.pilotId,
      participantId: participant.id,
      feature: feedback.feature,
      value: { success: true, rating: feedback.rating }
    });

    setFeedback({ rating: 5, comments: '', feature: 'bloom_rewards' });
    alert('Feedback submitted! Thank you for participating.');
  };

  const leavePilot = () => {
    if (!participant) return;
    
    pilotKit.leavePilot(participant.id);
    setIsJoined(false);
    setParticipant(null);
  };

  const completePilot = () => {
    if (!participant) return;
    
    pilotKit.completePilot(participant.id);
    alert('Pilot completed! Thank you for your participation.');
  };

  return (
    <div className="pilot-page">
      <div className="pilot-header">
        <h1>Publisher Pilot Program</h1>
        <p>Test Web4 features in a real-world publishing environment</p>
      </div>

      {!pilot && (
        <div className="pilot-setup">
          <h2>Create Publisher Pilot</h2>
          <p>This pilot will test BLOOM Rewards and Live Captions features with publishers.</p>
          <button onClick={createPilot} className="btn-primary">
            Create Pilot
          </button>
        </div>
      )}

      {pilot && !isJoined && (
        <div className="pilot-join">
          <h2>Join Publisher Pilot</h2>
          <div className="pilot-info">
            <h3>Pilot Details</h3>
            <ul>
              <li><strong>Duration:</strong> {pilot.duration} days</li>
              <li><strong>Features:</strong> {pilot.features.join(', ')}</li>
              <li><strong>Max Participants:</strong> {pilot.maxParticipants}</li>
            </ul>
            
            <h3>Features Being Tested</h3>
            <ul>
              <li><strong>BLOOM Rewards:</strong> Earn tokens for content engagement</li>
              <li><strong>Live Captions:</strong> Real-time transcription with vault storage</li>
            </ul>

            <h3>Privacy Notice</h3>
            <p className="privacy-copy">{pilot.privacyCopy}</p>

            <h3>Acceptance Criteria</h3>
            <ul>
              {pilot.acceptanceCriteria.map((criterion, index) => (
                <li key={index}>{criterion}</li>
              ))}
            </ul>

            <button onClick={joinPilot} className="btn-primary">
              Join Pilot
            </button>
          </div>
        </div>
      )}

      {isJoined && participant && (
        <div className="pilot-active">
          <div className="pilot-banner">
            <h2>🎯 Publisher Pilot Active</h2>
            <p>You're participating in the Publisher Pilot Program</p>
          </div>

          <div className="pilot-features">
            <h3>Test These Features</h3>
            
            <div className="feature-card">
              <h4>BLOOM Rewards</h4>
              <p>Earn BLOOM tokens for content engagement and data sharing</p>
              <div className="feature-toggle">
                <label>
                  <input 
                    type="checkbox" 
                    checked={featureFlags.isEnabled('bloom_rewards')}
                    onChange={(e) => featureFlags.set('bloom_rewards', e.target.checked)}
                  />
                  Enable BLOOM Rewards
                </label>
              </div>
            </div>

            <div className="feature-card">
              <h4>Live Captions</h4>
              <p>Real-time transcription with privacy-preserving vault storage</p>
              <div className="feature-toggle">
                <label>
                  <input 
                    type="checkbox" 
                    checked={featureFlags.isEnabled('live_captions_vault')}
                    onChange={(e) => featureFlags.set('live_captions_vault', e.target.checked)}
                  />
                  Enable Live Captions
                </label>
              </div>
            </div>
          </div>

          <div className="pilot-feedback">
            <h3>Provide Feedback</h3>
            <div className="feedback-form">
              <div className="form-group">
                <label>Feature:</label>
                <select 
                  value={feedback.feature} 
                  onChange={(e) => setFeedback({...feedback, feature: e.target.value})}
                >
                  <option value="bloom_rewards">BLOOM Rewards</option>
                  <option value="live_captions">Live Captions</option>
                </select>
              </div>

              <div className="form-group">
                <label>Rating (1-5):</label>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={feedback.rating}
                  onChange={(e) => setFeedback({...feedback, rating: parseInt(e.target.value)})}
                />
                <span>{feedback.rating}/5</span>
              </div>

              <div className="form-group">
                <label>Comments:</label>
                <textarea 
                  value={feedback.comments}
                  onChange={(e) => setFeedback({...feedback, comments: e.target.value})}
                  placeholder="Share your experience with this feature..."
                />
              </div>

              <button onClick={submitFeedback} className="btn-primary">
                Submit Feedback
              </button>
            </div>
          </div>

          <div className="pilot-actions">
            <button onClick={completePilot} className="btn-success">
              Complete Pilot
            </button>
            <button onClick={leavePilot} className="btn-secondary">
              Leave Pilot
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .pilot-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .pilot-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .pilot-header h1 {
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .pilot-setup, .pilot-join, .pilot-active {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 20px;
        }

        .pilot-banner {
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 30px;
        }

        .pilot-info ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .privacy-copy {
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 4px;
          font-style: italic;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .feature-card h4 {
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .feature-toggle {
          margin-top: 15px;
        }

        .feature-toggle label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .feedback-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .form-group label {
          font-weight: bold;
          color: #00d4ff;
        }

        .form-group input, .form-group select, .form-group textarea {
          padding: 10px;
          border: 1px solid #00d4ff;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.3);
          color: white;
        }

        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }

        .pilot-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 30px;
        }

        .btn-primary, .btn-success, .btn-secondary {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #00d4ff;
          color: #000;
        }

        .btn-success {
          background: #00ff88;
          color: #000;
        }

        .btn-secondary {
          background: #666;
          color: white;
        }

        .btn-primary:hover, .btn-success:hover, .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
