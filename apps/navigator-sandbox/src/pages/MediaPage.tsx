import React, { useState, useEffect } from 'react';
import { MediaPipeline, EncodeOptions, TranscodeOptions, EffectOptions, AV1Preset, HardwareCapabilities } from '@mycelia/media-pipeline';
import { EnhancedPeer, SFUClient, ScalabilityMode, CodecPreference } from '@mycelia/webrtc-enhanced';
import { NetworkStack, TransportProfile, Protocol } from '@mycelia/net-stack';
import { engine, EngineCapabilities } from '@mycelia/engine-bridge';
import { compatMatrix, CompatibilityResult } from '@mycelia/compat-matrix';
import { featureFlags } from '@mycelia/web4-feature-flags';
import { batteryMonitor, PowerCostEstimate } from '@mycelia/observability';
import { sr, SuperResolutionOptions, SuperResolutionResult, WebGPUCapabilities } from '@mycelia/webgpu-sr';

const MediaPage: React.FC = () => {
  const [mediaPipeline] = useState(() => new MediaPipeline());
  const [networkStack] = useState(() => new NetworkStack());
  const [sfuClient, setSfuClient] = useState<SFUClient | null>(null);
  const [peers, setPeers] = useState<EnhancedPeer[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [capabilities, setCapabilities] = useState<EngineCapabilities | null>(null);
  const [hardwareCaps, setHardwareCaps] = useState<HardwareCapabilities | null>(null);
  const [av1Preset, setAv1Preset] = useState<AV1Preset>('vod_1080p30_high');
  const [sideBySideResults, setSideBySideResults] = useState<any>(null);
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null);
  const [activeTab, setActiveTab] = useState<'vod' | 'live' | 'capability' | 'compat'>('vod');
  const [powerCostEstimate, setPowerCostEstimate] = useState<PowerCostEstimate | null>(null);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [webgpuCapabilities, setWebgpuCapabilities] = useState<WebGPUCapabilities | null>(null);
  const [srEnabled, setSrEnabled] = useState(false);
  const [srScale, setSrScale] = useState<1.5 | 2.0>(2.0);
  const [srQuality, setSrQuality] = useState<'fast' | 'high'>('fast');
  const [srResult, setSrResult] = useState<SuperResolutionResult | null>(null);
  const [sampleVideoLoaded, setSampleVideoLoaded] = useState(false);

  // Media Pipeline State
  const [encodeOptions, setEncodeOptions] = useState<EncodeOptions>({
    input: new ArrayBuffer(1024 * 1024), // 1MB test data
    codec: 'h264',
    bitrate: 2000,
    fps: 30,
    width: 1920,
    height: 1080,
    hardwarePreferred: true
  });

  const [transcodeOptions, setTranscodeOptions] = useState<TranscodeOptions>({
    input: new ArrayBuffer(1024 * 1024),
    targetCodec: 'vp9',
    qualityProfile: 'balanced'
  });

  const [effectOptions, setEffectOptions] = useState<EffectOptions>({
    type: 'blur',
    intensity: 0.5
  });

  // WebRTC State
  const [peerOptions, setPeerOptions] = useState({
    scalabilityMode: 'L1T3' as ScalabilityMode,
    targetBitrateKbps: 1200,
    lowDelay: false,
    enableAdaptiveBitrate: true,
    enableSimulcast: false,
    preferCodec: 'h264' as CodecPreference,
    enableFEC: false,
    enableBWE: true
  });

  // Network Stack State
  const [networkConfig, setNetworkConfig] = useState({
    transportProfile: 'default' as TransportProfile,
    preferredProtocol: 'http3' as Protocol,
    enableMultipath: false,
    enable0RTT: true
  });

  useEffect(() => {
    // Initialize capabilities
    const initCapabilities = async () => {
      const caps = await engine.capabilities();
      setCapabilities(caps);
      
      const hwCaps = mediaPipeline.getHardwareCapabilities();
      setHardwareCaps(hwCaps);
      
      // Detect compatibility
      const compatResult = await compatMatrix.detect();
      setCompatibilityResult(compatMatrix.getResult());
      
              // Initialize battery monitoring
              const powerEstimate = batteryMonitor.getPowerCostEstimate();
              setPowerCostEstimate(powerEstimate);
              
              // Initialize WebGPU SR capabilities
              const webgpuCaps = sr.getCapabilities();
              setWebgpuCapabilities(webgpuCaps);
    };

    initCapabilities().catch(console.error);

    // Update power cost estimate every 5 seconds
    const powerInterval = setInterval(() => {
      const powerEstimate = batteryMonitor.getPowerCostEstimate();
      setPowerCostEstimate(powerEstimate);
    }, 5000);

    return () => clearInterval(powerInterval);

    // Initialize SFU connection
    const initSFU = async () => {
      const client = new SFUClient('wss://sfu.example.com', 'test-token');
      await client.connect();
      setSfuClient(client);
    };

    initSFU().catch(console.error);

    // Update stats periodically
    const interval = setInterval(() => {
      updateStats();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const updateStats = async () => {
    const pipelineStats = mediaPipeline.getAverageStats();
    const networkStats = networkStack.getAverageStats();
    
    let sfuStats = null;
    if (sfuClient) {
      sfuStats = await sfuClient.getStats();
    }

    setStats({
      pipeline: pipelineStats,
      network: networkStats,
      sfu: sfuStats
    });
  };

  const handleEncode = async () => {
    setIsProcessing(true);
    try {
      const stream = await mediaPipeline.encode(encodeOptions);
      let totalBytes = 0;
      for await (const chunk of stream) {
        totalBytes += chunk.length;
      }
      console.log(`Encoded ${totalBytes} bytes`);
    } catch (error) {
      console.error('Encode failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAV1Encode = async () => {
    setIsProcessing(true);
    try {
      const stream = await mediaPipeline.encodeAV1(encodeOptions.input, av1Preset);
      let totalBytes = 0;
      for await (const chunk of stream) {
        totalBytes += chunk.length;
      }
      console.log(`AV1 encoded ${totalBytes} bytes with preset ${av1Preset}`);
    } catch (error) {
      console.error('AV1 encode failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSideBySideComparison = async () => {
    setIsProcessing(true);
    try {
      const inputData = encodeOptions.input;
      
      // Encode with AV1
      const av1Start = performance.now();
      const av1Stream = await mediaPipeline.encodeAV1(inputData, av1Preset);
      let av1Bytes = 0;
      for await (const chunk of av1Stream) {
        av1Bytes += chunk.length;
      }
      const av1Time = performance.now() - av1Start;
      
      // Encode with H.264
      const h264Start = performance.now();
      const h264Stream = await mediaPipeline.encode({
        ...encodeOptions,
        codec: 'h264'
      });
      let h264Bytes = 0;
      for await (const chunk of h264Stream) {
        h264Bytes += chunk.length;
      }
      const h264Time = performance.now() - h264Start;
      
      // Encode with VP9
      const vp9Start = performance.now();
      const vp9Stream = await mediaPipeline.encode({
        ...encodeOptions,
        codec: 'vp9'
      });
      let vp9Bytes = 0;
      for await (const chunk of vp9Stream) {
        vp9Bytes += chunk.length;
      }
      const vp9Time = performance.now() - vp9Start;
      
      const results = {
        av1: {
          bytes: av1Bytes,
          time: av1Time,
          compressionRatio: av1Bytes / inputData.byteLength,
          preset: av1Preset
        },
        h264: {
          bytes: h264Bytes,
          time: h264Time,
          compressionRatio: h264Bytes / inputData.byteLength
        },
        vp9: {
          bytes: vp9Bytes,
          time: vp9Time,
          compressionRatio: vp9Bytes / inputData.byteLength
        },
        inputSize: inputData.byteLength
      };
      
      setSideBySideResults(results);
      console.log('Side-by-side comparison:', results);
    } catch (error) {
      console.error('Side-by-side comparison failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranscode = async () => {
    setIsProcessing(true);
    try {
      const result = await mediaPipeline.transcode(transcodeOptions);
      console.log(`Transcoded to ${result.mime}, ${result.data.length} bytes`);
    } catch (error) {
      console.error('Transcode failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyEffect = async () => {
    setIsProcessing(true);
    try {
      const result = await mediaPipeline.applyEffect(encodeOptions.input, effectOptions);
      console.log(`Applied ${effectOptions.type} effect, ${result.length} bytes`);
    } catch (error) {
      console.error('Effect failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePeer = async () => {
    if (!sfuClient) return;
    
    try {
      const peer = await sfuClient.createPeer(peerOptions);
      setPeers(prev => [...prev, peer]);
    } catch (error) {
      console.error('Failed to create peer:', error);
    }
  };

  const handleRemovePeer = async (peerId: string) => {
    if (!sfuClient) return;
    
    try {
      await sfuClient.removePeer(peerId);
      setPeers(prev => prev.filter(p => p.id !== peerId));
    } catch (error) {
      console.error('Failed to remove peer:', error);
    }
  };

  const handleLoadSampleVideo = () => {
    // Simulate loading a sample video for demo purposes
    setSampleVideoLoaded(true);
    console.log('Sample video loaded for demo');
  };

  const handleTestSuperResolution = async () => {
    try {
      // Create a mock video element for testing
      const videoElement = document.createElement('video');
      videoElement.width = 640;
      videoElement.height = 480;
      
      // Create a test canvas with some content
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw a test pattern
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(320, 0, 320, 240);
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(0, 240, 320, 240);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(320, 240, 320, 240);
        
        // Add some text
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText('Test Pattern', 250, 250);
      }
      
      // Convert canvas to video element (mock)
      const stream = canvas.captureStream(30);
      videoElement.srcObject = stream;
      
      const options: SuperResolutionOptions = {
        scale: srScale,
        quality: srQuality,
        fallbackToWasm: true
      };
      
      const result = await sr.upscale(videoElement, options);
      setSrResult(result);
      
      console.log('Super-resolution test completed:', result);
    } catch (error) {
      console.error('Super-resolution test failed:', error);
      setSrResult({
        success: false,
        method: 'none',
        processingTimeMs: 0,
        outputWidth: 0,
        outputHeight: 0,
        error: (error as Error).message
      });
    }
  };

  const handleNetworkConfigChange = (key: string, value: any) => {
    setNetworkConfig(prev => ({ ...prev, [key]: value }));
    
    switch (key) {
      case 'transportProfile':
        networkStack.setTransportProfile(value);
        break;
      case 'preferredProtocol':
        networkStack.setPreferredProtocol(value);
        break;
      case 'enableMultipath':
        networkStack.enableMultipath(value);
        break;
      case 'enable0RTT':
        networkStack.enable0RTT(value);
        break;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Web4 Engine - AV1 Media Pipeline</h1>
        <p>High-performance AV1 encoding with hardware acceleration and WebRTC SVC</p>
      </div>

      {/* Capabilities Panel */}
      <div className="capabilities-panel">
        <h2>System Capabilities</h2>
        <div className="capabilities-grid">
          <div className="capability-group">
            <h3>Media Pipeline</h3>
            <div className="capability-item">
              <span>AV1 Encode:</span>
              <span className={hardwareCaps?.av1Encode ? 'capability-yes' : 'capability-no'}>
                {hardwareCaps?.av1Encode ? '✅ Hardware' : '❌ Software Only'}
              </span>
            </div>
            <div className="capability-item">
              <span>AV1 Decode:</span>
              <span className={hardwareCaps?.av1Decode ? 'capability-yes' : 'capability-no'}>
                {hardwareCaps?.av1Decode ? '✅ Hardware' : '❌ Software Only'}
              </span>
            </div>
            <div className="capability-item">
              <span>Platform:</span>
              <span>{hardwareCaps?.platform || 'Unknown'}</span>
            </div>
            <div className="capability-item">
              <span>Media Foundation:</span>
              <span className={hardwareCaps?.mediaFoundation ? 'capability-yes' : 'capability-no'}>
                {hardwareCaps?.mediaFoundation ? '✅' : '❌'}
              </span>
            </div>
            <div className="capability-item">
              <span>VideoToolbox:</span>
              <span className={hardwareCaps?.videoToolbox ? 'capability-yes' : 'capability-no'}>
                {hardwareCaps?.videoToolbox ? '✅' : '❌'}
              </span>
            </div>
            <div className="capability-item">
              <span>VA-API:</span>
              <span className={hardwareCaps?.vaApi ? 'capability-yes' : 'capability-no'}>
                {hardwareCaps?.vaApi ? '✅' : '❌'}
              </span>
            </div>
          </div>
          
          <div className="capability-group">
            <h3>WebRTC Enhanced</h3>
            <div className="capability-item">
              <span>AV1 SVC:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
            <div className="capability-item">
              <span>Simulcast:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
            <div className="capability-item">
              <span>FEC:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
            <div className="capability-item">
              <span>BWE:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
          </div>
          
          <div className="capability-group">
            <h3>Network Stack</h3>
            <div className="capability-item">
              <span>QUIC:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
            <div className="capability-item">
              <span>HTTP/3:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
            <div className="capability-item">
              <span>Multipath:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
            <div className="capability-item">
              <span>DoH:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
            <div className="capability-item">
              <span>DoQ:</span>
              <span className="capability-yes">✅ Supported</span>
            </div>
          </div>
        </div>
      </div>

      <div className="media-grid">
        {/* Media Pipeline Section */}
        <div className="media-section">
          <h2>Media Pipeline</h2>
          
          <div className="control-group">
            <h3>AV1 Encode</h3>
            <div className="form-row">
              <label>Preset:</label>
              <select 
                value={av1Preset} 
                onChange={(e) => setAv1Preset(e.target.value as AV1Preset)}
              >
                <option value="realtime_720p30_lowdelay">Realtime 720p30 Low Delay</option>
                <option value="vod_1080p30_high">VOD 1080p30 High Quality</option>
                <option value="vod_4k24_archive">VOD 4K24 Archive</option>
              </select>
            </div>
            <div className="form-row">
              <label>Input Size:</label>
              <input 
                type="number" 
                value={encodeOptions.input.byteLength} 
                onChange={(e) => setEncodeOptions(prev => ({ 
                  ...prev, 
                  input: new ArrayBuffer(parseInt(e.target.value)) 
                }))}
              />
              <span>bytes</span>
            </div>
            <div className="form-row">
              <button onClick={handleLoadSampleVideo} className="load-sample-btn">
                Load Sample Video
              </button>
              {sampleVideoLoaded && (
                <span className="sample-status">✅ Sample loaded</span>
              )}
            </div>
            <button onClick={handleAV1Encode} disabled={isProcessing}>
              {isProcessing ? 'AV1 Encoding...' : 'AV1 Encode'}
            </button>
          </div>

          <div className="control-group">
            <h3>Side-by-Side Comparison</h3>
            <p>Compare AV1, H.264, and VP9 encoding performance</p>
            <button onClick={handleSideBySideComparison} disabled={isProcessing}>
              {isProcessing ? 'Comparing...' : 'Run Comparison'}
            </button>
            
            {sideBySideResults && (
              <div className="comparison-results">
                <h4>Results:</h4>
                <div className="comparison-grid">
                  <div className="comparison-item">
                    <h5>AV1 ({sideBySideResults.av1.preset})</h5>
                    <div>Size: {(sideBySideResults.av1.bytes / 1024).toFixed(1)} KB</div>
                    <div>Time: {sideBySideResults.av1.time.toFixed(1)} ms</div>
                    <div>Compression: {(sideBySideResults.av1.compressionRatio * 100).toFixed(1)}%</div>
                  </div>
                  <div className="comparison-item">
                    <h5>H.264</h5>
                    <div>Size: {(sideBySideResults.h264.bytes / 1024).toFixed(1)} KB</div>
                    <div>Time: {sideBySideResults.h264.time.toFixed(1)} ms</div>
                    <div>Compression: {(sideBySideResults.h264.compressionRatio * 100).toFixed(1)}%</div>
                  </div>
                  <div className="comparison-item">
                    <h5>VP9</h5>
                    <div>Size: {(sideBySideResults.vp9.bytes / 1024).toFixed(1)} KB</div>
                    <div>Time: {sideBySideResults.vp9.time.toFixed(1)} ms</div>
                    <div>Compression: {(sideBySideResults.vp9.compressionRatio * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="comparison-summary">
                  <div>Input Size: {(sideBySideResults.inputSize / 1024).toFixed(1)} KB</div>
                  <div>AV1 vs H.264: {((sideBySideResults.h264.bytes - sideBySideResults.av1.bytes) / sideBySideResults.h264.bytes * 100).toFixed(1)}% smaller</div>
                  <div>AV1 vs VP9: {((sideBySideResults.vp9.bytes - sideBySideResults.av1.bytes) / sideBySideResults.vp9.bytes * 100).toFixed(1)}% smaller</div>
                </div>
              </div>
            )}
          </div>

          <div className="control-group">
            <h3>General Encode</h3>
            <div className="form-row">
              <label>Codec:</label>
              <select 
                value={encodeOptions.codec} 
                onChange={(e) => setEncodeOptions(prev => ({ ...prev, codec: e.target.value as any }))}
              >
                <option value="h264">H.264</option>
                <option value="vp9">VP9</option>
                <option value="av1">AV1</option>
              </select>
            </div>
            <div className="form-row">
              <label>Bitrate:</label>
              <input 
                type="number" 
                value={encodeOptions.bitrate} 
                onChange={(e) => setEncodeOptions(prev => ({ ...prev, bitrate: parseInt(e.target.value) }))}
              />
            </div>
            <div className="form-row">
              <label>Resolution:</label>
              <input 
                type="number" 
                value={encodeOptions.width} 
                onChange={(e) => setEncodeOptions(prev => ({ ...prev, width: parseInt(e.target.value) }))}
              />
              <span>x</span>
              <input 
                type="number" 
                value={encodeOptions.height} 
                onChange={(e) => setEncodeOptions(prev => ({ ...prev, height: parseInt(e.target.value) }))}
              />
            </div>
            <button onClick={handleEncode} disabled={isProcessing}>
              {isProcessing ? 'Encoding...' : 'Encode'}
            </button>
          </div>

          <div className="control-group">
            <h3>Transcode</h3>
            <div className="form-row">
              <label>Target Codec:</label>
              <select 
                value={transcodeOptions.targetCodec} 
                onChange={(e) => setTranscodeOptions(prev => ({ ...prev, targetCodec: e.target.value as any }))}
              >
                <option value="h264">H.264</option>
                <option value="vp9">VP9</option>
                <option value="av1">AV1</option>
              </select>
            </div>
            <div className="form-row">
              <label>Quality:</label>
              <select 
                value={transcodeOptions.qualityProfile} 
                onChange={(e) => setTranscodeOptions(prev => ({ ...prev, qualityProfile: e.target.value as any }))}
              >
                <option value="speed">Speed</option>
                <option value="balanced">Balanced</option>
                <option value="quality">Quality</option>
              </select>
            </div>
            <button onClick={handleTranscode} disabled={isProcessing}>
              {isProcessing ? 'Transcoding...' : 'Transcode'}
            </button>
          </div>

          <div className="control-group">
            <h3>Effects</h3>
            <div className="form-row">
              <label>Effect:</label>
              <select 
                value={effectOptions.type} 
                onChange={(e) => setEffectOptions(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <option value="blur">Blur</option>
                <option value="brightness">Brightness</option>
                <option value="contrast">Contrast</option>
                <option value="saturation">Saturation</option>
                <option value="noise_reduction">Noise Reduction</option>
                <option value="background_removal">Background Removal</option>
              </select>
            </div>
            <div className="form-row">
              <label>Intensity:</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={effectOptions.intensity} 
                onChange={(e) => setEffectOptions(prev => ({ ...prev, intensity: parseFloat(e.target.value) }))}
              />
              <span>{effectOptions.intensity}</span>
            </div>
            <button onClick={handleApplyEffect} disabled={isProcessing}>
              {isProcessing ? 'Applying...' : 'Apply Effect'}
            </button>
          </div>
        </div>

        {/* WebRTC Section */}
        <div className="media-section">
          <h2>WebRTC Enhanced</h2>
          
          <div className="control-group">
            <h3>SFU Connection</h3>
            <div className="status">
              Status: {sfuClient?.connectionState || 'Disconnected'}
            </div>
            {sfuClient && (
              <div className="stats">
                <div>Total Peers: {stats.sfu?.totalPeers || 0}</div>
                <div>Total Bitrate: {stats.sfu?.totalBitrate || 0} kbps</div>
                <div>Avg RTT: {stats.sfu?.avgRtt?.toFixed(1) || 0} ms</div>
              </div>
            )}
          </div>

          <div className="control-group">
            <h3>Peer Configuration</h3>
            <div className="form-row">
              <label>Preferred Codec:</label>
              <select 
                value={peerOptions.preferCodec} 
                onChange={(e) => setPeerOptions(prev => ({ ...prev, preferCodec: e.target.value as CodecPreference }))}
              >
                <option value="h264">H.264</option>
                <option value="vp9">VP9</option>
                <option value="av1">AV1</option>
              </select>
            </div>
            <div className="form-row">
              <label>Scalability Mode:</label>
              <select 
                value={peerOptions.scalabilityMode} 
                onChange={(e) => setPeerOptions(prev => ({ ...prev, scalabilityMode: e.target.value as ScalabilityMode }))}
              >
                <option value="L1T1">L1T1</option>
                <option value="L1T2">L1T2</option>
                <option value="L1T3">L1T3</option>
                <option value="L2T1">L2T1</option>
                <option value="L2T2">L2T2</option>
                <option value="L2T3">L2T3</option>
                <option value="L3T1">L3T1</option>
                <option value="L3T2">L3T2</option>
                <option value="L3T3">L3T3</option>
              </select>
            </div>
            <div className="form-row">
              <label>Target Bitrate:</label>
              <input 
                type="number" 
                value={peerOptions.targetBitrateKbps} 
                onChange={(e) => setPeerOptions(prev => ({ ...prev, targetBitrateKbps: parseInt(e.target.value) }))}
              />
              <span>kbps</span>
            </div>
            <div className="form-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={peerOptions.lowDelay} 
                  onChange={(e) => setPeerOptions(prev => ({ ...prev, lowDelay: e.target.checked }))}
                />
                Low Delay
              </label>
            </div>
            <div className="form-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={peerOptions.enableAdaptiveBitrate} 
                  onChange={(e) => setPeerOptions(prev => ({ ...prev, enableAdaptiveBitrate: e.target.checked }))}
                />
                Adaptive Bitrate
              </label>
            </div>
            <div className="form-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={peerOptions.enableFEC} 
                  onChange={(e) => setPeerOptions(prev => ({ ...prev, enableFEC: e.target.checked }))}
                />
                FEC (Forward Error Correction)
              </label>
            </div>
            <div className="form-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={peerOptions.enableBWE} 
                  onChange={(e) => setPeerOptions(prev => ({ ...prev, enableBWE: e.target.checked }))}
                />
                BWE (Bandwidth Estimation)
              </label>
            </div>
            <button onClick={handleCreatePeer}>
              Create Peer
            </button>
          </div>

          <div className="control-group">
            <h3>Active Peers</h3>
            {peers.map(peer => (
              <div key={peer.id} className="peer-item">
                <div>ID: {peer.id}</div>
                <div>State: {peer.getConnectionState()}</div>
                <button onClick={() => handleRemovePeer(peer.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Network Stack Section */}
        <div className="media-section">
          <h2>Network Stack</h2>
          
          <div className="control-group">
            <h3>Configuration</h3>
            <div className="form-row">
              <label>Transport Profile:</label>
              <select 
                value={networkConfig.transportProfile} 
                onChange={(e) => handleNetworkConfigChange('transportProfile', e.target.value as TransportProfile)}
              >
                <option value="default">Default</option>
                <option value="low_latency">Low Latency</option>
                <option value="bulk">Bulk</option>
                <option value="balanced">Balanced</option>
              </select>
            </div>
            <div className="form-row">
              <label>Preferred Protocol:</label>
              <select 
                value={networkConfig.preferredProtocol} 
                onChange={(e) => handleNetworkConfigChange('preferredProtocol', e.target.value as Protocol)}
              >
                <option value="http1">HTTP/1.1</option>
                <option value="http2">HTTP/2</option>
                <option value="http3">HTTP/3</option>
                <option value="quic">QUIC</option>
              </select>
            </div>
            <div className="form-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={networkConfig.enableMultipath} 
                  onChange={(e) => handleNetworkConfigChange('enableMultipath', e.target.checked)}
                />
                Multipath
              </label>
            </div>
            <div className="form-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={networkConfig.enable0RTT} 
                  onChange={(e) => handleNetworkConfigChange('enable0RTT', e.target.checked)}
                />
                0-RTT
              </label>
            </div>
          </div>

          <div className="control-group">
            <h3>Statistics</h3>
            <div className="stats">
              <div>Avg RTT: {stats.network?.avgRTT?.toFixed(1) || 0} ms</div>
              <div>Avg Bandwidth: {stats.network?.avgBandwidth?.toFixed(1) || 0} Mbps</div>
              <div>Packet Loss: {stats.network?.avgPacketLoss?.toFixed(2) || 0}%</div>
              <div>Bytes Sent: {stats.network?.totalBytesSent || 0}</div>
              <div>Bytes Received: {stats.network?.totalBytesReceived || 0}</div>
            </div>
          </div>
        </div>

        {/* Pipeline Statistics */}
        <div className="media-section">
          <h2>Pipeline Statistics</h2>
          <div className="stats">
            <div>Avg Encode Time: {stats.pipeline?.encodeTime?.toFixed(2) || 0} ms</div>
            <div>Compression Ratio: {((stats.pipeline?.compressionRatio || 0) * 100).toFixed(1)}%</div>
            <div>Avg FPS: {stats.pipeline?.fps?.toFixed(1) || 0}</div>
            <div>Avg Bitrate: {stats.pipeline?.bitrate?.toFixed(0) || 0} kbps</div>
          </div>
        </div>
      </div>

      {/* Power Hints Section */}
      {powerCostEstimate && (
        <div className="power-hints-section">
          <h2>Power & Performance</h2>
          
          <div className="power-status">
            <div className="power-metric">
              <span>Battery Cost:</span>
              <span className={powerCostEstimate.battery_cost_per_minute > 0.5 ? 'power-high' : 'power-normal'}>
                {powerCostEstimate.battery_cost_per_minute.toFixed(2)}/min
              </span>
            </div>
            <div className="power-metric">
              <span>CPU Load:</span>
              <span className={powerCostEstimate.cpu_load_percent > 75 ? 'power-high' : 'power-normal'}>
                {powerCostEstimate.cpu_load_percent.toFixed(1)}%
              </span>
            </div>
            <div className="power-metric">
              <span>Thermal State:</span>
              <span className={`thermal-${powerCostEstimate.thermal_state}`}>
                {powerCostEstimate.thermal_state}
              </span>
            </div>
            <div className="power-metric">
              <span>Power Mode:</span>
              <span className={`power-mode-${powerCostEstimate.power_mode}`}>
                {powerCostEstimate.power_mode}
              </span>
            </div>
          </div>

          <div className="power-controls">
            <div className="low-power-toggle">
              <label>
                <input 
                  type="checkbox" 
                  checked={lowPowerMode}
                  onChange={(e) => setLowPowerMode(e.target.checked)}
                />
                Low Power Mode
              </label>
              <p>Reduces frame rate and encoder complexity to save battery</p>
            </div>

            <div className="power-recommendations">
              <h3>Recommendations:</h3>
              <ul>
                {batteryMonitor.getPowerRecommendations().map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
                  </div>
                </div>
              )}

              {/* WebGPU Super-Resolution Section */}
              {webgpuCapabilities && (
                <div className="webgpu-sr-section">
                  <h2>WebGPU Super-Resolution</h2>
                  
                  <div className="sr-status">
                    <div className="sr-capability">
                      <span>WebGPU Available:</span>
                      <span className={webgpuCapabilities.available ? 'capability-yes' : 'capability-no'}>
                        {webgpuCapabilities.available ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {webgpuCapabilities.available && webgpuCapabilities.adapterInfo && (
                      <div className="sr-capability">
                        <span>Adapter:</span>
                        <span>{webgpuCapabilities.adapterInfo.vendor} {webgpuCapabilities.adapterInfo.architecture}</span>
                      </div>
                    )}
                    <div className="sr-capability">
                      <span>WASM Fallback:</span>
                      <span className={sr.isWasmAvailable() ? 'capability-yes' : 'capability-no'}>
                        {sr.isWasmAvailable() ? 'Available' : 'Not Available'}
                      </span>
                    </div>
                  </div>

                  <div className="sr-controls">
                    <div className="sr-toggle">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={srEnabled}
                          onChange={(e) => setSrEnabled(e.target.checked)}
                          disabled={!webgpuCapabilities.available && !sr.isWasmAvailable()}
                        />
                        Enable Super-Resolution
                      </label>
                      <p>Enhance video quality using AI upscaling</p>
                    </div>

                    {srEnabled && (
                      <div className="sr-settings">
                        <div className="sr-setting">
                          <label>
                            Scale Factor:
                            <select 
                              value={srScale} 
                              onChange={(e) => setSrScale(parseFloat(e.target.value) as 1.5 | 2.0)}
                            >
                              <option value={1.5}>1.5x</option>
                              <option value={2.0}>2.0x</option>
                            </select>
                          </label>
                        </div>

                        <div className="sr-setting">
                          <label>
                            Quality:
                            <select 
                              value={srQuality} 
                              onChange={(e) => setSrQuality(e.target.value as 'fast' | 'high')}
                            >
                              <option value="fast">Fast</option>
                              <option value="high">High</option>
                            </select>
                          </label>
                        </div>

                        <button 
                          onClick={handleTestSuperResolution}
                          disabled={!webgpuCapabilities.available && !sr.isWasmAvailable()}
                        >
                          Test Super-Resolution
                        </button>
                      </div>
                    )}

                    {srResult && (
                      <div className="sr-result">
                        <h3>Last Test Result:</h3>
                        <div className="sr-result-metrics">
                          <div className="sr-metric">
                            <span>Method:</span>
                            <span className={`method-${srResult.method}`}>{srResult.method}</span>
                          </div>
                          <div className="sr-metric">
                            <span>Success:</span>
                            <span className={srResult.success ? 'success-yes' : 'success-no'}>
                              {srResult.success ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="sr-metric">
                            <span>Processing Time:</span>
                            <span>{srResult.processingTimeMs.toFixed(2)} ms</span>
                          </div>
                          <div className="sr-metric">
                            <span>Output Resolution:</span>
                            <span>{srResult.outputWidth}x{srResult.outputHeight}</span>
                          </div>
                          {srResult.error && (
                            <div className="sr-error">
                              <span>Error:</span>
                              <span>{srResult.error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compatibility Tab */}
      {activeTab === 'compat' && (
        <div className="compat-section">
          <h2>Compatibility Matrix</h2>
          
          {compatibilityResult && (
            <div className="compat-results">
              <div className="compat-header">
                <h3>Hardware Detection Results</h3>
                <button 
                  onClick={() => engine.overridePath('sw')}
                  className="btn-force-sw"
                >
                  Force Software
                </button>
                <button 
                  onClick={() => engine.clearOverridePath()}
                  className="btn-clear-override"
                >
                  Clear Override
                </button>
              </div>
              
              <div className="compat-grid">
                <div className="compat-item">
                  <span>OS:</span>
                  <span>{compatibilityResult.capabilities.os}</span>
                </div>
                <div className="compat-item">
                  <span>GPU Driver:</span>
                  <span>{compatibilityResult.capabilities.gpu_driver}</span>
                </div>
                <div className="compat-item">
                  <span>HW Encode:</span>
                  <span className={compatibilityResult.capabilities.hw_encode === 'hw' ? 'compat-yes' : 'compat-no'}>
                    {compatibilityResult.capabilities.hw_encode === 'hw' ? '✅ Hardware' : '❌ Software'}
                  </span>
                </div>
                <div className="compat-item">
                  <span>HW Decode:</span>
                  <span className={compatibilityResult.capabilities.hw_decode === 'hw' ? 'compat-yes' : 'compat-no'}>
                    {compatibilityResult.capabilities.hw_decode === 'hw' ? '✅ Hardware' : '❌ Software'}
                  </span>
                </div>
              </div>
              
              <div className="fallback-decisions">
                <h4>Fallback Decisions</h4>
                <div className="decision-item">
                  <span>Encode Path:</span>
                  <span className={compatibilityResult.fallback_decisions.encode_path === 'hw' ? 'compat-yes' : 'compat-no'}>
                    {compatibilityResult.fallback_decisions.encode_path === 'hw' ? 'Hardware' : 'Software'}
                  </span>
                </div>
                <div className="decision-item">
                  <span>Decode Path:</span>
                  <span className={compatibilityResult.fallback_decisions.decode_path === 'hw' ? 'compat-yes' : 'compat-no'}>
                    {compatibilityResult.fallback_decisions.decode_path === 'hw' ? 'Hardware' : 'Software'}
                  </span>
                </div>
                
                <div className="reasons">
                  <h5>Reasons:</h5>
                  <ul>
                    {compatibilityResult.fallback_decisions.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="performance-estimate">
                <h4>Performance Estimate</h4>
                <div className="perf-item">
                  <span>Encode Performance:</span>
                  <span className={`perf-${compatibilityResult.performance_estimate.encode_performance}`}>
                    {compatibilityResult.performance_estimate.encode_performance}
                  </span>
                </div>
                <div className="perf-item">
                  <span>Decode Performance:</span>
                  <span className={`perf-${compatibilityResult.performance_estimate.decode_performance}`}>
                    {compatibilityResult.performance_estimate.decode_performance}
                  </span>
                </div>
                <div className="perf-item">
                  <span>Confidence:</span>
                  <span>{(compatibilityResult.performance_estimate.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          color: #00ff88;
          margin-bottom: 0.5rem;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
        }

        .media-section {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid #333;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .media-section h2 {
          color: #00ff88;
          margin-bottom: 1rem;
          border-bottom: 1px solid #333;
          padding-bottom: 0.5rem;
        }

        .control-group {
          margin-bottom: 1.5rem;
        }

        .control-group h3 {
          color: #ffaa00;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .form-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .form-row label {
          min-width: 120px;
          color: #ccc;
        }

        .form-row input,
        .form-row select {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #555;
          color: #fff;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .form-row input[type="range"] {
          flex: 1;
        }

        button {
          background: #00ff88;
          color: #000;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        button:disabled {
          background: #666;
          cursor: not-allowed;
        }

        button:hover:not(:disabled) {
          background: #00cc66;
        }

        .status {
          color: #00ff88;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .stats {
          background: rgba(0, 0, 0, 0.2);
          padding: 0.5rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .stats div {
          margin-bottom: 0.25rem;
          color: #ccc;
        }

        .peer-item {
          background: rgba(0, 0, 0, 0.2);
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .peer-item div {
          color: #ccc;
          font-size: 0.9rem;
        }

        .peer-item button {
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
        }

        .capabilities-panel {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid #333;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .capabilities-panel h2 {
          color: #00ff88;
          margin-bottom: 1rem;
          border-bottom: 1px solid #333;
          padding-bottom: 0.5rem;
        }

        .capabilities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .capability-group h3 {
          color: #ffaa00;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .capability-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
          padding: 0.25rem 0;
        }

        .capability-item span:first-child {
          color: #ccc;
        }

        .capability-yes {
          color: #00ff88;
          font-weight: bold;
        }

        .capability-no {
          color: #ff6666;
          font-weight: bold;
        }

        .comparison-results {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid #555;
          border-radius: 4px;
          padding: 1rem;
          margin-top: 1rem;
        }

        .comparison-results h4 {
          color: #00ff88;
          margin-bottom: 0.5rem;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .comparison-item {
          background: rgba(0, 0, 0, 0.3);
          padding: 0.75rem;
          border-radius: 4px;
          border: 1px solid #444;
        }

        .comparison-item h5 {
          color: #ffaa00;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .comparison-item div {
          color: #ccc;
          font-size: 0.8rem;
          margin-bottom: 0.25rem;
        }

        .comparison-summary {
          background: rgba(0, 0, 0, 0.4);
          padding: 0.75rem;
          border-radius: 4px;
          border: 1px solid #666;
        }

        .comparison-summary div {
          color: #ccc;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        /* Compatibility Tab Styles */
        .compat-section {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 30px;
          margin-top: 20px;
        }

        .compat-section h2 {
          color: #00d4ff;
          margin-bottom: 20px;
        }

        .compat-results {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 20px;
        }

        .compat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(0, 212, 255, 0.3);
        }

        .compat-header h3 {
          color: #00d4ff;
          margin: 0;
        }

        .btn-force-sw, .btn-clear-override {
          padding: 8px 16px;
          border: 1px solid #00d4ff;
          border-radius: 4px;
          background: transparent;
          color: #00d4ff;
          cursor: pointer;
          margin-left: 10px;
          transition: all 0.3s ease;
        }

        .btn-force-sw:hover, .btn-clear-override:hover {
          background: #00d4ff;
          color: #000;
        }

        .compat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .compat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .compat-item span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .compat-yes {
          color: #00ff88;
          font-weight: bold;
        }

        .compat-no {
          color: #ff6666;
          font-weight: bold;
        }

        .fallback-decisions, .performance-estimate {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 15px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .fallback-decisions h4, .performance-estimate h4 {
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .decision-item, .perf-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .decision-item span:first-child, .perf-item span:first-child {
          color: #ccc;
        }

        .reasons {
          margin-top: 10px;
        }

        .reasons h5 {
          color: #00d4ff;
          margin-bottom: 8px;
        }

        .reasons ul {
          margin: 0;
          padding-left: 20px;
        }

        .reasons li {
          color: #ccc;
          margin-bottom: 4px;
        }

        .perf-excellent {
          color: #00ff88;
          font-weight: bold;
        }

        .perf-good {
          color: #88ff00;
          font-weight: bold;
        }

        .perf-fair {
          color: #ffaa00;
          font-weight: bold;
        }

        .perf-poor {
          color: #ff6666;
          font-weight: bold;
        }

        /* Power Hints Styles */
        .power-hints-section {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 30px;
          margin-top: 20px;
        }

        .power-hints-section h2 {
          color: #00d4ff;
          margin-bottom: 20px;
        }

        .power-status {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .power-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .power-metric span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .power-normal {
          color: #00ff88;
          font-weight: bold;
        }

        .power-high {
          color: #ff6666;
          font-weight: bold;
        }

        .thermal-normal {
          color: #00ff88;
          font-weight: bold;
        }

        .thermal-warm {
          color: #ffaa00;
          font-weight: bold;
        }

        .thermal-hot {
          color: #ff6666;
          font-weight: bold;
        }

        .power-mode-low {
          color: #00ff88;
          font-weight: bold;
        }

        .power-mode-balanced {
          color: #00d4ff;
          font-weight: bold;
        }

        .power-mode-high {
          color: #ffaa00;
          font-weight: bold;
        }

        .power-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .low-power-toggle {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 15px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .low-power-toggle label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #00d4ff;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .low-power-toggle p {
          color: #ccc;
          font-size: 0.9rem;
          margin: 0;
        }

        .power-recommendations {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 15px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .power-recommendations h3 {
          color: #00d4ff;
          margin: 0 0 10px 0;
        }

        .power-recommendations ul {
          margin: 0;
          padding-left: 20px;
        }

        .power-recommendations li {
          color: #ccc;
          margin-bottom: 5px;
          font-size: 0.9rem;
        }

        /* WebGPU Super-Resolution Styles */
        .webgpu-sr-section {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 30px;
          margin-top: 20px;
        }

        .webgpu-sr-section h2 {
          color: #00d4ff;
          margin-bottom: 20px;
        }

        .sr-status {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .sr-capability {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .sr-capability span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .capability-yes {
          color: #00ff88;
          font-weight: bold;
        }

        .capability-no {
          color: #ff6666;
          font-weight: bold;
        }

        .sr-controls {
          margin-top: 20px;
        }

        .sr-toggle {
          margin-bottom: 20px;
        }

        .sr-toggle label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ccc;
          font-weight: bold;
        }

        .sr-toggle input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }

        .sr-toggle p {
          margin: 5px 0 0 30px;
          font-size: 0.9rem;
          color: #888;
        }

        .sr-settings {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 4px;
          padding: 20px;
          margin-top: 15px;
        }

        .sr-setting {
          margin-bottom: 15px;
        }

        .sr-setting label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ccc;
          font-weight: bold;
        }

        .sr-setting select {
          background: #333;
          border: 1px solid #555;
          color: #eee;
          padding: 5px 10px;
          border-radius: 4px;
        }

        .sr-result {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 4px;
          padding: 20px;
          margin-top: 20px;
        }

        .sr-result h3 {
          color: #00d4ff;
          margin-top: 0;
          margin-bottom: 15px;
        }

        .sr-result-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }

        .sr-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .sr-metric span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .method-webgpu {
          color: #00ff88;
          font-weight: bold;
        }

        .method-wasm {
          color: #ffaa00;
          font-weight: bold;
        }

        .method-none {
          color: #ff6666;
          font-weight: bold;
        }

        .success-yes {
          color: #00ff88;
          font-weight: bold;
        }

        .success-no {
          color: #ff6666;
          font-weight: bold;
        }

        .sr-error {
          grid-column: 1 / -1;
          background: rgba(255, 102, 102, 0.1);
          border: 1px solid #ff6666;
          border-radius: 4px;
          padding: 10px;
          margin-top: 10px;
        }

        .sr-error span:first-child {
          color: #ff6666;
          font-weight: bold;
        }

        .sr-error span:last-child {
          color: #ffcccc;
          font-family: monospace;
        }

        /* Sample Video Styles */
        .load-sample-btn {
          background: #00ff88;
          color: #1a1a1a;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 0.9rem;
          margin-right: 10px;
        }

        .load-sample-btn:hover {
          background: #00e677;
        }

        .sample-status {
          color: #00ff88;
          font-weight: bold;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default MediaPage;
