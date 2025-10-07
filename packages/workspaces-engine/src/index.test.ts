import { describe, it, expect } from 'vitest';
import { define, rule, dispatch, current } from './index';

describe('workspaces-engine', () => {
  it('activates layout based on time window with priority', () => {
    define('Work', { widgets: [] });
    define('Home', { widgets: [] });
    rule({ type: 'time', match: ['09:00', '17:00'], priority: 1 }, [{ type: 'activate', name: 'Work' }]);
    rule({ type: 'time', match: ['17:01', '23:00'], priority: 1 }, [{ type: 'activate', name: 'Home' }]);
    dispatch('time', '10:00');
    expect(current()).toBe('Work');
  });
});

