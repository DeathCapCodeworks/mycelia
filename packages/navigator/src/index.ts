import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';
import { statusHandler } from './routes/status.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// Initialize feature flags
featureFlags.initialize();

// Routes
app.get('/status.json', statusHandler);

// Assets route for NFT envelope creation
app.get('/assets', (req, res) => {
  if (!featureFlags.isFlagEnabled('nft_envelopes')) {
    return res.status(503).send('NFT Envelopes feature is not enabled.');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mycelia Assets</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #1a1a1a; color: #eee; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #00d4ff; }
        .feature-disabled { background: #ff6666; color: #1a1a1a; padding: 1rem; border-radius: 4px; text-align: center; font-weight: bold; }
        .upload-area { border: 2px dashed #555; padding: 2rem; text-align: center; margin: 1rem 0; border-radius: 8px; }
        .upload-area:hover { border-color: #00d4ff; }
        input, select, button { padding: 0.75rem; margin: 0.5rem; background: #333; border: 1px solid #555; border-radius: 4px; color: #eee; }
        button { background: #00d4ff; color: #1a1a1a; border: none; cursor: pointer; font-weight: bold; }
        button:hover { background: #00b3e6; }
        .preview { margin-top: 1rem; padding: 1rem; background: #222; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Mycelia Assets</h1>
        <p>Create and manage NFT envelopes for your digital assets.</p>
        
        <div class="upload-area">
          <h3>Upload Files</h3>
          <input type="file" id="fileInput" multiple accept="image/*,video/*,audio/*,application/*">
          <p>Select files to create an NFT envelope</p>
        </div>
        
        <div>
          <h3>Envelope Settings</h3>
          <input type="text" id="title" placeholder="Title" value="My Asset">
          <input type="text" id="description" placeholder="Description" value="A digital asset">
          <select id="license">
            <option value="Original">Original</option>
            <option value="CC">Creative Commons</option>
            <option value="Licensed">Licensed</option>
          </select>
          <input type="text" id="regions" placeholder="Regions (e.g., US,EU)">
          <label>
            <input type="checkbox" id="public" checked> Make Public (indexable)
          </label>
        </div>
        
        <button onclick="createEnvelope()">Create Envelope</button>
        
        <div id="preview" class="preview" style="display: none;">
          <h3>Preview</h3>
          <div id="previewContent"></div>
        </div>
        
        <div id="result" style="margin-top: 1rem;"></div>
      </div>
      
      <script>
        async function createEnvelope() {
          const files = document.getElementById('fileInput').files;
          if (files.length === 0) {
            alert('Please select files to upload');
            return;
          }
          
          const title = document.getElementById('title').value;
          const description = document.getElementById('description').value;
          const license = document.getElementById('license').value;
          const regions = document.getElementById('regions').value.split(',').map(r => r.trim()).filter(r => r);
          const isPublic = document.getElementById('public').checked;
          
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = '<p>Creating envelope...</p>';
          
          try {
            // Mock envelope creation
            const envelope = {
              meta: {
                title,
                description,
                mediaTypes: Array.from(files).map(f => f.type),
                license,
                regions: regions.length > 0 ? regions : undefined,
                indexable: isPublic
              },
              cids: Array.from(files).map(() => 'bafybeih' + Math.random().toString(36).substring(2, 15)),
              encrypted: !isPublic,
              envelopeCid: 'bafybeih' + Math.random().toString(36).substring(2, 15)
            };
            
            resultDiv.innerHTML = \`
              <h3>Envelope Created Successfully!</h3>
              <p><strong>Envelope CID:</strong> \${envelope.envelopeCid}</p>
              <p><strong>Type:</strong> \${envelope.encrypted ? 'Private (Encrypted)' : 'Public'}</p>
              <p><strong>Files:</strong> \${files.length}</p>
              <p><strong>Indexable:</strong> \${envelope.meta.indexable ? 'Yes' : 'No'}</p>
              \${envelope.meta.indexable ? '<p><em>This envelope can be listed in the public directory.</em></p>' : ''}
            \`;
            
            // Show preview
            const previewDiv = document.getElementById('preview');
            const previewContent = document.getElementById('previewContent');
            previewDiv.style.display = 'block';
            previewContent.innerHTML = \`
              <p><strong>Title:</strong> \${envelope.meta.title}</p>
              <p><strong>Description:</strong> \${envelope.meta.description}</p>
              <p><strong>License:</strong> \${envelope.meta.license}</p>
              \${envelope.meta.regions ? \`<p><strong>Regions:</strong> \${envelope.meta.regions.join(', ')}</p>\` : ''}
              <p><strong>Media Types:</strong> \${envelope.meta.mediaTypes.join(', ')}</p>
            \`;
            
          } catch (error) {
            resultDiv.innerHTML = \`<p style="color: #ff6666;">Error: \${error.message}</p>\`;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Explore route for public directory browsing
app.get('/explore', (req, res) => {
  if (!featureFlags.isFlagEnabled('public_directory')) {
    return res.status(503).send('Public Directory feature is not enabled.');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mycelia Explore</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #1a1a1a; color: #eee; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: #00d4ff; }
        .feature-disabled { background: #ff6666; color: #1a1a1a; padding: 1rem; border-radius: 4px; text-align: center; font-weight: bold; }
        .filters { background: #222; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
        .filters input, .filters select { padding: 0.5rem; margin: 0.25rem; background: #333; border: 1px solid #555; border-radius: 4px; color: #eee; }
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin: 1rem 0; }
        .asset-card { background: #222; border: 1px solid #444; border-radius: 8px; padding: 1rem; }
        .asset-card h3 { color: #00ff88; margin-top: 0; }
        .asset-card p { color: #ccc; margin: 0.5rem 0; }
        .asset-card .meta { font-size: 0.85rem; color: #888; }
        button { background: #00d4ff; color: #1a1a1a; border: none; padding: 0.75rem 1.5rem; border-radius: 25px; cursor: pointer; font-weight: bold; }
        button:hover { background: #00b3e6; }
        .loading { text-align: center; padding: 2rem; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Mycelia Explore</h1>
        <p>Browse and discover public NFT envelopes.</p>
        
        <div class="filters">
          <h3>Filters</h3>
          <input type="text" id="searchQuery" placeholder="Search titles and descriptions">
          <select id="licenseFilter">
            <option value="">All Licenses</option>
            <option value="Original">Original</option>
            <option value="CC">Creative Commons</option>
            <option value="Licensed">Licensed</option>
          </select>
          <input type="text" id="regionFilter" placeholder="Region (e.g., US, EU)">
          <button onclick="searchAssets()">Search</button>
          <button onclick="loadAssets()">Load All</button>
        </div>
        
        <div id="assets" class="asset-grid">
          <div class="loading">Loading assets...</div>
        </div>
      </div>
      
      <script>
        async function loadAssets() {
          const assetsDiv = document.getElementById('assets');
          assetsDiv.innerHTML = '<div class="loading">Loading assets...</div>';
          
          try {
            // Mock public directory API call
            const mockAssets = [
              {
                envelopeCid: 'bafybeih123456789',
                meta: {
                  title: 'Digital Art Collection #1',
                  description: 'A collection of generative digital art pieces',
                  mediaTypes: ['image/png', 'image/jpeg'],
                  license: 'CC',
                  regions: ['US', 'EU']
                },
                ownerDid: 'did:mycelia:artist123',
                indexedAt: Date.now() - 86400000
              },
              {
                envelopeCid: 'bafybeih987654321',
                meta: {
                  title: 'Music Track Demo',
                  description: 'A sample music track for demonstration',
                  mediaTypes: ['audio/mp3'],
                  license: 'Original',
                  regions: ['US']
                },
                ownerDid: 'did:mycelia:musician456',
                indexedAt: Date.now() - 172800000
              },
              {
                envelopeCid: 'bafybeih555666777',
                meta: {
                  title: 'Video Tutorial',
                  description: 'Educational video content',
                  mediaTypes: ['video/mp4'],
                  license: 'Licensed',
                  regions: ['US', 'EU', 'APAC']
                },
                ownerDid: 'did:mycelia:educator789',
                indexedAt: Date.now() - 259200000
              }
            ];
            
            displayAssets(mockAssets);
            
          } catch (error) {
            assetsDiv.innerHTML = \`<div style="color: #ff6666;">Error loading assets: \${error.message}</div>\`;
          }
        }
        
        function displayAssets(assets) {
          const assetsDiv = document.getElementById('assets');
          
          if (assets.length === 0) {
            assetsDiv.innerHTML = '<div class="loading">No assets found matching your criteria.</div>';
            return;
          }
          
          assetsDiv.innerHTML = assets.map(asset => \`
            <div class="asset-card">
              <h3>\${asset.meta.title}</h3>
              <p>\${asset.meta.description}</p>
              <div class="meta">
                <p><strong>License:</strong> \${asset.meta.license}</p>
                <p><strong>Media Types:</strong> \${asset.meta.mediaTypes.join(', ')}</p>
                \${asset.meta.regions ? \`<p><strong>Regions:</strong> \${asset.meta.regions.join(', ')}</p>\` : ''}
                <p><strong>Owner:</strong> \${asset.ownerDid}</p>
                <p><strong>Indexed:</strong> \${new Date(asset.indexedAt).toLocaleDateString()}</p>
                <p><strong>CID:</strong> \${asset.envelopeCid}</p>
              </div>
              <button onclick="viewAsset('\${asset.envelopeCid}')">View Asset</button>
            </div>
          \`).join('');
        }
        
        function searchAssets() {
          const query = document.getElementById('searchQuery').value;
          const license = document.getElementById('licenseFilter').value;
          const region = document.getElementById('regionFilter').value;
          
          // Mock search - in real implementation, this would call the public directory API
          console.log('Searching with:', { query, license, region });
          loadAssets(); // For now, just reload all assets
        }
        
        function viewAsset(envelopeCid) {
          alert(\`Viewing asset: \${envelopeCid}\\n\\nIn a real implementation, this would open the asset viewer with decryption capabilities.\`);
        }
        
        // Load assets on page load
        loadAssets();
      </script>
    </body>
    </html>
  `);
});

// Radio route
app.get('/radio', (req, res) => {
  if (!featureFlags.isFlagEnabled('radio_v0')) {
    return res.status(503).send('Radio v0 feature is not enabled.');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mycelia Radio v0</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #1a1a1a; color: #eee; }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { color: #00d4ff; }
        .feature-disabled { background: #ff6666; color: #1a1a1a; padding: 1rem; border-radius: 4px; text-align: center; font-weight: bold; }
        .room-management, .track-management, .performance-section, .payouts-meter { margin-bottom: 2rem; }
        input[type="text"], select { padding: 0.75rem; margin-right: 10px; background: #333; border: 1px solid #555; border-radius: 4px; color: #eee; width: 200px; }
        button { background: #00d4ff; color: #1a1a1a; border: none; padding: 0.75rem 1.5rem; border-radius: 25px; cursor: pointer; font-weight: bold; }
        button:hover:not(:disabled) { background: #00b3e6; }
        button:disabled { background: #555; cursor: not-allowed; }
        .create-room, .add-track { display: flex; gap: 10px; margin-bottom: 1.5rem; align-items: center; }
        .current-room-info { background: #222; border: 1px solid #444; border-radius: 4px; padding: 1rem; }
        ul { list-style: none; padding: 0; }
        li { background: #222; border: 1px solid #444; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; color: #ccc; }
        .payouts-meter { background: rgba(0, 255, 136, 0.1); border: 1px solid #00ff88; border-radius: 8px; padding: 1.5rem; }
        .payouts-meter ul li { background: rgba(0, 0, 0, 0.3); border-color: rgba(0, 255, 136, 0.2); color: #00ff88; font-weight: bold; }
        .payouts-note { font-size: 0.8rem; color: #ffaa00; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Mycelia Radio v0</h1>
        
        <div class="room-management">
          <h2>Room Management</h2>
          <div class="create-room">
            <input type="text" id="roomName" placeholder="Room Name" value="My Radio Room">
            <select id="roomRights">
              <option value="Original">Original</option>
              <option value="CC">Creative Commons</option>
              <option value="Licensed">Licensed (External)</option>
            </select>
            <button onclick="createRoom()">Create Room</button>
          </div>
          <div id="currentRoom" style="display: none;">
            <div class="current-room-info">
              <h3 id="roomTitle">Current Room</h3>
              <p id="roomDetails"></p>
              <button onclick="leaveRoom()">Leave Room</button>
            </div>
          </div>
        </div>
        
        <div id="trackManagement" style="display: none;">
          <div class="track-management">
            <h2>Tracks & Queue</h2>
            <div class="add-track">
              <input type="text" id="trackCid" placeholder="Track CID or Live Capture">
              <button onclick="addTrack()">Add Track</button>
            </div>
            
            <h3>Active Tracks</h3>
            <ul id="activeTracks">
              <li>No active tracks.</li>
            </ul>
            
            <h3>Moderated Queue</h3>
            <ul id="moderatedQueue">
              <li>Queue is empty.</li>
            </ul>
          </div>
          
          <div class="performance-section">
            <h2>Performance & Seeding</h2>
            <p>End-to-end Latency: <span id="latency">Measuring...</span></p>
            <label>
              <input type="checkbox" id="bandwidthShare"> Share Bandwidth (via libp2p)
            </label>
            <p class="bandwidth-hint">Contribute to the network by sharing your unused bandwidth.</p>
          </div>
          
          <div id="payoutsMeter" class="payouts-meter" style="display: none;">
            <h2>Provisional Payouts Meter (Demo)</h2>
            <p>Estimated BLOOM distribution based on contributions:</p>
            <ul id="payoutsList">
              <li>No provisional payouts yet.</li>
            </ul>
            <p class="payouts-note">
              Note: These are provisional calculations for demo purposes. Mainnet payouts are subject to governance approval.
            </p>
          </div>
        </div>
      </div>
      
      <script>
        let currentRoom = null;
        let latency = null;
        let isSharingBandwidth = false;
        
        // Mock latency measurement
        setInterval(() => {
          latency = Math.floor(Math.random() * 150) + 50; // 50-200ms
          document.getElementById('latency').textContent = \`\${latency} ms\`;
        }, 2000);
        
        function createRoom() {
          const roomName = document.getElementById('roomName').value;
          const roomRights = document.getElementById('roomRights').value;
          
          if (!roomName) {
            alert('Please enter a room name');
            return;
          }
          
          // Mock room creation
          currentRoom = {
            roomId: 'room-' + Math.random().toString(36).substring(2, 9),
            name: roomName,
            rights: roomRights,
            ownerDid: 'did:mycelia:user123'
          };
          
          document.getElementById('currentRoom').style.display = 'block';
          document.getElementById('trackManagement').style.display = 'block';
          document.getElementById('roomTitle').textContent = \`Current Room: \${currentRoom.name} (\${currentRoom.roomId})\`;
          document.getElementById('roomDetails').innerHTML = \`
            Rights: \${currentRoom.rights}<br>
            Owner: \${currentRoom.ownerDid}
          \`;
          
          // Show payouts meter if demo is enabled
          if (Math.random() > 0.5) { // Mock feature flag check
            document.getElementById('payoutsMeter').style.display = 'block';
            updatePayouts();
          }
        }
        
        function leaveRoom() {
          currentRoom = null;
          document.getElementById('currentRoom').style.display = 'none';
          document.getElementById('trackManagement').style.display = 'none';
          document.getElementById('payoutsMeter').style.display = 'none';
        }
        
        function addTrack() {
          const trackCid = document.getElementById('trackCid').value;
          
          if (!trackCid) {
            alert('Please enter a track CID');
            return;
          }
          
          // Mock track addition
          const activeTracks = document.getElementById('activeTracks');
          const li = document.createElement('li');
          li.textContent = \`\${trackCid} (Contributor: \${currentRoom.ownerDid})\`;
          activeTracks.appendChild(li);
          
          document.getElementById('trackCid').value = '';
          
          // Update payouts
          updatePayouts();
        }
        
        function updatePayouts() {
          const payoutsList = document.getElementById('payoutsList');
          const mockPayouts = [
            { did: 'did:mycelia:user123', bloomAmount: 0.1234 },
            { did: 'did:mycelia:seeder456', bloomAmount: 0.0567 }
          ];
          
          payoutsList.innerHTML = mockPayouts.map(payout => 
            \`<li>\${payout.did}: \${payout.bloomAmount.toFixed(4)} BLOOM</li>\`
          ).join('');
        }
        
        // Bandwidth sharing toggle
        document.getElementById('bandwidthShare').addEventListener('change', function() {
          isSharingBandwidth = this.checked;
          console.log(\`Bandwidth sharing \${isSharingBandwidth ? 'enabled' : 'disabled'}\`);
        });
      </script>
    </body>
    </html>
  `);
});

// ETH route
app.get('/eth', (req, res) => {
  if (!featureFlags.isFlagEnabled('evm_provider')) {
    return res.status(503).send('EVM Provider feature is not enabled.');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mycelia ETH Rails</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #1a1a1a; color: #eee; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: #00d4ff; }
        .tabs { display: flex; gap: 10px; margin-bottom: 2rem; }
        .tab { padding: 0.75rem 1.5rem; background: #333; border: 1px solid #555; border-radius: 4px; cursor: pointer; }
        .tab.active { background: #00d4ff; color: #1a1a1a; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .section { background: #222; border: 1px solid #444; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
        input, select, button { padding: 0.75rem; margin: 0.5rem; background: #333; border: 1px solid #555; border-radius: 4px; color: #eee; }
        button { background: #00d4ff; color: #1a1a1a; border: none; cursor: pointer; font-weight: bold; }
        button:hover { background: #00b3e6; }
        .status { padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0; }
        .status.connected { background: rgba(0, 255, 136, 0.2); border: 1px solid #00ff88; color: #00ff88; }
        .status.disconnected { background: rgba(255, 102, 102, 0.2); border: 1px solid #ff6666; color: #ff6666; }
        .preflight { background: #333; border: 1px solid #555; border-radius: 4px; padding: 1rem; margin: 1rem 0; }
        .preflight h4 { color: #00ff88; margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Mycelia ETH Rails</h1>
        <p>Ethereum-compatible blockchain integration with Account Abstraction and Paymasters.</p>
        
        <div class="tabs">
          <div class="tab active" onclick="showTab('wallet')">Wallet</div>
          <div class="tab" onclick="showTab('networks')">Networks</div>
          <div class="tab" onclick="showTab('ens')">ENS</div>
          <div class="tab" onclick="showTab('bridge')">Bridge</div>
          <div class="tab" onclick="showTab('allowances')">Allowances</div>
          <div class="tab" onclick="showTab('devtools')">Dev Tools</div>
        </div>
        
        <div id="wallet" class="tab-content active">
          <div class="section">
            <h3>Wallet Status</h3>
            <div id="walletStatus" class="status disconnected">Not Connected</div>
            <button onclick="connectWallet()">Connect Wallet</button>
            <button onclick="createSmartAccount()" disabled>Create Smart Account</button>
          </div>
          
          <div class="section">
            <h3>Account Abstraction</h3>
            <p>ERC-4337 Smart Account functionality</p>
            <div id="aaStatus" class="status disconnected">Account Abstraction Disabled</div>
            <button onclick="enableAA()" disabled>Enable Account Abstraction</button>
          </div>
        </div>
        
        <div id="networks" class="tab-content">
          <div class="section">
            <h3>Supported Networks</h3>
            <ul>
              <li>Ethereum Mainnet</li>
              <li>Polygon</li>
              <li>Arbitrum</li>
              <li>Optimism</li>
              <li>Base</li>
            </ul>
            <select id="networkSelect">
              <option value="ethereum">Ethereum Mainnet</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
            </select>
            <button onclick="switchNetwork()">Switch Network</button>
          </div>
        </div>
        
        <div id="ens" class="tab-content">
          <div class="section">
            <h3>ENS Integration</h3>
            <input type="text" id="ensName" placeholder="Enter ENS name (e.g., alice.eth)">
            <button onclick="resolveENS()">Resolve ENS</button>
            <div id="ensResult"></div>
          </div>
        </div>
        
        <div id="bridge" class="tab-content">
          <div class="section">
            <h3>Cross-Chain Bridge</h3>
            <p>Bridge assets between supported networks</p>
            <input type="number" id="bridgeAmount" placeholder="Amount" value="0.1">
            <select id="bridgeFrom">
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
            </select>
            <select id="bridgeTo">
              <option value="polygon">Polygon</option>
              <option value="ethereum">Ethereum</option>
            </select>
            <button onclick="initiateBridge()">Initiate Bridge</button>
          </div>
        </div>
        
        <div id="allowances" class="tab-content">
          <div class="section">
            <h3>Token Allowances</h3>
            <p>Manage token spending allowances</p>
            <input type="text" id="tokenAddress" placeholder="Token Contract Address">
            <input type="text" id="spenderAddress" placeholder="Spender Address">
            <input type="number" id="allowanceAmount" placeholder="Allowance Amount" value="0">
            <button onclick="setAllowance()">Set Allowance</button>
            <div id="allowanceResult"></div>
          </div>
        </div>
        
        <div id="devtools" class="tab-content">
          <div class="section">
            <h3>Transaction Preflight</h3>
            <textarea id="txData" placeholder="Transaction data (hex)" rows="4" style="width: 100%; background: #333; border: 1px solid #555; border-radius: 4px; color: #eee; padding: 0.75rem;"></textarea>
            <button onclick="simulateTransaction()">Simulate Transaction</button>
            <div id="preflightResult" class="preflight" style="display: none;">
              <h4>Preflight Analysis</h4>
              <div id="preflightContent"></div>
            </div>
          </div>
          
          <div class="section">
            <h3>Paymaster Status</h3>
            <div id="paymasterStatus" class="status disconnected">Paymaster Disabled</div>
            <button onclick="enablePaymaster()" disabled>Enable Paymaster</button>
          </div>
        </div>
      </div>
      
      <script>
        let isWalletConnected = false;
        let isAAEnabled = false;
        let isPaymasterEnabled = false;
        
        function showTab(tabName) {
          // Hide all tab contents
          document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
          });
          
          // Remove active class from all tabs
          document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Show selected tab content
          document.getElementById(tabName).classList.add('active');
          
          // Add active class to clicked tab
          event.target.classList.add('active');
        }
        
        function connectWallet() {
          // Mock wallet connection
          setTimeout(() => {
            isWalletConnected = true;
            document.getElementById('walletStatus').textContent = 'Connected';
            document.getElementById('walletStatus').className = 'status connected';
            document.querySelector('button[onclick="createSmartAccount()"]').disabled = false;
            document.querySelector('button[onclick="enableAA()"]').disabled = false;
          }, 1000);
        }
        
        function createSmartAccount() {
          if (!isWalletConnected) {
            alert('Please connect wallet first');
            return;
          }
          
          // Mock smart account creation
          alert('Smart Account created successfully!\\n\\nIn a real implementation, this would create an ERC-4337 smart account.');
        }
        
        function enableAA() {
          if (!isWalletConnected) {
            alert('Please connect wallet first');
            return;
          }
          
          isAAEnabled = true;
          document.getElementById('aaStatus').textContent = 'Account Abstraction Enabled';
          document.getElementById('aaStatus').className = 'status connected';
          document.querySelector('button[onclick="enablePaymaster()"]').disabled = false;
        }
        
        function switchNetwork() {
          const network = document.getElementById('networkSelect').value;
          alert(\`Switching to \${network} network...\\n\\nIn a real implementation, this would switch the connected network.\`);
        }
        
        function resolveENS() {
          const ensName = document.getElementById('ensName').value;
          if (!ensName) {
            alert('Please enter an ENS name');
            return;
          }
          
          // Mock ENS resolution
          document.getElementById('ensResult').innerHTML = \`
            <p><strong>ENS Name:</strong> \${ensName}</p>
            <p><strong>Address:</strong> 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6</p>
            <p><strong>Resolver:</strong> Public Resolver</p>
          \`;
        }
        
        function initiateBridge() {
          const amount = document.getElementById('bridgeAmount').value;
          const from = document.getElementById('bridgeFrom').value;
          const to = document.getElementById('bridgeTo').value;
          
          alert(\`Initiating bridge of \${amount} ETH from \${from} to \${to}...\\n\\nIn a real implementation, this would initiate the cross-chain bridge.\`);
        }
        
        function setAllowance() {
          const tokenAddress = document.getElementById('tokenAddress').value;
          const spenderAddress = document.getElementById('spenderAddress').value;
          const amount = document.getElementById('allowanceAmount').value;
          
          if (!tokenAddress || !spenderAddress) {
            alert('Please fill in all fields');
            return;
          }
          
          document.getElementById('allowanceResult').innerHTML = \`
            <p><strong>Token:</strong> \${tokenAddress}</p>
            <p><strong>Spender:</strong> \${spenderAddress}</p>
            <p><strong>Allowance:</strong> \${amount}</p>
            <p><em>Allowance set successfully!</em></p>
          \`;
        }
        
        function simulateTransaction() {
          const txData = document.getElementById('txData').value;
          
          if (!txData) {
            alert('Please enter transaction data');
            return;
          }
          
          // Mock transaction simulation
          document.getElementById('preflightResult').style.display = 'block';
          document.getElementById('preflightContent').innerHTML = \`
            <p><strong>Transaction Type:</strong> ERC-20 Transfer</p>
            <p><strong>From:</strong> 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6</p>
            <p><strong>To:</strong> 0x8ba1f109551bD432803012645Hac136c</p>
            <p><strong>Amount:</strong> 100.0 USDC</p>
            <p><strong>Gas Estimate:</strong> 65,000</p>
            <p><strong>Gas Price:</strong> 20 Gwei</p>
            <p><strong>Total Cost:</strong> 0.0013 ETH</p>
            <p><strong>Status:</strong> <span style="color: #00ff88;">✓ Safe to execute</span></p>
          \`;
        }
        
        function enablePaymaster() {
          if (!isAAEnabled) {
            alert('Please enable Account Abstraction first');
            return;
          }
          
          isPaymasterEnabled = true;
          document.getElementById('paymasterStatus').textContent = 'Paymaster Enabled';
          document.getElementById('paymasterStatus').className = 'status connected';
        }
      </script>
    </body>
    </html>
  `);
});

// Presence route
app.get('/presence', (req, res) => {
  if (!featureFlags.isFlagEnabled('presence_v0')) {
    return res.status(503).send('Presence v0 feature is not enabled.');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mycelia Presence v0</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #1a1a1a; color: #eee; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #00d4ff; }
        .section { background: #222; border: 1px solid #444; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
        .status { padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0; }
        .status.active { background: rgba(0, 255, 136, 0.2); border: 1px solid #00ff88; color: #00ff88; }
        .status.inactive { background: rgba(255, 102, 102, 0.2); border: 1px solid #ff6666; color: #ff6666; }
        button { background: #00d4ff; color: #1a1a1a; border: none; padding: 0.75rem 1.5rem; border-radius: 25px; cursor: pointer; font-weight: bold; margin: 0.5rem; }
        button:hover { background: #00b3e6; }
        button:disabled { background: #555; cursor: not-allowed; }
        .presence-indicator { position: fixed; top: 20px; right: 20px; background: #222; border: 1px solid #444; border-radius: 8px; padding: 1rem; }
        .presence-count { font-size: 1.2rem; font-weight: bold; color: #00ff88; }
        .ghost-mode { background: rgba(255, 170, 0, 0.2); border: 1px solid #ffaa00; color: #ffaa00; }
        input[type="text"] { padding: 0.75rem; margin: 0.5rem; background: #333; border: 1px solid #555; border-radius: 4px; color: #eee; width: 300px; }
        .privacy-note { font-size: 0.85rem; color: #888; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Mycelia Presence v0</h1>
        <p>Opt-in ephemeral presence sharing with privacy controls.</p>
        
        <div class="section">
          <h3>Presence Status</h3>
          <div id="presenceStatus" class="status inactive">Presence Disabled</div>
          <div id="ghostModeStatus" class="status inactive">Ghost Mode: Off</div>
          
          <div>
            <input type="text" id="originInput" placeholder="Enter origin (e.g., https://example.com)" value="https://example.com">
            <button onclick="joinPresence()">Join Presence</button>
            <button onclick="leavePresence()" disabled>Leave Presence</button>
          </div>
          
          <div>
            <button onclick="toggleGhostMode()">Toggle Ghost Mode</button>
            <button onclick="getPresenceCount()">Get Count</button>
          </div>
          
          <div id="presenceInfo"></div>
        </div>
        
        <div class="section">
          <h3>Privacy Controls</h3>
          <p>Presence is <strong>off by default</strong> and requires explicit opt-in per site.</p>
          <p>Ghost Mode provides a hard off switch for all presence features.</p>
          <p>Only presence counts are exposed, never individual user lists.</p>
          
          <div class="privacy-note">
            <h4>Privacy Features:</h4>
            <ul>
              <li>Ephemeral DIDs rotated every 5 minutes</li>
              <li>Origin-scoped presence (no cross-site tracking)</li>
              <li>No raw presence list exposure</li>
              <li>Hard off switch with Ghost Mode</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div id="presenceIndicator" class="presence-indicator" style="display: none;">
        <div class="presence-count" id="presenceCount">0 here</div>
        <div style="font-size: 0.8rem; color: #888;">Click to manage</div>
      </div>
      
      <script>
        let isPresenceActive = false;
        let isGhostMode = false;
        let currentOrigin = null;
        let presenceCount = 0;
        
        function joinPresence() {
          if (isGhostMode) {
            alert('Cannot join presence while Ghost Mode is active');
            return;
          }
          
          const origin = document.getElementById('originInput').value;
          if (!origin) {
            alert('Please enter an origin');
            return;
          }
          
          // Mock presence joining
          setTimeout(() => {
            isPresenceActive = true;
            currentOrigin = origin;
            presenceCount = Math.floor(Math.random() * 10) + 1;
            
            document.getElementById('presenceStatus').textContent = \`Presence Active for \${origin}\`;
            document.getElementById('presenceStatus').className = 'status active';
            document.querySelector('button[onclick="joinPresence()"]').disabled = true;
            document.querySelector('button[onclick="leavePresence()"]').disabled = false;
            
            document.getElementById('presenceIndicator').style.display = 'block';
            document.getElementById('presenceCount').textContent = \`\${presenceCount} here\`;
            
            document.getElementById('presenceInfo').innerHTML = \`
              <p><strong>Current Origin:</strong> \${origin}</p>
              <p><strong>Presence Count:</strong> \${presenceCount}</p>
              <p><strong>DID:</strong> did:mycelia:ephemeral-\${Date.now()}</p>
            \`;
          }, 1000);
        }
        
        function leavePresence() {
          isPresenceActive = false;
          currentOrigin = null;
          presenceCount = 0;
          
          document.getElementById('presenceStatus').textContent = 'Presence Disabled';
          document.getElementById('presenceStatus').className = 'status inactive';
          document.querySelector('button[onclick="joinPresence()"]').disabled = false;
          document.querySelector('button[onclick="leavePresence()"]').disabled = true;
          
          document.getElementById('presenceIndicator').style.display = 'none';
          document.getElementById('presenceInfo').innerHTML = '';
        }
        
        function toggleGhostMode() {
          isGhostMode = !isGhostMode;
          
          if (isGhostMode) {
            document.getElementById('ghostModeStatus').textContent = 'Ghost Mode: On';
            document.getElementById('ghostModeStatus').className = 'status ghost-mode';
            
            if (isPresenceActive) {
              leavePresence();
            }
            
            document.querySelector('button[onclick="joinPresence()"]').disabled = true;
          } else {
            document.getElementById('ghostModeStatus').textContent = 'Ghost Mode: Off';
            document.getElementById('ghostModeStatus').className = 'status inactive';
            document.querySelector('button[onclick="joinPresence()"]').disabled = false;
          }
        }
        
        function getPresenceCount() {
          if (!isPresenceActive) {
            alert('Please join presence first');
            return;
          }
          
          // Mock count update
          presenceCount = Math.floor(Math.random() * 15) + 1;
          document.getElementById('presenceCount').textContent = \`\${presenceCount} here\`;
          document.getElementById('presenceInfo').innerHTML = \`
            <p><strong>Current Origin:</strong> \${currentOrigin}</p>
            <p><strong>Presence Count:</strong> \${presenceCount}</p>
            <p><strong>DID:</strong> did:mycelia:ephemeral-\${Date.now()}</p>
          \`;
        }
        
        // Simulate presence count updates
        setInterval(() => {
          if (isPresenceActive && !isGhostMode) {
            presenceCount = Math.floor(Math.random() * 20) + 1;
            document.getElementById('presenceCount').textContent = \`\${presenceCount} here\`;
          }
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

// Databox route
app.get('/databox', (req, res) => {
  if (!featureFlags.isFlagEnabled('databox_v0')) {
    return res.status(503).send('Databox v0 feature is not enabled.');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mycelia Databox v0</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #1a1a1a; color: #eee; }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { color: #00d4ff; }
        .section { background: #222; border: 1px solid #444; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
        .status { padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0; }
        .status.healthy { background: rgba(0, 255, 136, 0.2); border: 1px solid #00ff88; color: #00ff88; }
        .status.warning { background: rgba(255, 170, 0, 0.2); border: 1px solid #ffaa00; color: #ffaa00; }
        .status.error { background: rgba(255, 102, 102, 0.2); border: 1px solid #ff6666; color: #ff6666; }
        button { background: #00d4ff; color: #1a1a1a; border: none; padding: 0.75rem 1.5rem; border-radius: 25px; cursor: pointer; font-weight: bold; margin: 0.5rem; }
        button:hover { background: #00b3e6; }
        button.danger { background: #ff6666; }
        button.danger:hover { background: #ff4444; }
        .entry { background: #333; border: 1px solid #555; border-radius: 4px; padding: 1rem; margin: 0.5rem 0; }
        .entry h4 { color: #00ff88; margin-top: 0; }
        .entry .meta { font-size: 0.85rem; color: #888; }
        .warning-box { background: rgba(255, 170, 0, 0.1); border: 1px solid #ffaa00; border-radius: 4px; padding: 1rem; margin: 1rem 0; }
        .warning-box h4 { color: #ffaa00; margin-top: 0; }
        textarea { width: 100%; background: #333; border: 1px solid #555; border-radius: 4px; color: #eee; padding: 0.75rem; margin: 0.5rem 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Mycelia Databox v0</h1>
        <p>Encrypted personal ledger with key-shred deletion and data portability.</p>
        
        <div class="section">
          <h3>Databox Status</h3>
          <div id="databoxStatus" class="status healthy">Databox Active</div>
          <div id="storageBackend" class="status healthy">Storage: Local (Default)</div>
          <div id="encryptionStatus" class="status healthy">Encryption: AES-256-GCM</div>
          
          <div>
            <button onclick="exportDatabox()">Export Databox</button>
            <button onclick="showImportDialog()">Import Databox</button>
            <button onclick="shredKeys()" class="danger">Shred Keys (Delete Data)</button>
          </div>
        </div>
        
        <div class="section">
          <h3>Data Entries</h3>
          <div id="entriesList">
            <div class="entry">
              <h4>Interaction: Page Visit</h4>
              <p>Visited /assets page</p>
              <div class="meta">Type: interaction | Origin: https://mycelia.app | Timestamp: 2024-01-15 10:30:00</div>
            </div>
            <div class="entry">
              <h4>Consent: NFT Envelope Creation</h4>
              <p>User consented to create NFT envelope</p>
              <div class="meta">Type: consent | Consent ID: consent-123 | Timestamp: 2024-01-15 10:35:00</div>
            </div>
            <div class="entry">
              <h4>Content Key: Private Asset</h4>
              <p>Encryption key for private NFT envelope</p>
              <div class="meta">Type: content_key | Key ID: key-456 | Timestamp: 2024-01-15 10:40:00</div>
            </div>
            <div class="entry">
              <h4>Preference: Theme Setting</h4>
              <p>User prefers dark theme</p>
              <div class="meta">Type: preference | Timestamp: 2024-01-15 10:45:00</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>Data Management</h3>
          <div class="warning-box">
            <h4>⚠️ Key Shredding Warning</h4>
            <p>Shredding keys will permanently destroy encryption keys, making all encrypted content unreadable. This action cannot be undone.</p>
            <p><strong>What happens when you shred keys:</strong></p>
            <ul>
              <li>All content encryption keys are destroyed</li>
              <li>Private content becomes permanently unreadable</li>
              <li>Public directory de-indexing is requested</li>
              <li>Local pins are removed</li>
              <li>Third-party mirrors may still exist</li>
            </ul>
          </div>
          
          <div>
            <button onclick="tombstoneConsent()">Tombstone Consent</button>
            <button onclick="changeStorageBackend()">Change Storage Backend</button>
          </div>
        </div>
        
        <div id="importDialog" style="display: none;">
          <div class="section">
            <h3>Import Databox</h3>
            <textarea id="importData" placeholder="Paste exported databox data here..." rows="10"></textarea>
            <button onclick="importDatabox()">Import</button>
            <button onclick="hideImportDialog()">Cancel</button>
          </div>
        </div>
        
        <div id="result" style="margin-top: 1rem;"></div>
      </div>
      
      <script>
        function exportDatabox() {
          // Mock databox export
          const mockExport = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            entries: [
              {
                id: "entry-1",
                type: "interaction",
                timestamp: Date.now() - 3600000,
                origin: "https://mycelia.app",
                data: "Visited /assets page",
                encrypted: false
              },
              {
                id: "entry-2",
                type: "consent",
                timestamp: Date.now() - 1800000,
                data: "User consented to create NFT envelope",
                encrypted: true,
                contentKeyId: "key-123"
              }
            ],
            contentKeys: [
              {
                id: "key-123",
                encryptedKey: "encrypted-key-data",
                createdAt: Date.now() - 1800000
              }
            ]
          };
          
          const exportData = JSON.stringify(mockExport, null, 2);
          const blob = new Blob([exportData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'mycelia-databox-export.json';
          a.click();
          URL.revokeObjectURL(url);
          
          document.getElementById('result').innerHTML = '<p style="color: #00ff88;">Databox exported successfully!</p>';
        }
        
        function showImportDialog() {
          document.getElementById('importDialog').style.display = 'block';
        }
        
        function hideImportDialog() {
          document.getElementById('importDialog').style.display = 'none';
          document.getElementById('importData').value = '';
        }
        
        function importDatabox() {
          const importData = document.getElementById('importData').value;
          
          if (!importData) {
            alert('Please paste databox data to import');
            return;
          }
          
          try {
            const parsed = JSON.parse(importData);
            
            // Mock import validation
            if (!parsed.version || !parsed.entries) {
              throw new Error('Invalid databox format');
            }
            
            document.getElementById('result').innerHTML = \`
              <p style="color: #00ff88;">Databox imported successfully!</p>
              <p>Imported \${parsed.entries.length} entries from \${parsed.exportedAt}</p>
            \`;
            
            hideImportDialog();
            
          } catch (error) {
            document.getElementById('result').innerHTML = \`
              <p style="color: #ff6666;">Import failed: \${error.message}</p>
            \`;
          }
        }
        
        function shredKeys() {
          if (!confirm('Are you sure you want to shred all encryption keys? This will make all encrypted content permanently unreadable.')) {
            return;
          }
          
          if (!confirm('This action cannot be undone. Are you absolutely sure?')) {
            return;
          }
          
          // Mock key shredding
          setTimeout(() => {
            document.getElementById('databoxStatus').textContent = 'Databox: Keys Shredded';
            document.getElementById('databoxStatus').className = 'status error';
            document.getElementById('encryptionStatus').textContent = 'Encryption: Keys Destroyed';
            document.getElementById('encryptionStatus').className = 'status error';
            
            document.getElementById('result').innerHTML = \`
              <div class="warning-box">
                <h4>Keys Shredded Successfully</h4>
                <p>All encryption keys have been destroyed. Encrypted content is now permanently unreadable.</p>
                <p><strong>Actions taken:</strong></p>
                <ul>
                  <li>✓ Content encryption keys destroyed</li>
                  <li>✓ Public directory de-indexing requested</li>
                  <li>✓ Local pins removed</li>
                  <li>⚠️ Third-party mirrors may still exist</li>
                </ul>
              </div>
            \`;
          }, 2000);
        }
        
        function tombstoneConsent() {
          const consentId = prompt('Enter consent ID to tombstone:');
          if (!consentId) return;
          
          document.getElementById('result').innerHTML = \`
            <p style="color: #00ff88;">Consent \${consentId} tombstoned successfully.</p>
            <p>This consent record has been marked as revoked and will not be used for future operations.</p>
          \`;
        }
        
        function changeStorageBackend() {
          const backends = ['Local (Default)', 'Remote Pin (User-provided)', 'Trusted Host'];
          const currentBackend = document.getElementById('storageBackend').textContent.split(': ')[1];
          const currentIndex = backends.indexOf(currentBackend);
          const nextIndex = (currentIndex + 1) % backends.length;
          const nextBackend = backends[nextIndex];
          
          document.getElementById('storageBackend').textContent = \`Storage: \${nextBackend}\`;
          
          document.getElementById('result').innerHTML = \`
            <p style="color: #00ff88;">Storage backend changed to: \${nextBackend}</p>
            <p>In a real implementation, this would migrate data to the new backend.</p>
          \`;
        }
      </script>
    </body>
    </html>
  `);
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Navigator error:', err);
  observability.logEvent('navigator_error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`Mycelia Navigator running on http://localhost:${port}`);
  observability.logEvent('navigator_started', { port });
});
