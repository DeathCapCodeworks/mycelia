import { execa } from 'execa';
import * as fs from 'fs';
import * as path from 'path';
import { DemoStep } from './captions.js';

export async function generateTTS(steps: DemoStep[]): Promise<string> {
  const platform = process.platform;
  const outputDir = '.cache/demo/tts';
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const audioFiles: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const audioFile = path.join(outputDir, `step-${i + 1}.wav`);
    
    try {
      await generateStepTTS(step.caption, audioFile, platform);
      audioFiles.push(audioFile);
    } catch (error) {
      console.warn(`⚠️ TTS generation failed for step ${i + 1}:`, error);
    }
  }

  if (audioFiles.length === 0) {
    throw new Error('No TTS audio files generated');
  }

  // Concatenate all audio files
  const finalAudioFile = path.join(outputDir, 'narration.wav');
  await concatenateAudio(audioFiles, finalAudioFile);

  return finalAudioFile;
}

async function generateStepTTS(text: string, outputFile: string, platform: string): Promise<void> {
  switch (platform) {
    case 'win32':
      await generateWindowsTTS(text, outputFile);
      break;
    case 'darwin':
      await generateMacOSTTS(text, outputFile);
      break;
    default:
      throw new Error(`TTS not supported on platform: ${platform}`);
  }
}

async function generateWindowsTTS(text: string, outputFile: string): Promise<void> {
  // Use PowerShell with SAPI
  const script = `
    $speak = New-Object -ComObject SAPI.SpVoice
    $fileStream = New-Object -ComObject SAPI.SpFileStream
    $fileStream.Open("${outputFile.replace(/\\/g, '\\\\')}", 3, $false)
    $speak.AudioOutputStream = $fileStream
    $speak.Speak("${text.replace(/"/g, '\\"')}")
    $fileStream.Close()
  `;

  await execa('powershell', ['-Command', script]);
}

async function generateMacOSTTS(text: string, outputFile: string): Promise<void> {
  // Use macOS say command
  await execa('say', ['-o', outputFile, text]);
}

async function concatenateAudio(audioFiles: string[], outputFile: string): Promise<void> {
  if (audioFiles.length === 1) {
    // Just copy the single file
    fs.copyFileSync(audioFiles[0], outputFile);
    return;
  }

  // Create concat file for ffmpeg
  const concatFile = path.join(path.dirname(outputFile), 'audio-concat.txt');
  const concatContent = audioFiles.map(file => `file '${path.resolve(file)}'`).join('\n');
  fs.writeFileSync(concatFile, concatContent);

  try {
    await execa('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-c', 'copy',
      '-y',
      outputFile
    ]);
  } finally {
    // Cleanup
    if (fs.existsSync(concatFile)) {
      fs.unlinkSync(concatFile);
    }
  }
}

export function isTTSAvailable(): boolean {
  const platform = process.platform;
  return platform === 'win32' || platform === 'darwin';
}

export function getTTSPlatform(): string {
  return process.platform;
}
