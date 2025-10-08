import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PatchResult {
  file: string;
  edits: Array<{ line: number; before: string; after: string }>;
  success: boolean;
  error?: string;
}

class MDXSpecificPatcher {
  private results: PatchResult[] = [];

  async patchAll(): Promise<PatchResult[]> {
    this.results = [];
    
    const targets = [
      'docs/attestations/mainnet-por.md',
      'docs/engine/media-pipeline.md', 
      'docs/engine/net-stack.md',
      'docs/engine/webrtc-enhanced.md'
    ];

    console.log(`🔧 Patching ${targets.length} specific MDX files...`);

    for (const target of targets) {
      await this.patchFile(target);
    }

    return this.results;
  }

  private async patchFile(filePath: string): Promise<void> {
    const result: PatchResult = {
      file: filePath,
      edits: [],
      success: false
    };

    try {
      if (!existsSync(filePath)) {
        console.log(`⚠️ File not found: ${filePath}`);
        this.results.push(result);
        return;
      }

      const originalContent = readFileSync(filePath, 'utf8');
      const lines = originalContent.split('\n');
      let modified = false;

      // Create backup
      const backupPath = filePath + '.bak';
      writeFileSync(backupPath, originalContent);

      // Apply specific patches based on filename
      try {
        if (filePath.includes('mainnet-por.md')) {
          modified = this.patchMainnetPor(lines, result);
        } else if (filePath.includes('media-pipeline.md')) {
          modified = this.patchMediaPipeline(lines, result);
        } else if (filePath.includes('net-stack.md')) {
          modified = this.patchNetStack(lines, result);
        } else if (filePath.includes('webrtc-enhanced.md')) {
          modified = this.patchWebrtcEnhanced(lines, result);
        }
      } catch (patchError) {
        const errorMsg = patchError instanceof Error ? patchError.message : String(patchError);
        console.error(`❌ Patch error for ${filePath}:`, errorMsg);
        result.error = errorMsg;
        
        // Write error log
        const errorLogPath = filePath + '.err.log';
        writeFileSync(errorLogPath, `Error patching ${filePath}:\n${errorMsg}\n\nStack:\n${patchError instanceof Error ? patchError.stack : 'No stack trace'}`);
      }

      if (modified) {
        const newContent = lines.join('\n');
        writeFileSync(filePath, newContent);
        result.success = true;
        console.log(`✅ Patched ${filePath}: ${result.edits.length} edits`);
      } else {
        console.log(`ℹ️ No changes needed for ${filePath}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to patch ${filePath}:`, errorMsg);
      result.error = errorMsg;
      
      // Write error log
      const errorLogPath = filePath + '.err.log';
      writeFileSync(errorLogPath, `Error patching ${filePath}:\n${errorMsg}\n\nStack:\n${error instanceof Error ? error.stack : 'No stack trace'}`);
    }

    this.results.push(result);
  }

  private patchMainnetPor(lines: string[], result: PatchResult): boolean {
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Fix missing closing brace in expressions - use string concatenation to avoid backtick issues
      const backtickOpen = '`' + '{';
      const backtickClose = '}' + '`';
      
      if (line.includes(backtickOpen) && !line.includes(backtickClose)) {
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        
        if (openBraces > closeBraces) {
          const before = line;
          const after = line + '}';
          lines[i] = after;
          result.edits.push({ line: i + 1, before, after });
          modified = true;
        }
      }
      
      // Normalize inline code backticks if they accidentally wrap JSX
      const jsxPattern = new RegExp('`(<[^>]+>)`', 'g');
      const match = jsxPattern.exec(line);
      if (match) {
        const before = line;
        const after = line.replace(jsxPattern, '`$1`');
        if (after !== before) {
          lines[i] = after;
          result.edits.push({ line: i + 1, before, after });
          modified = true;
        }
      }
    }
    return modified;
  }

  private patchMediaPipeline(lines: string[], result: PatchResult): boolean {
    let modified = false;
    const unclosedTagRegex = /<EncodedChunkStream>(?!.*<\/EncodedChunkStream>)/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = unclosedTagRegex.exec(line);
      if (match) {
        const before = line;
        // Replace with fenced code block
        lines[i] = '```tsx\n' + line + '\n```';
        result.edits.push({ line: i + 1, before, after: lines[i] });
        modified = true;
      }
    }
    return modified;
  }

  private patchNetStack(lines: string[], result: PatchResult): boolean {
    let modified = false;
    // Regex to find pseudo-tags like <http/3> or <foo/bar>
    const pseudoTagRegex = /<([^>\s\/]+(?:\/[^>\s\/]+)*)>/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = pseudoTagRegex.exec(line);
      if (match) {
        const newLine = line.replace(pseudoTagRegex, (match, tagContent) => {
          // Convert to inline code
          return '`' + tagContent + '`';
        });

        if (newLine !== line) {
          result.edits.push({ line: i + 1, before: line, after: newLine });
          lines[i] = newLine;
          modified = true;
        }
      }
    }
    return modified;
  }

  private patchWebrtcEnhanced(lines: string[], result: PatchResult): boolean {
    let modified = false;
    const voidTagRegex = /<void>(?!.*<\/void>)/g; // <void> without a closing </void>

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = voidTagRegex.exec(line);
      if (match) {
        const before = line;
        let after = line;

        // If it's just <void> on its own, convert to self-closing
        if (line.trim() === '<void>') {
          after = '<void />';
        } else {
          // If it has content, wrap it in a span to avoid JSX invalidity
          after = line.replace(/<void>(.*)/, '<span class="void">$1</span>');
        }

        if (after !== before) {
          lines[i] = after;
          result.edits.push({ line: i + 1, before, after });
          modified = true;
        }
      }
    }
    return modified;
  }
}

async function main() {
  const patcher = new MDXSpecificPatcher();
  const results = await patcher.patchAll();

  console.log('\n--- MDX Specific Patch Report ---');
  let totalEdits = 0;
  let totalErrors = 0;
  
  results.forEach(r => {
    if (r.edits.length > 0) {
      console.log(`File: ${r.file} (${r.edits.length} edits)`);
      r.edits.forEach(edit => {
        console.log(`  L${edit.line}: - ${edit.before}`);
        console.log(`  L${edit.line}: + ${edit.after}`);
      });
      totalEdits += r.edits.length;
    }
    
    if (r.error) {
      console.log(`File: ${r.file} (ERROR)`);
      console.log(`  Error: ${r.error}`);
      totalErrors++;
    }
  });

  if (totalEdits === 0 && totalErrors === 0) {
    console.log('No specific MDX patches applied.');
  } else {
    console.log(`Total specific MDX edits: ${totalEdits}`);
    if (totalErrors > 0) {
      console.log(`Total errors: ${totalErrors}`);
    }
  }
  console.log('---------------------------------');
}

main().catch(console.error);