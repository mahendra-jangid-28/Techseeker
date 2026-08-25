'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { runPlaygroundCode, CodeExecutionResponse } from '../../lib/api/playground';

const DEFAULT_STARTER_CODE = `print("Hello TechSeeker")`;

export default function PlaygroundPage() {
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>(DEFAULT_STARTER_CODE);
  const [stdin, setStdin] = useState<string>('');
  const [isStdinOpen, setIsStdinOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResponse | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'stdout' | 'stderr'>('stdout');
  const [copied, setCopied] = useState<boolean>(false);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll console on execution
  useEffect(() => {
    if (executionResult) {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionResult]);

  async function handleRunCode() {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await runPlaygroundCode({
        language,
        code,
        stdin: stdin.trim() ? stdin : undefined,
      });

      setExecutionResult(res);
      // Auto-switch to stderr tab if there's an error
      if (res.exit_code !== 0 && res.stderr.trim()) {
        setActiveConsoleTab('stderr');
      } else {
        setActiveConsoleTab('stdout');
      }
    } catch (err) {
      setExecutionResult({
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Unknown execution error',
        exit_code: 1,
        execution_time_ms: 0,
      });
      setActiveConsoleTab('stderr');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClearOutput() {
    setExecutionResult(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
  }

  return (
    <main
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="flex min-h-screen flex-col bg-[#1e1e1e] text-slate-200 outline-none"
    >
      {/* Top VS Code App Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#181818] px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-sky-500/20 text-xs font-bold text-sky-400">
              PY
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">
              TechSeeker Playground
            </span>
          </div>

          <div className="h-4 w-px bg-white/[0.1]" />

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="language-select" className="text-xs text-slate-400">
              Language:
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-white/[0.1] bg-[#252526] px-2.5 py-1 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="python">Python 3.12 (Sandboxed)</option>
              <option value="javascript" disabled>
                JavaScript (Coming Soon)
              </option>
              <option value="cpp" disabled>
                C++ (Coming Soon)
              </option>
              <option value="rust" disabled>
                Rust (Coming Soon)
              </option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#252526] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-[#2d2d2d] hover:text-white"
          >
            <span>{copied ? '✓' : '⎘'}</span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Clear Output */}
          <button
            type="button"
            onClick={handleClearOutput}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#252526] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-[#2d2d2d] hover:text-slate-200"
          >
            <span>⊘</span>
            <span>Clear Output</span>
          </button>

          {/* Run Code Button */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>Run</span>
                <span className="hidden text-[10px] opacity-70 sm:inline">(Ctrl+↵)</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
        {/* Monaco Code Editor Pane */}
        <section className="flex flex-col border-b border-white/[0.08] lg:col-span-7 lg:border-b-0 lg:border-r">
          {/* VS Code Tab Bar */}
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#1e1e1e] px-2">
            <div className="flex h-full items-center gap-2 border-t-2 border-sky-400 bg-[#252526] px-3.5 text-xs font-medium text-white">
              <span className="text-sky-400">🐍</span>
              <span>main.py</span>
            </div>

            <button
              type="button"
              onClick={() => setIsStdinOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                isStdinOpen
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
              }`}
            >
              <span>⌨</span>
              <span>STDIN Input {isStdinOpen ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Collapsible STDIN Pane */}
          {isStdinOpen && (
            <div className="border-b border-white/[0.08] bg-[#181818] p-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-slate-300">
                  Standard Input (STDIN)
                </span>
                <span className="text-slate-500">Passed to input() during execution</span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter standard input lines here..."
                rows={3}
                className="w-full resize-y rounded-md border border-white/[0.1] bg-[#1e1e1e] p-2 font-mono text-xs text-slate-200 outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Monaco Editor Component */}
          <div className="relative min-h-[380px] flex-1">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val ?? '')}
              options={{
                fontSize: 13,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                tabSize: 4,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          </div>
        </section>

        {/* Output & Terminal Console Pane */}
        <section className="flex flex-col bg-[#181818] lg:col-span-5">
          {/* Console Header & Tabs */}
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#1e1e1e] px-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveConsoleTab('stdout')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                  activeConsoleTab === 'stdout'
                    ? 'bg-[#252526] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                STDOUT
              </button>

              <button
                type="button"
                onClick={() => setActiveConsoleTab('stderr')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition ${
                  activeConsoleTab === 'stderr'
                    ? 'bg-[#252526] text-rose-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>STDERR</span>
                {executionResult?.stderr && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            </div>

            {/* Execution Metrics Badges */}
            {executionResult && (
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    executionResult.exit_code === 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  Exit: {executionResult.exit_code}
                </span>

                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                  {executionResult.execution_time_ms} ms
                </span>
              </div>
            )}
          </div>

          {/* Console Output Area */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                <span>Running sandboxed Python process...</span>
              </div>
            ) : !executionResult ? (
              <div className="text-slate-500">
                Click <span className="font-semibold text-emerald-400">Run</span> to execute your Python script in the secure sandbox.
              </div>
            ) : activeConsoleTab === 'stdout' ? (
              executionResult.stdout ? (
                <pre className="whitespace-pre-wrap text-emerald-300">
                  {executionResult.stdout}
                </pre>
              ) : (
                <div className="italic text-slate-500">(No standard output produced)</div>
              )
            ) : (
              executionResult.stderr ? (
                <pre className="whitespace-pre-wrap text-rose-400">
                  {executionResult.stderr}
                </pre>
              ) : (
                <div className="italic text-slate-500">(No errors or stderr output)</div>
              )
            )}
            <div ref={consoleEndRef} />
          </div>
        </section>
      </div>
    </main>
  );
}
