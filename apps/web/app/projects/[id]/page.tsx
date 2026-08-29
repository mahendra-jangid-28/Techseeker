'use client';

import React, { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import Editor from '@monaco-editor/react';
import {
  getProject,
  updateProject,
  evaluateProject,
  type ProjectDetail,
  type ProjectEvaluationRubric,
} from '../../../lib/api/projects';
import { generateCertificate } from '../../../lib/api/certificates';
import { useTheme } from '../../../components/ThemeProvider';
import { Button, Badge, ContentCallout, ProgressBar } from '@techseeker/ui';

export default function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = parseInt(resolvedParams.id, 10);
  const router = useRouter();
  const { theme } = useTheme();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-file state
  const [activeFileName, setActiveFileName] = useState<string>('main.py');
  const [files, setFiles] = useState<Record<string, string>>({
    'main.py': '',
    'README.md': '',
  });

  // Metadata state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');

  // AI Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [rubric, setRubric] = useState<ProjectEvaluationRubric | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [certGenerated, setCertGenerated] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const p = await getProject(projectId);
        setProject(p);
        setName(p.name);
        setDescription(p.description || '');
        setTechStack(p.tech_stack || '');
        setGithubUrl(p.github_url || '');
        setLiveDemoUrl(p.live_demo_url || '');

        if (p.files && Object.keys(p.files).length > 0) {
          setFiles(p.files);
          setActiveFileName(Object.keys(p.files)[0]);
        } else {
          const defaultFile = p.language === 'python' ? 'main.py' : 'index.js';
          setFiles({
            [defaultFile]: p.code || '',
            'README.md': `# ${p.name}\n\n${p.description || ''}\n`,
          });
          setActiveFileName(defaultFile);
        }

        if (p.review_json) {
          setRubric(p.review_json);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project details.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  // Debounced auto-save
  useEffect(() => {
    if (!project || loading) return;

    const handler = setTimeout(() => {
      handleSave(false);
    }, 1500);

    return () => clearTimeout(handler);
  }, [files, name, description, techStack, githubUrl, liveDemoUrl]);

  async function handleSave(manual: boolean = true) {
    if (!project) return;
    if (manual) setSaving(true);

    try {
      const primaryCode = files[activeFileName] || Object.values(files)[0] || '';
      const updated = await updateProject(projectId, {
        name,
        description,
        tech_stack: techStack,
        github_url: githubUrl,
        live_demo_url: liveDemoUrl,
        code: primaryCode,
        files,
      });
      setProject(updated);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    } catch {
      // Graceful auto-save
    } finally {
      if (manual) setSaving(false);
    }
  }

  function handleFileContentChange(val: string | undefined) {
    const text = val ?? '';
    setFiles((prev) => ({
      ...prev,
      [activeFileName]: text,
    }));
  }

  function handleAddFile() {
    const filename = prompt('Enter new filename (e.g. models.py, utils.ts, config.json):');
    if (!filename || !filename.trim()) return;
    const clean = filename.trim();
    if (files[clean] !== undefined) {
      setActiveFileName(clean);
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [clean]: `// ${clean}\n`,
    }));
    setActiveFileName(clean);
  }

  async function handleRunEvaluation() {
    if (isEvaluating) return;
    setIsEvaluating(true);
    try {
      await handleSave(false);
      const evaluated = await evaluateProject(projectId);
      setProject(evaluated);
      if (evaluated.review_json) {
        setRubric(evaluated.review_json);
        setShowEvaluationModal(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Evaluation failed. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleClaimCertificate() {
    if (!project) return;
    try {
      await generateCertificate({
        certificate_type: 'project',
        title: `Capstone Master: ${project.name}`,
        course_name: project.name,
        metadata: {
          project_id: project.id,
          score: project.score,
          category: project.category,
        },
      });
      setCertGenerated(true);
      setTimeout(() => {
        router.push('/progress' as Route);
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to issue certificate.');
    }
  }

  const activeContent = files[activeFileName] || '';
  const currentLang = activeFileName.endsWith('.py')
    ? 'python'
    : activeFileName.endsWith('.ts')
    ? 'typescript'
    : activeFileName.endsWith('.js')
    ? 'javascript'
    : activeFileName.endsWith('.json')
    ? 'json'
    : activeFileName.endsWith('.md')
    ? 'markdown'
    : activeFileName.endsWith('.sql')
    ? 'sql'
    : 'plaintext';

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 text-center">
        <ContentCallout variant="danger" title="Error">
          {error || 'Project not found.'}
        </ContentCallout>
        <Link href={'/projects' as Route} className="mt-4 inline-block text-xs text-brand underline">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <main className="flex h-[calc(100vh-theme(spacing.12))] md:h-screen w-full flex-col bg-canvas text-content-primary overflow-hidden">
      {/* Top Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={'/projects' as Route} className="text-xs font-semibold text-content-muted hover:text-content-primary">
            ← Projects
          </Link>
          <div className="h-4 w-px bg-border-subtle" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-xs truncate">{name || 'Untitled Project'}</span>
            <Badge variant={project.status === 'completed' ? 'success' : 'neutral'} size="sm">
              {project.status.toUpperCase()}
            </Badge>
            {autoSaved && (
              <span className="text-[10px] text-emerald-500 font-semibold animate-fade-in">
                ✓ Auto-saved
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {rubric && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEvaluationModal(true)}
              className="text-xs font-semibold"
            >
              Rubric Review ({rubric.final_score}/100)
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSave(true)}
            isLoading={saving}
            className="text-xs"
          >
            Save Draft
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunEvaluation}
            isLoading={isEvaluating}
            className="text-xs font-bold px-3.5 shadow-subtle"
          >
            <span>✦ Submit & AI Review</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
        {/* Left Column: Code Editor & Multi-File Tabs */}
        <section className="flex flex-col border-b border-border-subtle lg:col-span-8 lg:border-b-0 lg:border-r bg-surface min-h-[350px] lg:min-h-0">
          {/* File Tabs */}
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-2 overflow-x-auto">
            <div className="flex items-center gap-1">
              {Object.keys(files).map((fname) => (
                <button
                  key={fname}
                  type="button"
                  onClick={() => setActiveFileName(fname)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition ${
                    activeFileName === fname
                      ? 'bg-surface-elevated text-brand border border-border-subtle font-semibold shadow-subtle'
                      : 'text-content-muted hover:text-content-primary'
                  }`}
                >
                  <span>{fname.endsWith('.py') ? '🐍' : fname.endsWith('.md') ? '📝' : '📄'}</span>
                  <span>{fname}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={handleAddFile}
                title="Add new file"
                className="rounded-md px-2 py-1 text-xs font-bold text-brand hover:bg-brand-subtle transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="relative min-h-[300px] flex-1">
            <Editor
              height="100%"
              language={currentLang}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={activeContent}
              onChange={handleFileContentChange}
              options={{
                fontSize: 13,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                tabSize: 4,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Editor Footer */}
          <div className="flex h-7 shrink-0 items-center justify-between border-t border-border-subtle bg-surface px-3 text-[10px] text-content-muted font-mono select-none">
            <span>{activeFileName}</span>
            <span>{Object.keys(files).length} files in codebase</span>
          </div>
        </section>

        {/* Right Column: Project Metadata & Publishing Drawer */}
        <section className="flex flex-col bg-surface-elevated lg:col-span-4 min-h-[350px] lg:min-h-0 overflow-y-auto p-4 space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
              Portfolio Specs
            </span>
            <h3 className="text-sm font-bold text-content-primary mt-0.5">
              Project Architecture & Deployment
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-content-secondary mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface p-2 text-content-primary outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-secondary mb-1">
                Tech Stack
              </label>
              <input
                type="text"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface p-2 text-content-primary outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-secondary mb-1">
                GitHub Repo URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/username/repository"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface p-2 text-content-primary outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-secondary mb-1">
                Live Deployment URL
              </label>
              <input
                type="url"
                placeholder="https://my-app.vercel.app"
                value={liveDemoUrl}
                onChange={(e) => setLiveDemoUrl(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface p-2 text-content-primary outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-secondary mb-1">
                Architecture Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface p-2 text-content-primary outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Quick AI Evaluation Card */}
          {rubric ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  AI Assessment Passed
                </span>
                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {rubric.final_score}/100
                </span>
              </div>
              <p className="text-[11px] text-content-secondary leading-relaxed">
                {rubric.summary}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEvaluationModal(true)}
                className="w-full text-xs font-semibold"
              >
                View Full Rubric Breakdown →
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border-subtle bg-surface p-3.5 space-y-2">
              <span className="text-xs font-bold text-content-primary">
                Ready for Assessment?
              </span>
              <p className="text-[11px] text-content-muted leading-relaxed">
                Submit your multi-file codebase for automated engineering evaluation across functionality, code quality, architecture, readability, and documentation.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunEvaluation}
                isLoading={isEvaluating}
                className="w-full text-xs font-bold"
              >
                ✦ Run AI Review Rubric
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* AI Evaluation Rubric Modal */}
      {showEvaluationModal && rubric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-elevated space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <Badge variant={rubric.passed ? 'success' : 'warning'} size="sm">
                  {rubric.passed ? 'Assessment Passed ✓' : 'Revision Required'}
                </Badge>
                <h3 className="text-lg font-bold text-content-primary mt-1">
                  AI Project Evaluation Rubric
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEvaluationModal(false)}
                className="text-content-muted hover:text-content-primary"
              >
                ✕
              </button>
            </div>

            {/* Score & Summary */}
            <div className="rounded-xl border border-border-subtle bg-surface-elevated p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">
                  Overall Score
                </span>
                <p className="text-2xl font-bold font-mono text-brand">
                  {rubric.final_score} / 100
                </p>
              </div>
              <div className="text-right max-w-sm">
                <p className="text-xs text-content-secondary font-medium">
                  {rubric.summary}
                </p>
              </div>
            </div>

            {/* Rubric Breakdown Grid */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-border-subtle bg-surface p-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Functionality</span>
                  <span className="font-mono text-brand">{rubric.functionality_score}/100</span>
                </div>
                <p className="text-[11px] text-content-muted">{rubric.functionality_feedback}</p>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface p-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Code Quality</span>
                  <span className="font-mono text-brand">{rubric.code_quality_score}/100</span>
                </div>
                <p className="text-[11px] text-content-muted">{rubric.code_quality_feedback}</p>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface p-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Architecture</span>
                  <span className="font-mono text-brand">{rubric.architecture_score}/100</span>
                </div>
                <p className="text-[11px] text-content-muted">{rubric.architecture_feedback}</p>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface p-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Readability</span>
                  <span className="font-mono text-brand">{rubric.readability_score}/100</span>
                </div>
                <p className="text-[11px] text-content-muted">{rubric.readability_feedback}</p>
              </div>
            </div>

            {/* Actionable Suggestions */}
            {rubric.suggestions && rubric.suggestions.length > 0 && (
              <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-violet">
                  Architectural Suggestions
                </h4>
                <ul className="space-y-1 text-xs text-content-secondary">
                  {rubric.suggestions.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accent-violet font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Action: Claim Certificate */}
            <div className="flex items-center justify-between border-t border-border-subtle pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEvaluationModal(false)}
              >
                Close
              </Button>

              {rubric.passed && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleClaimCertificate}
                  disabled={certGenerated}
                >
                  {certGenerated ? '✓ Certificate Issued!' : '🎖 Claim Milestone Certificate'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
