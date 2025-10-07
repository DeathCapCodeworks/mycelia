export interface CompatibilityTest {
  name: string;
  category: 'css' | 'js' | 'html' | 'api' | 'security' | 'performance';
  feature: string;
  description: string;
  run(): Promise<TestResult>;
}

export interface TestResult {
  passed: boolean;
  message?: string;
  details?: any;
  duration: number;
}

export interface CompatibilityReport {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
  summary: {
    css: { passed: number; failed: number };
    js: { passed: number; failed: number };
    html: { passed: number; failed: number };
    api: { passed: number; failed: number };
    security: { passed: number; failed: number };
    performance: { passed: number; failed: number };
  };
}

export class ModernCompatibilityHarness {
  private tests: CompatibilityTest[] = [];
  private results: TestResult[] = [];

  constructor() {
    this.initializeTests();
  }

  private initializeTests(): void {
    // CSS Modern Features
    this.tests.push({
      name: 'CSS Grid Support',
      category: 'css',
      feature: 'CSS Grid',
      description: 'Test CSS Grid layout support',
      run: async () => {
        const start = performance.now();
        try {
          // Test CSS Grid support
          const testElement = document.createElement('div');
          testElement.style.display = 'grid';
          testElement.style.gridTemplateColumns = '1fr 1fr';
          const supported = testElement.style.display === 'grid';
          return {
            passed: supported,
            message: supported ? 'CSS Grid is supported' : 'CSS Grid is not supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `CSS Grid test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });

    this.tests.push({
      name: 'CSS Custom Properties',
      category: 'css',
      feature: 'CSS Variables',
      description: 'Test CSS custom properties support',
      run: async () => {
        const start = performance.now();
        try {
          const testElement = document.createElement('div');
          testElement.style.setProperty('--test-var', 'red');
          const value = getComputedStyle(testElement).getPropertyValue('--test-var');
          const supported = value === 'red';
          return {
            passed: supported,
            message: supported ? 'CSS Custom Properties are supported' : 'CSS Custom Properties are not supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `CSS Custom Properties test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });

    // JavaScript Modern Features
    this.tests.push({
      name: 'ES6 Modules',
      category: 'js',
      feature: 'ES6 Modules',
      description: 'Test ES6 module support',
      run: async () => {
        const start = performance.now();
        try {
          // Test dynamic import
          const supported = typeof import === 'function';
          return {
            passed: supported,
            message: supported ? 'ES6 Modules are supported' : 'ES6 Modules are not supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `ES6 Modules test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });

    this.tests.push({
      name: 'Async/Await',
      category: 'js',
      feature: 'Async/Await',
      description: 'Test async/await support',
      run: async () => {
        const start = performance.now();
        try {
          // Test async/await
          const testAsync = async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return true;
          };
          const result = await testAsync();
          return {
            passed: result,
            message: 'Async/Await is supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `Async/Await test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });

    // HTML5 Features
    this.tests.push({
      name: 'Web Components',
      category: 'html',
      feature: 'Web Components',
      description: 'Test Web Components support',
      run: async () => {
        const start = performance.now();
        try {
          const supported = 'customElements' in window;
          return {
            passed: supported,
            message: supported ? 'Web Components are supported' : 'Web Components are not supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `Web Components test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });

    // Modern APIs
    this.tests.push({
      name: 'Fetch API',
      category: 'api',
      feature: 'Fetch API',
      description: 'Test Fetch API support',
      run: async () => {
        const start = performance.now();
        try {
          const supported = 'fetch' in window;
          return {
            passed: supported,
            message: supported ? 'Fetch API is supported' : 'Fetch API is not supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `Fetch API test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });

    this.tests.push({
      name: 'Service Workers',
      category: 'api',
      feature: 'Service Workers',
      description: 'Test Service Worker support',
      run: async () => {
        const start = performance.now();
        try {
          const supported = 'serviceWorker' in navigator;
          return {
            passed: supported,
            message: supported ? 'Service Workers are supported' : 'Service Workers are not supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `Service Workers test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });

    // Security Features
    this.tests.push({
      name: 'Content Security Policy',
      category: 'security',
      feature: 'CSP',
      description: 'Test Content Security Policy support',
      run: async () => {
        const start = performance.now();
        try {
          // Check if CSP is supported by testing if we can create a CSP header
          const supported = 'SecurityPolicyViolationEvent' in window;
          return {
            passed: supported,
            message: supported ? 'CSP is supported' : 'CSP is not supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `CSP test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });

    // Performance Features
    this.tests.push({
      name: 'Performance API',
      category: 'performance',
      feature: 'Performance API',
      description: 'Test Performance API support',
      run: async () => {
        const start = performance.now();
        try {
          const supported = 'performance' in window && 'now' in performance;
          return {
            passed: supported,
            message: supported ? 'Performance API is supported' : 'Performance API is not supported',
            duration: performance.now() - start
          };
        } catch (error) {
          return {
            passed: false,
            message: `Performance API test failed: ${error}`,
            duration: performance.now() - start
          };
        }
      }
    });
  }

  async runAllTests(): Promise<CompatibilityReport> {
    this.results = [];
    console.log(`Running ${this.tests.length} compatibility tests...`);

    for (const test of this.tests) {
      try {
        const result = await test.run();
        this.results.push(result);
        console.log(`${result.passed ? '✅' : '❌'} ${test.name}: ${result.message}`);
      } catch (error) {
        this.results.push({
          passed: false,
          message: `Test failed with error: ${error}`,
          duration: 0
        });
        console.log(`❌ ${test.name}: Test failed with error: ${error}`);
      }
    }

    return this.generateReport();
  }

  async runSubset(categories?: string[]): Promise<CompatibilityReport> {
    const filteredTests = categories 
      ? this.tests.filter(test => categories.includes(test.category))
      : this.tests.slice(0, 5); // Default to first 5 tests

    this.results = [];
    console.log(`Running ${filteredTests.length} compatibility tests...`);

    for (const test of filteredTests) {
      try {
        const result = await test.run();
        this.results.push(result);
        console.log(`${result.passed ? '✅' : '❌'} ${test.name}: ${result.message}`);
      } catch (error) {
        this.results.push({
          passed: false,
          message: `Test failed with error: ${error}`,
          duration: 0
        });
        console.log(`❌ ${test.name}: Test failed with error: ${error}`);
      }
    }

    return this.generateReport();
  }

  private generateReport(): CompatibilityReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const skipped = this.tests.length - this.results.length;

    const summary = {
      css: { passed: 0, failed: 0 },
      js: { passed: 0, failed: 0 },
      html: { passed: 0, failed: 0 },
      api: { passed: 0, failed: 0 },
      security: { passed: 0, failed: 0 },
      performance: { passed: 0, failed: 0 }
    };

    this.results.forEach((result, index) => {
      const test = this.tests[index];
      if (test && summary[test.category]) {
        if (result.passed) {
          summary[test.category].passed++;
        } else {
          summary[test.category].failed++;
        }
      }
    });

    return {
      total: this.tests.length,
      passed,
      failed,
      skipped,
      results: this.results,
      summary
    };
  }

  getTests(): CompatibilityTest[] {
    return [...this.tests];
  }

  getResults(): TestResult[] {
    return [...this.results];
  }
}

// Legacy function for backward compatibility
export function runSubset(): { passed: number; failed: number } {
  const harness = new ModernCompatibilityHarness();
  return harness.runSubset().then(report => ({
    passed: report.passed,
    failed: report.failed
  }));
}

