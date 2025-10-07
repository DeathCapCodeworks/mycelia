import { format } from 'date-fns';

export interface DemoStep {
  route: string;
  waitFor: string;
  click?: string;
  type?: string;
  pauseMs: number;
  caption: string;
}

export interface CaptionResult {
  srt: string;
  ass: string;
}

export function generateCaptions(steps: DemoStep[], startTime: number): CaptionResult {
  let currentTime = startTime;
  const srtEntries: string[] = [];
  const assEntries: string[] = [];

  // ASS header with styling
  assEntries.push('[Script Info]');
  assEntries.push('Title: Golden Path Demo');
  assEntries.push('ScriptType: v4.00+');
  assEntries.push('');
  assEntries.push('[V4+ Styles]');
  assEntries.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding');
  assEntries.push('Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1');
  assEntries.push('');
  assEntries.push('[Events]');
  assEntries.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');

  steps.forEach((step, index) => {
    const startMs = currentTime;
    const endMs = currentTime + step.pauseMs;
    
    // Convert to SRT format (HH:MM:SS,mmm)
    const startSRT = formatTimeSRT(startMs);
    const endSRT = formatTimeSRT(endMs);
    
    // Convert to ASS format (H:MM:SS.cc)
    const startASS = formatTimeASS(startMs);
    const endASS = formatTimeASS(endMs);

    // SRT entry
    srtEntries.push(`${index + 1}`);
    srtEntries.push(`${startSRT} --> ${endSRT}`);
    srtEntries.push(step.caption);
    srtEntries.push('');

    // ASS entry
    assEntries.push(`Dialogue: 0,${startASS},${endASS},Default,,0,0,0,,${step.caption}`);

    currentTime = endMs;
  });

  return {
    srt: srtEntries.join('\n'),
    ass: assEntries.join('\n')
  };
}

function formatTimeSRT(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

function formatTimeASS(ms: number): string {
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}
