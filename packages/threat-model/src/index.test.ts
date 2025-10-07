import { describe, it, expect } from 'vitest';
import { ThreatModel, STRIDE, RiskLevel, generateRiskRegister, generateMarkdownReport } from '../src/index';

describe('ThreatModel', () => {
  it('should create threat model with STRIDE categories', () => {
    const model = new ThreatModel('Test Component');
    
    model.addThreat(STRIDE.SPOOFING, {
      id: 'T001',
      title: 'Identity Spoofing',
      description: 'Attacker impersonates legitimate user',
      severity: RiskLevel.HIGH,
      mitigation: 'Multi-factor authentication',
      owner: 'Security Team'
    });
    
    expect(model.getThreats()).toHaveLength(1);
    expect(model.getThreats()[0].category).toBe(STRIDE.SPOOFING);
  });

  it('should generate risk register', () => {
    const model = new ThreatModel('Test Component');
    model.addThreat(STRIDE.SPOOFING, {
      id: 'T001',
      title: 'Identity Spoofing',
      description: 'Attacker impersonates legitimate user',
      severity: RiskLevel.HIGH,
      mitigation: 'Multi-factor authentication',
      owner: 'Security Team'
    });
    
    const register = generateRiskRegister([model]);
    expect(register.components).toHaveLength(1);
    expect(register.totalThreats).toBe(1);
    expect(register.highRiskCount).toBe(1);
  });

  it('should generate markdown report', () => {
    const model = new ThreatModel('Test Component');
    model.addThreat(STRIDE.SPOOFING, {
      id: 'T001',
      title: 'Identity Spoofing',
      description: 'Attacker impersonates legitimate user',
      severity: RiskLevel.HIGH,
      mitigation: 'Multi-factor authentication',
      owner: 'Security Team'
    });
    
    const markdown = generateMarkdownReport([model]);
    expect(markdown).toContain('# Threat Model Report');
    expect(markdown).toContain('Identity Spoofing');
    expect(markdown).toContain('HIGH');
  });
});
