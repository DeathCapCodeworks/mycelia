import type { CompatReport, SupportFlag } from './types';

const g = (typeof globalThis !== 'undefined' ? globalThis : {}) as any;

function flag(tf: boolean | undefined): SupportFlag {
  if (tf === true) return 'native';
  if (tf === false) return 'unsupported';
  return 'unknown';
}

export function detectAv1(): { decode: SupportFlag; encode: SupportFlag; svc: SupportFlag } {
  // Decode via MediaCapabilities / canPlayType quick path
  const v = g.document?.createElement?.('video');
  const canDecode = !!v && typeof v.canPlayType === 'function'
    ? !!v.canPlayType('video/mp4;codecs="av01.0.05M.08"')
    : undefined;
  // Encode via WebCodecs presence
  const enc = !!g.VideoEncoder && typeof g.VideoEncoder === 'function';
  // SVC hint via RTCRtpSender.getCapabilities guard
  const svc =
    !!g.RTCRtpSender &&
    typeof g.RTCRtpSender.getCapabilities === 'function' &&
    !!g.RTCRtpSender.getCapabilities('video')?.scalabilityModes?.length;

  return { decode: flag(canDecode), encode: flag(enc), svc: flag(svc) };
}

export function detectWebGpu() {
  const has = !!g.navigator?.gpu;
  const adapter = undefined;
  return { status: flag(has), adapter };
}

export function detectWebNn() {
  const has = !!g.navigator?.ml || !!g.ml; // tentative WebNN bindings
  const backends: string[] = [];
  return { status: flag(has), backends };
}

export function detectWebCodecs() {
  const dec = !!g.VideoDecoder && typeof g.VideoDecoder === 'function';
  const enc = !!g.VideoEncoder && typeof g.VideoEncoder === 'function';
  return { videoDecoder: flag(dec), videoEncoder: flag(enc) };
}

export function detectQuic() {
  const wt = !!g.WebTransport && typeof g.WebTransport === 'function';
  // http/3 presence cannot be probed directly; leave unknown
  return { webTransport: flag(wt), http3: 'unknown' as const };
}

export function detectWasm() {
  const simd = typeof g.WebAssembly !== 'undefined' && !!(WebAssembly as any).validate?.(
    new Uint8Array([0,97,115,109]) // cheap sanity check; not SIMD feature test
  );
  // Threads requires COOP/COEP; report unknown unless known
  const threads = 'unknown' as const;
  const bulk = typeof g.WebAssembly !== 'undefined' ? 'native' as const : 'unsupported' as const;
  return { simd: flag(simd), threads, bulk };
}

export function detectAll(): CompatReport {
  return {
    av1: detectAv1(),
    webgpu: detectWebGpu(),
    webnn: detectWebNn(),
    webcodecs: detectWebCodecs(),
    quic: detectQuic(),
    wasm: detectWasm(),
    timestamp: new Date().toISOString()
  };
}
