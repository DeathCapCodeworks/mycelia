import React, { useState, useEffect } from 'react';
import { offload, EmbeddingOptions, EmbeddingResult, WebNNCapabilities, ModelInfo } from '@mycelia/webnn-offload';
import { featureFlags } from '@mycelia/web4-feature-flags';
import { observability } from '@mycelia/observability';

const OraclePage: React.FC = () => {
  const [webnnCapabilities, setWebnnCapabilities] = useState<WebNNCapabilities | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [cpuOnlyMode, setCpuOnlyMode] = useState(false);
  const [embeddingTexts, setEmbeddingTexts] = useState<string[]>(['Hello world', 'This is a test', 'WebNN offload demo']);
  const [embeddingResult, setEmbeddingResult] = useState<EmbeddingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    // Initialize WebNN capabilities
    const caps = offload.getCapabilities();
    setWebnnCapabilities(caps);
    
    const model = offload.getModelInfo();
    setModelInfo(model);
    
    setCpuOnlyMode(offload.isCpuOnlyMode());
  }, []);

  const handleAddText = () => {
    if (customText.trim()) {
      setEmbeddingTexts(prev => [...prev, customText.trim()]);
      setCustomText('');
    }
  };

  const handleRemoveText = (index: number) => {
    setEmbeddingTexts(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessEmbeddings = async () => {
    if (embeddingTexts.length === 0) {
      alert('Please add some texts to process.');
      return;
    }

    setIsProcessing(true);
    try {
      const options: EmbeddingOptions = {
        model: 'text-embedding-3-small',
        dimensions: 1536,
        batchSize: 4,
        cpuOnly: cpuOnlyMode
      };

      const result = await offload.embed(embeddingTexts, options);
      setEmbeddingResult(result);
      
      console.log('Embedding processing completed:', result);
    } catch (error) {
      console.error('Embedding processing failed:', error);
      setEmbeddingResult({
        embeddings: [],
        method: 'fallback',
        processingTimeMs: 0,
        modelUsed: 'none',
        error: (error as Error).message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCpuOnlyToggle = (enabled: boolean) => {
    setCpuOnlyMode(enabled);
    offload.setCpuOnlyMode(enabled);
  };

  const calculateSimilarity = (embedding1: Float32Array, embedding2: Float32Array): number => {
    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  };

  return (
    <div className="oracle-page">
      <h1>Oracle - WebNN Model Offload</h1>
      <p>Test on-device embedding generation using WebNN acceleration.</p>

      {/* WebNN Capabilities Section */}
      <div className="capabilities-section">
        <h2>WebNN Capabilities</h2>
        
        <div className="capability-status">
          <div className="capability-item">
            <span>WebNN Available:</span>
            <span className={webnnCapabilities?.available ? 'capability-yes' : 'capability-no'}>
              {webnnCapabilities?.available ? 'Yes' : 'No'}
            </span>
          </div>
          
          {webnnCapabilities?.available && (
            <>
              <div className="capability-item">
                <span>Device Type:</span>
                <span className={`device-${webnnCapabilities.deviceType}`}>
                  {webnnCapabilities.deviceType.toUpperCase()}
                </span>
              </div>
              
              <div className="capability-item">
                <span>Vendor:</span>
                <span>{webnnCapabilities.vendor}</span>
              </div>
              
              <div className="capability-item">
                <span>Architecture:</span>
                <span>{webnnCapabilities.architecture}</span>
              </div>
              
              <div className="capability-item">
                <span>Supported Ops:</span>
                <span>{webnnCapabilities.supportedOps.length} operations</span>
              </div>
            </>
          )}
        </div>

        {modelInfo && (
          <div className="model-info">
            <h3>Loaded Model</h3>
            <div className="model-details">
              <div className="model-detail">
                <span>Name:</span>
                <span>{modelInfo.name}</span>
              </div>
              <div className="model-detail">
                <span>Size:</span>
                <span>{modelInfo.size} MB</span>
              </div>
              <div className="model-detail">
                <span>Input Shape:</span>
                <span>{modelInfo.inputShape.join(' x ')}</span>
              </div>
              <div className="model-detail">
                <span>Output Shape:</span>
                <span>{modelInfo.outputShape.join(' x ')}</span>
              </div>
              <div className="model-detail">
                <span>Quantization:</span>
                <span>{modelInfo.quantization}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Controls */}
      <div className="processing-section">
        <h2>Embedding Processing</h2>
        
        <div className="processing-controls">
          <div className="cpu-only-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={cpuOnlyMode}
                onChange={(e) => handleCpuOnlyToggle(e.target.checked)}
                disabled={!webnnCapabilities?.available}
              />
              CPU Only Mode
            </label>
            <p>Force processing on CPU for privacy-sensitive applications</p>
          </div>

          <div className="text-input-section">
            <h3>Input Texts</h3>
            <div className="text-input-controls">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter text to embed..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddText()}
              />
              <button onClick={handleAddText}>Add Text</button>
            </div>
            
            <div className="text-list">
              {embeddingTexts.map((text, index) => (
                <div key={index} className="text-item">
                  <span className="text-content">{text}</span>
                  <button onClick={() => handleRemoveText(index)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleProcessEmbeddings}
            disabled={isProcessing || embeddingTexts.length === 0 || !webnnCapabilities?.available}
            className="process-button"
          >
            {isProcessing ? 'Processing...' : 'Process Embeddings'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {embeddingResult && (
        <div className="results-section">
          <h2>Processing Results</h2>
          
          <div className="result-summary">
            <div className="result-metric">
              <span>Method:</span>
              <span className={`method-${embeddingResult.method}`}>
                {embeddingResult.method.toUpperCase()}
              </span>
            </div>
            
            <div className="result-metric">
              <span>Model Used:</span>
              <span>{embeddingResult.modelUsed}</span>
            </div>
            
            <div className="result-metric">
              <span>Processing Time:</span>
              <span>{embeddingResult.processingTimeMs.toFixed(2)} ms</span>
            </div>
            
            <div className="result-metric">
              <span>Texts Processed:</span>
              <span>{embeddingTexts.length}</span>
            </div>
            
            <div className="result-metric">
              <span>Embeddings Generated:</span>
              <span>{embeddingResult.embeddings.length}</span>
            </div>
            
            {embeddingResult.error && (
              <div className="result-error">
                <span>Error:</span>
                <span>{embeddingResult.error}</span>
              </div>
            )}
          </div>

          {embeddingResult.embeddings.length > 0 && (
            <div className="embeddings-section">
              <h3>Generated Embeddings</h3>
              
              <div className="embeddings-grid">
                {embeddingResult.embeddings.map((embedding, index) => (
                  <div key={index} className="embedding-item">
                    <h4>Text {index + 1}: "{embeddingTexts[index]}"</h4>
                    <div className="embedding-preview">
                      <span>Dimensions: {embedding.length}</span>
                      <span>First 5 values: [{embedding.slice(0, 5).map(v => v.toFixed(3)).join(', ')}...]</span>
                      <span>Magnitude: {Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)).toFixed(3)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {embeddingResult.embeddings.length > 1 && (
                <div className="similarity-section">
                  <h3>Similarity Matrix</h3>
                  <div className="similarity-matrix">
                    {embeddingResult.embeddings.map((embedding1, i) => (
                      <div key={i} className="similarity-row">
                        {embeddingResult.embeddings.map((embedding2, j) => {
                          const similarity = calculateSimilarity(embedding1, embedding2);
                          return (
                            <div 
                              key={j} 
                              className={`similarity-cell ${i === j ? 'diagonal' : ''}`}
                              title={`Similarity between "${embeddingTexts[i]}" and "${embeddingTexts[j]}"`}
                            >
                              {i === j ? '1.000' : similarity.toFixed(3)}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .oracle-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          color: #eee;
        }

        h1 {
          color: #00d4ff;
          margin-bottom: 1rem;
          text-align: center;
        }

        p {
          text-align: center;
          color: #ccc;
          margin-bottom: 2rem;
        }

        h2 {
          color: #00ff88;
          margin-top: 2rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #333;
          padding-bottom: 0.5rem;
        }

        h3 {
          color: #00d4ff;
          margin-bottom: 1rem;
        }

        h4 {
          color: #ccc;
          margin-bottom: 0.5rem;
        }

        /* Capabilities Section */
        .capabilities-section {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 2rem;
        }

        .capability-status {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .capability-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .capability-item span:first-child {
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

        .device-cpu {
          color: #00d4ff;
          font-weight: bold;
        }

        .device-gpu {
          color: #00ff88;
          font-weight: bold;
        }

        .device-npu {
          color: #ffaa00;
          font-weight: bold;
        }

        .device-unknown {
          color: #888;
          font-weight: bold;
        }

        .model-info {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 4px;
          padding: 15px;
        }

        .model-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }

        .model-detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .model-detail span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        /* Processing Section */
        .processing-section {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid #00ff88;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 2rem;
        }

        .processing-controls {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .cpu-only-toggle {
          margin-bottom: 20px;
        }

        .cpu-only-toggle label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ccc;
          font-weight: bold;
        }

        .cpu-only-toggle input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }

        .cpu-only-toggle p {
          margin: 5px 0 0 30px;
          font-size: 0.9rem;
          color: #888;
        }

        .text-input-section {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 4px;
          padding: 15px;
        }

        .text-input-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .text-input-controls input {
          flex: 1;
          padding: 10px;
          background: #333;
          border: 1px solid #555;
          border-radius: 4px;
          color: #eee;
        }

        .text-input-controls button {
          background: #00ff88;
          color: #1a1a1a;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .text-input-controls button:hover {
          background: #00e677;
        }

        .text-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .text-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          border: 1px solid rgba(0, 255, 136, 0.1);
        }

        .text-content {
          color: #ccc;
          flex: 1;
        }

        .text-item button {
          background: #ff6666;
          color: #1a1a1a;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .text-item button:hover {
          background: #e65c5c;
        }

        .process-button {
          background: #00ff88;
          color: #1a1a1a;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1.1rem;
          transition: background 0.3s ease;
        }

        .process-button:hover:not(:disabled) {
          background: #00e677;
        }

        .process-button:disabled {
          background: #555;
          cursor: not-allowed;
        }

        /* Results Section */
        .results-section {
          background: rgba(255, 170, 0, 0.1);
          border: 1px solid #ffaa00;
          border-radius: 8px;
          padding: 20px;
        }

        .result-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .result-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(255, 170, 0, 0.2);
        }

        .result-metric span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .method-webnn {
          color: #00ff88;
          font-weight: bold;
        }

        .method-remote {
          color: #ffaa00;
          font-weight: bold;
        }

        .method-fallback {
          color: #ff6666;
          font-weight: bold;
        }

        .result-error {
          grid-column: 1 / -1;
          background: rgba(255, 102, 102, 0.1);
          border: 1px solid #ff6666;
          border-radius: 4px;
          padding: 10px;
          margin-top: 10px;
        }

        .result-error span:first-child {
          color: #ff6666;
          font-weight: bold;
        }

        .result-error span:last-child {
          color: #ffcccc;
          font-family: monospace;
        }

        .embeddings-section {
          margin-top: 20px;
        }

        .embeddings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .embedding-item {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 170, 0, 0.2);
          border-radius: 4px;
          padding: 15px;
        }

        .embedding-preview {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 10px;
        }

        .embedding-preview span {
          color: #ccc;
          font-size: 0.9rem;
          font-family: monospace;
        }

        .similarity-section {
          margin-top: 20px;
        }

        .similarity-matrix {
          display: flex;
          flex-direction: column;
          gap: 5px;
          max-width: 600px;
        }

        .similarity-row {
          display: flex;
          gap: 5px;
        }

        .similarity-cell {
          flex: 1;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 170, 0, 0.2);
          border-radius: 4px;
          text-align: center;
          font-family: monospace;
          font-size: 0.9rem;
          color: #ccc;
          cursor: help;
        }

        .similarity-cell.diagonal {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
          font-weight: bold;
        }

        .similarity-cell:hover {
          background: rgba(255, 170, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default OraclePage;