export type EncodeOptions = {
  input: ArrayBuffer | Uint8Array;
  codec: 'av1' | 'vp9' | 'h264';
  bitrate: number;
  fps: number;
  width: number;
  height: number;
  hardwarePreferred?: boolean;
};

export type TranscodeOptions = {
  input: ArrayBuffer | Uint8Array;
  targetCodec: 'av1' | 'vp9' | 'h264';
  qualityProfile: 'speed' | 'balanced' | 'quality';
};

export type EffectOptions = {
  type: 'blur' | 'brightness' | 'contrast' | 'saturation' | 'noise_reduction' | 'background_removal';
  intensity: number;
  region?: { x: number; y: number; width: number; height: number };
};

export type AV1Preset = 
  | 'realtime_720p30_lowdelay'
  | 'vod_1080p30_high'
  | 'vod_4k24_archive';

export type AV1Config = {
  preset: AV1Preset;
  gopSize: number;
  lagInFrames: number;
  tileRows: number;
  tileCols: number;
  targetBitrate: number;
  rateControl: 'cbr' | 'vbr' | 'cq';
  screenContentMode?: boolean;
  enableDenoise?: boolean;
  enableDeband?: boolean;
  enableSuperRes?: boolean;
};

export type HardwareCapabilities = {
  av1Encode: boolean;
  av1Decode: boolean;
  platform: 'windows' | 'macos' | 'linux' | 'unknown';
  mediaFoundation?: boolean;
  videoToolbox?: boolean;
  vaApi?: boolean;
  dxva2?: boolean;
};

export type EncodedChunkStream = AsyncIterable<Uint8Array>;
export type MediaFile = { mime: string; data: Uint8Array };

export interface MediaPipelineStats {
  encodeTime: number;
  outputSize: number;
  compressionRatio: number;
  fps: number;
  bitrate: number;
  codec: string;
  hardwareAccelerated: boolean;
  preset: string;
}

export class MediaPipeline {
  private activeStreams: Map<string, any> = new Map();
  private stats: MediaPipelineStats[] = [];
  private hardwareCaps: HardwareCapabilities | null = null;
  private svtAv1Module: any = null;

  constructor() {
    this.detectHardwareCapabilities();
  }

  private async detectHardwareCapabilities(): Promise<void> {
    const platform = this.getPlatform();
    let av1Encode = false;
    let av1Decode = false;
    let mediaFoundation = false;
    let videoToolbox = false;
    let vaApi = false;
    let dxva2 = false;

    // Platform-specific hardware detection
    switch (platform) {
      case 'windows':
        mediaFoundation = this.detectMediaFoundation();
        dxva2 = this.detectDXVA2();
        av1Decode = mediaFoundation || dxva2;
        av1Encode = mediaFoundation; // Limited AV1 encode support
        break;
      case 'macos':
        videoToolbox = this.detectVideoToolbox();
        av1Decode = videoToolbox;
        av1Encode = false; // No AV1 encode in VideoToolbox yet
        break;
      case 'linux':
        vaApi = this.detectVAAPI();
        av1Decode = vaApi;
        av1Encode = vaApi;
        break;
    }

    this.hardwareCaps = {
      av1Encode,
      av1Decode,
      platform,
      mediaFoundation,
      videoToolbox,
      vaApi,
      dxva2
    };

    console.log('Hardware capabilities detected:', this.hardwareCaps);
  }

  private getPlatform(): HardwareCapabilities['platform'] {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('windows')) return 'windows';
      if (userAgent.includes('mac')) return 'macos';
      if (userAgent.includes('linux')) return 'linux';
    }
    return 'unknown';
  }

  private detectMediaFoundation(): boolean {
    // Mock detection - in real implementation, would check for Media Foundation support
    return Math.random() > 0.5;
  }

  private detectDXVA2(): boolean {
    // Mock detection - in real implementation, would check for DXVA2 support
    return Math.random() > 0.3;
  }

  private detectVideoToolbox(): boolean {
    // Mock detection - in real implementation, would check for VideoToolbox support
    return Math.random() > 0.7;
  }

  private detectVAAPI(): boolean {
    // Mock detection - in real implementation, would check for VA-API support
    return Math.random() > 0.4;
  }

  private async loadSvtAv1(): Promise<any> {
    if (this.svtAv1Module) return this.svtAv1Module;

    try {
      // Dynamic import of SVT AV1 WASM module
      const module = await import('@mycelia/svt-av1-wasm');
      this.svtAv1Module = module;
      console.log('SVT AV1 WASM module loaded');
      return module;
    } catch (error) {
      console.warn('SVT AV1 WASM module not available:', error);
      return null;
    }
  }

  private getAV1PresetConfig(preset: AV1Preset): AV1Config {
    const presets: Record<AV1Preset, AV1Config> = {
      'realtime_720p30_lowdelay': {
        preset: 'realtime_720p30_lowdelay',
        gopSize: 30,
        lagInFrames: 0,
        tileRows: 1,
        tileCols: 1,
        targetBitrate: 1000,
        rateControl: 'cbr',
        screenContentMode: false,
        enableDenoise: false,
        enableDeband: false,
        enableSuperRes: false
      },
      'vod_1080p30_high': {
        preset: 'vod_1080p30_high',
        gopSize: 120,
        lagInFrames: 19,
        tileRows: 2,
        tileCols: 2,
        targetBitrate: 3000,
        rateControl: 'vbr',
        screenContentMode: true,
        enableDenoise: true,
        enableDeband: true,
        enableSuperRes: false
      },
      'vod_4k24_archive': {
        preset: 'vod_4k24_archive',
        gopSize: 240,
        lagInFrames: 19,
        tileRows: 4,
        tileCols: 4,
        targetBitrate: 8000,
        rateControl: 'cq',
        screenContentMode: true,
        enableDenoise: true,
        enableDeband: true,
        enableSuperRes: true
      }
    };

    return presets[preset];
  }

  async encode(opts: EncodeOptions): Promise<EncodedChunkStream> {
    const startTime = performance.now();
    
    // Detect screen content if needed
    const screenContentMode = this.detectScreenContent(opts.input);
    
    // Choose encoding path
    const encodingPath = await this.chooseEncodingPath(opts.codec, opts.hardwarePreferred);
    
    // Simulate encoding with appropriate path
    const inputSize = opts.input.byteLength;
    let compressionRatio: number;
    let outputSize: number;
    let encodeTime: number;

    switch (encodingPath) {
      case 'hardware':
        compressionRatio = opts.codec === 'av1' ? 0.5 : opts.codec === 'vp9' ? 0.6 : 0.7;
        encodeTime = opts.codec === 'av1' ? 20 : opts.codec === 'vp9' ? 15 : 10;
        break;
      case 'webcodecs':
        compressionRatio = opts.codec === 'av1' ? 0.55 : opts.codec === 'vp9' ? 0.65 : 0.75;
        encodeTime = opts.codec === 'av1' ? 30 : opts.codec === 'vp9' ? 25 : 15;
        break;
      case 'wasm':
        compressionRatio = opts.codec === 'av1' ? 0.6 : opts.codec === 'vp9' ? 0.7 : 0.8;
        encodeTime = opts.codec === 'av1' ? 100 : opts.codec === 'vp9' ? 80 : 50;
        break;
      default:
        compressionRatio = 0.8;
        encodeTime = 50;
    }

    outputSize = Math.floor(inputSize * compressionRatio);
    
    // Apply screen content optimizations
    if (screenContentMode && opts.codec === 'av1') {
      compressionRatio *= 0.9; // Better compression for screen content
      outputSize = Math.floor(inputSize * compressionRatio);
    }
    
    await new Promise(resolve => setTimeout(resolve, encodeTime));
    
    const finalEncodeTime = performance.now() - startTime;
    
    // Store stats
    this.stats.push({
      encodeTime: finalEncodeTime,
      outputSize,
      compressionRatio,
      fps: opts.fps,
      bitrate: opts.bitrate,
      codec: opts.codec,
      hardwareAccelerated: encodingPath === 'hardware',
      preset: 'custom'
    });

    async function* encodedStream() {
      const buf = opts.input instanceof Uint8Array ? opts.input : new Uint8Array(opts.input);
      // Simulate chunked output
      const chunkSize = Math.floor(buf.length / 10);
      for (let i = 0; i < buf.length; i += chunkSize) {
        yield buf.slice(i, i + chunkSize);
      }
    }
    
    return encodedStream();
  }

  async encodeAV1(input: ArrayBuffer | Uint8Array, preset: AV1Preset, options?: Partial<EncodeOptions>): Promise<EncodedChunkStream> {
    const config = this.getAV1PresetConfig(preset);
    const opts: EncodeOptions = {
      input,
      codec: 'av1',
      bitrate: config.targetBitrate,
      fps: preset.includes('720p') ? 30 : preset.includes('1080p') ? 30 : 24,
      width: preset.includes('720p') ? 1280 : preset.includes('1080p') ? 1920 : 3840,
      height: preset.includes('720p') ? 720 : preset.includes('1080p') ? 1080 : 2160,
      hardwarePreferred: true,
      ...options
    };

    return this.encode(opts);
  }

  private detectScreenContent(input: ArrayBuffer | Uint8Array): boolean {
    // Mock screen content detection - in real implementation, would analyze video content
    // Screen content typically has sharp edges, text, UI elements
    return Math.random() > 0.7;
  }

  private async chooseEncodingPath(codec: string, hardwarePreferred?: boolean): Promise<'hardware' | 'webcodecs' | 'wasm' | 'fallback'> {
    if (!this.hardwareCaps) await this.detectHardwareCapabilities();

    // AV1 encoding path selection
    if (codec === 'av1') {
      if (hardwarePreferred && this.hardwareCaps?.av1Encode) {
        return 'hardware';
      }
      
      // Try WebCodecs first
      if (typeof window !== 'undefined' && 'VideoEncoder' in window) {
        try {
          // Check if AV1 is supported in WebCodecs
          const support = await this.checkWebCodecsSupport('av01');
          if (support) return 'webcodecs';
        } catch (error) {
          console.warn('WebCodecs AV1 not available:', error);
        }
      }
      
      // Fallback to WASM
      const svtModule = await this.loadSvtAv1();
      if (svtModule) return 'wasm';
      
      return 'fallback';
    }

    // Non-AV1 codecs
    if (hardwarePreferred && this.hardwareCaps?.av1Decode) {
      return 'hardware';
    }
    
    return 'webcodecs';
  }

  private async checkWebCodecsSupport(codec: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('VideoEncoder' in window)) {
      return false;
    }

    try {
      // Mock WebCodecs support check
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width: 1280,
        height: 720,
        bitrate: 1000000,
        framerate: 30
      });
      return support.supported;
    } catch (error) {
      return false;
    }
  }

  async transcode(opts: TranscodeOptions): Promise<MediaFile> {
    const startTime = performance.now();
    
    const buf = opts.input instanceof Uint8Array ? opts.input : new Uint8Array(opts.input);
    const mime = opts.targetCodec === 'av1' ? 'video/av01' : opts.targetCodec === 'vp9' ? 'video/vp9' : 'video/avc';
    
    // Simulate transcoding delay based on target codec
    const delay = opts.targetCodec === 'av1' ? 150 : opts.targetCodec === 'vp9' ? 100 : 50;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const transcodeTime = performance.now() - startTime;
    console.log(`Transcoded to ${opts.targetCodec} in ${transcodeTime.toFixed(2)}ms`);
    
    return { mime, data: buf };
  }

  async applyEffect(input: ArrayBuffer | Uint8Array, effect: EffectOptions): Promise<Uint8Array> {
    const startTime = performance.now();
    
    const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
    
    // Simulate effect processing delay
    const delay = effect.type === 'background_removal' ? 200 : effect.type === 'noise_reduction' ? 100 : 30;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const effectTime = performance.now() - startTime;
    console.log(`Applied ${effect.type} effect in ${effectTime.toFixed(2)}ms`);
    
    return buf; // Effects don't change buffer size significantly
  }

  async supports(options: { codec: string; encode?: boolean; decode?: boolean }): Promise<boolean> {
    if (!this.hardwareCaps) await this.detectHardwareCapabilities();

    if (options.codec === 'av1') {
      if (options.encode && this.hardwareCaps?.av1Encode) return true;
      if (options.decode && this.hardwareCaps?.av1Decode) return true;
      
      // Check WebCodecs support
      if (typeof window !== 'undefined' && 'VideoEncoder' in window) {
        const support = await this.checkWebCodecsSupport('av01');
        if (support) return true;
      }
      
      // Check WASM fallback
      const svtModule = await this.loadSvtAv1();
      return svtModule !== null;
    }

    return true; // Other codecs are generally supported
  }

  getHardwareCapabilities(): HardwareCapabilities | null {
    return this.hardwareCaps;
  }

  getStats(): MediaPipelineStats[] {
    return [...this.stats];
  }

  getAverageStats(): MediaPipelineStats {
    if (this.stats.length === 0) {
      return {
        encodeTime: 0,
        outputSize: 0,
        compressionRatio: 0,
        fps: 0,
        bitrate: 0,
        codec: 'unknown',
        hardwareAccelerated: false,
        preset: 'unknown'
      };
    }

    const totals = this.stats.reduce((acc, stat) => ({
      encodeTime: acc.encodeTime + stat.encodeTime,
      outputSize: acc.outputSize + stat.outputSize,
      compressionRatio: acc.compressionRatio + stat.compressionRatio,
      fps: acc.fps + stat.fps,
      bitrate: acc.bitrate + stat.bitrate
    }), { encodeTime: 0, outputSize: 0, compressionRatio: 0, fps: 0, bitrate: 0 });

    const count = this.stats.length;
    const latestStat = this.stats[this.stats.length - 1];
    
    return {
      encodeTime: totals.encodeTime / count,
      outputSize: totals.outputSize / count,
      compressionRatio: totals.compressionRatio / count,
      fps: totals.fps / count,
      bitrate: totals.bitrate / count,
      codec: latestStat.codec,
      hardwareAccelerated: latestStat.hardwareAccelerated,
      preset: latestStat.preset
    };
  }

  resetStats(): void {
    this.stats = [];
  }
}

// Legacy function exports for backward compatibility
export async function encode(opts: EncodeOptions): Promise<EncodedChunkStream> {
  const pipeline = new MediaPipeline();
  return pipeline.encode(opts);
}

export async function transcode(opts: TranscodeOptions): Promise<MediaFile> {
  const pipeline = new MediaPipeline();
  return pipeline.transcode(opts);
}

export function captureEffects(_: { constraints?: MediaStreamConstraints; effects?: string[] }): MediaStreamTrack {
  // Browser-only stub
  // @ts-ignore
  return {} as MediaStreamTrack;
}

