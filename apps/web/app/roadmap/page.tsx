'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  completeModule,
  getAllRoadmaps,
  getUserRoadmap,
  selectRoadmap,
  type RoadmapSummary,
  type UserRoadmapDetail,
} from '../../lib/api/roadmap';
import { getToken } from '../../lib/api/auth';

function getDifficultyBadge(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20';
    case 'intermediate':
      return 'bg-sky-400/10 text-sky-300 border-sky-400/20';
    case 'advanced':
      return 'bg-violet-400/10 text-violet-300 border-violet-400/20';
    default:
      return 'bg-slate-400/10 text-slate-300 border-slate-400/20';
  }
}

export default function RoadmapPage() {
  const router = useRouter();
  const [userRoadmap, setUserRoadmap] = useState<UserRoadmapDetail | null>(null);
  const [allRoadmaps, setAllRoadmaps] = useState<RoadmapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        const [myRoadmap, roadmaps] = await Promise.all([
          getUserRoadmap(token || undefined),
          getAllRoadmaps(token || undefined),
        ]);
        setUserRoadmap(myRoadmap);
        setAllRoadmaps(roadmaps);
        if (!myRoadmap) {
          setShowCatalog(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load roadmaps');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function handleSelectRoadmap(roadmapId: number) {
    setError(null);
    setSelectingId(roadmapId);
    try {
      const updated = await selectRoadmap(roadmapId);
      setUserRoadmap(updated);
      setShowCatalog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select roadmap');
    } finally {
      setSelectingId(null);
    }
  }

  async function handleCompleteModule(moduleId: number) {
    setError(null);
    setCompletingId(moduleId);
    try {
      const updated = await completeModule(moduleId);
      setUserRoadmap(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete module');
    } finally {
      setCompletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-xs text-slate-500">
        Loading your roadmap...
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-white sm:px-6 md:px-10">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Header section */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-400">
                Career Roadmap
              </span>
              <span className="text-xs text-slate-500">
                AI Guided Growth Path
              </span>
            </div>

            {userRoadmap && !showCatalog && (
              <button
                type="button"
                onClick={() => setShowCatalog(true)}
                className="rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-slate-800"
              >
                Switch Roadmap ⇄
              </button>
            )}

            {showCatalog && userRoadmap && (
              <button
                type="button"
                onClick={() => setShowCatalog(false)}
                className="rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-slate-800"
              >
                ← Return to Current Roadmap
              </button>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            {showCatalog || !userRoadmap
              ? 'Select Your Career Roadmap'
              : userRoadmap.title}
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            {showCatalog || !userRoadmap
              ? 'Choose a structured industry-aligned curriculum to master essential developer competencies and build real-world systems.'
              : userRoadmap.description}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}
        </section>

        {/* ROADMAP CATALOG SELECTION VIEW */}
        {(showCatalog || !userRoadmap) && (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allRoadmaps.map((r) => {
              const isSelected = userRoadmap?.id === r.id;
              const isSelecting = selectingId === r.id;

              return (
                <div
                  key={r.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 ${
                    isSelected
                      ? 'border-sky-400/40 shadow-xl shadow-sky-500/10'
                      : 'border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getDifficultyBadge(
                          r.difficulty
                        )}`}
                      >
                        {r.difficulty}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        ⏱ {r.estimated_weeks} Weeks
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                      {r.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {r.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {r.total_modules} Core Modules
                    </span>

                    <button
                      type="button"
                      disabled={isSelecting}
                      onClick={() => handleSelectRoadmap(r.id)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 ${
                        isSelected
                          ? 'bg-sky-400/10 border border-sky-400/30 text-sky-300'
                          : 'bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20 hover:bg-sky-300'
                      }`}
                    >
                      {isSelecting
                        ? 'Selecting...'
                        : isSelected
                        ? 'Current Path ✓'
                        : 'Start Roadmap →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ACTIVE USER ROADMAP VIEW */}
        {!showCatalog && userRoadmap && (
          <div className="space-y-8">
            {/* Overall Progress Banner */}
            <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getDifficultyBadge(
                        userRoadmap.difficulty
                      )}`}
                    >
                      {userRoadmap.difficulty}
                    </span>
                    <span className="text-xs text-slate-400">
                      ⏱ {userRoadmap.estimated_weeks} Weeks Estimated
                    </span>
                    <span className="text-xs text-sky-400">
                      ⭐ {userRoadmap.completed_modules_count} of {userRoadmap.total_modules_count} Modules Completed
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold text-white">
                    Overall Curriculum Progress
                  </h2>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                      <span>Curriculum Completion</span>
                      <span className="font-bold text-sky-400">
                        {userRoadmap.progress_percentage}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500 transition-all duration-500"
                        style={{ width: `${userRoadmap.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-400/30 bg-sky-400/10 text-xl font-bold text-sky-300 shadow-lg shadow-sky-500/10">
                  {userRoadmap.progress_percentage}%
                </div>
              </div>
            </section>

            {/* Vertical Module Timeline */}
            <section className="relative space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Curriculum Modules
              </h2>

              <div className="relative border-l-2 border-white/[0.08] ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-6">
                {userRoadmap.modules.map((module) => {
                  const isCompleted = module.status === 'completed';
                  const isUnlocked = module.status === 'unlocked';
                  const isLocked = module.status === 'locked';
                  const isCompleting = completingId === module.id;

                  return (
                    <div
                      key={module.id}
                      className={`relative group rounded-2xl border p-5 backdrop-blur-xl transition-all duration-200 ${
                        isCompleted
                          ? 'border-emerald-500/20 bg-slate-950/60'
                          : isUnlocked
                          ? 'border-sky-400/40 bg-slate-950/80 shadow-lg shadow-sky-500/5 hover:-translate-y-0.5'
                          : 'border-white/[0.05] bg-slate-950/40 opacity-60'
                      }`}
                    >
                      {/* Timeline status node on vertical line */}
                      <div
                        className={`absolute -left-[35px] sm:-left-[43px] top-6 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/40'
                            : isUnlocked
                            ? 'bg-sky-400 text-slate-950 ring-4 ring-sky-400/20 shadow-md shadow-sky-400/50'
                            : 'bg-slate-800 text-slate-500 border border-white/[0.1]'
                        }`}
                      >
                        {isCompleted ? '✓' : module.order_index}
                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Module {module.order_index}
                            </span>

                            {isCompleted && (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                                Completed ✓
                              </span>
                            )}
                            {isUnlocked && (
                              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-sky-400 animate-pulse">
                                In Progress ✦
                              </span>
                            )}
                            {isLocked && (
                              <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                                🔒 Locked
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400">
                              ⏱ ~{module.estimated_hours} Hours
                            </span>
                          </div>

                          <h3
                            className={`mt-2 text-lg font-bold ${
                              isCompleted
                                ? 'text-slate-200 line-through decoration-slate-600'
                                : isUnlocked
                                ? 'text-white'
                                : 'text-slate-400'
                            }`}
                          >
                            {module.title}
                          </h3>

                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {module.description}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
                          {isUnlocked && (
                            <>
                              <Link
                                href="/learn"
                                className="rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                              >
                                Learn Topic →
                              </Link>
                              <button
                                type="button"
                                disabled={isCompleting}
                                onClick={() => handleCompleteModule(module.id)}
                                className="rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/20 transition hover:opacity-90 disabled:opacity-50"
                              >
                                {isCompleting ? 'Completing...' : 'Mark Completed (+25 XP)'}
                              </button>
                            </>
                          )}

                          {isCompleted && (
                            <Link
                              href="/learn"
                              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
                            >
                              Review Concept ↺
                            </Link>
                          )}

                          {isLocked && (
                            <span className="text-xs text-slate-600 font-medium">
                              Complete previous module to unlock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}