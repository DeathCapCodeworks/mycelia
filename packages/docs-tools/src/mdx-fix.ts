import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

interface FixResult {
  file: string;
  changes: string[];
  errors: string[];
}

class MDXFixer {
  private changes: FixResult[] = [];

  async fixAll(): Promise<FixResult[]> {
    this.changes = [];
    
    // Find all MDX/MD files in docs directory
    const files = await glob('docs/**/*.{md,mdx}', { 
      cwd: process.cwd(),
      absolute: true 
    });

    console.log(`🔧 Fixing ${files.length} documentation files...`);

    for (const file of files) {
      await this.fixFile(file);
    }

    return this.changes;
  }

  private async fixFile(filePath: string): Promise<void> {
    const result: FixResult = {
      file: filePath,
      changes: [],
      errors: []
    };

    try {
      const originalContent = readFileSync(filePath, 'utf8');
      const { data: frontmatter, content: body } = matter(originalContent);
      
      let modifiedContent = originalContent;
      let hasChanges = false;

      // Fix 1: Ensure frontmatter has at least title
      if (!frontmatter.title) {
        const filename = basename(filePath, extname(filePath));
        const title = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const frontmatterStr = `---\ntitle: ${title}\n---\n\n`;
        modifiedContent = frontmatterStr + body;
        hasChanges = true;
        result.changes.push(`Added title: ${title}`);
      }

      // Fix 2: Convert triple-backtick fences that miss language into ```text
      modifiedContent = modifiedContent.replace(/```\n/g, '```text\n');
      if (modifiedContent !== originalContent) {
        hasChanges = true;
        result.changes.push('Fixed code fences without language');
      }

      // Fix 3: Replace problematic imports with warning comments
      const importRegex = /import\s+.*?\s+from\s+['"]@site\/([^'"]+)['"];?/g;
      let importMatch;
      const importReplacements: string[] = [];
      
      while ((importMatch = importRegex.exec(modifiedContent)) !== null) {
        const importPath = importMatch[1];
        const resolvedPath = join(process.cwd(), 'apps', 'docs', 'docs', importPath);
        
        if (!existsSync(resolvedPath)) {
          const warningComment = `{/* WARNING: Import removed - file not found: @site/${importPath} */}`;
          modifiedContent = modifiedContent.replace(importMatch[0], warningComment);
          importReplacements.push(importPath);
        }
      }
      
      if (importReplacements.length > 0) {
        hasChanges = true;
        result.changes.push(`Removed ${importReplacements.length} broken imports`);
      }

      // Fix 4: Ensure headings start at H1 or H2; demote H0 usages
      const headingRegex = /^(#{0,2})(#{3,6})\s+(.+)$/gm;
      let headingMatch;
      const headingReplacements: string[] = [];
      
      while ((headingMatch = headingRegex.exec(modifiedContent)) !== null) {
        const [, prefix, hashes, text] = headingMatch;
        const newLevel = Math.min(prefix.length + hashes.length, 6);
        const newHashes = '#'.repeat(newLevel);
        const replacement = `${newHashes} ${text}`;
        
        modifiedContent = modifiedContent.replace(headingMatch[0], replacement);
        headingReplacements.push(`${headingMatch[0]} -> ${replacement}`);
      }
      
      if (headingReplacements.length > 0) {
        hasChanges = true;
        result.changes.push(`Fixed ${headingReplacements.length} heading levels`);
      }

      // Write changes if any were made
      if (hasChanges) {
        // Create backup
        const backupPath = filePath + '.bak';
        writeFileSync(backupPath, originalContent);
        
        // Write fixed content
        writeFileSync(filePath, modifiedContent);
        
        console.log(`✅ Fixed ${filePath}: ${result.changes.join(', ')}`);
      } else {
        console.log(`ℹ️ No changes needed for ${filePath}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to process file: ${errorMsg}`);
      console.error(`❌ Failed to fix ${filePath}:`, errorMsg);
    }

    this.changes.push(result);
  }

  printReport(): void {
    const totalFiles = this.changes.length;
    const filesWithChanges = this.changes.filter(c => c.changes.length > 0).length;
    const filesWithErrors = this.changes.filter(c => c.errors.length > 0).length;

    console.log(`\n📋 MDX Fix Report:`);
    console.log(`  Total files: ${totalFiles}`);
    console.log(`  Files modified: ${filesWithChanges}`);
    console.log(`  Files with errors: ${filesWithErrors}`);

    if (filesWithErrors > 0) {
      console.log(`\n❌ Errors:`);
      this.changes.filter(c => c.errors.length > 0).forEach(result => {
        console.log(`  ${result.file}:`);
        result.errors.forEach(error => console.log(`    - ${error}`));
      });
    }

    if (filesWithChanges > 0) {
      console.log(`\n✅ Changes made:`);
      this.changes.filter(c => c.changes.length > 0).forEach(result => {
        console.log(`  ${result.file}:`);
        result.changes.forEach(change => console.log(`    - ${change}`));
      });
    }
  }
}

async function main(): Promise<void> {
  const fixer = new MDXFixer();
  const results = await fixer.fixAll();
  fixer.printReport();
  
  // Exit with non-zero code only for errors
  const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);
  if (errorCount > 0) {
    console.log(`\n❌ Found ${errorCount} errors. Please review the files.`);
    process.exit(1);
  } else {
    console.log('\n✅ MDX fix completed successfully');
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('MDX fix failed:', error);
    process.exit(1);
  });
}
