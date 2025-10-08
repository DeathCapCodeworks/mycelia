import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PatchResult {
  file: string;
  edits: Array<{ line: number; before: string; after: string }>;
  success: boolean;
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
      if (filePath.includes('mainnet-por.md')) {
        modified = this.patchMainnetPor(lines, result);
      } else if (filePath.includes('media-pipeline.md')) {
        modified = this.patchMediaPipeline(lines, result);
      } else if (filePath.includes('net-stack.md')) {
        modified = this.patchNetStack(lines, result);
      } else if (filePath.includes('webrtc-enhanced.md')) {
        modified = this.patchWebrtcEnhanced(lines, result);
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
      console.error(`❌ Failed to patch ${filePath}:`, error);
    }

    this.results.push(result);
  }

  private patchMainnetPor(lines: string[], result: PatchResult): boolean {
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Fix missing closing brace in expressions like {por.freshness}
      if (line.includes('`{') && !line.includes('}`)) {
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
    }

    return modified;
  }

  private patchMediaPipeline(lines: string[], result: PatchResult): boolean {
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Fix unclosed <EncodedChunkStream> tags
      if (line.includes('<EncodedChunkStream>') && !line.includes('</EncodedChunkStream>')) {
        const before = line;
        
        // Find the content and convert to fenced code block
        const content = line.replace('<EncodedChunkStream>', '').trim();
        const after = `\`\`\`tsx\n${content}\n\`\`\``;
        
        lines[i] = after;
        result.edits.push({ line: i + 1, before, after });
        modified = true;
      }
    }

    return modified;
  }

  private patchNetStack(lines: string[], result: PatchResult): boolean {
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Fix invalid JSX tag names like <http/3>
      const invalidTagRegex = /<([^>]*[\/"'<>][^>]*)>/g;
      let match;
      
      while ((match = invalidTagRegex.exec(line)) !== null) {
        const before = line;
        const tagContent = match[1];
        const replacement = `\`${tagContent}\``;
        const after = line.replace(match[0], replacement);
        
        lines[i] = after;
        result.edits.push({ line: i + 1, before, after });
        modified = true;
      }
    }

    return modified;
  }

  private patchWebrtcEnhanced(lines: string[], result: PatchResult): boolean {
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Fix unclosed <void> tags
      if (line.includes('<void>') && !line.includes('</void>') && !line.includes('<void />')) {
        const before = line;
        
        // Check if there's content on the same line
        const content = line.replace('<void>', '').trim();
        if (content && content !== '') {
          // Has content, wrap in span
          const after = `<span class="void">${content}</span>`;
          lines[i] = after;
        } else {
          // No content, make self-closing
          const after = line.replace('<void>', '<void />');
          lines[i] = after;
        }
        
        result.edits.push({ line: i + 1, before, after });
        modified = true;
      }
    }

    return modified;
  }

  printReport(): void {
    const totalFiles = this.results.length;
    const filesPatched = this.results.filter(r => r.success).length;
    const totalEdits = this.results.reduce((sum, r) => sum + r.edits.length, 0);

    console.log(`\n📋 MDX Specific Patch Report:`);
    console.log(`  Total files: ${totalFiles}`);
    console.log(`  Files patched: ${filesPatched}`);
    console.log(`  Total edits: ${totalEdits}`);

    if (totalEdits > 0) {
      console.log(`\n✅ Edits made:`);
      this.results.filter(r => r.success).forEach(result => {
        console.log(`  ${result.file}:`);
        result.edits.forEach(edit => {
          console.log(`    Line ${edit.line}: ${edit.before} → ${edit.after}`);
        });
      });
    }

    if (totalEdits === 0) {
      console.log('\nℹ️ No patches were needed - all files are clean');
    }
  }
}

async function main(): Promise<void> {
  const patcher = new MDXSpecificPatcher();
  const results = await patcher.patchAll();
  patcher.printReport();
  
  // Exit with success
  console.log('\n✅ MDX specific patching completed');
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('MDX specific patching failed:', error);
    process.exit(1);
  });
}
