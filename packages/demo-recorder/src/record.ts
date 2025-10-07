import { chromium, Browser, Page } from '@playwright/test';
import { execa } from 'execa';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import steps from './steps.json';
import { generateCaptions } from './util/captions.js';
import { processVideo } from './util/ff.js';
import { generateTTS } from './util/os-tts.js';

interface DemoStep {
  route: string;
  waitFor: string;
  click?: string;
  type?: string;
  pauseMs: number;
  caption: string;
}

interface DemoConfig {
  baseUrl: string;
  docsUrl?: string;
  maxSec: number;
  narrate: boolean;
  headful: boolean;
}

class DemoRecorder {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: DemoConfig;
  private segments: string[] = [];
  private startTime: number = 0;

  constructor(config: DemoConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    console.log('🎬 Starting Golden Path Demo Recorder...');
    
    // Ensure output directories exist
    await this.ensureDirectories();
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: !this.config.headful,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage({
      recordVideo: {
        dir: '.cache/demo/segments',
        size: { width: 1920, height: 1080 }
      },
      viewport: { width: 1920, height: 1080 }
    });

    this.startTime = Date.now();
    console.log(`📹 Recording started at ${format(new Date(), 'HH:mm:ss')}`);
  }

  async recordSteps(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i] as DemoStep;
      console.log(`📍 Step ${i + 1}/${steps.length}: ${step.route}`);
      
      try {
        // Navigate to route
        await this.page.goto(`${this.config.baseUrl}${step.route}`, {
          waitUntil: 'networkidle'
        });

        // Wait for specific element
        await this.page.waitForSelector(step.waitFor, { timeout: 10000 });

        // Perform interaction if specified
        if (step.click) {
          await this.page.click(step.click);
          await this.page.waitForTimeout(500);
        }

        if (step.type) {
          await this.page.type(step.type, 'test input');
          await this.page.waitForTimeout(500);
        }

        // Pause for specified duration
        await this.page.waitForTimeout(step.pauseMs);

        // Capture screenshot for debugging
        await this.page.screenshot({
          path: `.cache/demo/screenshots/step-${i + 1}.png`,
          fullPage: true
        });

        console.log(`✅ Step ${i + 1} completed`);
      } catch (error) {
        console.error(`❌ Step ${i + 1} failed:`, error);
        // Continue with next step
      }
    }
  }

  async finish(): Promise<void> {
    if (!this.page) return;

    // Get video path
    const videoPath = await this.page.video()?.path();
    if (videoPath) {
      this.segments.push(videoPath);
    }

    await this.page.close();
    if (this.browser) {
      await this.browser.close();
    }

    console.log('🎬 Recording finished');
  }

  async processVideo(): Promise<void> {
    console.log('🎞️ Processing video...');

    // Generate captions
    const captions = generateCaptions(steps as DemoStep[], this.startTime);
    const srtPath = 'release/public/golden-path.srt';
    const assPath = '.cache/demo/golden-path.ass';

    // Write SRT file
    fs.writeFileSync(srtPath, captions.srt);
    console.log(`📝 SRT captions written to ${srtPath}`);

    // Write ASS file for better styling
    fs.writeFileSync(assPath, captions.ass);
    console.log(`📝 ASS captions written to ${assPath}`);

    // Generate TTS narration if requested
    let audioPath: string | null = null;
    if (this.config.narrate) {
      try {
        audioPath = await generateTTS(steps as DemoStep[]);
        console.log(`🎤 TTS narration generated: ${audioPath}`);
      } catch (error) {
        console.warn('⚠️ TTS generation failed:', error);
      }
    }

    // Process video with ffmpeg
    await processVideo({
      segments: this.segments,
      outputPath: 'release/public/golden-path.mp4',
      subtitlePath: assPath,
      audioPath,
      maxSec: this.config.maxSec
    });

    console.log('✅ Video processing completed');
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      '.cache/demo/segments',
      '.cache/demo/screenshots',
      'release/public'
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const config: DemoConfig = {
    baseUrl: 'http://127.0.0.1:5173',
    docsUrl: 'http://127.0.0.1:3000',
    maxSec: 60,
    narrate: false,
    headful: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base':
        config.baseUrl = args[++i];
        break;
      case '--docs':
        config.docsUrl = args[++i];
        break;
      case '--maxSec':
        config.maxSec = parseInt(args[++i]);
        break;
      case '--narrate':
        config.narrate = true;
        break;
      case '--headful':
        config.headful = true;
        break;
    }
  }

  console.log('🎬 Golden Path Demo Recorder Configuration:');
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Max Duration: ${config.maxSec}s`);
  console.log(`   Narrate: ${config.narrate ? 'Yes' : 'No'}`);
  console.log(`   Headful: ${config.headful ? 'Yes' : 'No'}`);

  const recorder = new DemoRecorder(config);

  try {
    await recorder.start();
    await recorder.recordSteps();
    await recorder.finish();
    await recorder.processVideo();
    
    console.log('🎉 Golden Path demo recording completed successfully!');
    console.log('📁 Output files:');
    console.log('   - release/public/golden-path.mp4');
    console.log('   - release/public/golden-path.srt');
  } catch (error) {
    console.error('❌ Demo recording failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DemoRecorder };
