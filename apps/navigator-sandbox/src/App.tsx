import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import OraclePage from './pages/OraclePage';
import WorkspacesPage from './pages/WorkspacesPage';
import RewardsPage from './pages/RewardsPage';
import GraphPage from './pages/GraphPage';
import FundingPage from './pages/FundingPage';
import RedemptionPage from './pages/RedemptionPage';
import StakingPage from './pages/StakingPage';
import { PegBadge } from '@mycelia/ui-components';
import PrivacyPage from './pages/PrivacyPage';
import TimeMachinePage from './pages/TimeMachinePage';
import MediaPage from './pages/MediaPage';
import PublisherPilotPage from './pages/PublisherPilotPage';
import OrgPilotPage from './pages/OrgPilotPage';

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
          <Link to="/redemption">Redemption</Link>
          <Link to="/staking">Staking</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/time-machine">Time Machine</Link>
          <Link to="/media">Media Engine</Link>
          <Link to="/pilot/publisher">Publisher Pilot</Link>
          <Link to="/pilot/org">Org Pilot</Link>
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
              <Route path="/redemption" element={<RedemptionPage />} />
              <Route path="/staking" element={<StakingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/time-machine" element={<TimeMachinePage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="/pilot/publisher" element={<PublisherPilotPage />} />
            <Route path="/pilot/org" element={<OrgPilotPage />} />
              <Route path="/" element={<div className="card myc-muted">Navigate to a demo above</div>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
