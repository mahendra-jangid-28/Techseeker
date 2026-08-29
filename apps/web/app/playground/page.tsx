'use client';

import React, { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
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
import { triggerConfetti } from '../../lib/utils/confetti';

interface LanguageConfig {
  id: string;
  label: string;
  badge?: string;
  comingSoon: boolean;
  icon: string;
  filename: string;
}

const LANGUAGES: LanguageConfig[] = [
  {
    id: 'python',
    label: 'Python 3.12 (Sandbox)',
    comingSoon: false,
    icon: '🐍',
    filename: 'main.py',
  },
  {
    id: 'javascript',
    label: 'JavaScript (Node)',
    badge: 'Coming soon',
    comingSoon: true,
    icon: 'JS',
    filename: 'app.js',
  },
  {
    id: 'typescript',
    label: 'TypeScript (v5.9)',
    badge: 'Coming soon',
    comingSoon: true,
    icon: 'TS',
    filename: 'solution.ts',
  },
  {
    id: 'sql',
    label: 'PostgreSQL / SQL',
    badge: 'Coming soon',
    comingSoon: true,
    icon: 'SQL',
    filename: 'query.sql',
  },
];

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

  // Custom Language Selector Dropdown state
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  // Keep ref to latest handleRunCode to ensure Monaco keybinding always executes newest state
  const handleRunCodeRef = useRef<() => Promise<void>>(async () => {});

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Auto-detect input() in Python code to proactively surface STDIN panel
  const usesInput = language === 'python' && /\binput\s*\(/.test(code);

  async function handleRunCode(overrideStdin?: string) {
    if (isLoading) return;
    setIsLoading(true);
    setActiveTab('console');

    const inputPayload = overrideStdin !== undefined ? overrideStdin : stdin;
    const cleanStdin = inputPayload.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    try {
      const res = await runPlaygroundCode({
        language,
        code,
        stdin: cleanStdin.length > 0 ? cleanStdin : undefined,
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

  // Update handleRunCodeRef continuously
  useEffect(() => {
    handleRunCodeRef.current = handleRunCode;
  });

  // Monaco Editor onMount handler: Register Ctrl+Enter / Cmd+Enter keybinding
  const handleEditorMount: OnMount = (editor, monaco) => {
    editor.addAction({
      id: 'run-playground-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1,
      run: () => {
        handleRunCodeRef.current();
      },
    });
  };

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
      if (res.passed) {
        triggerConfetti();
      }
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

  // Global window keydown fallback listener for Ctrl+Enter when editor is not directly focused
  useEffect(() => {
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          handleRunCodeRef.current();
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const lineCount = code.split('\n').length;
  const currentLangConfig = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];
  const isEofError = executionResult?.stderr?.includes('EOFError');
  const isTimeoutError = executionResult?.exit_code === 124 || executionResult?.stderr?.includes('timed out');

  return (
    <main className="flex h-[calc(100vh-theme(spacing.12))] md:h-screen w-full flex-col bg-canvas text-content-primary outline-none overflow-hidden select-none">
      {/* Top Application Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-brand border border-brand-border text-xs font-bold shrink-0">
              IDE
            </span>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-xs font-bold tracking-tight text-content-primary uppercase">
                Interactive Playground
              </h1>
              <p className="text-[9px] text-content-muted truncate">
                Sandboxed Python Execution Engine
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-border-subtle hidden sm:block" />

          {/* Language Selector Custom Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-elevated px-2.5 py-1 text-xs font-medium text-content-primary hover:border-brand-border transition cursor-pointer"
              aria-label="Select execution language"
            >
              <span className="text-xs">{currentLangConfig.icon}</span>
              <span className="font-semibold">{currentLangConfig.label}</span>
              <span className="text-[10px] text-content-muted">▼</span>
            </button>

            {langDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-surface shadow-elevated p-1.5 z-50 animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-content-muted border-b border-border-subtle mb-1">
                  Select Language
                </div>
                {LANGUAGES.map((lang) => {
                  const isSelected = lang.id === language;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      disabled={lang.comingSoon}
                      onClick={() => {
                        if (!lang.comingSoon) {
                          setLanguage(lang.id);
                          setLangDropdownOpen(false);
                        }
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                        isSelected
                          ? 'bg-brand-subtle text-brand font-bold'
                          : lang.comingSoon
                          ? 'opacity-50 cursor-not-allowed text-content-muted'
                          : 'text-content-primary hover:bg-surface-hover cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{lang.icon}</span>
                        <span>{lang.label}</span>
                      </div>
                      {lang.comingSoon ? (
                        <span className="rounded-full border border-border-subtle bg-surface-elevated px-1.5 py-0.2 text-[8px] font-semibold text-content-muted">
                          Coming soon
                        </span>
                      ) : isSelected ? (
                        <span className="text-brand font-bold">✓</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
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
            onClick={() => handleRunCode()}
            disabled={isLoading || isReviewing || isRunningTests}
            isLoading={isLoading}
            className="text-xs font-bold shadow-subtle px-3.5"
            title="Execute script (Ctrl + Enter)"
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
            <div className="flex h-full items-center gap-2 border-t-2 border-data bg-surface-elevated px-3 text-xs font-medium text-content-primary">
              <span className="text-data font-mono">
                {currentLangConfig.icon} {currentLangConfig.filename}
              </span>
              <span className="text-[10px] text-content-muted font-mono">({lineCount} lines)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStdinOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  isStdinOpen || usesInput
                    ? 'bg-data-subtle text-data border border-data-border'
                    : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
                }`}
                title="Open Standard Input (STDIN) Stream Drawer"
              >
                <span>⌨</span>
                <span>STDIN {isStdinOpen ? '▲' : '▼'}</span>
                {usesInput && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" title="Code expects input()" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible STDIN Drawer */}
          {isStdinOpen && (
            <div className="border-b border-border-subtle bg-surface-elevated p-3 animate-fade-in">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-content-secondary">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wider text-content-primary">
                    Standard Input Stream
                  </span>
                  {usesInput && (
                    <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-amber-500">
                      input() detected
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-content-muted">
                  Passed to stdin during execution (one line per input prompt)
                </span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter input values here (e.g. your name, numbers)..."
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
              onMount={handleEditorMount}
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
            <div className="hidden sm:flex items-center gap-2">
              <kbd className="rounded border border-border-subtle bg-surface-elevated px-1.5 py-0.2">
                Ctrl + Enter
              </kbd>
              <span>to execute</span>
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
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
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
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
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
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
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
          <div className="flex-1 min-h-0 overflow-y-auto p-4 select-text">
            {/* TAB 1: CONSOLE OUTPUT */}
            {activeTab === 'console' && (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-content-muted">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-data border-t-transparent mb-3" />
                    <p className="text-xs font-semibold text-content-primary">
                      Executing in sandbox container...
                    </p>
                    <p className="text-[10px] text-content-muted mt-1">
                      Enforcing timeout, memory limits, and isolated permissions.
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
                      </kbd>{' '}
                      to execute your Python code.
                    </p>

                    {/* Proactive STDIN Input Box in console when input() is in code */}
                    {usesInput && (
                      <div className="mt-5 text-left rounded-xl border border-amber-500/30 bg-surface p-3.5 shadow-subtle">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 mb-1.5">
                          <span>⌨</span>
                          <span>Interactive STDIN Input</span>
                        </div>
                        <p className="text-[11px] text-content-muted mb-2 leading-relaxed">
                          Your code calls <code className="font-mono text-amber-400">input()</code>. Enter each prompt value on a new line (e.g. Line 1: name, Line 2: number):
                        </p>
                        <textarea
                          value={stdin}
                          onChange={(e) => setStdin(e.target.value)}
                          placeholder={"Line 1: your name\nLine 2: your number"}
                          rows={3}
                          className="w-full resize-y rounded-lg border border-border-subtle bg-surface-elevated p-2 font-mono text-xs text-content-primary outline-none focus:border-brand"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRunCode()}
                          className="mt-2 text-xs font-semibold w-full justify-center"
                        >
                          Run with Input
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Execution Outcome Badge */}
                    <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                        Terminal Output
                      </span>
                      <div className="flex items-center gap-2">
                        {isTimeoutError && (
                          <Badge variant="warning" size="sm">
                            Timeout (2.0s limit)
                          </Badge>
                        )}
                        <Badge
                          variant={executionResult.exit_code === 0 ? 'success' : 'danger'}
                          size="sm"
                        >
                          {executionResult.exit_code === 0 ? 'Exit Code 0 (Success)' : `Exit Code ${executionResult.exit_code}`}
                        </Badge>
                      </div>
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

                    {/* Inline STDIN Prompt if code threw EOFError due to empty or missing input line */}
                    {isEofError && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 mb-1">
                          <span>⌨</span>
                          <span>Provide Input for Next input() Prompt</span>
                        </div>
                        <p className="text-[11px] text-content-secondary mb-2 leading-relaxed">
                          Your code requested additional input via <code className="font-mono text-amber-400">input()</code>. Provide input values (one per line):
                        </p>
                        <div className="space-y-2">
                          <textarea
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                            placeholder={"Line 1: first input\nLine 2: second input"}
                            rows={3}
                            className="w-full resize-y rounded-lg border border-amber-500/40 bg-surface p-2 font-mono text-xs text-content-primary outline-none focus:border-brand"
                          />
                          <div className="flex justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleRunCode()}
                              isLoading={isLoading}
                              className="text-xs font-semibold"
                            >
                              Run with Input
                            </Button>
                          </div>
                        </div>
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
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">
                      Challenge Test Suite
                    </h3>
                    <p className="text-[10px] text-content-muted">
                      Verify solution against edge cases & sample inputs
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRunTests}
                    disabled={isRunningTests || isLoading}
                    isLoading={isRunningTests}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Run Test Cases
                  </Button>
                </div>

                {isRunningTests ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-content-muted">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-3" />
                    <p className="text-xs font-semibold text-content-primary">
                      Evaluating test cases against sandbox...
                    </p>
                  </div>
                ) : testResults ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-base ${testResults.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {testResults.passed ? '✓' : '✗'}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-content-primary">
                            {testResults.feedback}
                          </p>
                          <p className="text-[10px] text-content-muted font-mono">
                            {testResults.execution_time_ms} ms total execution
                          </p>
                        </div>
                      </div>
                      <Badge variant={testResults.passed ? 'success' : 'danger'} size="md">
                        {testResults.passed ? 'PASSED' : 'FAILED'}
                      </Badge>
                    </div>

                    {/* Test Case Cards */}
                    <div className="space-y-2">
                      {testResults.test_results.map((tr) => (
                        <div
                          key={tr.id}
                          className={`rounded-xl border p-3 ${
                            tr.passed
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-rose-500/30 bg-rose-500/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold font-mono">
                              Case #{tr.id}
                            </span>
                            <Badge variant={tr.passed ? 'success' : 'danger'} size="sm">
                              {tr.passed ? 'Pass' : 'Fail'}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-[11px] font-mono">
                            <div className="text-content-muted">Input: {tr.input}</div>
                            <div className="text-content-secondary">
                              Expected: {tr.expected_output}
                            </div>
                            <div className={tr.passed ? 'text-emerald-400' : 'text-rose-400'}>
                              Actual: {tr.actual_output}
                            </div>
                            {tr.error && (
                              <div className="mt-1 text-rose-500 text-[10px]">
                                Error: {tr.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {testcases.map((tc) => (
                      <div key={tc.id} className="rounded-xl border border-border-subtle bg-surface p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold">Test Case #{tc.id}</span>
                          <span className="text-[10px] text-content-muted">{tc.explanation}</span>
                        </div>
                        <div className="space-y-0.5 text-[11px] font-mono text-content-muted">
                          <div>Input: {tc.input}</div>
                          <div>Expected: {tc.expected_output}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: AI CODE REVIEW */}
            {activeTab === 'review' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                      ✦ AI Code Intelligence Review
                    </h3>
                    <p className="text-[10px] text-content-muted">
                      Evaluates time/space complexity, style, bugs, and edge cases
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRunAiReview}
                    disabled={isReviewing || isLoading}
                    isLoading={isReviewing}
                    className="text-xs font-bold border-brand-border bg-brand-subtle text-brand"
                  >
                    Generate Review
                  </Button>
                </div>

                {reviewError && (
                  <ContentCallout variant="danger" title="Review Error">
                    {reviewError}
                  </ContentCallout>
                )}

                {isReviewing ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-content-muted">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent mb-3" />
                    <p className="text-xs font-semibold text-content-primary">
                      AI is inspecting code structure, complexity, and pitfalls...
                    </p>
                  </div>
                ) : reviewResult ? (
                  <div className="space-y-3">
                    {/* Verdict & Complexity Banner */}
                    <div className="rounded-xl border border-border-subtle bg-surface p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                          Overall Verdict
                        </span>
                        {reviewResult.readability_score !== undefined && (
                          <Badge variant="primary" size="sm">
                            Readability: {reviewResult.readability_score}/10
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-content-primary leading-relaxed">
                        {reviewResult.overall_verdict || 'Code analysis complete.'}
                      </p>
                    </div>

                    {/* Complexity Metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border-subtle bg-surface p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted block">
                          Time Complexity
                        </span>
                        <span className="text-xs font-mono font-bold text-brand mt-0.5 block">
                          {reviewResult.time_complexity || 'O(N)'}
                        </span>
                      </div>
                      <div className="rounded-xl border border-border-subtle bg-surface p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted block">
                          Space Complexity
                        </span>
                        <span className="text-xs font-mono font-bold text-accent-violet mt-0.5 block">
                          {reviewResult.space_complexity || 'O(1)'}
                        </span>
                      </div>
                    </div>

                    {/* Logic Analysis */}
                    {reviewResult.logic_analysis && (
                      <div className="rounded-xl border border-border-subtle bg-surface p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted block mb-1">
                          Logic Analysis
                        </span>
                        <p className="text-xs leading-relaxed text-content-secondary">
                          {reviewResult.logic_analysis}
                        </p>
                      </div>
                    )}

                    {/* Detected Bugs */}
                    {reviewResult.detected_bugs && reviewResult.detected_bugs.length > 0 && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1.5">
                          Potential Issues & Bugs
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-rose-600 dark:text-rose-400">
                          {reviewResult.detected_bugs.map((bug, idx) => (
                            <li key={idx}>{bug}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Edge Cases */}
                    {reviewResult.edge_cases && reviewResult.edge_cases.length > 0 && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1.5">
                          Edge Cases to Consider
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                          {reviewResult.edge_cases.map((ec, idx) => (
                            <li key={idx}>{ec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Better Approach Recommendation */}
                    {reviewResult.better_approach && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                          Optimal Alternative Approach
                        </span>
                        <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
                          {reviewResult.better_approach}
                        </p>
                      </div>
                    )}
                  </div>

                ) : (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-lg text-brand border border-brand-border">
                      ✦
                    </div>
                    <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider">
                      Request AI Review
                    </h3>
                    <p className="mt-1 text-xs text-content-muted leading-relaxed">
                      Receive detailed technical feedback, time & space Big-O analysis, and suggestions.
                    </p>
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
