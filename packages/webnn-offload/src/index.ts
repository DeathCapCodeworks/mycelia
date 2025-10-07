import { featureFlags } from '@mycelia/web4-feature-flags';
import { observability } from '@mycelia/observability';

export interface EmbeddingOptions {
  model?: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions?: number;
  batchSize?: number;
  cpuOnly?: boolean;
}

export interface EmbeddingResult {
  embeddings: Float32Array[];
  method: 'webnn' | 'remote' | 'fallback';
  processingTimeMs: number;
  modelUsed: string;
  error?: string;
}

export interface WebNNCapabilities {
  available: boolean;
  supportedOps: string[];
  deviceType: 'cpu' | 'gpu' | 'npu' | 'unknown';
  vendor: string;
  architecture: string;
}

export interface ModelInfo {
  name: string;
  size: number; // in MB
  inputShape: number[];
  outputShape: number[];
  quantization: 'fp32' | 'fp16' | 'int8' | 'int4';
}

export class WebNNModelOffload {
  private context: MLContext | null = null;
  private capabilities: WebNNCapabilities | null = null;
  private embeddingModel: MLGraph | null = null;
  private modelInfo: ModelInfo | null = null;
  private isInitialized = false;
  private cpuOnlyMode = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Check if WebNN is available
      if ('ml' in navigator) {
        this.context = await navigator.ml.createContext();
        this.capabilities = await this.detectCapabilities();
        
        observability.logEvent('webnn_offload_initialized', {
          available: this.capabilities.available,
          device_type: this.capabilities.deviceType,
          vendor: this.capabilities.vendor,
          supported_ops: this.capabilities.supportedOps.length
        });

        // Load embedding model if available
        if (this.capabilities.available) {
          await this.loadEmbeddingModel();
        }
      } else {
        this.capabilities = {
          available: false,
          supportedOps: [],
          deviceType: 'unknown',
          vendor: 'unknown',
          architecture: 'unknown'
        };
      }

      this.isInitialized = true;
    } catch (error) {
      console.warn('WebNN offload initialization failed:', error);
      observability.logEvent('webnn_offload_init_failed', {
        error: (error as Error).message
      });
    }
  }

  private async detectCapabilities(): Promise<WebNNCapabilities> {
    if (!this.context) {
      return {
        available: false,
        supportedOps: [],
        deviceType: 'unknown',
        vendor: 'unknown',
        architecture: 'unknown'
      };
    }

    try {
      // Mock capability detection
      // In real implementation, this would use actual WebNN APIs
      const deviceType = this.cpuOnlyMode ? 'cpu' : 'gpu';
      
      return {
        available: true,
        supportedOps: [
          'add', 'mul', 'conv2d', 'matmul', 'softmax', 'relu', 
          'transpose', 'reshape', 'slice', 'concat'
        ],
        deviceType: deviceType as 'cpu' | 'gpu' | 'npu',
        vendor: 'mock-vendor',
        architecture: 'mock-arch'
      };
    } catch (error) {
      return {
        available: false,
        supportedOps: [],
        deviceType: 'unknown',
        vendor: 'unknown',
        architecture: 'unknown'
      };
    }
  }

  private async loadEmbeddingModel(): Promise<void> {
    if (!this.context || !this.capabilities?.available) {
      return;
    }

    try {
      // Mock model loading
      // In real implementation, this would load actual model weights
      this.modelInfo = {
        name: 'text-embedding-3-small',
        size: 15.2, // MB
        inputShape: [1, 512], // max tokens
        outputShape: [1, 1536], // embedding dimensions
        quantization: 'fp16'
      };

      // Mock model compilation
      this.embeddingModel = {
        compute: async (inputs: Record<string, MLTensor>) => {
          // Mock inference
          const inputTensor = inputs['input_ids'];
          const batchSize = inputTensor.shape[0];
          const embeddingDim = this.modelInfo!.outputShape[1];
          
          const outputData = new Float32Array(batchSize * embeddingDim);
          
          // Generate mock embeddings (normally distributed)
          for (let i = 0; i < outputData.length; i++) {
            outputData[i] = (Math.random() - 0.5) * 2; // -1 to 1
          }
          
          // Normalize to unit vectors
          for (let b = 0; b < batchSize; b++) {
            const start = b * embeddingDim;
            const end = start + embeddingDim;
            const slice = outputData.slice(start, end);
            const norm = Math.sqrt(slice.reduce((sum, val) => sum + val * val, 0));
            
            for (let i = start; i < end; i++) {
              outputData[i] /= norm;
            }
          }
          
          return {
            'embeddings': {
              data: outputData,
              shape: [batchSize, embeddingDim],
              dataType: 'float32'
            }
          };
        }
      } as MLGraph;

      observability.logEvent('webnn_model_loaded', {
        model_name: this.modelInfo.name,
        model_size_mb: this.modelInfo.size,
        quantization: this.modelInfo.quantization
      });

    } catch (error) {
      console.warn('Failed to load embedding model:', error);
      observability.logEvent('webnn_model_load_failed', {
        error: (error as Error).message
      });
    }
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    const startTime = performance.now();
    
    // Check feature flag
    if (!featureFlags.isFlagEnabled('oracle_webnn_offload')) {
      return {
        embeddings: [],
        method: 'remote',
        processingTimeMs: 0,
        modelUsed: 'remote-api',
        error: 'WebNN offload feature flag disabled'
      };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check CPU-only mode
    if (options.cpuOnly || this.cpuOnlyMode) {
      this.cpuOnlyMode = true;
      if (this.capabilities?.deviceType !== 'cpu') {
        // Force CPU mode
        this.capabilities!.deviceType = 'cpu';
      }
    }

    try {
      // Try WebNN first
      if (this.embeddingModel && this.capabilities?.available) {
        const result = await this.processWithWebNN(texts, options);
        if (result.success) {
          const processingTime = performance.now() - startTime;
          
          observability.logEvent('webnn_embed_success', {
            method: 'webnn',
            text_count: texts.length,
            processing_time_ms: processingTime,
            device_type: this.capabilities.deviceType,
            model_used: this.modelInfo?.name || 'unknown'
          });
          
          return {
            embeddings: result.embeddings,
            method: 'webnn',
            processingTimeMs: processingTime,
            modelUsed: this.modelInfo?.name || 'webnn-model'
          };
        }
      }

      // Fallback to remote API
      const result = await this.processWithRemoteAPI(texts, options);
      const processingTime = performance.now() - startTime;
      
      observability.logEvent('webnn_embed_fallback', {
        method: 'remote',
        text_count: texts.length,
        processing_time_ms: processingTime,
        model_used: options.model || 'text-embedding-3-small'
      });
      
      return {
        embeddings: result.embeddings,
        method: 'remote',
        processingTimeMs: processingTime,
        modelUsed: options.model || 'text-embedding-3-small'
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      observability.logEvent('webnn_embed_error', {
        error: (error as Error).message,
        processing_time_ms: processingTime
      });

      return {
        embeddings: [],
        method: 'fallback',
        processingTimeMs: processingTime,
        modelUsed: 'none',
        error: (error as Error).message
      };
    }
  }

  private async processWithWebNN(texts: string[], options: EmbeddingOptions): Promise<{ success: boolean; embeddings: Float32Array[] }> {
    if (!this.embeddingModel || !this.modelInfo) {
      return { success: false, embeddings: [] };
    }

    try {
      const batchSize = options.batchSize || Math.min(texts.length, 8);
      const embeddings: Float32Array[] = [];

      // Process in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        // Tokenize (mock implementation)
        const tokenized = batch.map(text => this.tokenize(text));
        const maxTokens = Math.max(...tokenized.map(t => t.length));
        
        // Pad sequences
        const paddedTokens = tokenized.map(tokens => {
          const padded = new Array(maxTokens).fill(0);
          for (let j = 0; j < Math.min(tokens.length, maxTokens); j++) {
            padded[j] = tokens[j];
          }
          return padded;
        });

        // Create input tensor
        const inputData = new Float32Array(batch.length * maxTokens);
        for (let b = 0; b < batch.length; b++) {
          for (let t = 0; t < maxTokens; t++) {
            inputData[b * maxTokens + t] = paddedTokens[b][t];
          }
        }

        const inputTensor: MLTensor = {
          data: inputData,
          shape: [batch.length, maxTokens],
          dataType: 'float32'
        };

        // Run inference
        const outputs = await this.embeddingModel.compute({ 'input_ids': inputTensor });
        const outputTensor = outputs['embeddings'];
        
        // Extract embeddings
        const embeddingData = outputTensor.data as Float32Array;
        const embeddingDim = outputTensor.shape[1];
        
        for (let b = 0; b < batch.length; b++) {
          const start = b * embeddingDim;
          const end = start + embeddingDim;
          embeddings.push(embeddingData.slice(start, end));
        }
      }

      return { success: true, embeddings };

    } catch (error) {
      console.error('WebNN processing failed:', error);
      return { success: false, embeddings: [] };
    }
  }

  private async processWithRemoteAPI(texts: string[], options: EmbeddingOptions): Promise<{ embeddings: Float32Array[] }> {
    // Mock remote API call
    // In real implementation, this would call actual embedding API
    const embeddings: Float32Array[] = [];
    const embeddingDim = options.dimensions || 1536;

    for (const text of texts) {
      const embedding = new Float32Array(embeddingDim);
      
      // Generate mock embedding based on text hash
      const hash = this.hashString(text);
      const seed = hash % 1000000;
      
      // Use seed for reproducible "random" embedding
      for (let i = 0; i < embeddingDim; i++) {
        const pseudoRandom = Math.sin(seed + i) * 10000;
        embedding[i] = (pseudoRandom - Math.floor(pseudoRandom)) * 2 - 1; // -1 to 1
      }
      
      // Normalize
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      for (let i = 0; i < embeddingDim; i++) {
        embedding[i] /= norm;
      }
      
      embeddings.push(embedding);
    }

    return { embeddings };
  }

  private tokenize(text: string): number[] {
    // Mock tokenization
    // In real implementation, this would use actual tokenizer
    const words = text.toLowerCase().split(/\s+/);
    return words.map(word => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
      }
      return Math.abs(hash) % 30000; // Mock vocab size
    });
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getCapabilities(): WebNNCapabilities | null {
    return this.capabilities;
  }

  getModelInfo(): ModelInfo | null {
    return this.modelInfo;
  }

  isWebNNAvailable(): boolean {
    return this.capabilities?.available || false;
  }

  setCpuOnlyMode(enabled: boolean): void {
    this.cpuOnlyMode = enabled;
    if (enabled && this.capabilities) {
      this.capabilities.deviceType = 'cpu';
    }
  }

  isCpuOnlyMode(): boolean {
    return this.cpuOnlyMode;
  }

  destroy(): void {
    this.context = null;
    this.embeddingModel = null;
    this.isInitialized = false;
  }
}

// Global instance
let globalWebNNOffload: WebNNModelOffload | null = null;

export function getWebNNModelOffload(): WebNNModelOffload {
  if (!globalWebNNOffload) {
    globalWebNNOffload = new WebNNModelOffload();
  }
  return globalWebNNOffload;
}

// Convenience exports
export const offload = {
  embed: (texts: string[], options?: EmbeddingOptions) => 
    getWebNNModelOffload().embed(texts, options),
  getCapabilities: () => getWebNNModelOffload().getCapabilities(),
  getModelInfo: () => getWebNNModelOffload().getModelInfo(),
  isWebNNAvailable: () => getWebNNModelOffload().isWebNNAvailable(),
  setCpuOnlyMode: (enabled: boolean) => getWebNNModelOffload().setCpuOnlyMode(enabled),
  isCpuOnlyMode: () => getWebNNModelOffload().isCpuOnlyMode()
};
