import React, { useState, useEffect } from 'react';
import { define, rule, dispatch, current } from '@mycelia/workspaces-engine';
import { WorkspaceSwitcher } from '@mycelia/ui-components';

export default function WorkspacesPage() {
  const [active, setActive] = useState(current());

  useEffect(() => {
    define('Work', { widgets: [{ id: 'email', x: 0, y: 0, w: 4, h: 2 }] });
    define('Home', { widgets: [{ id: 'media', x: 0, y: 0, w: 6, h: 3 }] });
    define('Dev', { widgets: [{ id: 'terminal', x: 0, y: 0, w: 8, h: 4 }] });
    
    rule({ type: 'time', match: ['09:00', '17:00'], priority: 1 }, [{ type: 'activate', name: 'Work' }]);
    rule({ type: 'time', match: ['17:01', '23:00'], priority: 1 }, [{ type: 'activate', name: 'Home' }]);
    rule({ type: 'process', match: 'Code.exe', priority: 2 }, [{ type: 'activate', name: 'Dev' }]);
  }, []);

  const handleTimeChange = (time: string) => {
    dispatch('time', time);
    setActive(current());
  };

  const handleProcessChange = (process: string) => {
    dispatch('process', process);
    setActive(current());
  };

  return (
    <div>
      <h1>Context Aware Workspaces Demo</h1>
      <p>Rule based layouts that react to time, location, network, and foreground app.</p>
      
      <div style={{ margin: '1rem 0' }}>
        <label>Time: </label>
        <input type="time" onChange={(e) => handleTimeChange(e.target.value)} />
      </div>
      
      <div style={{ margin: '1rem 0' }}>
        <label>Active Process: </label>
        <select onChange={(e) => handleProcessChange(e.target.value)}>
          <option value="">None</option>
          <option value="Code.exe">VS Code</option>
          <option value="chrome.exe">Chrome</option>
        </select>
      </div>
      
      <div style={{ margin: '1rem 0' }}>
        <WorkspaceSwitcher value={active} onChange={setActive} />
      </div>
      
      <div style={{ padding: '1rem', border: '1px solid #333', marginTop: '1rem' }}>
        Active workspace: <strong>{active || 'None'}</strong>
      </div>
    </div>
  );
}
