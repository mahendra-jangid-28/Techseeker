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
import {
  PageContainer,
  PageHeader,
  Button,
  Card,
  Badge,
  ProgressBar,
  ContentCallout,
} from '@techseeker/ui';

function getDifficultyBadgeVariant(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'success' as const;
    case 'intermediate':
      return 'primary' as const;
    case 'advanced':
      return 'ai-accent' as const;
    default:
      return 'neutral' as const;
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
  const [completedSuccessMsg, setCompletedSuccessMsg] = useState<string | null>(null);

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
    setCompletedSuccessMsg(null);
    setCompletingId(moduleId);
    try {
      const updated = await completeModule(moduleId);
      setUserRoadmap(updated);
      setCompletedSuccessMsg('Module marked complete! +25 XP earned.');
      setTimeout(() => setCompletedSuccessMsg(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete module');
    } finally {
      setCompletingId(null);
    }
  }

  if (loading) {
    return (
      <PageContainer maxWidth="7xl" className="space-y-6">
        <div className="h-16 w-full animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-44 w-full animate-pulse rounded-2xl bg-surface-elevated" />
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-surface-elevated" />
          <div className="h-28 animate-pulse rounded-2xl bg-surface-elevated" />
          <div className="h-28 animate-pulse rounded-2xl bg-surface-elevated" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl" className="relative min-h-screen">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-subtle blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent-violet/10 blur-3xl" />
      </div>

      {/* HEADER SECTION */}
      <PageHeader
        title={
          showCatalog || !userRoadmap
            ? 'Select Your Career Roadmap'
            : userRoadmap.title
        }
        description={
          showCatalog || !userRoadmap
            ? 'Choose a structured industry-aligned curriculum to master essential developer competencies and build real-world systems.'
            : userRoadmap.description
        }
        badge={
          <Badge variant="primary" size="sm">
            {showCatalog || !userRoadmap
              ? '6 Industry Paths Available'
              : `${userRoadmap.difficulty} • ${userRoadmap.estimated_weeks} Weeks Estimated`}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2.5">
            {userRoadmap && !showCatalog && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCatalog(true)}
              >
                Switch Roadmap ⇄
              </Button>
            )}

            {showCatalog && userRoadmap && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCatalog(false)}
              >
                ← Return to Current Roadmap
              </Button>
            )}

            <Link href="/learn">
              <Button variant="ghost" size="sm">
                Explore Curriculum
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-6">
          <ContentCallout variant="danger" title="Roadmap Error">
            {error}
          </ContentCallout>
        </div>
      )}

      {completedSuccessMsg && (
        <div className="mb-6">
          <ContentCallout variant="success" title="Milestone Complete" icon="★">
            {completedSuccessMsg}
          </ContentCallout>
        </div>
      )}

      {/* ROADMAP CATALOG SELECTION VIEW */}
      {(showCatalog || !userRoadmap) && (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {allRoadmaps.map((r) => {
            const isSelected = userRoadmap?.id === r.id;
            const isSelecting = selectingId === r.id;

            return (
              <Card
                key={r.id}
                variant={isSelected ? 'selected' : 'interactive'}
                className="flex flex-col justify-between p-6 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant={getDifficultyBadgeVariant(r.difficulty)} size="sm">
                      {r.difficulty}
                    </Badge>
                    <span className="text-[11px] font-semibold text-content-muted">
                      ⏱ {r.estimated_weeks} Weeks
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-content-primary">
                    {r.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-content-secondary">
                    {r.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4">
                  <span className="text-[11px] font-semibold text-content-muted">
                    {r.total_modules} Core Modules
                  </span>

                  <Button
                    variant={isSelected ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={isSelecting}
                    isLoading={isSelecting}
                    onClick={() => handleSelectRoadmap(r.id)}
                  >
                    {isSelecting
                      ? 'Selecting...'
                      : isSelected
                      ? 'Active Path ✓'
                      : 'Enroll Path →'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {/* ACTIVE USER ROADMAP WORKSPACE */}
      {!showCatalog && userRoadmap && (
        <div className="space-y-8">
          {/* Progress Hero Banner */}
          <Card variant="elevated" className="p-6 sm:p-7 shadow-elevated">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant={getDifficultyBadgeVariant(userRoadmap.difficulty)} size="sm">
                    {userRoadmap.difficulty}
                  </Badge>
                  <span className="text-xs text-content-secondary">
                    ⏱ {userRoadmap.estimated_weeks} Weeks Duration
                  </span>
                  <span className="text-xs text-content-muted">•</span>
                  <span className="text-xs font-semibold text-brand">
                    ⭐ {userRoadmap.completed_modules_count} of {userRoadmap.total_modules_count} Modules Completed
                  </span>
                </div>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">
                  Overall Curriculum Progress
                </h2>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-content-secondary">
                    <span>Curriculum Completion</span>
                    <span className="font-bold text-brand">
                      {userRoadmap.progress_percentage}%
                    </span>
                  </div>
                  <ProgressBar
                    value={userRoadmap.progress_percentage}
                    max={100}
                    size="md"
                    variant="brand"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-content-muted">
                  <span>Roadmap XP Earned:</span>
                  <Badge variant="primary" size="sm">
                    +{userRoadmap.completed_modules_count * 25} XP
                  </Badge>
                </div>
              </div>

              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-brand/40 bg-brand-subtle text-2xl font-bold text-brand shadow-subtle">
                {userRoadmap.progress_percentage}%
              </div>
            </div>
          </Card>

          {/* Interactive Curriculum Timeline */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-content-muted">
                Curriculum Milestone Track
              </h2>
              <span className="text-xs text-content-secondary">
                Sequential progression • Complete modules in order to advance
              </span>
            </div>

            <div className="relative space-y-4 border-l-2 border-border-subtle ml-4 sm:ml-6 pl-6 sm:pl-8">
              {userRoadmap.modules.map((module) => {
                const isCompleted = module.status === 'completed';
                const isUnlocked = module.status === 'unlocked';
                const isLocked = module.status === 'locked';
                const isCompleting = completingId === module.id;

                return (
                  <div
                    key={module.id}
                    className={`relative rounded-2xl border p-5 sm:p-6 transition-all duration-200 ${
                      isCompleted
                        ? 'border-status-success/30 bg-surface/80'
                        : isUnlocked
                        ? 'border-brand/50 bg-surface shadow-elevated'
                        : 'border-border-subtle bg-surface-elevated/40 opacity-70'
                    }`}
                  >
                    {/* Timeline Node Icon on Vertical Line */}
                    <div
                      className={`absolute -left-[35px] sm:-left-[43px] top-6 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-status-success text-white shadow-subtle'
                          : isUnlocked
                          ? 'bg-brand text-content-inverse ring-4 ring-brand/20 shadow-subtle'
                          : 'bg-surface-elevated text-content-muted border border-border-subtle'
                      }`}
                    >
                      {isCompleted ? '✓' : isUnlocked ? '●' : '🔒'}
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-content-muted">
                            Module {module.order_index}
                          </span>

                          {isCompleted && (
                            <Badge variant="success" size="sm">
                              Completed ✓
                            </Badge>
                          )}
                          {isUnlocked && (
                            <Badge variant="primary" size="sm">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                              In Progress ✦
                            </Badge>
                          )}
                          {isLocked && (
                            <Badge variant="neutral" size="sm">
                              🔒 Locked
                            </Badge>
                          )}

                          <span className="text-[11px] text-content-muted">
                            ⏱ ~{module.estimated_hours} Hours Estimated
                          </span>
                        </div>

                        <h3
                          className={`text-base sm:text-lg font-bold ${
                            isCompleted
                              ? 'text-content-secondary line-through decoration-border'
                              : isUnlocked
                              ? 'text-content-primary'
                              : 'text-content-muted'
                          }`}
                        >
                          {module.title}
                        </h3>

                        <p className="text-xs leading-relaxed text-content-secondary">
                          {module.description}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0 shrink-0">
                        {isUnlocked && (
                          <>
                            <Link href={`/learn?module_id=${module.id}`}>
                              <Button variant="secondary" size="sm">
                                Learn Topic →
                              </Button>
                            </Link>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isCompleting}
                              isLoading={isCompleting}
                              onClick={() => handleCompleteModule(module.id)}
                            >
                              {isCompleting ? 'Completing...' : 'Mark Completed (+25 XP)'}
                            </Button>
                          </>
                        )}

                        {isCompleted && (
                          <Link href={`/learn?module_id=${module.id}`}>
                            <Button variant="ghost" size="sm" className="text-content-secondary">
                              Review Concept ↺
                            </Button>
                          </Link>
                        )}

                        {isLocked && (
                          <span className="text-xs text-content-muted font-medium italic">
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
    </PageContainer>
  );
}