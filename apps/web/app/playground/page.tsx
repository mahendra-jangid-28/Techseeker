'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { executeCode, CodeExecutionResponse } from '../../lib/api/playground';
import { analyzeCode, CodeDebugResponse } from '../../lib/api/debug';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  ProjectDetail,
  ProjectListItem,
  SupportedLanguage,
} from '../../lib/api/projects';
import { getToken } from '../../lib/api/auth';

const starterCodes: Record<SupportedLanguage, string> = {
  javascript: `function greet(name) {
  return \`Hello, \${name}! Welcome to TechSeeker.\`;
}

const user = 'Developer';

console.log(greet(user));`,
  python: `def greet(name):
    return f"Hello, {name}! Welcome to TechSeeker."

user = "Developer"
print(greet(user))`,
  cpp: `#include <iostream>
#include <string>

std::string greet(const std::string &name) {
  return "Hello, " + name + "! Welcome to TechSeeker.";
}

int main() {
  std::string user = "Developer";
  std::cout << greet(user) << std::endl;
  return 0;
} `,
};

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return value === 'python' || value === 'cpp' || value === 'javascript';
}

export default function PlaygroundPage() {
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(() => starterCodes.python);
  const [stdin, setStdin] = useState<string>('');
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<CodeExecutionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'output' | 'stdin'>('output');

  // AI Mentor States
  const [isAiCardOpen, setIsAiCardOpen] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [debugResult, setDebugResult] = useState<CodeDebugResponse | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sprint 6: Project Persistence States
  const [activeProject, setActiveProject] = useState<ProjectDetail | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectListItem[]>([]);
  const [isProjectsDrawerOpen, setIsProjectsDrawerOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectLanguage, setNewProjectLanguage] = useState<SupportedLanguage>('python');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isAuthAvailable, setIsAuthAvailable] = useState<boolean>(false);

  const storageKeyRef = useRef<string>('playground:code:python');
  const outputConsoleRef = useRef<HTMLDivElement>(null);
  const lastExecutedPayloadRef = useRef<{
    language: string;
    code: string;
    stdout: string;
    stderr: string;
    exit_code: number | null;
  } | null>(null);

  // Check auth and load project list
  useEffect(() => {
    const token = getToken();
    setIsAuthAvailable(Boolean(token));
    if (token) {
      fetchUserProjects();
    }
  }, []);

  const fetchUserProjects = async () => {
    try {
      const items = await listProjects();
      setProjectsList(items);
    } catch {
      // ignore fetch errors if not logged in
    }
  };

  useEffect(() => {
    const key = `playground:code:${language}`;
    storageKeyRef.current = key;
    // Only load scratchpad code if NOT viewing an active saved project
    if (!activeProject) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (saved) setCode(saved);
      else setCode(starterCodes[language]);
    }
  }, [language, activeProject]);

  useEffect(() => {
    try {
      if (!activeProject && typeof window !== 'undefined') {
        localStorage.setItem(storageKeyRef.current, code);
      }
    } catch {
      // ignore storage write errors
    }
  }, [code, activeProject]);

  // Auto-scroll output container whenever stdout, stderr or result updates
  useEffect(() => {
    if (outputConsoleRef.current) {
      outputConsoleRef.current.scrollTo({
        top: outputConsoleRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [stdout, stderr, executionResult]);

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (isSupportedLanguage(val)) {
      setLanguage(val);
    }
  };

  const triggerAiAnalysis = async (payload: {
    language: string;
    code: string;
    stdout: string;
    stderr: string;
    exit_code: number | null;
  }) => {
    setIsAnalyzing(true);
    setDebugError(null);

    try {
      const response = await analyzeCode(payload);
      setDebugResult(response);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'AI Code Mentor is temporarily unavailable.';
      setDebugError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCode = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setActiveTab('output');
    setStdout('');
    setStderr('');
    setExecutionResult(null);
    setHasExecuted(true);
    setDebugResult(null);
    setDebugError(null);

    const executionPayload = {
      language,
      code,
      stdin: stdin.trim() ? stdin : undefined,
    };

    let executedStdout = '';
    let executedStderr = '';
    let executedExitCode: number | null = null;

    try {
      const result = await executeCode(executionPayload);

      setExecutionResult(result);
      executedStdout = result.stdout;
      executedStderr = result.stderr;
      executedExitCode = result.exit_code;
      setStdout(executedStdout);
      setStderr(executedStderr);
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'An unexpected execution error occurred.';
      executedStderr = errorMsg;
      setStderr(errorMsg);
      setExecutionResult({
        status: 'internal_error',
        stdout: '',
        stderr: errorMsg,
        exit_code: null,
        execution_time_ms: 0,
        output_truncated: false,
      });
    } finally {
      // Console updates immediately; execution spinner stops
      setIsLoading(false);

      // Trigger background AI Mentor analysis without blocking console
      const aiPayload = {
        language,
        code,
        stdout: executedStdout,
        stderr: executedStderr,
        exit_code: executedExitCode,
      };
      lastExecutedPayloadRef.current = aiPayload;
      triggerAiAnalysis(aiPayload);
    }
  };

  // Sprint 6 Project Handlers
  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSaving(true);
    try {
      const initialCode = starterCodes[newProjectLanguage];
      const created = await createProject({
        name: newProjectName.trim(),
        language: newProjectLanguage,
        code: initialCode,
      });

      setActiveProject(created);
      setLanguage(created.language);
      setCode(created.code);
      setIsNewProjectModalOpen(false);
      setNewProjectName('');
      await fetchUserProjects();
      showBanner(`Project "${created.name}" created successfully!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      showBanner(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProject = async () => {
    if (isSaving) return;

    if (!isAuthAvailable) {
      showBanner('Please log in to save and persist projects.', 'error');
      return;
    }

    // If no active project, prompt creation
    if (!activeProject) {
      setNewProjectName('Untitled Project');
      setNewProjectLanguage(language);
      setIsNewProjectModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateProject(activeProject.id, {
        name: activeProject.name,
        language,
        code,
      });
      setActiveProject(updated);
      await fetchUserProjects();
      showBanner(`Project "${updated.name}" saved!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save project';
      showBanner(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenProject = async (projectId: number) => {
    try {
      const detail = await getProject(projectId);
      setActiveProject(detail);
      setLanguage(detail.language);
      setCode(detail.code);
      setIsProjectsDrawerOpen(false);
      showBanner(`Loaded project "${detail.name}"`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load project';
      showBanner(msg, 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      if (activeProject && activeProject.id === projectToDelete.id) {
        setActiveProject(null);
        setCode(starterCodes[language]);
      }
      setProjectToDelete(null);
      await fetchUserProjects();
      showBanner(`Deleted project "${projectToDelete.name}"`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete project';
      showBanner(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseActiveProject = () => {
    setActiveProject(null);
    setCode(starterCodes[language]);
    showBanner('Returned to Scratchpad mode.', 'success');
  };

  const showBanner = (message: string, type: 'success' | 'error') => {
    setSaveBanner({ message, type });
    setTimeout(() => {
      setSaveBanner((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const retryAiAnalysis = () => {
    if (lastExecutedPayloadRef.current && !isAnalyzing) {
      triggerAiAnalysis(lastExecutedPayloadRef.current);
    }
  };

  const handleCopyImprovedCode = async () => {
    if (!debugResult?.improved_code) return;
    try {
      await navigator.clipboard.writeText(debugResult.improved_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const resetCode = () => {
    if (activeProject) {
      setCode(starterCodes[language]);
    } else {
      const key = storageKeyRef.current;
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
      setCode(starterCodes[language]);
    }
  };

  const clearConsole = () => {
    setStdout('');
    setStderr('');
    setExecutionResult(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-violet-500/[0.08] blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20%] h-[28rem] w-[28rem] rounded-full bg-sky-500/[0.06] blur-[120px]" />
      </div>

      {/* Floating Notification Banner */}
      {saveBanner && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium shadow-2xl backdrop-blur-xl transition ${
            saveBanner.type === 'success'
              ? 'border border-emerald-400/30 bg-emerald-950/90 text-emerald-300'
              : 'border border-red-400/30 bg-red-950/90 text-red-300'
          }`}
        >
          <span>{saveBanner.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{saveBanner.message}</span>
        </div>
      )}

      <div className="relative mx-auto min-h-screen max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-lg font-bold text-white shadow-xl shadow-violet-500/20">
              {'</>'}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-semibold tracking-tight text-white">
                  {activeProject ? activeProject.name : 'Code Playground'}
                </h1>

                {activeProject ? (
                  <span className="flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    Saved Project
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    Scratchpad
                  </span>
                )}

                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300">
                  Docker Sandbox
                </span>
              </div>

              <p className="mt-0.5 text-xs text-slate-400">
                {activeProject
                  ? `Last updated: ${new Date(activeProject.updated_at).toLocaleString()}`
                  : 'Write, execute in isolated containers, and persist your code'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* My Projects Button */}
            <button
              type="button"
              onClick={() => {
                fetchUserProjects();
                setIsProjectsDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-violet-500/40 hover:bg-slate-800"
            >
              <span>📁</span>
              <span>Projects</span>
              {projectsList.length > 0 && (
                <span className="rounded-full bg-violet-500/20 px-1.5 py-0.2 text-[10px] font-bold text-violet-300">
                  {projectsList.length}
                </span>
              )}
            </button>

            {/* New Project Button */}
            <button
              type="button"
              onClick={() => {
                setNewProjectName('');
                setNewProjectLanguage(language);
                setIsNewProjectModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-violet-500/40 hover:bg-slate-800"
            >
              <span>+</span>
              <span>New</span>
            </button>

            {/* Save Project Button */}
            <button
              type="button"
              onClick={handleSaveProject}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="h-3 w-3 animate-spin text-sky-300" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save</span>
                </>
              )}
            </button>

            {/* Close Active Project Button */}
            {activeProject && (
              <button
                type="button"
                onClick={handleCloseActiveProject}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                title="Close project and return to scratchpad"
              >
                ✕ Close
              </button>
            )}

            {/* Language Selector */}
            <select
              value={language}
              onChange={handleLanguageChange}
              disabled={isLoading}
              className="rounded-xl border border-white/[0.08] bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-200 outline-none transition focus:border-violet-500/50"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
            </select>

            <button
              type="button"
              onClick={resetCode}
              disabled={isLoading}
              className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-50"
            >
              Reset
            </button>

            {/* Run Button */}
            <button
              type="button"
              onClick={runCode}
              disabled={isLoading}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg transition ${
                isLoading
                  ? 'cursor-not-allowed bg-violet-600/50 opacity-75'
                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/25 hover:from-violet-400 hover:to-fuchsia-400 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>Run</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Workspace */}
        <section className="grid min-h-[calc(100vh-120px)] gap-4 py-5 lg:grid-cols-[7fr_3fr]">
          {/* Editor */}
          <div className="flex min-h-[550px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-950/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>

                <span className="text-xs font-medium text-slate-400">
                  {activeProject ? activeProject.name : `main.${language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'cpp'}`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {executionResult && (
                  <div className="flex items-center gap-2">
                    {/* Execution time badge */}
                    <span className="rounded-md border border-slate-700/50 bg-slate-800/60 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      ⚡ {executionResult.execution_time_ms.toFixed(1)} ms
                    </span>

                    {/* Exit code badge */}
                    {executionResult.exit_code !== null ? (
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold ${
                          executionResult.exit_code === 0
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-400'
                        }`}
                      >
                        Exit {executionResult.exit_code}
                      </span>
                    ) : (
                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                        {executionResult.status.toUpperCase()}
                      </span>
                    )}

                    {/* Truncated badge */}
                    {executionResult.output_truncated && (
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        Truncated 64KB
                      </span>
                    )}
                  </div>
                )}

                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {language === 'javascript' ? 'JavaScript' : language === 'python' ? 'Python' : 'C++'}
                </span>
              </div>
            </div>

            <div className="min-h-[500px] flex-1">
              <Editor
                height="100%"
                defaultLanguage={language}
                language={language}
                value={code}
                onChange={(v) => typeof v === 'string' && setCode(v)}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Side panel */}
          <div className="flex flex-col gap-4">
            {/* Output & Stdin Console */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-950/70 shadow-xl shadow-black/20 backdrop-blur-xl">
              {/* Console Tabs */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('output')}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      activeTab === 'output'
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isLoading
                          ? 'animate-pulse bg-amber-400'
                          : stderr
                          ? 'bg-red-400'
                          : stdout
                          ? 'bg-emerald-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span>Output</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('stdin')}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      activeTab === 'stdin'
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Input (stdin)</span>
                    {stdin.trim().length > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {activeTab === 'output' && (stdout || stderr || executionResult) && (
                    <button
                      type="button"
                      onClick={clearConsole}
                      className="text-[11px] text-slate-500 transition hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Console Body */}
              <div className="flex min-h-[220px] max-h-[320px] flex-col p-3">
                {activeTab === 'stdin' ? (
                  <div className="flex flex-1 flex-col">
                    <label
                      htmlFor="stdin-input"
                      className="mb-1.5 text-[11px] font-medium text-slate-400"
                    >
                      Standard Input passed to code during execution:
                    </label>
                    <textarea
                      id="stdin-input"
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      placeholder="Type standard input here (e.g. data for input() or cin)..."
                      className="min-h-[140px] flex-1 resize-none rounded-xl border border-white/[0.06] bg-slate-900/60 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 outline-none transition focus:border-violet-500/50"
                    />
                  </div>
                ) : (
                  <div
                    ref={outputConsoleRef}
                    className="flex-1 overflow-y-auto rounded-xl bg-slate-900/60 p-3 font-mono text-xs"
                  >
                    {isLoading ? (
                      <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-slate-400">
                        <svg
                          className="h-5 w-5 animate-spin text-violet-400"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        <span className="text-xs font-medium text-slate-400">
                          Executing code in isolated container...
                        </span>
                      </div>
                    ) : !stdout && !stderr ? (
                      <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-slate-600">
                        <p className="text-xs">Click Run to execute code.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Stdout Output */}
                        {stdout && (
                          <div className="flex flex-col">
                            <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Standard Output:
                            </span>
                            <pre className="whitespace-pre-wrap font-mono leading-relaxed text-emerald-300">
                              {stdout}
                            </pre>
                          </div>
                        )}

                        {/* Stderr Output */}
                        {stderr && (
                          <div className="flex flex-col rounded-lg border border-red-500/20 bg-red-500/[0.05] p-2.5">
                            <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                              Standard Error / Diagnostics:
                            </span>
                            <pre className="whitespace-pre-wrap font-mono leading-relaxed text-red-300">
                              {stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI Code Mentor Collapsible Card */}
            <div className="overflow-hidden rounded-2xl border border-sky-400/15 bg-gradient-to-br from-sky-500/[0.07] via-slate-950/80 to-violet-500/[0.07] shadow-xl shadow-black/20 backdrop-blur-xl transition">
              {/* Card Header */}
              <div
                onClick={() => setIsAiCardOpen((prev) => !prev)}
                className="flex cursor-pointer items-center justify-between border-b border-white/[0.06] px-4 py-3 select-none hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/20 to-violet-500/20 text-xs text-sky-300">
                    ✦
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-slate-100">
                        AI Code Mentor
                      </h3>
                      {isAnalyzing && (
                        <span className="flex items-center gap-1 text-[10px] text-sky-400">
                          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-sky-400" />
                          Analyzing...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {isAiCardOpen ? '▼' : '▲'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              {isAiCardOpen && (
                <div className="p-4 text-xs leading-relaxed text-slate-300">
                  {/* State 1: Before Execution */}
                  {!hasExecuted && !isAnalyzing && (
                    <div className="py-4 text-center text-slate-500">
                      <p className="text-xs">
                        Run your code to receive AI feedback.
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        The AI will explain runtime errors, logic bugs, time complexity, and suggestions.
                      </p>
                    </div>
                  )}

                  {/* State 2: While Analyzing (Skeleton Loader) */}
                  {isAnalyzing && (
                    <div className="flex flex-col gap-3 py-2 animate-pulse">
                      <div className="h-4 w-3/4 rounded bg-sky-400/10" />
                      <div className="h-12 w-full rounded-xl bg-slate-900/60" />
                      <div className="h-16 w-full rounded-xl bg-slate-900/60" />
                      <div className="flex gap-2">
                        <div className="h-5 w-24 rounded bg-sky-400/10" />
                        <div className="h-5 w-32 rounded bg-violet-400/10" />
                      </div>
                    </div>
                  )}

                  {/* State 4: AI Unavailable / Error */}
                  {debugError && !isAnalyzing && (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-red-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-red-400">
                          Analysis Notice
                        </span>
                        <button
                          type="button"
                          onClick={retryAiAnalysis}
                          className="rounded-lg bg-red-400/20 px-2 py-0.5 text-[10px] font-medium text-red-200 transition hover:bg-red-400/30"
                        >
                          Retry Analysis
                        </button>
                      </div>
                      <p className="text-[11px] text-red-300/90">{debugError}</p>
                    </div>
                  )}

                  {/* State 3: Success Result */}
                  {debugResult && !isAnalyzing && (
                    <div className="flex flex-col gap-3.5">
                      {/* Summary & Error Badge */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                              debugResult.error_type.toLowerCase().includes('none') ||
                              debugResult.error_type.toLowerCase().includes('success')
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                            }`}
                          >
                            {debugResult.error_type}
                          </span>

                          {debugResult.complexity && (
                            <span className="rounded-md border border-white/[0.06] bg-slate-900/60 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                              {debugResult.complexity}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-medium text-slate-200">
                          {debugResult.summary}
                        </p>
                      </div>

                      {/* Explanation */}
                      {debugResult.explanation && (
                        <div className="rounded-xl border border-white/[0.06] bg-slate-900/60 p-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300/80">
                            Mentor Explanation
                          </p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {debugResult.explanation}
                          </p>
                        </div>
                      )}

                      {/* Suggested Fix */}
                      {debugResult.fix && (
                        <div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.05] p-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                            Suggested Fix & Guidance
                          </p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {debugResult.fix}
                          </p>
                        </div>
                      )}

                      {/* Improved Code */}
                      {debugResult.improved_code && (
                        <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-slate-950/90">
                          <div className="flex items-center justify-between border-b border-white/[0.06] bg-slate-900/70 px-3 py-1.5">
                            <span className="text-[10px] font-medium text-slate-400">
                              Improved Code
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyImprovedCode}
                              className="text-[10px] text-sky-400 transition hover:text-sky-300"
                            >
                              {copied ? '✓ Copied' : 'Copy Code'}
                            </button>
                          </div>
                          <pre className="max-h-48 overflow-auto p-3 font-mono text-[11px] text-slate-200 leading-relaxed">
                            {debugResult.improved_code}
                          </pre>
                        </div>
                      )}

                      {/* Tips */}
                      {debugResult.tips && debugResult.tips.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Best Practice Tips:
                          </span>
                          <ul className="flex flex-col gap-1 pl-3 text-[11px] text-slate-400">
                            {debugResult.tips.map((tip, i) => (
                              <li key={i} className="list-disc leading-relaxed">
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Runtime Status */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Runtime status
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Container Sandbox
                </span>

                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Projects List Drawer / Modal */}
      {isProjectsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📁</span>
                <h2 className="text-sm font-semibold text-white">My Projects</h2>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                  {projectsList.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsProjectsDrawerOpen(false)}
                className="text-slate-400 transition hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {projectsList.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <p className="text-xs">No saved projects yet.</p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Click &quot;New&quot; or &quot;Save&quot; to persist your code.
                  </p>
                </div>
              ) : (
                projectsList.map((proj) => (
                  <div
                    key={proj.id}
                    className={`flex items-center justify-between rounded-xl border p-3 transition ${
                      activeProject?.id === proj.id
                        ? 'border-violet-500/40 bg-violet-500/[0.08]'
                        : 'border-white/[0.06] bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <div
                      className="flex flex-1 cursor-pointer flex-col"
                      onClick={() => handleOpenProject(proj.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">
                          {proj.name}
                        </span>
                        <span className="rounded-md border border-white/[0.08] bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-mono uppercase text-slate-400">
                          {proj.language}
                        </span>
                      </div>
                      <span className="mt-1 text-[10px] text-slate-500">
                        Updated {new Date(proj.updated_at).toLocaleDateString()} at{' '}
                        {new Date(proj.updated_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenProject(proj.id)}
                        className="rounded-lg bg-violet-500/20 px-2.5 py-1 text-[11px] font-medium text-violet-300 transition hover:bg-violet-500/30"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(proj)}
                        className="rounded-lg bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20"
                        title="Delete project"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/[0.08] pt-3 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsProjectsDrawerOpen(false);
                  setNewProjectName('');
                  setNewProjectLanguage(language);
                  setIsNewProjectModalOpen(true);
                }}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
              >
                + New Project
              </button>

              <button
                type="button"
                onClick={() => setIsProjectsDrawerOpen(false)}
                className="rounded-xl border border-white/[0.08] bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateNewProject}
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-slate-950 p-5 shadow-2xl"
          >
            <h2 className="text-sm font-semibold text-white border-b border-white/[0.08] pb-3">
              Create New Project
            </h2>

            <div className="my-4 space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium text-slate-400">
                  Project Name:
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Binary Search Tree"
                  className="w-full rounded-xl border border-white/[0.08] bg-slate-900 p-2.5 text-slate-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-slate-400">
                  Language:
                </label>
                <select
                  value={newProjectLanguage}
                  onChange={(e) => setNewProjectLanguage(e.target.value as SupportedLanguage)}
                  className="w-full rounded-xl border border-white/[0.08] bg-slate-900 p-2.5 text-slate-200 outline-none focus:border-violet-500"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="cpp">C++</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-3">
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="rounded-xl border border-white/[0.08] bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !newProjectName.trim()}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg disabled:opacity-50"
              >
                {isSaving ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-red-500/30 bg-slate-950 p-5 shadow-2xl">
            <h2 className="text-sm font-semibold text-red-400 border-b border-white/[0.08] pb-3">
              Delete Project
            </h2>

            <p className="my-4 text-xs text-slate-300">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">&quot;{projectToDelete.name}&quot;</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-3">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="rounded-xl border border-white/[0.08] bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="rounded-xl bg-red-500/80 hover:bg-red-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
