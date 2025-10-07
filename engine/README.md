# Mycelia Web4 Engine

This folder tracks native integration notes and Chromium patch sets for the Mycelia Engine initiative.

- Goal: Keep Chromium compatibility while adding a Mycelia Engine layer that pushes beyond Chrome in targeted areas.
- Do not rewrite Blink or V8 today; focus on native modules and WASM toolchains that can be upstreamed later.

Structure:
- `chromium-patches/` patchset summaries (placeholders)
- `scripts/` docs for fetch, sync, apply (placeholders)

Packages (see `packages/`):
- `@mycelia/media-pipeline`: encoder/transcoder/effects with HW accel and WASM fallbacks
- `@mycelia/webrtc-enhanced`: SVC, low delay, SFU client
- `@mycelia/net-stack`: QUIC/HTTP3, DoH/DoQ profiles
- `@mycelia/compat-modern`: test harness runner and polyfill gates
- `@mycelia/standards-test`: WPT harness integration
- `@mycelia/engine-bridge`: TS API that Navigator calls into

Security:
- All native modules require explicit `policy.allowNative` and hardware toggles.
- Sandboxing with restricted permissions.
