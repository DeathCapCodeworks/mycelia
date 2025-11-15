---
title: Webnn Offload
---

# WebNN Model Offload

This document describes Mycelia's WebNN model offload implementation for running AI models locally on user devices.

## Overview

WebNN Model Offload enables running AI models (specifically embedding models) directly on user devices using WebNN acceleration, with remote API fallback. This approach provides privacy benefits, reduced latency, and improved user experience.

## Architecture

### WebNN Pipeline

1. **Model Loading:** Load pre-trained model weights and metadata
2. **Input Preprocessing:** Tokenize and prepare text inputs
3. **WebNN Inference:** Run model inference using WebNN API
4. **Output Postprocessing:** Process and normalize embeddings
5. **Result Return:** Return processed embeddings

### Remote API Fallback

When WebNN is unavailable:
1. **Input Preparation:** Same preprocessing as WebNN
2. **API Request:** Send requests to remote embedding service
3. **Response Processing:** Handle API responses and errors
4. **Result Return:** Return embeddings from API

## API Reference

### Basic Usage

```typescript
import { offload } from '@mycelia/webnn-offload';

// Generate embeddings for text array
const texts = ['Hello world', 'This is a test'];
const result = await offload.embed(texts, {
  model: 'text-embedding-3-small',
  dimensions: 1536,
  batchSize: 4
});

console.log('Method used:', result.method);
console.log('Processing time:', result.processingTimeMs);
console.log('Embeddings:', result.embeddings);
```text

### Configuration Options

```typescript
interface EmbeddingOptions {
  model?: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions?: number;        // Embedding dimensions
  batchSize?: number;        // Batch processing size
  cpuOnly?: boolean;         // Force CPU processing
}
```text

### Result Object

```typescript
interface EmbeddingResult {
  embeddings: Float32Array[];  // Generated embeddings
  method: 'webnn' | 'remote' | 'fallback';  // Processing method
  processingTimeMs: number;   // Processing time
  modelUsed: string;          // Model name used
  error?: string;             // Error message if failed
}
```text

## Capability Detection

### Check WebNN Support

```typescript
import { offload } from '@mycelia/webnn-offload';

// Check WebNN availability
const webnnAvailable = offload.isWebNNAvailable();
console.log('WebNN available:', webnnAvailable);

// Get detailed capabilities
const capabilities = offload.getCapabilities();
console.log('Device type:', capabilities.deviceType);
console.log('Supported ops:', capabilities.supportedOps);

// Get model information
const modelInfo = offload.getModelInfo();
console.log('Model name:', modelInfo?.name);
console.log('Model size:', modelInfo?.size);
```text

### Capability Object

```typescript
interface WebNNCapabilities {
  available: boolean;                    // WebNN support
  supportedOps: string[];               // Supported operations
  deviceType: 'cpu' | 'gpu' | 'npu' | 'unknown';  // Processing device
  vendor: string;                        // Hardware vendor
  architecture: string;                  // Hardware architecture
}
```text

### Model Information

```typescript
interface ModelInfo {
  name: string;                          // Model name
  size: number;                          // Model size in MB
  inputShape: number[];                  // Input tensor shape
  outputShape: number[];                 // Output tensor shape
  quantization: 'fp32' | 'fp16' | 'int8' | 'int4';  // Quantization type
}
```text

## Implementation Details

### WebNN Model Execution

The embedding model uses WebNN for efficient inference:

```typescript
// Example WebNN model execution (simplified)
async function runWebNNInference(inputIds: MLTensor): Promise<MLTensor> {
  const context = await navigator.ml.createContext();
  const model = await context.createModel(modelBuffer);
  
  const inputs = { 'input_ids': inputIds };
  const outputs = await model.compute(inputs);
  
  return outputs['embeddings'];
}
```text

### Text Tokenization

Text preprocessing for model input:

```typescript
function tokenizeText(text: string): number[] {
  // Simplified tokenization (in practice, use proper tokenizer)
  const words = text.toLowerCase().split(/\s+/);
  return words.map(word => {
    // Convert word to token ID using vocabulary
    return getTokenId(word);
  });
}
```text

### Embedding Normalization

Post-processing for consistent embeddings:

```typescript
function normalizeEmbedding(embedding: Float32Array): Float32Array {
  // Calculate L2 norm
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  
  // Normalize to unit vector
  return embedding.map(val => val / norm);
}
```text

## Privacy Features

### CPU-Only Mode

Force processing on CPU for enhanced privacy:

```typescript
import { offload } from '@mycelia/webnn-offload';

// Enable CPU-only mode
offload.setCpuOnlyMode(true);

// Check current mode
const isCpuOnly = offload.isCpuOnlyMode();
console.log('CPU-only mode:', isCpuOnly);

// Process with CPU-only constraint
const result = await offload.embed(texts, { cpuOnly: true });
```text

### Local Processing Benefits

1. **Data Privacy:** Text never leaves the device
2. **Reduced Latency:** No network requests
3. **Offline Capability:** Works without internet
4. **Cost Savings:** No API usage fees

## Performance Considerations

### Hardware Requirements

**WebNN (Recommended):**
- Modern CPU with AI acceleration
- Chrome 110+ or Edge 110+
- Windows 10+, macOS 12+, or Linux

**CPU Fallback:**
- Any modern CPU
- All major browsers
- Lower performance than WebNN

### Performance Metrics

Typical performance on mid-range hardware:

| Method | Text Count | Batch Size | Processing Time | CPU Usage |
|--------|------------|------------|----------------|-----------|
| WebNN (NPU) | 100 | 8 | 200ms | Low |
| WebNN (GPU) | 100 | 8 | 500ms | Low |
| WebNN (CPU) | 100 | 8 | 2000ms | High |
| Remote API | 100 | 8 | 1500ms | Low |

### Optimization Tips

1. **Batch Processing:** Process multiple texts together
2. **Model Selection:** Use smaller models for better performance
3. **CPU-Only Mode:** Disable for better performance when privacy allows
4. **Caching:** Cache embeddings for repeated texts

## Integration Examples

### React Component

```tsx
import React, { useState, useEffect } from 'react';
import { offload } from '@mycelia/webnn-offload';

const EmbeddingGenerator: React.FC = () => {
  const [texts, setTexts] = useState<string[]>([]);
  const [embeddings, setEmbeddings] = useState<Float32Array[]>([]);
  const [capabilities, setCapabilities] = useState(null);

  useEffect(() => {
    const caps = offload.getCapabilities();
    setCapabilities(caps);
  }, []);

  const generateEmbeddings = async () => {
    const result = await offload.embed(texts, {
      model: 'text-embedding-3-small',
      batchSize: 4
    });

    if (result.success) {
      setEmbeddings(result.embeddings);
    }
  };

  return (
    <div>
      <div>
        <h3>WebNN Capabilities</h3>
        <p>Available: {capabilities?.available ? 'Yes' : 'No'}</p>
        <p>Device: {capabilities?.deviceType}</p>
      </div>
      
      <div>
        <h3>Generate Embeddings</h3>
        <button onClick={generateEmbeddings}>
          Process Texts
        </button>
      </div>
    </div>
  );
};
```text

### Oracle Integration

```typescript
import { offload } from '@mycelia/webnn-offload';

class OracleService {
  private cache = new Map<string, Float32Array>();

  async getEmbedding(text: string): Promise<Float32Array> {
    // Check cache first
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    // Generate embedding
    const result = await offload.embed([text], {
      model: 'text-embedding-3-small',
      dimensions: 1536
    });

    if (result.success && result.embeddings.length > 0) {
      const embedding = result.embeddings[0];
      this.cache.set(text, embedding);
      return embedding;
    }

    throw new Error('Failed to generate embedding');
  }

  async findSimilar(query: string, candidates: string[]): Promise<string[]> {
    const queryEmbedding = await this.getEmbedding(query);
    
    const similarities = await Promise.all(
      candidates.map(async (candidate) => {
        const candidateEmbedding = await this.getEmbedding(candidate);
        const similarity = this.calculateSimilarity(queryEmbedding, candidateEmbedding);
        return { text: candidate, similarity };
      })
    );

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.text);
  }

  private calculateSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct; // Assuming normalized embeddings
  }
}
```text

## Feature Flags

Model offload is controlled by feature flags:

```typescript
import { featureFlags } from '@mycelia/web4-feature-flags';

// Check if offload is enabled
const offloadEnabled = featureFlags.isFlagEnabled('oracle_webnn_offload');

// Enable offload for specific users
featureFlags.setFlag('oracle_webnn_offload', true, { userId: 'user123' });
```text

## Error Handling

### Common Errors

**WebNN Not Available:**
```typescript
const result = await offload.embed(texts, options);
if (result.method === 'fallback') {
  console.warn('WebNN not available, using remote API');
}
```text

**Model Loading Failed:**
```typescript
const modelInfo = offload.getModelInfo();
if (!modelInfo) {
  console.error('Model failed to load');
  // Fallback to remote API
}
```text

### Error Recovery

```typescript
async function safeEmbed(texts: string[], options: EmbeddingOptions) {
  try {
    // Try WebNN first
    const result = await offload.embed(texts, { ...options, cpuOnly: false });
    if (result.success) return result;

    // Fallback to remote API
    return await offload.embed(texts, { ...options, cpuOnly: false });
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return { embeddings: [], method: 'fallback', processingTimeMs: 0, modelUsed: 'none' };
  }
}
```text

## Testing

### Unit Tests

```typescript
import { offload } from '@mycelia/webnn-offload';

describe('WebNN Offload', () => {
  test('should detect WebNN capabilities', () => {
    const capabilities = offload.getCapabilities();
    expect(capabilities).toBeDefined();
    expect(typeof capabilities.available).toBe('boolean');
  });

  test('should generate embeddings', async () => {
    const texts = ['test text'];
    const result = await offload.embed(texts, { batchSize: 1 });
    
    expect(result.success).toBe(true);
    expect(result.embeddings).toHaveLength(1);
    expect(result.embeddings[0]).toBeInstanceOf(Float32Array);
  });

  test('should respect CPU-only mode', async () => {
    offload.setCpuOnlyMode(true);
    const capabilities = offload.getCapabilities();
    expect(capabilities.deviceType).toBe('cpu');
  });
});
```text

### Performance Tests

```typescript
test('should meet performance targets', async () => {
  const texts = Array(100).fill('test text');
  const startTime = performance.now();
  
  const result = await offload.embed(texts, { batchSize: 8 });
  
  const processingTime = performance.now() - startTime;
  expect(processingTime).toBeLessThan(5000); // < 5 seconds
  expect(result.success).toBe(true);
});
```text

## Browser Compatibility

### WebNN Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 110+ | ✅ Supported |
| Edge | 110+ | ✅ Supported |
| Firefox | TBD | 🚧 In Development |
| Safari | TBD | 🚧 In Development |

### Fallback Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 57+ | ✅ Remote API |
| Firefox | 52+ | ✅ Remote API |
| Safari | 11+ | ✅ Remote API |
| Edge | 16+ | ✅ Remote API |

## Troubleshooting

### WebNN Issues

**"WebNN not supported"**
- Update browser to latest version
- Check hardware compatibility
- Verify WebNN feature flags

**"Model loading failed"**
- Check network connectivity
- Verify model file integrity
- Review browser console for errors

### Performance Issues

**"Processing too slow"**
- Reduce batch size
- Use smaller model
- Check CPU usage

**"Memory errors"**
- Reduce batch size
- Process texts individually
- Check available memory

## Future Enhancements

### Planned Features

1. **Multiple Models:** Support for different embedding models
2. **Custom Models:** User-uploaded model support
3. **Batch Optimization:** Improved batch processing
4. **Caching:** Intelligent embedding caching

### Performance Improvements

1. **Model Quantization:** Smaller, faster models
2. **Hardware Optimization:** Better NPU/GPU utilization
3. **Memory Management:** Reduced memory footprint
4. **Pipeline Optimization:** Streamlined processing

## Support

For WebNN offload issues:
- Check browser compatibility
- Review error messages in console
- Test with different text inputs
- Contact the AI team
- Submit issues to the Mycelia repository
