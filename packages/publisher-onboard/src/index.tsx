// Publisher Onboarding Wizard - Domain verification and snippet integration

import React, { useState, useEffect } from 'react';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface PublisherOnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

export interface DomainVerification {
  domain: string;
  verified: boolean;
  verification_method: 'dns' | 'meta' | 'file';
  verification_token: string;
  verified_at?: number;
}

export interface SiteReceipt {
  domain_hash: string;
  timestamp: number;
  owner_did: string;
  signature: string;
  features_enabled: string[];
  verification_status: 'verified' | 'pending' | 'failed';
}

export interface SnippetCheck {
  snippet_present: boolean;
  snippet_version: string;
  features_detected: string[];
  errors: string[];
  warnings: string[];
}

export interface LiveCheck {
  site_accessible: boolean;
  snippet_loading: boolean;
  features_working: string[];
  performance_score: number;
  errors: string[];
}

export class PublisherOnboardingManager {
  private currentStep: number = 0;
  private onboardingData: any = {};
  private siteReceipt: SiteReceipt | null = null;

  constructor() {
    this.loadOnboardingData();
  }

  private loadOnboardingData(): void {
    try {
      const stored = localStorage.getItem('mycelia-publisher-onboarding');
      if (stored) {
        const data = JSON.parse(stored);
        this.currentStep = data.currentStep || 0;
        this.onboardingData = data.onboardingData || {};
        this.siteReceipt = data.siteReceipt || null;
      }
    } catch (error) {
      console.warn('Failed to load onboarding data:', error);
    }
  }

  private saveOnboardingData(): void {
    try {
      const data = {
        currentStep: this.currentStep,
        onboardingData: this.onboardingData,
        siteReceipt: this.siteReceipt,
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-publisher-onboarding', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save onboarding data:', error);
    }
  }

  getSteps(): PublisherOnboardingStep[] {
    return [
      {
        id: 'domain',
        title: 'Add Domain',
        description: 'Enter your website domain for verification',
        completed: !!this.onboardingData.domain
      },
      {
        id: 'snippet',
        title: 'Paste Snippet',
        description: 'Add the Mycelia snippet to your website',
        completed: !!this.onboardingData.snippetAdded
      },
      {
        id: 'live-check',
        title: 'Run Live Check',
        description: 'Verify the snippet is working on your site',
        completed: !!this.onboardingData.liveCheckPassed
      },
      {
        id: 'features',
        title: 'Enable Features',
        description: 'Choose which Web4 features to enable',
        completed: !!this.onboardingData.featuresEnabled
      }
    ];
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  setCurrentStep(step: number): void {
    this.currentStep = step;
    this.saveOnboardingData();
  }

  nextStep(): void {
    if (this.currentStep < this.getSteps().length - 1) {
      this.currentStep++;
      this.saveOnboardingData();
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.saveOnboardingData();
    }
  }

  async verifyDomain(domain: string): Promise<DomainVerification> {
    // Mock domain verification
    const verification: DomainVerification = {
      domain,
      verified: true,
      verification_method: 'meta',
      verification_token: this.generateVerificationToken(),
      verified_at: Date.now()
    };

    this.onboardingData.domain = domain;
    this.onboardingData.domainVerification = verification;
    this.saveOnboardingData();

    observability.logEvent('publisher_domain_verified', {
      domain,
      verification_method: verification.verification_method
    });

    return verification;
  }

  generateSnippet(domain: string, features: string[]): string {
    const snippet = `<!-- Mycelia Web4 Integration -->
<script>
  window.MyceliaConfig = {
    domain: '${domain}',
    features: ${JSON.stringify(features)},
    apiKey: '${this.generateApiKey()}'
  };
</script>
<script src="https://cdn.mycelia.org/web4-integration.js" async></script>`;

    this.onboardingData.snippet = snippet;
    this.onboardingData.snippetAdded = true;
    this.saveOnboardingData();

    return snippet;
  }

  async checkSnippet(domain: string): Promise<SnippetCheck> {
    // Mock snippet check
    const check: SnippetCheck = {
      snippet_present: true,
      snippet_version: '1.0.0',
      features_detected: ['rewards', 'captions'],
      errors: [],
      warnings: []
    };

    this.onboardingData.snippetCheck = check;
    this.saveOnboardingData();

    observability.logEvent('publisher_snippet_checked', {
      domain,
      snippet_present: check.snippet_present,
      features_detected: check.features_detected.length
    });

    return check;
  }

  async runLiveCheck(domain: string): Promise<LiveCheck> {
    // Mock live check
    const check: LiveCheck = {
      site_accessible: true,
      snippet_loading: true,
      features_working: ['rewards', 'captions'],
      performance_score: 85,
      errors: [],
      warnings: []
    };

    this.onboardingData.liveCheck = check;
    this.onboardingData.liveCheckPassed = true;
    this.saveOnboardingData();

    observability.logEvent('publisher_live_check', {
      domain,
      site_accessible: check.site_accessible,
      performance_score: check.performance_score
    });

    return check;
  }

  async enableFeatures(features: string[]): Promise<void> {
    // Enable features via feature flags
    features.forEach(feature => {
      featureFlags.set(feature, true);
    });

    this.onboardingData.featuresEnabled = features;
    this.saveOnboardingData();

    observability.logEvent('publisher_features_enabled', {
      features,
      count: features.length
    });
  }

  async generateSiteReceipt(domain: string, ownerDid: string): Promise<SiteReceipt> {
    const domainHash = await this.hashDomain(domain);
    const timestamp = Date.now();
    const features = this.onboardingData.featuresEnabled || [];
    
    const receipt: SiteReceipt = {
      domain_hash: domainHash,
      timestamp,
      owner_did: ownerDid,
      signature: this.generateSignature(domainHash, timestamp, ownerDid),
      features_enabled: features,
      verification_status: 'verified'
    };

    this.siteReceipt = receipt;
    this.saveOnboardingData();

    observability.logEvent('publisher_site_receipt_generated', {
      domain,
      domain_hash: domainHash,
      features_enabled: features.length
    });

    return receipt;
  }

  getSiteReceipt(): SiteReceipt | null {
    return this.siteReceipt;
  }

  getOnboardingData(): any {
    return this.onboardingData;
  }

  isComplete(): boolean {
    const steps = this.getSteps();
    return steps.every(step => step.completed);
  }

  reset(): void {
    this.currentStep = 0;
    this.onboardingData = {};
    this.siteReceipt = null;
    this.saveOnboardingData();
  }

  private generateVerificationToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateApiKey(): string {
    return 'myc_' + Math.random().toString(36).substring(2) + '_' + Date.now().toString(36);
  }

  private async hashDomain(domain: string): Promise<string> {
    // Mock domain hashing
    return 'hash_' + domain.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now();
  }

  private generateSignature(domainHash: string, timestamp: number, ownerDid: string): string {
    // Mock signature generation
    return 'sig_' + domainHash.substring(0, 8) + '_' + timestamp.toString(36);
  }
}

// React Components
export const PublisherOnboardingWizard: React.FC = () => {
  const [onboardingManager] = useState(() => new PublisherOnboardingManager());
  const [currentStep, setCurrentStep] = useState(0);
  const [domain, setDomain] = useState('');
  const [domainVerification, setDomainVerification] = useState<DomainVerification | null>(null);
  const [snippet, setSnippet] = useState('');
  const [snippetCheck, setSnippetCheck] = useState<SnippetCheck | null>(null);
  const [liveCheck, setLiveCheck] = useState<LiveCheck | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['rewards']);
  const [siteReceipt, setSiteReceipt] = useState<SiteReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const steps = onboardingManager.getSteps();
    setCurrentStep(onboardingManager.getCurrentStep());
    
    const data = onboardingManager.getOnboardingData();
    if (data.domain) setDomain(data.domain);
    if (data.domainVerification) setDomainVerification(data.domainVerification);
    if (data.snippet) setSnippet(data.snippet);
    if (data.snippetCheck) setSnippetCheck(data.snippetCheck);
    if (data.liveCheck) setLiveCheck(data.liveCheck);
    if (data.featuresEnabled) setSelectedFeatures(data.featuresEnabled);
    
    const receipt = onboardingManager.getSiteReceipt();
    if (receipt) setSiteReceipt(receipt);
  }, []);

  const handleDomainSubmit = async () => {
    if (!domain) return;
    
    setIsLoading(true);
    try {
      const verification = await onboardingManager.verifyDomain(domain);
      setDomainVerification(verification);
      onboardingManager.nextStep();
      setCurrentStep(1);
    } catch (error) {
      console.error('Domain verification failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSnippetGenerate = () => {
    if (!domain) return;
    
    const generatedSnippet = onboardingManager.generateSnippet(domain, selectedFeatures);
    setSnippet(generatedSnippet);
    onboardingManager.nextStep();
    setCurrentStep(2);
  };

  const handleSnippetCheck = async () => {
    if (!domain) return;
    
    setIsLoading(true);
    try {
      const check = await onboardingManager.checkSnippet(domain);
      setSnippetCheck(check);
    } catch (error) {
      console.error('Snippet check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLiveCheck = async () => {
    if (!domain) return;
    
    setIsLoading(true);
    try {
      const check = await onboardingManager.runLiveCheck(domain);
      setLiveCheck(check);
      onboardingManager.nextStep();
      setCurrentStep(3);
    } catch (error) {
      console.error('Live check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeaturesSubmit = async () => {
    setIsLoading(true);
    try {
      await onboardingManager.enableFeatures(selectedFeatures);
      const receipt = await onboardingManager.generateSiteReceipt(domain, 'did:mycelia:user123');
      setSiteReceipt(receipt);
      onboardingManager.nextStep();
      setCurrentStep(4);
    } catch (error) {
      console.error('Feature enablement failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = onboardingManager.getSteps();

  return (
    <div className="publisher-onboarding">
      <div className="onboarding-header">
        <h1>Publisher Onboarding</h1>
        <p>Get your website ready for Web4 features</p>
      </div>

      <div className="onboarding-progress">
        <div className="progress-bar">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`progress-step ${index <= currentStep ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-info">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="onboarding-content">
        {currentStep === 0 && (
          <div className="step-content">
            <h2>Add Your Domain</h2>
            <p>Enter your website domain to begin the verification process.</p>
            
            <div className="form-group">
              <label>Domain:</label>
              <input 
                type="text" 
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
              />
            </div>

            <button 
              onClick={handleDomainSubmit}
              disabled={!domain || isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Verifying...' : 'Verify Domain'}
            </button>
          </div>
        )}

        {currentStep === 1 && (
          <div className="step-content">
            <h2>Add Integration Snippet</h2>
            <p>Copy and paste this snippet into your website's HTML head section.</p>
            
            {domainVerification && (
              <div className="verification-success">
                <h3>✅ Domain Verified</h3>
                <p>Domain: {domainVerification.domain}</p>
                <p>Method: {domainVerification.verification_method}</p>
              </div>
            )}

            <div className="snippet-container">
              <textarea 
                value={snippet}
                onChange={(e) => setSnippet(e.target.value)}
                placeholder="Snippet will be generated here..."
                rows={10}
              />
              <button 
                onClick={() => navigator.clipboard.writeText(snippet)}
                className="btn-copy"
              >
                Copy to Clipboard
              </button>
            </div>

            <div className="feature-selection">
              <h3>Select Features:</h3>
              <label>
                <input 
                  type="checkbox" 
                  checked={selectedFeatures.includes('rewards')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFeatures([...selectedFeatures, 'rewards']);
                    } else {
                      setSelectedFeatures(selectedFeatures.filter(f => f !== 'rewards'));
                    }
                  }}
                />
                BLOOM Rewards
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={selectedFeatures.includes('captions')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFeatures([...selectedFeatures, 'captions']);
                    } else {
                      setSelectedFeatures(selectedFeatures.filter(f => f !== 'captions'));
                    }
                  }}
                />
                Live Captions
              </label>
            </div>

            <button 
              onClick={handleSnippetGenerate}
              className="btn-primary"
            >
              Generate Snippet
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="step-content">
            <h2>Verify Snippet Installation</h2>
            <p>Check if the snippet is properly installed on your website.</p>
            
            <button 
              onClick={handleSnippetCheck}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Checking...' : 'Check Snippet'}
            </button>

            {snippetCheck && (
              <div className="check-results">
                <h3>Snippet Check Results:</h3>
                <div className="result-item">
                  <span>Snippet Present:</span>
                  <span className={snippetCheck.snippet_present ? 'success' : 'error'}>
                    {snippetCheck.snippet_present ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="result-item">
                  <span>Version:</span>
                  <span>{snippetCheck.snippet_version}</span>
                </div>
                <div className="result-item">
                  <span>Features Detected:</span>
                  <span>{snippetCheck.features_detected.join(', ')}</span>
                </div>
                
                {snippetCheck.errors.length > 0 && (
                  <div className="errors">
                    <h4>Errors:</h4>
                    <ul>
                      {snippetCheck.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {snippetCheck && (
              <button 
                onClick={handleLiveCheck}
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Running Live Check...' : 'Run Live Check'}
              </button>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="step-content">
            <h2>Live Check Results</h2>
            <p>Verify that your website is working correctly with Web4 features.</p>
            
            {liveCheck && (
              <div className="live-check-results">
                <h3>Live Check Results:</h3>
                <div className="result-item">
                  <span>Site Accessible:</span>
                  <span className={liveCheck.site_accessible ? 'success' : 'error'}>
                    {liveCheck.site_accessible ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="result-item">
                  <span>Snippet Loading:</span>
                  <span className={liveCheck.snippet_loading ? 'success' : 'error'}>
                    {liveCheck.snippet_loading ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="result-item">
                  <span>Performance Score:</span>
                  <span>{liveCheck.performance_score}/100</span>
                </div>
                <div className="result-item">
                  <span>Features Working:</span>
                  <span>{liveCheck.features_working.join(', ')}</span>
                </div>
              </div>
            )}

            <button 
              onClick={handleFeaturesSubmit}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Enabling Features...' : 'Enable Features'}
            </button>
          </div>
        )}

        {currentStep === 4 && siteReceipt && (
          <div className="step-content">
            <h2>🎉 Onboarding Complete!</h2>
            <p>Your website is now ready for Web4 features.</p>
            
            <div className="site-receipt">
              <h3>Site Receipt</h3>
              <div className="receipt-details">
                <div className="receipt-item">
                  <span>Domain Hash:</span>
                  <span>{siteReceipt.domain_hash}</span>
                </div>
                <div className="receipt-item">
                  <span>Timestamp:</span>
                  <span>{new Date(siteReceipt.timestamp).toLocaleString()}</span>
                </div>
                <div className="receipt-item">
                  <span>Owner DID:</span>
                  <span>{siteReceipt.owner_did}</span>
                </div>
                <div className="receipt-item">
                  <span>Features Enabled:</span>
                  <span>{siteReceipt.features_enabled.join(', ')}</span>
                </div>
                <div className="receipt-item">
                  <span>Verification Status:</span>
                  <span className="success">✅ Verified</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.location.href = '/gallery'}
              className="btn-primary"
            >
              Explore Applets Gallery
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .publisher-onboarding {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .onboarding-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .onboarding-header h1 {
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .onboarding-progress {
          margin-bottom: 40px;
        }

        .progress-bar {
          display: flex;
          justify-content: space-between;
          position: relative;
        }

        .progress-bar::before {
          content: '';
          position: absolute;
          top: 20px;
          left: 0;
          right: 0;
          height: 2px;
          background: #333;
          z-index: 1;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          flex: 1;
        }

        .progress-step.active .step-number {
          background: #00d4ff;
          color: #000;
        }

        .progress-step.completed .step-number {
          background: #00ff88;
          color: #000;
        }

        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #333;
          color: #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .step-info {
          text-align: center;
        }

        .step-info h3 {
          color: #00d4ff;
          margin: 0 0 5px 0;
          font-size: 0.9rem;
        }

        .step-info p {
          color: #ccc;
          margin: 0;
          font-size: 0.8rem;
        }

        .onboarding-content {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 30px;
        }

        .step-content h2 {
          color: #00d4ff;
          margin-bottom: 15px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          color: #00d4ff;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .form-group input, .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #00d4ff;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.3);
          color: white;
        }

        .form-group textarea {
          resize: vertical;
          font-family: monospace;
        }

        .btn-primary, .btn-copy {
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

        .btn-primary:hover:not(:disabled) {
          background: #0099cc;
          color: white;
        }

        .btn-primary:disabled {
          background: #666;
          color: #999;
          cursor: not-allowed;
        }

        .btn-copy {
          background: #ffaa00;
          color: #000;
          margin-top: 10px;
        }

        .verification-success {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid #00ff88;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .verification-success h3 {
          color: #00ff88;
          margin: 0 0 10px 0;
        }

        .snippet-container {
          margin-bottom: 20px;
        }

        .feature-selection {
          margin-bottom: 20px;
        }

        .feature-selection h3 {
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .feature-selection label {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          cursor: pointer;
        }

        .check-results, .live-check-results {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
        }

        .check-results h3, .live-check-results h3 {
          color: #00d4ff;
          margin: 0 0 15px 0;
        }

        .result-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .result-item span:first-child {
          color: #ccc;
        }

        .result-item span:last-child {
          color: #00d4ff;
          font-weight: bold;
        }

        .success {
          color: #00ff88 !important;
        }

        .error {
          color: #ff6666 !important;
        }

        .errors {
          margin-top: 15px;
        }

        .errors h4 {
          color: #ff6666;
          margin-bottom: 10px;
        }

        .errors ul {
          margin: 0;
          padding-left: 20px;
        }

        .errors li {
          color: #ff6666;
        }

        .site-receipt {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid #00ff88;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .site-receipt h3 {
          color: #00ff88;
          margin: 0 0 15px 0;
        }

        .receipt-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .receipt-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        }

        .receipt-item span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .receipt-item span:last-child {
          color: #00ff88;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
};

// Global onboarding manager instance
let globalOnboardingManager: PublisherOnboardingManager | null = null;

export function getPublisherOnboardingManager(): PublisherOnboardingManager {
  if (!globalOnboardingManager) {
    globalOnboardingManager = new PublisherOnboardingManager();
  }
  return globalOnboardingManager;
}

// Convenience exports
export const publisherOnboarding = {
  getSteps: () => getPublisherOnboardingManager().getSteps(),
  getCurrentStep: () => getPublisherOnboardingManager().getCurrentStep(),
  setCurrentStep: (step: number) => getPublisherOnboardingManager().setCurrentStep(step),
  nextStep: () => getPublisherOnboardingManager().nextStep(),
  previousStep: () => getPublisherOnboardingManager().previousStep(),
  verifyDomain: (domain: string) => getPublisherOnboardingManager().verifyDomain(domain),
  generateSnippet: (domain: string, features: string[]) => getPublisherOnboardingManager().generateSnippet(domain, features),
  checkSnippet: (domain: string) => getPublisherOnboardingManager().checkSnippet(domain),
  runLiveCheck: (domain: string) => getPublisherOnboardingManager().runLiveCheck(domain),
  enableFeatures: (features: string[]) => getPublisherOnboardingManager().enableFeatures(features),
  generateSiteReceipt: (domain: string, ownerDid: string) => getPublisherOnboardingManager().generateSiteReceipt(domain, ownerDid),
  getSiteReceipt: () => getPublisherOnboardingManager().getSiteReceipt(),
  isComplete: () => getPublisherOnboardingManager().isComplete(),
  reset: () => getPublisherOnboardingManager().reset()
};
