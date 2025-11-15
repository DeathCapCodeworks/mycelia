import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

interface MDXIssue {
  file: string;
  line?: number;
  message: string;
  severity: 'warning' | 'error';
}

class MDXChecker {
  private issues: MDXIssue[] = [];
  private docsDir: string;

  constructor(docsDir: string = 'docs') {
    this.docsDir = docsDir;
  }

  async checkAll(): Promise<MDXIssue[]> {
    this.issues = [];
    
    // Find all MDX/MD files
    const files = await glob(`${this.docsDir}/**/*.{md,mdx}`, { 
      cwd: process.cwd(),
      absolute: true 
    });

    console.log(`🔍 Checking ${files.length} documentation files...`);

    for (const file of files) {
      await this.checkFile(file);
    }

    return this.issues;
  }

  private async checkFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf8');
      const { data: frontmatter, content: body } = matter(content);
      
      // Check frontmatter
      this.checkFrontmatter(filePath, frontmatter);
      
      // Check imports
      this.checkImports(filePath, body, dirname(filePath));
      
    } catch (error) {
      this.addIssue(filePath, `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  private checkFrontmatter(filePath: string, frontmatter: any): void {
    if (!frontmatter.id && !frontmatter.title) {
      this.addIssue(filePath, 'Missing required frontmatter: id or title', 'warning');
    }
    
    if (frontmatter.id && typeof frontmatter.id !== 'string') {
      this.addIssue(filePath, 'Frontmatter id must be a string', 'warning');
    }
    
    if (frontmatter.title && typeof frontmatter.title !== 'string') {
      this.addIssue(filePath, 'Frontmatter title must be a string', 'warning');
    }
  }

  private checkImports(filePath: string, content: string, baseDir: string): void {
    // Look for import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Skip external imports
      if (importPath.startsWith('@') || importPath.startsWith('react') || importPath.startsWith('docusaurus')) {
        continue;
      }
      
      // Check if the imported file exists
      const resolvedPath = this.resolveImportPath(importPath, baseDir);
      if (!existsSync(resolvedPath)) {
        this.addIssue(filePath, `Import resolves to non-existent file: ${importPath}`, 'warning');
      }
    }
  }

  private resolveImportPath(importPath: string, baseDir: string): string {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return join(baseDir, importPath);
    }
    
    // Handle absolute imports from docs root
    if (importPath.startsWith('/')) {
      return join(process.cwd(), 'docs', importPath.substring(1));
    }
    
    // Default to relative from base dir
    return join(baseDir, importPath);
  }

  private addIssue(filePath: string, message: string, severity: 'warning' | 'error'): void {
    this.issues.push({
      file: filePath,
      message,
      severity
    });
  }

  printReport(): void {
    if (this.issues.length === 0) {
      console.log('✅ No MDX issues found');
      return;
    }

    console.log(`\n📋 MDX Check Report (${this.issues.length} issues):`);
    
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const errors = this.issues.filter(i => i.severity === 'error');
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${warnings.length}):`);
      warnings.forEach(issue => {
        console.log(`  ${issue.file}: ${issue.message}`);
      });
    }
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors (${errors.length}):`);
      errors.forEach(issue => {
        console.log(`  ${issue.file}: ${issue.message}`);
      });
    }
    
    console.log(`\n📊 Summary: ${warnings.length} warnings, ${errors.length} errors`);
  }
}

async function main(): Promise<void> {
  const checker = new MDXChecker();
  const issues = await checker.checkAll();
  checker.printReport();
  
  // Exit with non-zero code only for errors, not warnings
  const errorCount = issues.filter(i => i.severity === 'error').length;
  if (errorCount > 0) {
    console.log(`\n❌ Found ${errorCount} errors. Please fix them before building.`);
    process.exit(1);
  } else {
    console.log('\n✅ MDX check completed successfully');
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('MDX check failed:', error);
    process.exit(1);
  });
}
