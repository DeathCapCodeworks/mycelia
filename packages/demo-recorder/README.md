# Golden Path Demo Recorder

Automated demo recording system for Mycelia's core features using Playwright and FFmpeg.

## Overview

The Golden Path Demo Recorder creates a 60-second demonstration video showcasing Mycelia's key features:
- Publisher onboarding flow
- Applets gallery browsing
- Media pipeline with AV1 encoding
- Governance simulation for P-0001

## Features

- **Automated Recording:** Playwright-driven browser automation
- **High Quality:** 1080p @ 30fps output
- **Captions:** Burned-in subtitles with ASS styling
- **TTS Narration:** Optional OS text-to-speech (Windows/macOS)
- **CI Integration:** Automated recording on every push
- **Cross-Platform:** Works on Windows, macOS, and Linux

## Quick Start

### Prerequisites

- Node.js 20 LTS
- FFmpeg (installed via `ffmpeg-static`)
- Playwright browsers

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install chromium
```

### Recording

```bash
# Start servers
pnpm demo:serve:win  # Windows
# or
pnpm demo:serve      # macOS/Linux

# Record demo
pnpm demo:record                    # Captioned only
pnpm demo:record:narrated          # With TTS narration
```

## Configuration

### Command Line Options

- `--base <url>`: Base URL for sandbox (default: http://127.0.0.1:5173)
- `--docs <url>`: Docs URL (default: http://127.0.0.1:3000)
- `--maxSec <seconds>`: Maximum duration (default: 60)
- `--narrate`: Enable TTS narration (local only)
- `--headful`: Show browser window during recording

### Demo Steps

The demo follows a predefined sequence defined in `src/steps.json`:

1. **Publisher Onboarding** (`/publisher/start`)
   - Wait for stepper UI
   - Click verification button
   - Show completion state

2. **Applets Gallery** (`/gallery`)
   - Browse applet cards
   - Filter by offline-ready
   - Open install modal

3. **Media Pipeline** (`/media`)
   - Load sample video
   - Start AV1 encoding
   - Show performance stats

4. **Governance** (`/governance`)
   - Open P-0001 simulator
   - Run health checks
   - Generate vote package

## Output Files

- `release/public/golden-path.mp4` - Main video file
- `release/public/golden-path.srt` - Subtitle file
- `.cache/demo/screenshots/` - Debug screenshots
- `.cache/demo/segments/` - Raw video segments

## Technical Details

### Video Processing

1. **Recording:** Playwright captures browser interactions
2. **Segmentation:** Each step recorded as separate segment
3. **Concatenation:** FFmpeg combines segments
4. **Caption Burn-in:** ASS subtitles rendered into video
5. **Audio Mixing:** TTS narration mixed with video audio
6. **Duration Control:** Trimmed to target length

### Caption Generation

- **SRT Format:** Standard subtitle format
- **ASS Format:** Advanced styling for burn-in
- **Timing:** Synchronized with demo steps
- **Styling:** High contrast, readable fonts

### TTS Integration

- **Windows:** PowerShell SAPI integration
- **macOS:** Native `say` command
- **Linux:** Not supported (graceful fallback)

## CI Integration

The demo is automatically recorded in GitHub Actions:

```yaml
# .github/workflows/golden-path.yml
- name: Record Golden Path Demo
  run: pnpm demo:record
  
- name: Upload Demo
  uses: actions/upload-artifact@v4
  with:
    name: golden-path-demo
    path: release/public/golden-path.*
```

## Troubleshooting

### Common Issues

**"Servers not responding"**
- Check ports 3000 and 5173 are available
- Verify server startup logs
- Ensure firewall allows local connections

**"Playwright browser launch failed"**
- Install browsers: `npx playwright install chromium`
- Check system dependencies
- Verify display settings for headless mode

**"FFmpeg processing failed"**
- Install FFmpeg: `npm install -g ffmpeg-static`
- Check video file permissions
- Verify output directory exists

**"TTS generation failed"**
- Check OS compatibility (Windows/macOS only)
- Verify PowerShell/SAPI availability
- Review audio file permissions

### Debug Mode

Enable headful mode to see browser interactions:

```bash
pnpm demo:record --headful
```

Check debug screenshots in `.cache/demo/screenshots/`

## Customization

### Adding New Steps

Edit `src/steps.json`:

```json
{
  "route": "/new-feature",
  "waitFor": ".feature-container",
  "click": ".feature-button",
  "pauseMs": 2000,
  "caption": "New feature demonstration."
}
```

### Modifying Captions

Update caption text in `src/steps.json` or modify timing in `src/util/captions.ts`

### Custom Styling

Modify ASS subtitle styling in `src/util/captions.ts`:

```typescript
assEntries.push('Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1');
```

## Performance

### Recording Performance

- **Resolution:** 1920x1080 @ 30fps
- **Duration:** ~60 seconds
- **File Size:** ~10-15 MB
- **Processing Time:** 2-3 minutes

### Optimization Tips

- Use SSD storage for better I/O performance
- Close unnecessary applications during recording
- Ensure stable network connection
- Monitor system resources

## Security

- **Local Only:** No external network calls during recording
- **Sandboxed:** Playwright runs in isolated browser context
- **Temporary Files:** Cache files cleaned up after processing
- **No Sensitive Data:** Demo uses mock data only

## Contributing

### Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm --filter @mycelia/demo-recorder dev

# Test recording
pnpm demo:record --headful
```

### Testing

```bash
# Run tests
pnpm test

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

## License

Part of Project Mycelia. See main repository license.

## Support

For demo recorder issues:
- Check troubleshooting section
- Review CI logs for automated recordings
- Contact the demo team
- Submit issues to the Mycelia repository
