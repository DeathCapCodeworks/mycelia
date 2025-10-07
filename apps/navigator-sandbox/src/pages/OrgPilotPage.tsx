// Organization Pilot Page

import React, { useState, useEffect } from 'react';
import { pilotKit, PilotConfig, PilotParticipant } from '@mycelia/pilot-kit';
import { featureFlags } from '@mycelia/web4-feature-flags';

export default function OrgPilotPage() {
  const [pilot, setPilot] = useState<PilotConfig | null>(null);
  const [participant, setParticipant] = useState<PilotParticipant | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comments: '',
    feature: 'intent_bar'
  });
  const [taskCompletionTime, setTaskCompletionTime] = useState(0);
  const [appletInstallSuccess, setAppletInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if already in a pilot
    const currentPilot = pilotKit.getCurrentPilot();
    if (currentPilot && currentPilot.pilotType === 'org') {
      setPilot(currentPilot);
      setIsJoined(true);
    }
  }, []);

  const createPilot = () => {
    const newPilot = pilotKit.createOrgPilot({
      maxParticipants: 5,
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
      value: { 
        success: true, 
        rating: feedback.rating,
        taskCompletionTime: taskCompletionTime,
        appletInstallSuccess: appletInstallSuccess
      }
    });

    setFeedback({ rating: 5, comments: '', feature: 'intent_bar' });
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

  const simulateTaskCompletion = () => {
    const startTime = Date.now();
    
    // Simulate task completion
    setTimeout(() => {
      const endTime = Date.now();
      const completionTime = (endTime - startTime) / 1000; // seconds
      setTaskCompletionTime(completionTime);
      
      // Record metric
      if (participant) {
        pilotKit.recordMetric({
          pilotId: pilot!.pilotId,
          participantId: participant.id,
          feature: 'intent_bar',
          value: { 
            success: true, 
            taskCompletionTime: completionTime,
            timestamp: Date.now()
          }
        });
      }
    }, Math.random() * 30000 + 10000); // 10-40 seconds
  };

  const simulateAppletInstall = () => {
    // Simulate applet installation
    const success = Math.random() > 0.05; // 95% success rate
    setAppletInstallSuccess(success);
    
    // Record metric
    if (participant) {
      pilotKit.recordMetric({
        pilotId: pilot!.pilotId,
        participantId: participant.id,
        feature: 'applets',
        value: { 
          success: success,
          timestamp: Date.now()
        }
      });
    }
  };

  return (
    <div className="pilot-page">
      <div className="pilot-header">
        <h1>Organization Pilot Program</h1>
        <p>Test Web4 features in an organizational workflow environment</p>
      </div>

      {!pilot && (
        <div className="pilot-setup">
          <h2>Create Organization Pilot</h2>
          <p>This pilot will test Intent Bar and Portable Applets features with organizational users.</p>
          <button onClick={createPilot} className="btn-primary">
            Create Pilot
          </button>
        </div>
      )}

      {pilot && !isJoined && (
        <div className="pilot-join">
          <h2>Join Organization Pilot</h2>
          <div className="pilot-info">
            <h3>Pilot Details</h3>
            <ul>
              <li><strong>Duration:</strong> {pilot.duration} days</li>
              <li><strong>Features:</strong> {pilot.features.join(', ')}</li>
              <li><strong>Max Participants:</strong> {pilot.maxParticipants}</li>
            </ul>
            
            <h3>Features Being Tested</h3>
            <ul>
              <li><strong>Intent Bar:</strong> Omni-prompt for composing actions across calendar, wallet, graph, files</li>
              <li><strong>Portable Applets:</strong> Turn site actions into local applets with manifest and WASM sandbox</li>
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
            <h2>🏢 Organization Pilot Active</h2>
            <p>You're participating in the Organization Pilot Program</p>
          </div>

          <div className="pilot-features">
            <h3>Test These Features</h3>
            
            <div className="feature-card">
              <h4>Intent Bar</h4>
              <p>Omni-prompt for composing actions with capability prompts and dry run preview</p>
              <div className="feature-toggle">
                <label>
                  <input 
                    type="checkbox" 
                    checked={featureFlags.isEnabled('intent_bar_v1')}
                    onChange={(e) => featureFlags.set('intent_bar_v1', e.target.checked)}
                  />
                  Enable Intent Bar
                </label>
              </div>
              <div className="feature-test">
                <button onClick={simulateTaskCompletion} className="btn-test">
                  Simulate Task Completion
                </button>
                {taskCompletionTime > 0 && (
                  <p>Task completed in {taskCompletionTime.toFixed(1)} seconds</p>
                )}
              </div>
            </div>

            <div className="feature-card">
              <h4>Portable Applets</h4>
              <p>Turn site actions into local applets with manifest and WASM sandbox</p>
              <div className="feature-toggle">
                <label>
                  <input 
                    type="checkbox" 
                    checked={featureFlags.isEnabled('applets_v1')}
                    onChange={(e) => featureFlags.set('applets_v1', e.target.checked)}
                  />
                  Enable Portable Applets
                </label>
              </div>
              <div className="feature-test">
                <button onClick={simulateAppletInstall} className="btn-test">
                  Simulate Applet Installation
                </button>
                {appletInstallSuccess && (
                  <p className="success">✅ Applet installed successfully</p>
                )}
                {!appletInstallSuccess && appletInstallSuccess !== undefined && (
                  <p className="error">❌ Applet installation failed</p>
                )}
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
                  <option value="intent_bar">Intent Bar</option>
                  <option value="applets">Portable Applets</option>
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

        .feature-test {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(0, 212, 255, 0.2);
        }

        .btn-test {
          padding: 8px 16px;
          background: #00d4ff;
          color: #000;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-test:hover {
          background: #0099cc;
          color: white;
        }

        .success {
          color: #00ff88;
          margin-top: 10px;
        }

        .error {
          color: #ff4444;
          margin-top: 10px;
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
