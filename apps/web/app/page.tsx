'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '../lib/api/auth';
import { getUserProgress, type UserProgressResponse } from '../lib/api/progress';
import {
  getStudyRecommendations,
  refreshStudyRecommendations,
  getWeakTopics,
} from '../lib/api/recommendations';
import type { StudyRecommendationItem, WeakTopicItem } from '../lib/types/recommendations';
import {
  PageContainer,
  PageHeader,
  Button,
  Card,
  Badge,
  MetricCard,
  ProgressBar,
  ContentCallout,
} from '@techseeker/ui';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'learned_topic':
      return '◈';
    case 'quiz_completed':
      return '✓';
    case 'mentor_chat':
      return '✦';
    case 'playground_execution':
      return '⌘';
    case 'project_saved':
      return '💾';
    case 'roadmap_module_completed':
      return '★';
    case 'interactive_challenge_passed':
      return '⚡';
    default:
      return '✦';
  }
}

function getIntensityClass(level: number): string {
  switch (level) {
    case 1:
      return 'bg-amber-500/25 border-amber-500/35 text-amber-700 dark:text-amber-300';
    case 2:
      return 'bg-amber-500/60 border-amber-500/70 text-slate-950 font-bold';
    case 3:
      return 'bg-gradient-to-br from-amber-400 to-yellow-300 border-amber-300 text-slate-950 shadow-subtle font-bold';
    case 0:
    default:
      return 'bg-surface border-border-subtle';
  }
}

function getRecommendationTheme(type: string) {
  switch (type) {
    case 'weak_topic_revision':
      return {
        label: 'Needs Remediation',
        badgeVariant: 'warning' as const,
        actionLabel: 'Review & Practice',
        cardStyles: 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-surface to-surface shadow-elevated',
        icon: '⚠️',
      };
    case 'continue_learning':
      return {
        label: 'Active Progression',
        badgeVariant: 'primary' as const,
        actionLabel: 'Continue Lesson',
        cardStyles: 'border-brand bg-gradient-to-br from-brand-subtle/50 via-surface to-surface shadow-elevated',
        icon: '📘',
      };
    case 'next_roadmap_module':
      return {
        label: 'Roadmap Milestone',
        badgeVariant: 'ai-accent' as const,
        actionLabel: 'Open Roadmap',
        cardStyles: 'border-violet-500/40 bg-gradient-to-br from-violet-500/10 via-surface to-surface shadow-elevated',
        icon: '🎯',
      };
    case 'review':
      return {
        label: 'Skill Deepening',
        badgeVariant: 'success' as const,
        actionLabel: 'Explore Topic',
        cardStyles: 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-surface to-surface shadow-elevated',
        icon: '💡',
      };
    case 'practice':
    default:
      return {
        label: 'Hands-on Practice',
        badgeVariant: 'primary' as const,
        actionLabel: 'Open Sandbox',
        cardStyles: 'border-border-subtle bg-surface shadow-subtle',
        icon: '⚡',
      };
  }
}

export default function HomePage() {
  const [progress, setProgress] = useState<UserProgressResponse | null>(null);
  const [recommendations, setRecommendations] = useState<StudyRecommendationItem[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    setGreeting(getGreeting());

    async function loadDashboard() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      let hadConnectionError = false;

      try {
        const [progressData, recsData, weakData] = await Promise.all([
          getUserProgress(token).catch((err) => {
            console.error('Failed to load progress:', err);
            hadConnectionError = true;
            return null;
          }),
          getStudyRecommendations(token).catch((err) => {
            console.error('Failed to load recommendations:', err);
            hadConnectionError = true;
            return { recommendations: [] };
          }),
          getWeakTopics(token).catch((err) => {
            console.error('Failed to load weak topics:', err);
            return { weak_topics: [] };
          }),
        ]);

        if (progressData) setProgress(progressData);
        if (recsData && recsData.recommendations) {
          setRecommendations(recsData.recommendations);
        }
        if (weakData && weakData.weak_topics) {
          setWeakTopics(weakData.weak_topics);
        }

        if (hadConnectionError && !progressData && (!recsData || recsData.recommendations.length === 0)) {
          setConnectionWarning(
            'Unable to reach the TechSeeker intelligence backend. Some progress metrics and adaptive recommendations may be temporarily unavailable.',
          );
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setConnectionWarning(
          'Unable to reach the TechSeeker intelligence backend. Please verify your connection.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function handleRefreshRecommendations() {
    const token = getToken();
    if (!token || refreshing) return;

    setRefreshing(true);
    setRefreshError(null);
    try {
      const fresh = await refreshStudyRecommendations(token);
      if (fresh && fresh.recommendations) {
        setRecommendations(fresh.recommendations);
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Failed to refresh recommendations');
    } finally {
      setRefreshing(false);
    }
  }

  const userName = progress?.name?.trim() || 'Learner';
  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? 1;
  const streak = progress?.streak ?? 0;
  const roadmapPct = progress?.roadmap_progress_percentage ?? 0;
  const quizzesCompleted = progress?.quizzes_completed ?? 0;
  const challengesPassed = progress?.challenges_passed ?? 0;
  const currentLevelProgressXp = xp % 100;
  const topRecommendation = recommendations.length > 0 ? recommendations[0] : null;
  const secondaryRecommendations = recommendations.slice(1, 5);
  const activeWeakList = weakTopics.filter((t) => t.status === 'active' || t.status === 'improving');

  if (loading) {
    return (
      <PageContainer maxWidth="7xl" className="space-y-6">
        <div className="h-16 w-full animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-48 w-full animate-pulse rounded-2xl bg-surface-elevated" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-28 animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-28 animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-28 animate-pulse rounded-xl bg-surface-elevated" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-48 animate-pulse rounded-2xl bg-surface-elevated" />
          <div className="h-48 animate-pulse rounded-2xl bg-surface-elevated" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl" className="relative min-h-screen space-y-8">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-subtle blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-accent-violet/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-data-subtle blur-3xl" />
      </div>

      {/* PRIORITY 1: GREETING & LEARNER CONTEXT */}
      <PageHeader
        title={
          <span>
            {greeting},{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              {userName}
            </span>
          </span>
        }
        description="Your personal learning intelligence command center. Review adaptive recommendations, build systems, and maintain momentum."
        badge={
          <Badge variant="ai-accent" size="sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Learning Intelligence Active
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/explore">
              <Button variant="secondary" size="sm">
                Explore Topics
              </Button>
            </Link>
            <Link href="/mentor">
              <Button variant="primary" size="sm" rightIcon={<span>✦</span>}>
                Ask AI Mentor
              </Button>
            </Link>
          </div>
        }
      />

      {connectionWarning && (
        <ContentCallout variant="warning" title="Connection Notice" icon="⚠️">
          {connectionWarning}
        </ContentCallout>
      )}

      {refreshError && (
        <ContentCallout variant="danger" title="Recommendation Notice">
          {refreshError}
        </ContentCallout>
      )}

      {/* PRIORITY 2: ADAPTIVE NEXT BEST ACTION (FOCAL POINT) */}
      {topRecommendation ? (
        (() => {
          const theme = getRecommendationTheme(topRecommendation.recommendation_type);
          return (
            <Card
              variant="selected"
              className={`relative overflow-hidden p-6 sm:p-7 ${theme.cardStyles}`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="primary" size="sm">
                      Priority Focus #1
                    </Badge>
                    <Badge variant={theme.badgeVariant} size="sm">
                      {theme.label}
                    </Badge>
                    <span className="text-[11px] font-semibold text-content-muted">
                      Topic: {topRecommendation.topic}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
                    {topRecommendation.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
                    {topRecommendation.description}
                  </p>

                  <div className="inline-flex items-center gap-1.5 rounded-md bg-surface-elevated/80 px-2.5 py-1 text-xs text-content-secondary border border-border-subtle">
                    <span className="text-accent-amber">💡</span>
                    <span>{topRecommendation.reason}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                  <Link href={(topRecommendation.action_url || '/learn') as any}>
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full sm:w-auto h-10 px-6 font-bold shadow-subtle"
                    >
                      {theme.actionLabel} →
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshRecommendations}
                    disabled={refreshing}
                    isLoading={refreshing}
                    leftIcon={<span>↻</span>}
                    className="text-xs text-content-muted hover:text-content-primary"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh Suggestions'}
                  </Button>
                </div>
              </div>

              {/* Secondary Recommended Lessons (Max 5 total cards) */}
              {secondaryRecommendations.length > 0 && (
                <div className="mt-6 pt-5 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                      Recommended Next Actions
                    </p>
                    <span className="text-[10px] text-content-muted">
                      Adaptive Signals
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {secondaryRecommendations.map((rec) => {
                      const recTheme = getRecommendationTheme(rec.recommendation_type);
                      return (
                        <Link
                          key={rec.id}
                          href={(rec.action_url || '/learn') as any}
                          className="group flex flex-col justify-between p-3.5 rounded-xl border border-border-subtle bg-surface hover:border-brand-border hover:bg-surface-hover transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <Badge variant={recTheme.badgeVariant} size="sm">
                                {recTheme.label}
                              </Badge>
                              <span className="text-[10px] font-mono text-content-muted">
                                P{rec.priority}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-content-primary group-hover:text-brand transition line-clamp-1">
                              {rec.title}
                            </p>
                            <p className="mt-1 text-[11px] text-content-muted line-clamp-2 leading-relaxed">
                              {rec.reason}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-brand pt-2 border-t border-border-subtle/50">
                            <span>{recTheme.actionLabel}</span>
                            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })()
      ) : (
        <Card variant="elevated" className="p-6 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-content-primary">
              All Caught Up!
            </h3>
            <p className="text-xs text-content-secondary mt-1">
              Select a module from your career roadmap or test your skills in the Code Playground.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2.5 shrink-0 justify-center">
            <Link href="/learn">
              <Button variant="primary" size="sm">
                Start Learning
              </Button>
            </Link>
            <Link href="/roadmap">
              <Button variant="secondary" size="sm">
                View Roadmap
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* PRIORITY 3: METRIC CARDS (XP + STREAK + ROADMAP + MASTERY) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Learning Streak"
          value={streak}
          subvalue={streak === 1 ? 'day active' : 'days streak'}
          icon="🔥"
          variant="interactive"
        />

        <MetricCard
          label="Level & XP"
          value={`LVL ${level}`}
          subvalue={`${xp} Total XP`}
          progress={currentLevelProgressXp}
          variant="interactive"
          badge={
            <Badge variant="reward" size="sm">
              +{100 - currentLevelProgressXp} to L{level + 1}
            </Badge>
          }
        />

        <MetricCard
          label="Roadmap Progress"
          value={`${roadmapPct}%`}
          subvalue="Curriculum Complete"
          progress={roadmapPct}
          icon="🎯"
          variant="interactive"
        />

        <MetricCard
          label="Skills Mastered"
          value={quizzesCompleted + challengesPassed}
          subvalue={`${quizzesCompleted} Quizzes · ${challengesPassed} Challenges`}
          icon="⚡"
          variant="interactive"
        />
      </section>

      {/* PRIORITY 4: WEAK TOPICS & AI MENTOR ADVICE */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* Weak Topics Box */}
        {activeWeakList.length > 0 ? (
          <Card variant="elevated" className="p-6 border-amber-500/30 bg-surface flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚠️</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Weak Topics Detected ({activeWeakList.length})
                  </h3>
                </div>
                <Badge variant="warning" size="sm">
                  Action Needed
                </Badge>
              </div>

              <p className="mt-1.5 text-xs text-content-secondary">
                The diagnostic engine identified the following concepts based on recent failed checks:
              </p>

              <div className="mt-4 space-y-2.5">
                {activeWeakList.slice(0, 3).map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-border-subtle"
                  >
                    <div>
                      <span className="text-xs font-bold text-content-primary">{w.topic}</span>
                      <span className="block text-[10px] text-content-muted">
                        {w.failure_count} mistakes · {Math.round((w.confidence ?? 0.5) * 100)}% mastery confidence
                      </span>
                    </div>
                    <Link href="/learn">
                      <Button variant="secondary" size="sm" className="text-xs">
                        Revise
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex justify-end">
              <Link href="/progress" className="text-xs font-semibold text-brand hover:underline">
                View detailed breakdown →
              </Link>
            </div>
          </Card>
        ) : (
          <Card variant="default" className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Competency Health
                </span>
                <Badge variant="success" size="sm">
                  Mastery On Track
                </Badge>
              </div>
              <h3 className="mt-2 text-base font-bold text-content-primary">
                No Weak Topics Active
              </h3>
              <p className="mt-1 text-xs text-content-secondary leading-relaxed">
                Your recent quiz submissions and coding challenges meet mastery standards without triggering active remediation. Keep up the high standard!
              </p>
            </div>
            <div className="mt-4">
              <Link href="/playground">
                <Button variant="secondary" size="sm">
                  Practice Deliberate Coding →
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* AI Mentor Advice Box */}
        <Card variant="default" className="p-6 flex flex-col justify-between border-brand-border/40 bg-gradient-to-br from-brand-subtle/30 via-surface to-surface">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-subtle text-brand text-xs font-bold">
                  ✦
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand">
                  AI Mentor Advice
                </h3>
              </div>
              <Badge variant="ai-accent" size="sm">
                Tailored
              </Badge>
            </div>

            <h4 className="mt-3 text-sm font-bold text-content-primary">
              {streak >= 3
                ? '🔥 Outstanding Consistency!'
                : streak >= 1
                ? '⚡ Momentum is Building'
                : '🚀 Start Your Daily Learning Habit'}
            </h4>

            <p className="mt-1.5 text-xs text-content-secondary leading-relaxed">
              {activeWeakList.length > 0
                ? `Focus today on revising ${activeWeakList[0].topic}. Break down its core mental model using analogies before attempting the coding challenge again.`
                : progress?.continue_learning
                ? `You are making steady progress on "${progress.continue_learning.topic}". Complete today's checkpoint quiz to earn +20 XP and advance toward Level ${level + 1}.`
                : 'Enroll in a roadmap track or explore a new topic in Knowledge Explorer to establish your personalized curriculum.'}
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between pt-3 border-t border-border-subtle">
            <span className="text-[10px] text-content-muted">
              Auto-calibrated with memory
            </span>
            <Link href="/mentor">
              <Button variant="primary" size="sm">
                Chat with Mentor →
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* PRIORITY 5: CONTINUE LEARNING & 35-DAY HEATMAP */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Continue Learning Card */}
        {progress?.continue_learning ? (
          <Card variant="interactive" className="p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                    Active Curriculum
                  </span>
                  <h2 className="mt-1 text-xl sm:text-2xl font-bold text-content-primary">
                    {progress.continue_learning.topic}
                  </h2>
                </div>
                <Badge variant="primary" size="md">
                  {progress.continue_learning.progress}%
                </Badge>
              </div>

              <div className="mt-5">
                <ProgressBar
                  value={progress.continue_learning.progress}
                  max={100}
                  size="sm"
                  variant="brand"
                  label={progress.continue_learning.topic}
                />
              </div>

              <p className="mt-3 text-xs text-content-secondary">
                Pick up right where you left off with adaptive guidance and instant evaluations.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
              <Link href="/learn">
                <Button variant="hero" size="md">
                  Resume Lesson →
                </Button>
              </Link>
              <Link href="/mentor">
                <Button variant="secondary" size="md">
                  Discuss with Mentor
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card variant="interactive" className="p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-lg text-brand">
                  ✦
                </div>
                <Badge variant="success" size="sm">
                  Ready to Start
                </Badge>
              </div>

              <h2 className="mt-4 text-xl font-bold text-content-primary">
                Structured Technical Curriculum
              </h2>

              <p className="mt-1.5 text-xs text-content-secondary leading-relaxed">
                Explore interactive coding lessons with progressive hint ladders, real-world analogies, and hands-on validation.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/learn">
                <Button variant="hero" size="md">
                  Start Learning →
                </Button>
              </Link>
              <Link href="/mentor">
                <Button variant="secondary" size="md">
                  Open Mentor Workspace
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* 35-Day Learning Heatmap */}
        <Card variant="default" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Activity Heatmap
                </span>
                <h3 className="mt-0.5 text-base font-bold text-content-primary">
                  Learning Consistency
                </h3>
              </div>
              <span className="text-xs text-content-muted font-mono">{streak}d active streak</span>
            </div>

            <p className="mt-1 text-xs text-content-secondary">
              GitHub-style activity matrix of verified completions and practice sessions.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-1.5">
              {(progress?.heatmap && progress.heatmap.length > 0
                ? progress.heatmap
                : [
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0],
                  ]
              ).map((week, wIdx) => (
                <div key={wIdx} className="flex flex-1 flex-col gap-1.5">
                  {week.map((lvl, dIdx) => {
                    const dayObj = progress?.heatmap_days?.[wIdx * 7 + dIdx];
                    return (
                      <div
                        key={dIdx}
                        className={`h-6 w-full rounded-md border transition-all ${getIntensityClass(lvl)}`}
                        title={
                          dayObj
                            ? `${dayObj.date} (${dayObj.day}): ${dayObj.count} events`
                            : `Intensity Level ${lvl}`
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2 text-[10px] text-content-muted">
              <span>Less</span>
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 rounded border border-border-subtle bg-surface" />
                <div className="h-2.5 w-2.5 rounded border border-amber-500/35 bg-amber-500/25" />
                <div className="h-2.5 w-2.5 rounded border border-amber-500/70 bg-amber-500/60" />
                <div className="h-2.5 w-2.5 rounded border border-amber-300 bg-amber-400" />
              </div>
              <span>More</span>
            </div>
          </div>
        </Card>
      </section>
    </PageContainer>
  );
}