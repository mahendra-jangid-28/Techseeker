'use client';

import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  runPlaygroundCode,
  runChallengeTestcases,
  getAICodeReview,
  type CodeExecutionResponse,
  type ChallengeExecutionResponse,
  type AICodeReviewResponse,
  type TestCase,
} from '../../lib/api/playground';
import { useTheme } from '../../components/ThemeProvider';
import { Button, ContentCallout, Badge, CodeBlock } from '@techseeker/ui';

const STARTER_CODES: Record<string, string> = {
  python: `"""
TechSeeker Python 3.12 Sandbox
Execute real Python scripts in an isolated, sandboxed environment.
"""

def solve(nums: list[int], target: int) -> list[int]:
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i
    return []

if __name__ == "__main__":
    nums = [2, 7, 11, 15]
    target = 9
    result = solve(nums, target)
    print(f"Indices for target {target}: {result}")
`,
  javascript: `// TechSeeker JavaScript Sandbox (ES6+)
function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) {
            return [map.get(diff), i];
        }
        map.set(nums[i], i);
    }
    return [];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log("Two Sum result:", twoSum(nums, target));
`,
  typescript: `// TechSeeker TypeScript Sandbox
interface SolutionResult {
    indices: [number, number] | [];
    executionTimeMs?: number;
}

function findPair(nums: number[], target: number): SolutionResult {
    const map = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) {
            return { indices: [map.get(diff)!, i] };
        }
        map.set(nums[i], i);
    }
    return { indices: [] };
}

const result = findPair([3, 2, 4], 6);
console.log("TypeScript Pair Found:", result);
`,
  sql: `-- TechSeeker SQL Sandbox
-- Relational Query Design
SELECT 
    u.id AS user_id,
    u.full_name,
    COUNT(p.id) AS completed_projects,
    AVG(p.score) AS average_score
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.full_name
HAVING COUNT(p.id) > 0
ORDER BY average_score DESC;
`,
};

const DEFAULT_SAMPLE_TESTCASES: TestCase[] = [
  {
    id: 1,
    input: 'nums = [2, 7, 11, 15], target = 9',
    expected_output: 'Indices for target 9: [0, 1]',
    explanation: 'Basic standard two sum lookup',
  },
  {
    id: 2,
    input: 'nums = [3, 2, 4], target = 6',
    expected_output: 'Indices for target 6: [1, 2]',
    explanation: 'Non-zero indexed pair',
  },
  {
    id: 3,
    input: 'nums = [3, 3], target = 6',
    expected_output: 'Indices for target 6: [0, 1]',
    explanation: 'Identical value duplicate lookup',
  },
];

export default function PlaygroundPage() {
  const { theme } = useTheme();

  const [language, setLanguage] = useState<string>('python');
  const [fontSize, setFontSize] = useState<number>(13);
  const [code, setCode] = useState<string>(STARTER_CODES.python);
  const [stdin, setStdin] = useState<string>('');
  const [isStdinOpen, setIsStdinOpen] = useState<boolean>(false);
  const [autoSaved, setAutoSaved] = useState<boolean>(false);

  // Execution states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'tests' | 'review'>('console');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Test Runner State
  const [testcases, setTestcases] = useState<TestCase[]>(DEFAULT_SAMPLE_TESTCASES);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<ChallengeExecutionResponse | null>(null);

  // AI Review State
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<AICodeReviewResponse | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Restore from localStorage on initial mount / language change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`techseeker-playground-${language}`);
      if (saved) {
        setCode(saved);
      } else {
        setCode(STARTER_CODES[language] || STARTER_CODES.python);
      }
    } catch {}
  }, [language]);

  // Auto-save code on change with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        localStorage.setItem(`techseeker-playground-${language}`, code);
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 1500);
      } catch {}
    }, 800);

    return () => clearTimeout(handler);
  }, [code, language]);

  // Auto-scroll console
  useEffect(() => {
    if (executionResult && activeTab === 'console') {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionResult, activeTab]);

  async function handleRunCode() {
    if (isLoading) return;
    setIsLoading(true);
    setActiveTab('console');

    try {
      const res = await runPlaygroundCode({
        language,
        code,
        stdin: stdin.trim() ? stdin : undefined,
      });
      setExecutionResult(res);
    } catch (err) {
      setExecutionResult({
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Unknown execution error',
        exit_code: 1,
        execution_time_ms: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRunTests() {
    if (isRunningTests || isLoading) return;
    setIsRunningTests(true);
    setActiveTab('tests');

    try {
      const res = await runChallengeTestcases({
        code,
        language,
        testcases,
      });
      setTestResults(res);
    } catch (err) {
      setTestResults({
        passed: false,
        passed_tests: 0,
        total_tests: testcases.length,
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Failed to execute test cases.',
        execution_time_ms: 0,
        memory_kb: 0,
        test_results: [],
        feedback: 'Test execution error.',
      });
    } finally {
      setIsRunningTests(false);
    }
  }

  async function handleRunAiReview() {
    if (isReviewing || isLoading) return;
    setIsReviewing(true);
    setReviewError(null);
    setActiveTab('review');

    try {
      const res = await getAICodeReview({
        code,
        language,
        stdout: executionResult?.stdout || testResults?.stdout || '',
        stderr: executionResult?.stderr || testResults?.stderr || '',
      });
      setReviewResult(res);
    } catch (err) {
      setReviewError(
        err instanceof Error
          ? err.message
          : 'AI Code Review service is temporarily unavailable.',
      );
    } finally {
      setIsReviewing(false);
    }
  }

  function handleResetCode() {
    const starter = STARTER_CODES[language] || STARTER_CODES.python;
    setCode(starter);
    try {
      localStorage.setItem(`techseeker-playground-${language}`, starter);
    } catch {}
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleDownloadCode() {
    const extensionMap: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      sql: 'sql',
    };
    const ext = extensionMap[language] || 'py';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solution.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCode(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
  }

  const lineCount = code.split('\n').length;

  return (
    <main
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="flex h-[calc(100vh-theme(spacing.12))] md:h-screen w-full flex-col bg-canvas text-content-primary outline-none overflow-hidden"
    >
      {/* Top Application Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-brand border border-brand-border text-xs font-bold shrink-0">
              VS
            </span>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-xs font-bold tracking-tight text-content-primary uppercase">
                Interactive IDE
              </h1>
              <p className="text-[9px] text-content-muted truncate">
                Multi-Language Sandboxed Engineering
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-border-subtle hidden sm:block" />

          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-border-subtle bg-surface-elevated px-2.5 py-1 text-xs font-medium text-content-primary focus:border-brand focus:outline-none cursor-pointer"
            >
              <option value="python">Python 3.12 (Sandbox)</option>
              <option value="javascript">JavaScript (Node)</option>
              <option value="typescript">TypeScript</option>
              <option value="sql">PostgreSQL / SQL</option>
            </select>
          </div>

          {/* Font Size Control */}
          <div className="hidden md:flex items-center gap-1 text-[11px] text-content-muted">
            <span>Size:</span>
            {[12, 13, 14, 16].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setFontSize(sz)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition ${
                  fontSize === sz
                    ? 'bg-brand text-content-inverse font-bold'
                    : 'bg-surface-elevated text-content-secondary hover:bg-surface-hover'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Auto-saved Indicator */}
          {autoSaved && (
            <span className="hidden lg:inline text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in">
              ✓ Saved
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Upload File */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadFile}
            accept=".py,.js,.ts,.sql,.txt"
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Upload local file to editor"
            className="hidden sm:inline-flex text-xs text-content-secondary"
          >
            <span>↑</span>
            <span>Upload</span>
          </Button>

          {/* Download File */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadCode}
            title="Download code as file"
            className="hidden sm:inline-flex text-xs text-content-secondary"
          >
            <span>↓</span>
            <span>Download</span>
          </Button>

          {/* Reset Code */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetCode}
            title="Reset to default starter code"
            className="text-xs text-content-secondary"
          >
            Reset
          </Button>

          {/* Copy Code */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyCode}
            title="Copy code to clipboard"
            className="text-xs font-medium"
          >
            <span>{copiedCode ? '✓' : '⎘'}</span>
            <span className="hidden sm:inline">{copiedCode ? 'Copied' : 'Copy'}</span>
          </Button>

          {/* AI Review Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunAiReview}
            disabled={isReviewing || isLoading}
            isLoading={isReviewing}
            title="Generate comprehensive AI code review"
            className="border-brand-border bg-brand-subtle text-brand hover:bg-brand hover:text-content-inverse text-xs font-semibold"
          >
            <span>✦</span>
            <span>AI Review</span>
          </Button>

          {/* Test Runner Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunTests}
            disabled={isRunningTests || isLoading}
            isLoading={isRunningTests}
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-semibold"
          >
            <span>✓</span>
            <span>Test Cases</span>
          </Button>

          {/* Run Code Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunCode}
            disabled={isLoading || isReviewing || isRunningTests}
            isLoading={isLoading}
            className="text-xs font-bold shadow-subtle px-3.5"
          >
            <span>▶</span>
            <span>{isLoading ? 'Running...' : 'Run'}</span>
            <span className="hidden text-[10px] opacity-80 lg:inline">(Ctrl+↵)</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
        {/* Left Pane: Monaco Code Editor */}
        <section className="flex flex-col border-b border-border-subtle lg:col-span-7 lg:border-b-0 lg:border-r bg-surface min-h-[350px] lg:min-h-0">
          {/* File Tab Bar */}
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-3">
            <div className="flex h-full items-center gap-2 border-t-2 border-brand bg-surface-elevated px-3 text-xs font-medium text-content-primary">
              <span className="text-brand font-mono">
                {language === 'python' ? '🐍 main.py' : language === 'typescript' ? 'TS solution.ts' : language === 'javascript' ? 'JS app.js' : 'SQL query.sql'}
              </span>
              <span className="text-[10px] text-content-muted font-mono">({lineCount} lines)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStdinOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  isStdinOpen
                    ? 'bg-brand-subtle text-brand border border-brand-border'
                    : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
                }`}
              >
                <span>⌨</span>
                <span>STDIN {isStdinOpen ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible STDIN Drawer */}
          {isStdinOpen && (
            <div className="border-b border-border-subtle bg-surface-elevated p-3 animate-fade-in">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-content-secondary">
                <span className="font-semibold uppercase tracking-wider text-content-primary">
                  Standard Input Stream
                </span>
                <span className="text-[10px] text-content-muted">
                  Passed to stdin during execution
                </span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter input lines here..."
                rows={3}
                className="w-full resize-y rounded-lg border border-border-subtle bg-surface p-2.5 font-mono text-xs text-content-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          )}

          {/* Monaco Editor Container */}
          <div className="relative min-h-[300px] flex-1">
            <Editor
              height="100%"
              language={language === 'sql' ? 'sql' : language === 'typescript' ? 'typescript' : language === 'javascript' ? 'javascript' : 'python'}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={code}
              onChange={(val) => setCode(val ?? '')}
              options={{
                fontSize,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                tabSize: 4,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
              }}
            />
          </div>

          {/* Editor Status Footer */}
          <div className="flex h-7 shrink-0 items-center justify-between border-t border-border-subtle bg-surface px-3 text-[10px] text-content-muted font-mono select-none">
            <div className="flex items-center gap-3">
              <span>{language.toUpperCase()}</span>
              <span>UTF-8</span>
              <span>Font: {fontSize}px</span>
            </div>
            <div className="hidden sm:block">
              <span>Ctrl + Enter to run</span>
            </div>
          </div>
        </section>

        {/* Right Pane: Multi-Tab Intelligence & Execution Panel */}
        <section className="flex flex-col bg-surface-elevated lg:col-span-5 min-h-[350px] lg:min-h-0 overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('console')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === 'console'
                    ? 'bg-surface-elevated text-content-primary shadow-subtle'
                    : 'text-content-muted hover:text-content-primary'
                }`}
              >
                Console
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tests')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === 'tests'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-subtle'
                    : 'text-content-muted hover:text-content-primary'
                }`}
              >
                <span>Test Cases</span>
                {testResults && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                      testResults.passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {testResults.passed_tests}/{testResults.total_tests}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('review')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === 'review'
                    ? 'bg-brand-subtle text-brand shadow-subtle'
                    : 'text-content-muted hover:text-content-primary'
                }`}
              >
                <span>✦ AI Review</span>
                {reviewResult && (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </button>
            </div>

            {/* Status Metrics */}
            <div className="flex items-center gap-2">
              {isLoading || isRunningTests || isReviewing ? (
                <Badge variant="warning" size="sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  Processing...
                </Badge>
              ) : executionResult ? (
                <span className="rounded-md border border-border-subtle bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-content-secondary">
                  {executionResult.execution_time_ms} ms
                </span>
              ) : (
                <Badge variant="neutral" size="sm">
                  Ready
                </Badge>
              )}
            </div>
          </div>

          {/* Panel Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {/* TAB 1: CONSOLE OUTPUT */}
            {activeTab === 'console' && (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-content-muted">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mb-3" />
                    <p className="text-xs font-semibold text-content-primary">
                      Executing in sandbox...
                    </p>
                  </div>
                ) : !executionResult ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-lg text-content-muted border border-border-subtle">
                      ▶
                    </div>
                    <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider">
                      Ready to Run
                    </h3>
                    <p className="mt-1 text-xs text-content-muted leading-relaxed">
                      Click <span className="font-semibold text-brand">Run</span> or press{' '}
                      <kbd className="rounded border border-border-subtle bg-surface px-1.5 py-0.5 font-mono text-[10px]">
                        Ctrl + Enter
                      </kbd>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Execution Outcome Badge */}
                    <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                        Terminal Output
                      </span>
                      <Badge
                        variant={executionResult.exit_code === 0 ? 'success' : 'danger'}
                        size="sm"
                      >
                        {executionResult.exit_code === 0 ? 'Exit Code 0 (Success)' : `Exit Code ${executionResult.exit_code}`}
                      </Badge>
                    </div>

                    {/* Standard Output */}
                    {executionResult.stdout && (
                      <div className="rounded-xl border border-border-subtle bg-surface p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1.5">
                          STDOUT
                        </span>
                        <pre className="font-mono text-xs leading-relaxed text-emerald-600 dark:text-emerald-300 whitespace-pre-wrap">
                          {executionResult.stdout}
                        </pre>
                      </div>
                    )}

                    {/* Standard Error */}
                    {executionResult.stderr && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1.5">
                          STDERR
                        </span>
                        <pre className="font-mono text-xs leading-relaxed text-rose-600 dark:text-rose-400 whitespace-pre-wrap">
                          {executionResult.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
                <div ref={consoleEndRef} />
              </div>
            )}

            {/* TAB 2: TEST CASES RUNNER */}
            {activeTab === 'tests' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
                    Challenge Test Cases ({testcases.length})
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRunTests}
                    isLoading={isRunningTests}
                  >
                    Run All Tests ✓
                  </Button>
                </div>

                {/* Summary Feedback */}
                {testResults && (
                  <div
                    className={`rounded-xl border p-3.5 flex items-center justify-between ${
                      testResults.passed
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{testResults.passed ? '✓' : '✗'}</span>
                      <span className="text-xs font-bold">{testResults.feedback}</span>
                    </div>
                    <span className="font-mono text-xs font-semibold">
                      {testResults.execution_time_ms} ms
                    </span>
                  </div>
                )}

                {/* Test Cases List */}
                <div className="space-y-3">
                  {testcases.map((tc, idx) => {
                    const res = testResults?.test_results.find((r) => r.id === tc.id);

                    return (
                      <div
                        key={tc.id}
                        className={`rounded-xl border p-3.5 space-y-2 transition-all ${
                          res
                            ? res.passed
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-rose-500/40 bg-rose-500/5'
                            : 'border-border-subtle bg-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-content-primary">
                            Test Case {idx + 1}
                          </span>
                          {res && (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                res.passed
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {res.passed ? 'Passed ✓' : 'Failed ✗'}
                            </span>
                          )}
                        </div>

                        {/* Input & Expected */}
                        <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono">
                          <div className="rounded-lg bg-surface-elevated p-2">
                            <span className="text-[10px] uppercase font-bold text-content-muted block mb-1">
                              Input:
                            </span>
                            <span className="text-content-secondary">{tc.input}</span>
                          </div>

                          <div className="rounded-lg bg-surface-elevated p-2">
                            <span className="text-[10px] uppercase font-bold text-content-muted block mb-1">
                              Expected:
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400">{tc.expected_output}</span>
                          </div>
                        </div>

                        {/* Actual Output if evaluated */}
                        {res && !res.passed && (
                          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 font-mono text-xs">
                            <span className="text-[10px] uppercase font-bold text-rose-500 block mb-1">
                              Actual Output:
                            </span>
                            <span className="text-rose-600 dark:text-rose-300">
                              {res.actual_output || '(No output)'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: AI CODE REVIEW */}
            {activeTab === 'review' && (
              <div className="space-y-4">
                {isReviewing ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-content-muted">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mb-3" />
                    <p className="text-xs font-semibold text-content-primary">
                      AI Architect conducting code review...
                    </p>
                    <p className="text-[10px] text-content-muted mt-1">
                      Analyzing logic, edge cases, algorithmic complexity, and hint progression
                    </p>
                  </div>
                ) : reviewError ? (
                  <ContentCallout variant="danger" title="Review Unavailable">
                    {reviewError}
                  </ContentCallout>
                ) : !reviewResult ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-lg text-brand border border-brand-border">
                      ✦
                    </div>
                    <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider">
                      Structured AI Review
                    </h3>
                    <p className="mt-1 text-xs text-content-muted leading-relaxed">
                      Receive detailed feedback on logic flow, readability score, detected edge cases, asymptotic complexity, and progressive hint clues.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunAiReview}
                      className="mt-4"
                    >
                      Generate AI Code Review
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {/* Overall Verdict & Readability Score */}
                    <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">
                          Overall Verdict
                        </span>
                        <Badge variant="primary" size="sm">
                          {reviewResult.overall_verdict}
                        </Badge>
                      </div>

                      {/* Readability Meter */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-content-secondary">Readability Score:</span>
                          <span className="font-bold font-mono text-brand">
                            {reviewResult.readability_score} / 10
                          </span>
                        </div>
                        <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-brand h-full rounded-full transition-all duration-500"
                            style={{ width: `${reviewResult.readability_score * 10}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-content-muted pt-1">
                          {reviewResult.readability_feedback}
                        </p>
                      </div>

                      {/* Complexity */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle font-mono text-xs">
                        <div className="rounded-lg bg-surface-elevated p-2">
                          <span className="text-[9px] uppercase text-content-muted block">Time:</span>
                          <span className="text-brand font-semibold">{reviewResult.time_complexity}</span>
                        </div>
                        <div className="rounded-lg bg-surface-elevated p-2">
                          <span className="text-[9px] uppercase text-content-muted block">Space:</span>
                          <span className="text-accent-violet font-semibold">{reviewResult.space_complexity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Logic Analysis */}
                    <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand">
                        Logic Analysis
                      </h4>
                      <p className="text-xs text-content-secondary leading-relaxed">
                        {reviewResult.logic_analysis}
                      </p>
                    </div>

                    {/* Better Approach */}
                    {reviewResult.better_approach && (
                      <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-accent-violet">
                          Algorithmic Optimization
                        </h4>
                        <p className="text-xs text-content-secondary leading-relaxed">
                          {reviewResult.better_approach}
                        </p>
                      </div>
                    )}

                    {/* Edge Cases & Bugs */}
                    {reviewResult.edge_cases && reviewResult.edge_cases.length > 0 && (
                      <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                          Edge Cases to Consider
                        </h4>
                        <ul className="space-y-1 text-xs text-content-secondary">
                          {reviewResult.edge_cases.map((ec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{ec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Progressive Hint Ladder */}
                    {reviewResult.hint_ladder && reviewResult.hint_ladder.length > 0 && (
                      <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                          Progressive Hint Ladder
                        </h4>
                        <div className="space-y-2">
                          {reviewResult.hint_ladder.map((hint, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-border-subtle bg-surface-elevated p-2.5 text-xs text-content-secondary"
                            >
                              <span className="font-semibold text-brand mr-1.5">
                                Clue {idx + 1}:
                              </span>
                              <span>{hint}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
