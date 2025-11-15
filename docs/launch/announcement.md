---
title: Announcement
---

# Golden Path Demo

Watch our 60-second demonstration of Mycelia's core features and capabilities.

## 🎬 Watch the Demo

[![Golden Path Demo](https://img.youtube.com/vi/placeholder/maxresdefault.jpg)](https://youtu.be/placeholder)

**Duration:** ~60 seconds  
**Resolution:** 1080p  
**Features:** Publisher onboarding, Applets gallery, Media pipeline, Governance simulation

## What You'll See

### 1. Publisher Onboarding
- Domain verification process
- Mycelia snippet installation
- Feature enablement (Rewards, Live Captions)

### 2. Applets Gallery
- Browse installable, offline-ready applets
- Filter by category and verification status
- Install flow with consent cards

### 3. Media Pipeline
- AV1 end-to-end encoding
- WebRTC with SVC (Scalable Video Coding)
- Performance monitoring and optimization

### 4. Governance Simulation
- Proposal P-0001 simulator
- Health checks and risk assessment
- Safe voting package generation

## Technical Details

- **Recording:** Automated with Playwright
- **Processing:** FFmpeg with burned-in captions
- **Quality:** 1080p @ 30fps
- **Format:** MP4 with AAC audio
- **Captions:** SRT and ASS subtitle formats

## Local Recording

To record your own demo:

```bash
# Start servers
pnpm demo:serve:win  # Windows
# or
pnpm demo:serve      # macOS/Linux

# Record demo
pnpm demo:record                    # Captioned only
pnpm demo:record:narrated          # With TTS narration (local only)
```text

Output files:
- `release/public/golden-path.mp4` - Video file
- `release/public/golden-path.srt` - Subtitle file

## CI Integration

The demo is automatically recorded on every push to main and available as a GitHub Actions artifact.

## Accessibility

- **Captions:** Burned into video for accessibility
- **Narration:** Optional TTS support (Windows/macOS)
- **Keyboard Navigation:** All interactions accessible via keyboard
- **Screen Reader:** Compatible with assistive technologies

## Requirements

- Node.js 20 LTS
- FFmpeg (for video processing)
- Playwright browsers
- Windows/macOS for TTS narration

## Troubleshooting

### Recording Issues

**"Servers not responding"**
- Ensure ports 3000 and 5173 are available
- Check firewall settings
- Verify server startup logs

**"Playwright browser launch failed"**
- Install Playwright browsers: `npx playwright install chromium`
- Check system dependencies
- Verify display settings (for headless mode)

**"FFmpeg processing failed"**
- Install FFmpeg: `npm install -g ffmpeg-static`
- Check video file permissions
- Verify output directory exists

### Quality Issues

**"Video quality poor"**
- Increase CRF value in ffmpeg settings
- Check input video resolution
- Verify encoding preset

**"Captions not visible"**
- Check subtitle file format
- Verify ASS styling parameters
- Test with different video players

## Future Enhancements

- **Multiple Languages:** Support for international captions
- **Interactive Elements:** Clickable hotspots in video
- **Custom Themes:** Branded video styling
- **Analytics:** View tracking and engagement metrics

## Support

For demo recording issues:
- Check the troubleshooting section above
- Review CI logs for automated recordings
- Contact the demo team
- Submit issues to the Mycelia repository