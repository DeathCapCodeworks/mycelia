import { execa } from 'execa';
import * as fs from 'fs';
import * as path from 'path';

export interface VideoProcessingOptions {
  segments: string[];
  outputPath: string;
  subtitlePath: string;
  audioPath?: string | null;
  maxSec: number;
}

export async function processVideo(options: VideoProcessingOptions): Promise<void> {
  const { segments, outputPath, subtitlePath, audioPath, maxSec } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (segments.length === 0) {
    throw new Error('No video segments to process');
  }

  // If only one segment, just copy and process it
  if (segments.length === 1) {
    await processSingleVideo(segments[0], outputPath, subtitlePath, audioPath, maxSec);
    return;
  }

  // Multiple segments - create concat file
  const concatFile = '.cache/demo/concat.txt';
  const concatContent = segments.map(segment => `file '${path.resolve(segment)}'`).join('\n');
  fs.writeFileSync(concatFile, concatContent);

  try {
    // Concatenate segments
    const concatOutput = '.cache/demo/concatenated.mp4';
    await execa('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-c', 'copy',
      '-y',
      concatOutput
    ]);

    // Process the concatenated video
    await processSingleVideo(concatOutput, outputPath, subtitlePath, audioPath, maxSec);

  } finally {
    // Cleanup
    if (fs.existsSync(concatFile)) {
      fs.unlinkSync(concatFile);
    }
  }
}

async function processSingleVideo(
  inputPath: string,
  outputPath: string,
  subtitlePath: string,
  audioPath: string | null | undefined,
  maxSec: number
): Promise<void> {
  const args: string[] = [
    '-i', inputPath,
    '-vf', `ass=${subtitlePath}`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-y'
  ];

  // Add audio if provided
  if (audioPath && fs.existsSync(audioPath)) {
    args.splice(2, 0, '-i', audioPath);
    args.push('-filter_complex', '[0:a][1:a]amix=inputs=2:duration=shortest[a]', '-map', '0:v', '-map', '[a]');
  }

  // Add duration limit
  args.push('-t', maxSec.toString());

  args.push(outputPath);

  console.log('🎞️ Running ffmpeg:', args.join(' '));

  try {
    await execa('ffmpeg', args);
    console.log(`✅ Video processed successfully: ${outputPath}`);
  } catch (error) {
    console.error('❌ FFmpeg processing failed:', error);
    throw error;
  }
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const { stdout } = await execa('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      videoPath
    ]);
    
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('Failed to get video duration:', error);
    return 0;
  }
}

export async function trimVideo(inputPath: string, outputPath: string, startSec: number, durationSec: number): Promise<void> {
  await execa('ffmpeg', [
    '-i', inputPath,
    '-ss', startSec.toString(),
    '-t', durationSec.toString(),
    '-c', 'copy',
    '-y',
    outputPath
  ]);
}
