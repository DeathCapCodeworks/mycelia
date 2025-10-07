import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import OraclePage from './pages/OraclePage';
import WorkspacesPage from './pages/WorkspacesPage';
import RewardsPage from './pages/RewardsPage';
import GraphPage from './pages/GraphPage';
import FundingPage from './pages/FundingPage';
import { PegBadge } from '@mycelia/ui-components';

function App() {
  return (
    <Router>
      <div className="myc-shell">
        <nav className="myc-nav">
          <Link to="/oracle">Oracle</Link>
          <Link to="/workspaces">Workspaces</Link>
          <Link to="/rewards">Rewards</Link>
          <Link to="/graph">Social Graph</Link>
          <Link to="/funding">Funding</Link>
        </nav>
        <main className="myc-main">
          <div className="myc-grid">
            <div className="page-header">
              <PegBadge />
            </div>
            <Routes>
              <Route path="/oracle" element={<OraclePage />} />
              <Route path="/workspaces" element={<WorkspacesPage />} />
              <Route path="/rewards" element={<RewardsPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/funding" element={<FundingPage />} />
              <Route path="/" element={<div className="card myc-muted">Navigate to a demo above</div>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
