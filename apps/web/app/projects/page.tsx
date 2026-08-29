'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import {
  PageContainer,
  PageHeader,
  Button,
  Card,
  Badge,
  ContentCallout,
} from '@techseeker/ui';
import {
  listProjects,
  createProject,
  deleteProject,
  type ProjectListItem,
} from '../../lib/api/projects';
import { getToken } from '../../lib/api/auth';

const CATEGORIES = [
  'All',
  'Full Stack',
  'Backend & APIs',
  'AI / Machine Learning',
  'Systems & Algorithms',
  'Frontend & UI',
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Project Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Full Stack');
  const [newDifficulty, setNewDifficulty] = useState('Intermediate');
  const [newTechStack, setNewTechStack] = useState('Python, FastAPI, SQLite');
  const [newDescription, setNewDescription] = useState('');
  const [newLanguage, setNewLanguage] = useState('python');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login' as Route);
      return;
    }

    loadProjects();
  }, [router]);

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio projects.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const initialCode =
        newLanguage === 'python'
          ? `"""\n${newName}\n${newDescription}\n"""\n\ndef main():\n    print("Welcome to ${newName}!")\n\nif __name__ == "__main__":\n    main()\n`
          : `// ${newName}\n// ${newDescription}\n\nconsole.log("Welcome to ${newName}!");\n`;

      const project = await createProject({
        name: newName.trim(),
        language: newLanguage,
        category: newCategory,
        difficulty: newDifficulty,
        tech_stack: newTechStack,
        description: newDescription,
        code: initialCode,
        files: {
          [newLanguage === 'python' ? 'main.py' : 'index.js']: initialCode,
          'README.md': `# ${newName}\n\n${newDescription}\n\n## Tech Stack\n${newTechStack}\n`,
        },
      });

      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      router.push(`/projects/${project.id}` as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(projectId: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project.');
    }
  }

  const filteredProjects = projects.filter((p) => {
    const matchesCategory =
      activeCategory === 'All' || p.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchesStatus =
      activeStatus === 'all' || p.status?.toLowerCase() === activeStatus.toLowerCase();
    return matchesCategory && matchesStatus;
  });

  return (
    <PageContainer maxWidth="7xl" className="space-y-8 min-h-screen relative">
      {/* Header */}
      <PageHeader
        title="Portfolio Project Builder"
        description="Design, build, and publish production-grade portfolio projects. Submit multi-file codebases for rigorous AI rubric evaluations and earn capstone credentials."
        badge={
          <Badge variant="primary" size="sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            V1.0 Capstone Engine
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<span>+</span>}
          >
            New Portfolio Project
          </Button>
        }
      />

      {error && (
        <ContentCallout variant="danger" title="Portfolio Error">
          {error}
        </ContentCallout>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === cat
                  ? 'bg-brand text-content-inverse shadow-subtle'
                  : 'bg-surface text-content-secondary hover:bg-surface-hover hover:text-content-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-content-muted">Status:</span>
          {['all', 'draft', 'completed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setActiveStatus(st)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium capitalize transition ${
                activeStatus === st
                  ? 'bg-surface-elevated text-brand font-bold border border-brand-border'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-2xl bg-surface-elevated" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card variant="default" className="p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-subtle text-xl text-brand">
            🚀
          </div>
          <div>
            <h3 className="text-base font-bold text-content-primary">
              No Portfolio Projects Found
            </h3>
            <p className="mt-1 text-xs text-content-secondary leading-relaxed">
              Start building your first multi-file capstone project to demonstrate real-world engineering proficiency.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateModal(true)}
            className="mt-2"
          >
            Create Your First Project +
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const isCompleted = project.status === 'completed';

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}` as Route}
                className="group flex flex-col justify-between rounded-2xl border border-border-subtle bg-surface p-5 transition-all hover:border-brand hover:shadow-elevated"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={isCompleted ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {isCompleted ? 'Completed ✓' : 'Draft In-Progress'}
                    </Badge>

                    {project.score !== null && project.score !== undefined && (
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {project.score}/100
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-content-primary group-hover:text-brand transition">
                      {project.name}
                    </h3>
                    <p className="mt-1 text-xs text-content-secondary line-clamp-2 leading-relaxed">
                      {project.description || 'Custom multi-file software engineering project.'}
                    </p>
                  </div>

                  {/* Tech Stack Tags */}
                  {project.tech_stack && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {project.tech_stack.split(',').map((tech, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-surface-elevated px-2 py-0.5 text-[10px] font-mono text-content-muted border border-border-subtle"
                        >
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-3 text-xs">
                  <span className="text-[10px] font-mono text-content-muted">
                    {project.language.toUpperCase()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      title="Delete Project"
                      className="rounded p-1 text-content-muted hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                    >
                      🗑
                    </button>
                    <span className="font-semibold text-brand group-hover:translate-x-0.5 transition-transform">
                      Open Editor →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-elevated space-y-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-subtle text-brand font-bold text-sm">
                  🚀
                </span>
                <h3 className="text-base font-bold text-content-primary">
                  Create Portfolio Project
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-content-muted hover:text-content-primary text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content-primary mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Task Queue, URL Shortener Microservice"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-surface-elevated p-2.5 text-xs text-content-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1">
                    Primary Language
                  </label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    className="w-full rounded-xl border border-border-subtle bg-surface-elevated p-2.5 text-xs text-content-primary outline-none focus:border-brand"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="sql">SQL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-border-subtle bg-surface-elevated p-2.5 text-xs text-content-primary outline-none focus:border-brand"
                  >
                    <option value="Full Stack">Full Stack</option>
                    <option value="Backend & APIs">Backend & APIs</option>
                    <option value="AI / Machine Learning">AI / Machine Learning</option>
                    <option value="Systems & Algorithms">Systems & Algorithms</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-content-primary mb-1">
                  Tech Stack
                </label>
                <input
                  type="text"
                  placeholder="e.g. FastAPI, PostgreSQL, Next.js, Redis"
                  value={newTechStack}
                  onChange={(e) => setNewTechStack(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-surface-elevated p-2.5 text-xs text-content-primary outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content-primary mb-1">
                  Short Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the architectural objective and key features..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-surface-elevated p-2.5 text-xs text-content-primary outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={creating}
                  disabled={!newName.trim()}
                >
                  Create & Launch Workspace →
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
