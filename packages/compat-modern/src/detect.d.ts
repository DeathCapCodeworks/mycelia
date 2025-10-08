import type { CompatReport, SupportFlag } from './types';
export declare function detectAv1(): {
    decode: SupportFlag;
    encode: SupportFlag;
    svc: SupportFlag;
};
export declare function detectWebGpu(): {
    status: SupportFlag;
    adapter: undefined;
};
export declare function detectWebNn(): {
    status: SupportFlag;
    backends: string[];
};
export declare function detectWebCodecs(): {
    videoDecoder: SupportFlag;
    videoEncoder: SupportFlag;
};
export declare function detectQuic(): {
    webTransport: SupportFlag;
    http3: "unknown";
};
export declare function detectWasm(): {
    simd: SupportFlag;
    threads: "unknown";
    bulk: "native" | "unsupported";
};
export declare function detectAll(): CompatReport;
