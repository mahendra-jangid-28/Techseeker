'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserProgress, type UserProgressResponse } from '../../lib/api/progress';
import { getWeakTopics } from '../../lib/api/recommendations';
import type { WeakTopicItem } from '../../lib/types/recommendations';
import { getToken } from '../../lib/api/auth';
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

export default function ProgressPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgressResponse | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadProgress() {
      try {
        const [progressData, weakTopicsData] = await Promise.all([
          getUserProgress(token || undefined),
          getWeakTopics(token || '').catch((err) => {
            console.error('Failed to load weak topics:', err);
            return { weak_topics: [] };
          }),
        ]);

        setProgress(progressData);
        if (weakTopicsData && weakTopicsData.weak_topics) {
          setWeakTopics(weakTopicsData.weak_topics);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress analytics');
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [router]);

  if (loading) {
    return (
      <PageContainer maxWidth="7xl" className="space-y-6">
        <div className="h-16 w-full animate-pulse rounded-xl bg-surface-elevated" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-28 animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-28 animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-28 animate-pulse rounded-xl bg-surface-elevated" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-56 animate-pulse rounded-2xl bg-surface-elevated" />
          <div className="h-56 animate-pulse rounded-2xl bg-surface-elevated" />
        </div>
      </PageContainer>
    );
  }

  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? 1;
  const streak = progress?.streak ?? 0;
  const lessonsCompleted = progress?.lessons_completed ?? 0;
  const roadmapPct = progress?.roadmap_progress_percentage ?? 0;
  const quizzesCompleted = progress?.quizzes_completed ?? 0;
  const challengesPassed = progress?.challenges_passed ?? 0;
  const activeWeakTopicsCount = progress?.active_weak_topics_count ?? 0;
  const resolvedTopicsCount = progress?.resolved_topics_count ?? 0;
  const currentLevelProgressXp = xp % 100;
  const xpNeeded = 100 - currentLevelProgressXp;

  const activeWeakList = weakTopics.filter(
    (t) => t.status === 'active' || t.status === 'improving',
  );

  const achievements = [
    {
      title: 'First Step',
      desc: 'Completed your first learning activity',
      icon: '🌱',
      earned: xp > 0 || lessonsCompleted > 0,
      requirement: 'Complete 1 lesson or earn XP',
    },
    {
      title: 'Consistent Learner',
      desc: 'Maintained an active daily learning streak',
      icon: '🔥',
      earned: streak >= 1,
      requirement: '1+ Day Streak active',
    },
    {
      title: 'Quiz Champion',
      desc: 'Passed structured knowledge check quizzes',
      icon: '✓',
      earned: quizzesCompleted >= 1,
      requirement: 'Pass 1+ knowledge quiz',
    },
    {
      title: 'Code Builder',
      desc: 'Passed interactive coding challenges in sandbox',
      icon: '⚡',
      earned: challengesPassed >= 1,
      requirement: 'Pass 1+ coding challenge',
    },
    {
      title: '100 XP Pioneer',
      desc: 'Accumulated 100+ total lifetime XP',
      icon: '⭐',
      earned: xp >= 100,
      requirement: 'Earn 100 Total XP',
    },
    {
      title: 'Level 5 Master',
      desc: 'Advanced to Developer Level 5',
      icon: '🧠',
      earned: level >= 5,
      requirement: 'Reach Developer Level 5',
    },
  ];

  return (
    <PageContainer maxWidth="7xl" className="relative min-h-screen space-y-8">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-subtle blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent-violet/10 blur-3xl" />
      </div>

      {/* HEADER */}
      <PageHeader
        title="Learning Progress Intelligence"
        description={
          progress?.name
            ? `${progress.name}, here is your verified learning momentum, weak-topic remediation, and consistency analytics.`
            : 'Real-time verified metrics computed from your lessons, quizzes, coding sandbox challenges, and roadmap milestones.'
        }
        badge={
          <Badge variant="primary" size="sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            Verified Learning Analytics
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/">
              <Button variant="secondary" size="sm">
                ← Command Center
              </Button>
            </Link>
            <Link href="/roadmap">
              <Button variant="primary" size="sm">
                View Roadmap →
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <ContentCallout variant="danger" title="Analytics Error">
          {error}
        </ContentCallout>
      )}

      {/* 1. TOP INTELLIGENCE METRIC QUAD */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total XP */}
        <MetricCard
          label="Total XP Earned"
          value={xp.toLocaleString()}
          subvalue={`Level ${level} Developer`}
          progress={currentLevelProgressXp}
          badge={
            <Badge variant="reward" size="sm">
              +{xpNeeded} to L{level + 1}
            </Badge>
          }
          icon="⭐"
          variant="interactive"
        />

        {/* Metric 2: Streak */}
        <MetricCard
          label="Learning Streak"
          value={`${streak} ${streak === 1 ? 'Day' : 'Days'}`}
          subvalue={streak > 0 ? 'Daily momentum active' : 'Start learning today'}
          icon="🔥"
          variant="interactive"
        />

        {/* Metric 3: Lessons / Modules */}
        <MetricCard
          label="Completed Modules"
          value={lessonsCompleted.toString()}
          subvalue={`${quizzesCompleted} Quizzes · ${challengesPassed} Challenges`}
          icon="📘"
          variant="interactive"
        />

        {/* Metric 4: Active Roadmap */}
        <MetricCard
          label="Roadmap Progress"
          value={`${roadmapPct}%`}
          subvalue={roadmapPct > 0 ? 'Curriculum progression' : 'No active roadmap'}
          progress={roadmapPct}
          icon="🎯"
          variant="interactive"
        />
      </section>

      {/* 2. WEAK-TOPIC REMEDIATION CENTER */}
      {activeWeakList.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400 font-bold">
                  ⚠️
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Weak-Topic Remediation Center
                </h2>
              </div>
              <h3 className="text-lg font-bold text-content-primary mt-1">
                Active Diagnostic Signals & Recommended Revision
              </h3>
            </div>
            <Badge variant="warning" size="sm">
              {activeWeakList.length} Active Focus {activeWeakList.length === 1 ? 'Area' : 'Areas'}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeWeakList.map((topic) => {
              const confidencePct = Math.round((topic.confidence ?? 0.5) * 100);
              const isImproving = topic.status === 'improving';

              return (
                <Card
                  key={topic.id}
                  variant="elevated"
                  className="p-5 flex flex-col justify-between border-amber-500/30 bg-surface shadow-elevated space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={isImproving ? 'primary' : 'warning'} size="sm">
                        {isImproving ? '⚡ Improving / Recovering' : '⚠️ Active Weakness'}
                      </Badge>
                      <span className="text-[10px] font-mono text-content-muted">
                        {topic.attempt_count} attempts
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-content-primary">
                      {topic.topic}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-content-secondary pt-1">
                      <div className="rounded-lg bg-surface-elevated p-2 border border-border-subtle">
                        <span className="text-content-muted block text-[9px] uppercase font-semibold">
                          Failed Checks
                        </span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {topic.failure_count}
                        </span>
                      </div>
                      <div className="rounded-lg bg-surface-elevated p-2 border border-border-subtle">
                        <span className="text-content-muted block text-[9px] uppercase font-semibold">
                          Recoveries
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {topic.successful_attempts}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-content-secondary">
                        <span>Mastery Confidence</span>
                        <span className="font-semibold">{confidencePct}%</span>
                      </div>
                      <ProgressBar
                        value={confidencePct}
                        max={100}
                        size="xs"
                        variant={confidencePct >= 60 ? 'data' : 'amber'}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-subtle">
                    <Link href="/learn">
                      <Button variant="primary" size="sm" className="w-full text-xs font-semibold">
                        Review & Remediate →
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : (
        <Card variant="default" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-lg text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-bold text-content-primary">
                  No Active Weak Topics Detected
                </h3>
                <p className="text-xs text-content-secondary mt-0.5">
                  Your recent quiz submissions and coding challenges meet mastery standards without triggering active remediation.
                </p>
              </div>
            </div>
            <Badge variant="success" size="sm" className="hidden sm:inline-flex">
              Clean Mastery Signals
            </Badge>
          </div>
        </Card>
      )}

      {/* 3. LEVEL PROGRESSION & NEXT STEP HERO */}
      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Level Progression Target Card */}
        <Card variant="elevated" className="p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                Level Progression Target
              </span>
              <Badge variant="primary" size="sm">
                LVL {level}
              </Badge>
            </div>

            <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
              Advance to Developer Level {level + 1}
            </h2>

            <p className="mt-1.5 text-xs text-content-secondary leading-relaxed">
              Earn <span className="font-semibold text-brand">{xpNeeded} more XP</span> by completing interactive lessons, passing knowledge quizzes, or mastering sandboxed coding challenges.
            </p>

            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-content-secondary">
                <span>Level {level} Progress</span>
                <span className="font-semibold text-brand">
                  {currentLevelProgressXp} / 100 XP ({currentLevelProgressXp}%)
                </span>
              </div>
              <ProgressBar
                value={currentLevelProgressXp}
                max={100}
                size="md"
                variant="reward"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4 text-xs text-content-muted">
            <span>Formula: 100 XP per Level</span>
            <span className="font-mono">{xp} Total Lifetime XP</span>
          </div>
        </Card>

        {/* Continue Learning or Active Roadmap Pointer */}
        {progress?.continue_learning ? (
          <Card variant="interactive" className="p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                    Active Focus
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-content-primary">
                    {progress.continue_learning.topic}
                  </h3>
                </div>
                <Badge variant="primary" size="md">
                  {progress.continue_learning.progress}%
                </Badge>
              </div>

              <div className="mt-4">
                <ProgressBar
                  value={progress.continue_learning.progress}
                  max={100}
                  size="sm"
                  variant="brand"
                />
              </div>

              <p className="mt-3 text-xs text-content-secondary leading-relaxed">
                Deterministic next recommended step based on your active roadmap progression and recent activities.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/learn">
                <Button variant="primary" size="sm">
                  Resume Lesson →
                </Button>
              </Link>
              <Link href="/roadmap">
                <Button variant="secondary" size="sm">
                  Roadmap Track
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card variant="default" className="p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-lg text-brand mb-3">
                ✦
              </div>
              <h3 className="text-base font-bold text-content-primary">
                Explore Curriculum
              </h3>
              <p className="mt-1.5 text-xs text-content-secondary leading-relaxed">
                Choose a structured topic track or enroll in a career roadmap to start building real systems.
              </p>
            </div>

            <div className="mt-6">
              <Link href="/learn">
                <Button variant="primary" size="sm">
                  Start Learning →
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* 4. WEEKLY CONSISTENCY & 35-DAY HEATMAP */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Weekly Consistency Bar Chart */}
        <Card variant="default" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Weekly Momentum
                </span>
                <h3 className="mt-0.5 text-base font-bold text-content-primary">
                  7-Day Consistency
                </h3>
              </div>
              <Badge variant="primary" size="sm">
                Last 7 Days
              </Badge>
            </div>

            <p className="mt-1 text-xs text-content-secondary">
              Active minutes computed from verified learning actions (max 120m/day).
            </p>
          </div>

          <div className="mt-8 flex h-40 items-end justify-between gap-2 px-1">
            {(progress?.weekly_activity && progress.weekly_activity.length > 0
              ? progress.weekly_activity
              : [
                  { day: 'Mon', minutes: 0 },
                  { day: 'Tue', minutes: 0 },
                  { day: 'Wed', minutes: 0 },
                  { day: 'Thu', minutes: 0 },
                  { day: 'Fri', minutes: 0 },
                  { day: 'Sat', minutes: 0 },
                  { day: 'Sun', minutes: 0 },
                ]
            ).map((item, idx) => {
              const heightPercent = Math.min(100, Math.max(8, (item.minutes / 60) * 100));
              return (
                <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-24 w-full items-end justify-center rounded-lg bg-surface-elevated">
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-teal-500 to-cyan-400 transition-all duration-300 hover:brightness-110"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.day}: ${item.minutes} minutes`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-content-secondary">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 35-Day Meaningful Activity Heatmap */}
        <Card variant="default" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Activity Matrix
                </span>
                <h3 className="mt-0.5 text-base font-bold text-content-primary">
                  35-Day Learning Heatmap
                </h3>
              </div>
              <span className="text-xs text-content-muted">Meaningful events only</span>
            </div>

            <p className="mt-1 text-xs text-content-secondary">
              Reflects verified lesson completions, quizzes, coding challenges, and roadmap progress.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <div className="flex gap-2">
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
                <div key={wIdx} className="flex flex-1 flex-col gap-2">
                  {week.map((level, dIdx) => {
                    const dayObj = progress?.heatmap_days?.[wIdx * 7 + dIdx];
                    const ariaLabel = dayObj
                      ? `${dayObj.date} (${dayObj.day}): ${dayObj.count} verified events (Level ${level})`
                      : `Activity level: ${level}`;

                    return (
                      <div
                        key={dIdx}
                        aria-label={ariaLabel}
                        className={`h-7 w-full rounded-lg border transition-all ${getIntensityClass(level)}`}
                        title={
                          dayObj
                            ? `${dayObj.date} (${dayObj.day}): ${dayObj.count} verified events`
                            : `Intensity: Level ${level}`
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Heatmap Spectrum Legend */}
            <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3 text-[11px] text-content-muted">
              <span>5-Week Activity Spectrum</span>
              <div className="flex items-center gap-1.5">
                <span>Less</span>
                <div className="h-3 w-3 rounded border border-border-subtle bg-surface" />
                <div className="h-3 w-3 rounded border border-amber-500/35 bg-amber-500/25" />
                <div className="h-3 w-3 rounded border border-amber-500/70 bg-amber-500/60" />
                <div className="h-3 w-3 rounded border border-amber-300 bg-amber-400" />
                <span>More</span>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 5. LEARNING SIGNALS & RECENT ACTIVITY */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        {/* Learning Signals Card */}
        <Card variant="default" className="p-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
            Diagnostics
          </span>
          <h3 className="mt-0.5 text-base font-bold text-content-primary">
            Learning Signals Summary
          </h3>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border-subtle bg-surface-elevated p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                Active Focus Areas
              </span>
              <p className="mt-1 text-2xl font-bold text-accent-amber">
                {activeWeakTopicsCount}
              </p>
              <span className="text-[10px] text-content-muted">
                {activeWeakTopicsCount > 0 ? 'Topics needing revision' : 'No active weaknesses'}
              </span>
            </div>

            <div className="rounded-xl border border-border-subtle bg-surface-elevated p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                Resolved Topics
              </span>
              <p className="mt-1 text-2xl font-bold text-status-success">
                {resolvedTopicsCount}
              </p>
              <span className="text-[10px] text-content-muted">Remediated concepts</span>
            </div>

            <div className="rounded-xl border border-border-subtle bg-surface-elevated p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                Quizzes Passed
              </span>
              <p className="mt-1 text-2xl font-bold text-brand">
                {quizzesCompleted}
              </p>
              <span className="text-[10px] text-content-muted">Knowledge checks</span>
            </div>

            <div className="rounded-xl border border-border-subtle bg-surface-elevated p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                Coding Challenges
              </span>
              <p className="mt-1 text-2xl font-bold text-accent-violet">
                {challengesPassed}
              </p>
              <span className="text-[10px] text-content-muted">Sandbox validations</span>
            </div>
          </div>
        </Card>

        {/* Recent Verified Activity Stream */}
        <Card variant="default" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Audit Trail
                </span>
                <h3 className="mt-0.5 text-base font-bold text-content-primary">
                  Recent Learning Stream
                </h3>
              </div>
              <Badge variant="neutral" size="sm">
                Verified Events
              </Badge>
            </div>

            <div className="mt-4 divide-y divide-border-subtle">
              {progress?.recent_activity && progress.recent_activity.length > 0 ? (
                progress.recent_activity.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-all hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-xs font-bold text-brand">
                        {getActivityIcon(act.activity_type)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-content-primary">
                          {act.activity_title}
                        </p>
                        <p className="text-[10px] text-content-muted">
                          {formatRelativeTime(act.created_at)}
                        </p>
                      </div>
                    </div>

                    {act.xp_earned > 0 && (
                      <Badge variant="primary" size="sm">
                        +{act.xp_earned} XP
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-content-muted">
                  No learning events recorded yet. Complete a lesson or quiz to start your activity stream!
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* 6. ACHIEVEMENTS & UNLOCKED COMPETENCIES */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
              Competencies
            </span>
            <h2 className="mt-0.5 text-xl font-bold text-content-primary">
              Milestones & Achievements
            </h2>
          </div>
          <span className="text-xs text-content-muted">
            {achievements.filter((a) => a.earned).length} of {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((badge) => (
            <Card
              key={badge.title}
              variant={badge.earned ? 'interactive' : 'default'}
              className={`p-5 transition-all ${
                badge.earned ? 'border-brand/30' : 'opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{badge.icon}</span>

                {badge.earned ? (
                  <Badge variant="success" size="sm">
                    UNLOCKED ✓
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    LOCKED 🔒
                  </Badge>
                )}
              </div>

              <h4 className="mt-3 text-sm font-bold text-content-primary">
                {badge.title}
              </h4>
              <p className="mt-1 text-xs text-content-secondary leading-relaxed">
                {badge.desc}
              </p>

              <div className="mt-3 border-t border-border-subtle pt-2 text-[10px] text-content-muted">
                Requirement: {badge.requirement}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}