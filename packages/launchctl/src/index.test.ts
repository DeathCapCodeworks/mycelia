import { describe, it, expect, beforeEach } from 'vitest';
import { LaunchController, ChecklistItem } from './index';

describe('LaunchController', () => {
  let controller: LaunchController;

  beforeEach(() => {
    controller = new LaunchController();
  });

  it('should create a new instance', () => {
    expect(controller).toBeDefined();
  });

  it('should get T-minus 14 days checklist', () => {
    const checklist = controller.getTMinusChecklist(14);
    
    expect(checklist).toBeDefined();
    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist[0].title).toContain('T-14');
  });

  it('should get T-minus 7 days checklist', () => {
    const checklist = controller.getTMinusChecklist(7);
    
    expect(checklist).toBeDefined();
    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist[0].title).toContain('T-7');
  });

  it('should get T-minus 1 day checklist', () => {
    const checklist = controller.getTMinusChecklist(1);
    
    expect(checklist).toBeDefined();
    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist[0].title).toContain('T-1');
  });

  it('should run go gate verification', async () => {
    const result = await controller.runGoGate();
    
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.checks).toBeDefined();
  });

  it('should pause redemption', async () => {
    const result = await controller.pauseRedemption();
    
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it('should resume redemption', async () => {
    const result = await controller.resumeRedemption();
    
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });
});
