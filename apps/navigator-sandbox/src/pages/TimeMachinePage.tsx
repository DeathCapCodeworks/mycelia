import React from 'react';
import { saveSnapshot, listSnapshots, restoreSnapshot, deleteSnapshot } from '@mycelia/workspaces-engine';

export default function TimeMachinePage() {
  const [name, setName] = React.useState('session');
  const [snaps, setSnaps] = React.useState(listSnapshots());

  const doSave = () => {
    saveSnapshot(name, {
      tabs: [{ id: 't1', url: '/oracle' }, { id: 't2', url: '/graph' }],
      scrollPositions: { '/oracle': 120, '/graph': 0 },
      formStates: { note: 'demo form content' },
      walletContext: { address: 'demo', chain: 'evm' }
    });
    setSnaps(listSnapshots());
  };

  const doRestore = (n: string) => {
    const s = restoreSnapshot(n);
    if (s) alert(`Restored ${n}: tabs=${s.tabs.length}, scroll=/oracle=>${s.scrollPositions['/oracle'] ?? 0}`);
  };

  const doDelete = (n: string) => { deleteSnapshot(n); setSnaps(listSnapshots()); };

  return (
    <div className="card">
      <h2>Session Time Machine</h2>
      <p className="myc-muted">Save and restore workspace snapshots (tabs, scroll positions, and optional form state). Secrets are never saved.</p>
      <div className="row">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="snapshot name" />
        <button onClick={doSave}>Save Snapshot</button>
      </div>
      <div className="list">
        {snaps.map(s => (
          <div key={s.name} className="list-row">
            <div><strong>{s.name}</strong> · {new Date(s.createdAt).toLocaleString()}</div>
            <div className="row">
              <button onClick={() => doRestore(s.name)}>Restore</button>
              <button onClick={() => doDelete(s.name)}>Delete</button>
            </div>
          </div>
        ))}
        {snaps.length === 0 && <div className="myc-muted">No snapshots yet</div>}
      </div>
    </div>
  );
}
