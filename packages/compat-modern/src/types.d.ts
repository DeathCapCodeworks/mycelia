export type SupportFlag = 'native' | 'polyfilled' | 'unsupported' | 'unknown';
export interface Av1Support {
    decode: SupportFlag;
    encode: SupportFlag;
    svc: SupportFlag;
}
export interface WebGpuSupport {
    status: SupportFlag;
    adapter?: string;
}
export interface WebNnSupport {
    status: SupportFlag;
    backends: string[];
}
export interface WebCodecsSupport {
    videoDecoder: SupportFlag;
    videoEncoder: SupportFlag;
}
export interface QuicSupport {
    webTransport: SupportFlag;
    http3: SupportFlag;
}
export interface WasmSupport {
    simd: SupportFlag;
    threads: SupportFlag;
    bulk: SupportFlag;
}
export interface CompatReport {
    av1: Av1Support;
    webgpu: WebGpuSupport;
    webnn: WebNnSupport;
    webcodecs: WebCodecsSupport;
    quic: QuicSupport;
    wasm: WasmSupport;
    timestamp: string;
}
