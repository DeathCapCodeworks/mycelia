import { featureFlags } from '@mycelia/web4-feature-flags';
import { observability } from '@mycelia/observability';

export interface SuperResolutionOptions {
  scale: 1.5 | 2.0;
  quality: 'fast' | 'high';
  fallbackToWasm?: boolean;
}

export interface SuperResolutionResult {
  success: boolean;
  method: 'webgpu' | 'wasm' | 'none';
  processingTimeMs: number;
  outputWidth: number;
  outputHeight: number;
  error?: string;
}

export interface WebGPUCapabilities {
  available: boolean;
  computeShaderSupport: boolean;
  storageTextureSupport: boolean;
  adapterInfo?: GPUAdapterInfo;
}

export class WebGPUSuperResolution {
  private device: GPUDevice | null = null;
  private capabilities: WebGPUCapabilities | null = null;
  private wasmModule: any = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Check if WebGPU is available
      if ('gpu' in navigator) {
        const adapter = await navigator.requestAdapter();
        if (adapter) {
          this.device = await adapter.requestDevice();
          this.capabilities = {
            available: true,
            computeShaderSupport: true, // Assume support for simplicity
            storageTextureSupport: true,
            adapterInfo: adapter.info
          };
          observability.logEvent('webgpu_sr_initialized', {
            method: 'webgpu',
            adapter_vendor: adapter.info?.vendor,
            adapter_architecture: adapter.info?.architecture
          });
        }
      }

      // Initialize WASM fallback
      await this.initializeWasmFallback();

      this.isInitialized = true;
    } catch (error) {
      console.warn('WebGPU SR initialization failed:', error);
      observability.logEvent('webgpu_sr_init_failed', {
        error: (error as Error).message
      });
    }
  }

  private async initializeWasmFallback(): Promise<void> {
    try {
      // Mock WASM module initialization
      // In real implementation, this would load actual WASM binary
      this.wasmModule = {
        process: (inputData: Uint8Array, width: number, height: number, scale: number) => {
          // Mock WASM processing
          const outputWidth = Math.floor(width * scale);
          const outputHeight = Math.floor(height * scale);
          const outputData = new Uint8Array(outputWidth * outputHeight * 4);
          
          // Simple nearest neighbor upscaling for demo
          for (let y = 0; y < outputHeight; y++) {
            for (let x = 0; x < outputWidth; x++) {
              const srcX = Math.floor(x / scale);
              const srcY = Math.floor(y / scale);
              const srcIndex = (srcY * width + srcX) * 4;
              const dstIndex = (y * outputWidth + x) * 4;
              
              outputData[dstIndex] = inputData[srcIndex];     // R
              outputData[dstIndex + 1] = inputData[srcIndex + 1]; // G
              outputData[dstIndex + 2] = inputData[srcIndex + 2]; // B
              outputData[dstIndex + 3] = inputData[srcIndex + 3]; // A
            }
          }
          
          return outputData;
        }
      };
    } catch (error) {
      console.warn('WASM fallback initialization failed:', error);
    }
  }

  async upscale(videoElement: HTMLVideoElement, options: SuperResolutionOptions): Promise<SuperResolutionResult> {
    const startTime = performance.now();
    
    // Check feature flag
    if (!featureFlags.isFlagEnabled('engine_webgpu_sr')) {
      return {
        success: false,
        method: 'none',
        processingTimeMs: 0,
        outputWidth: videoElement.videoWidth,
        outputHeight: videoElement.videoHeight,
        error: 'WebGPU SR feature flag disabled'
      };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    const inputWidth = videoElement.videoWidth;
    const inputHeight = videoElement.videoHeight;
    const outputWidth = Math.floor(inputWidth * options.scale);
    const outputHeight = Math.floor(inputHeight * options.scale);

    try {
      // Try WebGPU first
      if (this.device && this.capabilities?.available) {
        const result = await this.processWithWebGPU(videoElement, options);
        if (result.success) {
          const processingTime = performance.now() - startTime;
          observability.logEvent('webgpu_sr_success', {
            method: 'webgpu',
            scale: options.scale,
            quality: options.quality,
            processing_time_ms: processingTime,
            input_resolution: `${inputWidth}x${inputHeight}`,
            output_resolution: `${outputWidth}x${outputHeight}`
          });
          
          return {
            ...result,
            processingTimeMs: processingTime,
            outputWidth,
            outputHeight
          };
        }
      }

      // Fallback to WASM
      if (options.fallbackToWasm !== false && this.wasmModule) {
        const result = await this.processWithWasm(videoElement, options);
        const processingTime = performance.now() - startTime;
        
        observability.logEvent('webgpu_sr_fallback', {
          method: 'wasm',
          scale: options.scale,
          quality: options.quality,
          processing_time_ms: processingTime,
          input_resolution: `${inputWidth}x${inputHeight}`,
          output_resolution: `${outputWidth}x${outputHeight}`
        });
        
        return {
          ...result,
          processingTimeMs: processingTime,
          outputWidth,
          outputHeight
        };
      }

      // No processing available
      const processingTime = performance.now() - startTime;
      observability.logEvent('webgpu_sr_unavailable', {
        webgpu_available: this.capabilities?.available || false,
        wasm_available: !!this.wasmModule,
        processing_time_ms: processingTime
      });

      return {
        success: false,
        method: 'none',
        processingTimeMs: processingTime,
        outputWidth: inputWidth,
        outputHeight: inputHeight,
        error: 'No processing method available'
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      observability.logEvent('webgpu_sr_error', {
        error: (error as Error).message,
        processing_time_ms: processingTime
      });

      return {
        success: false,
        method: 'none',
        processingTimeMs: processingTime,
        outputWidth: inputWidth,
        outputHeight: inputHeight,
        error: (error as Error).message
      };
    }
  }

  private async processWithWebGPU(videoElement: HTMLVideoElement, options: SuperResolutionOptions): Promise<SuperResolutionResult> {
    if (!this.device) {
      return { success: false, method: 'webgpu', processingTimeMs: 0, outputWidth: 0, outputHeight: 0 };
    }

    try {
      // Create canvas to extract video frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const inputData = imageData.data;

      // Create WebGPU texture from image data
      const textureDescriptor: GPUTextureDescriptor = {
        size: [canvas.width, canvas.height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
      };

      const inputTexture = this.device.createTexture(textureDescriptor);
      
      // Create output texture
      const outputWidth = Math.floor(canvas.width * options.scale);
      const outputHeight = Math.floor(canvas.height * options.scale);
      
      const outputTextureDescriptor: GPUTextureDescriptor = {
        size: [outputWidth, outputHeight],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING
      };

      const outputTexture = this.device.createTexture(outputTextureDescriptor);

      // Upload input data
      this.device.queue.writeTexture(
        { texture: inputTexture },
        inputData,
        { bytesPerRow: canvas.width * 4 },
        { width: canvas.width, height: canvas.height }
      );

      // Mock compute shader processing
      // In real implementation, this would use actual compute shaders
      const outputData = new Uint8Array(outputWidth * outputHeight * 4);
      
      // Simple nearest neighbor upscaling for demo
      for (let y = 0; y < outputHeight; y++) {
        for (let x = 0; x < outputWidth; x++) {
          const srcX = Math.floor(x / options.scale);
          const srcY = Math.floor(y / options.scale);
          const srcIndex = (srcY * canvas.width + srcX) * 4;
          const dstIndex = (y * outputWidth + x) * 4;
          
          outputData[dstIndex] = inputData[srcIndex];     // R
          outputData[dstIndex + 1] = inputData[srcIndex + 1]; // G
          outputData[dstIndex + 2] = inputData[srcIndex + 2]; // B
          outputData[dstIndex + 3] = inputData[srcIndex + 3]; // A
        }
      }

      // Download output data
      const outputImageData = new ImageData(
        new Uint8ClampedArray(outputData),
        outputWidth,
        outputHeight
      );

      // Create output canvas
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) {
        throw new Error('Could not get output canvas context');
      }

      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;
      outputCtx.putImageData(outputImageData, 0, 0);

      // Clean up
      inputTexture.destroy();
      outputTexture.destroy();

      return {
        success: true,
        method: 'webgpu',
        processingTimeMs: 0, // Will be set by caller
        outputWidth,
        outputHeight
      };

    } catch (error) {
      return {
        success: false,
        method: 'webgpu',
        processingTimeMs: 0,
        outputWidth: 0,
        outputHeight: 0,
        error: (error as Error).message
      };
    }
  }

  private async processWithWasm(videoElement: HTMLVideoElement, options: SuperResolutionOptions): Promise<SuperResolutionResult> {
    if (!this.wasmModule) {
      return { success: false, method: 'wasm', processingTimeMs: 0, outputWidth: 0, outputHeight: 0 };
    }

    try {
      // Create canvas to extract video frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const inputData = new Uint8Array(imageData.data);

      // Process with WASM
      const outputData = this.wasmModule.process(inputData, canvas.width, canvas.height, options.scale);

      // Create output canvas
      const outputWidth = Math.floor(canvas.width * options.scale);
      const outputHeight = Math.floor(canvas.height * options.scale);
      
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) {
        throw new Error('Could not get output canvas context');
      }

      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;
      
      const outputImageData = new ImageData(
        new Uint8ClampedArray(outputData),
        outputWidth,
        outputHeight
      );
      
      outputCtx.putImageData(outputImageData, 0, 0);

      return {
        success: true,
        method: 'wasm',
        processingTimeMs: 0, // Will be set by caller
        outputWidth,
        outputHeight
      };

    } catch (error) {
      return {
        success: false,
        method: 'wasm',
        processingTimeMs: 0,
        outputWidth: 0,
        outputHeight: 0,
        error: (error as Error).message
      };
    }
  }

  getCapabilities(): WebGPUCapabilities | null {
    return this.capabilities;
  }

  isWebGPUAvailable(): boolean {
    return this.capabilities?.available || false;
  }

  isWasmAvailable(): boolean {
    return !!this.wasmModule;
  }

  destroy(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.wasmModule = null;
    this.isInitialized = false;
  }
}

// Global instance
let globalWebGPUSR: WebGPUSuperResolution | null = null;

export function getWebGPUSuperResolution(): WebGPUSuperResolution {
  if (!globalWebGPUSR) {
    globalWebGPUSR = new WebGPUSuperResolution();
  }
  return globalWebGPUSR;
}

// Convenience exports
export const sr = {
  upscale: (videoElement: HTMLVideoElement, options: SuperResolutionOptions) => 
    getWebGPUSuperResolution().upscale(videoElement, options),
  getCapabilities: () => getWebGPUSuperResolution().getCapabilities(),
  isWebGPUAvailable: () => getWebGPUSuperResolution().isWebGPUAvailable(),
  isWasmAvailable: () => getWebGPUSuperResolution().isWasmAvailable()
};
