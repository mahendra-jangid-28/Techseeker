'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserProgress, type UserProgressResponse } from '../lib/api/progress';
import {
  getStudyRecommendations,
  refreshStudyRecommendations,
} from '../lib/api/recommendations';
import type { StudyRecommendationItem } from '../lib/types/recommendations';
import { getToken } from '../lib/api/auth';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
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

function getRecommendationBadge(type: string) {
  switch (type) {
    case 'weak_topic_revision':
      return {
        label: 'Needs Revision',
        badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
        actionLabel: 'Review & Practice',
      };
    case 'continue_learning':
      return {
        label: 'In Progress',
        badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
        actionLabel: 'Continue Lesson',
      };
    case 'next_roadmap_module':
      return {
        label: 'Roadmap Milestone',
        badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
        actionLabel: 'Open Roadmap',
      };
    case 'review':
      return {
        label: 'Deepen Skills',
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        actionLabel: 'Explore Topic',
      };
    case 'practice':
    default:
      return {
        label: 'Daily Practice',
        badgeClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
        actionLabel: 'Open Sandbox',
      };
  }
}

export default function HomePage() {
  const [progress, setProgress] = useState<UserProgressResponse | null>(null);
  const [recommendations, setRecommendations] = useState<StudyRecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    setGreeting(getGreeting());

    async function loadDashboard() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [progressData, recsData] = await Promise.all([
          getUserProgress(token).catch((err) => {
            console.error('Failed to load progress:', err);
            return null;
          }),
          getStudyRecommendations(token).catch((err) => {
            console.error('Failed to load recommendations:', err);
            return { recommendations: [] };
          }),
        ]);

        if (progressData) setProgress(progressData);
        if (recsData && recsData.recommendations) {
          setRecommendations(recsData.recommendations);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
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
    try {
      const fresh = await refreshStudyRecommendations(token);
      if (fresh && fresh.recommendations) {
        setRecommendations(fresh.recommendations);
      }
    } catch (err) {
      console.error('Failed to refresh recommendations:', err);
    } finally {
      setRefreshing(false);
    }
  }

  const userName = progress?.name || 'Developer';
  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? 1;
  const streak = progress?.streak ?? 0;
  const nextLevelXp = level * 100;
  const currentLevelProgressXp = xp % 100;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 md:px-10">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Top Header / Welcome Hero */}
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                AI Mentor Online
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              {greeting},{' '}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                {userName}.
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Your personal technical workspace. Master concepts, build real systems, and earn XP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/learn"
              className="rounded-xl border border-white/[0.08] bg-slate-900/70 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-slate-800"
            >
              Explore Topics
            </Link>

            <Link
              href="/mentor"
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 px-4 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
            >
              <span>Ask AI Mentor</span>
              <span>✦</span>
            </Link>
          </div>
        </header>

        {/* Level, XP & Streak Stats Bar */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {/* Streak Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/30">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Current Streak
              </p>
              <span className="text-lg">🔥</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{streak}</span>
              <span className="text-xs font-medium text-orange-400">
                {streak === 1 ? 'day active' : 'days streak'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Practice daily to maintain your momentum.
            </p>
          </div>

          {/* Level Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/30">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Developer Level
              </p>
              <span className="rounded-md border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                LVL {level}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{xp}</span>
              <span className="text-xs font-medium text-violet-400">Total XP</span>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                <span>Progress to Level {level + 1}</span>
                <span>{currentLevelProgressXp} / 100 XP</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, currentLevelProgressXp))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Activity Overview */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/30">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Next Milestone
              </p>
              <span className="text-lg">🎯</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{nextLevelXp - xp}</span>
              <span className="text-xs font-medium text-sky-400">XP needed</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Complete quizzes and lessons to level up.
            </p>
          </div>
        </section>

        {/* Recommended for You Section (Sprint 8B) */}
        <section className="mt-6 rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/10 text-xs text-sky-300">
                ✦
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Recommended for You</h3>
                <p className="text-[11px] text-slate-400">
                  Adaptive study suggestions based on your learning memory & activity
                </p>
              </div>
            </div>

            <button
              onClick={handleRefreshRecommendations}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[11px] font-medium text-slate-300 transition hover:border-sky-400/30 hover:bg-slate-800 disabled:opacity-50 sm:self-auto"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {recommendations && recommendations.length > 0 ? (
              recommendations.slice(0, 3).map((rec) => {
                const meta = getRecommendationBadge(rec.recommendation_type);
                return (
                  <div
                    key={rec.id}
                    className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-slate-900/50 p-4 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-slate-900/80"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Priority #{rec.priority}
                        </span>
                      </div>

                      <h4 className="mt-3 text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                        {rec.title}
                      </h4>

                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {rec.description}
                      </p>

                      <div className="mt-3 inline-block rounded-md bg-white/[0.03] px-2 py-1 text-[10px] text-slate-400">
                        💡 {rec.reason}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.04]">
                      <Link
                        href={(rec.action_url || '/learn') as any}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-sky-400 hover:text-slate-950"
                      >
                        <span>{meta.actionLabel}</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 py-6 text-center">
                <p className="text-xs text-slate-400">
                  No pending recommendations. Complete a lesson or quiz to receive tailored suggestions!
                </p>
                <div className="mt-3 flex justify-center gap-3">
                  <Link
                    href="/learn"
                    className="rounded-lg bg-sky-400/10 border border-sky-400/20 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/20 transition"
                  >
                    Start Learning
                  </Link>
                  <Link
                    href="/roadmap"
                    className="rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition"
                  >
                    View Roadmaps
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Continue Learning or AI Mentor CTA */}
          {progress?.continue_learning ? (
            <div className="group relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-950/80 to-violet-500/10 p-7 shadow-2xl backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/40">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-400">
                    Continue Learning
                  </span>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    {progress.continue_learning.topic}
                  </h2>
                </div>
                <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-300">
                  {progress.continue_learning.progress}%
                </span>
              </div>

              <div className="mt-6">
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500 transition-all duration-500"
                    style={{ width: `${progress.continue_learning.progress}%` }}
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Pick up right where you left off in your personalized interactive curriculum.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/learn"
                  className="rounded-xl bg-sky-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-300"
                >
                  Resume Lesson →
                </Link>
                <Link
                  href="/mentor"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-white/[0.07]"
                >
                  Discuss with Mentor
                </Link>
              </div>
            </div>
          ) : (
            <div className="group relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-950/80 to-violet-500/10 p-7 shadow-2xl backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/40">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-xl text-sky-300">
                  ✦
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                  AI Mentor Online
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-bold text-white">
                Learn any technology with AI guidance
              </h2>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Generate interactive structured lessons with instant quizzes, real-world analogies, and hands-on exercises.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/learn"
                  className="rounded-xl bg-sky-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-300"
                >
                  Start Learning →
                </Link>
                <Link
                  href="/mentor"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-white/[0.07]"
                >
                  Open Mentor Chat
                </Link>
              </div>
            </div>
          )}

          {/* Code Playground Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950/70 p-7 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-lg font-mono text-violet-300">
                {'</>'}
              </div>
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Interactive Sandbox
              </span>
            </div>

            <h2 className="mt-6 text-xl font-bold text-white">
              Code Playground
            </h2>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Run Python, Node.js, and C++ code with real-time AI mentoring and auto-debugging.
            </p>

            <div className="mt-6">
              <Link
                href="/playground"
                className="inline-flex rounded-xl border border-white/[0.08] bg-slate-900/80 px-5 py-2.5 text-xs font-semibold text-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-slate-800"
              >
                Open Playground →
              </Link>
            </div>
          </div>
        </section>

        {/* Weekly Activity & Recent Actions Grid */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          {/* Weekly Activity Bar Chart */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Weekly Activity</h3>
                <p className="mt-0.5 text-[11px] text-slate-400">Minutes practiced per day</p>
              </div>
              <span className="text-xs font-semibold text-sky-400">7 Days</span>
            </div>

            <div className="mt-8 flex h-36 items-end justify-between gap-2 px-2">
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
              ).map((day, idx) => {
                const heightPercent = Math.min(100, Math.max(10, (day.minutes / 60) * 100));
                return (
                  <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative flex h-24 w-full items-end justify-center rounded-lg bg-white/[0.02]">
                      <div
                        className="w-full max-w-[28px] rounded-md bg-gradient-to-t from-sky-500 to-cyan-400 transition-all duration-300 hover:brightness-110"
                        style={{ height: `${heightPercent}%` }}
                        title={`${day.day}: ${day.minutes} min`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity List / Empty State */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                <p className="mt-0.5 text-[11px] text-slate-400">Your latest actions and XP gains</p>
              </div>
              <Link href="/learn" className="text-xs font-semibold text-sky-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="mt-4 divide-y divide-white/[0.05]">
              {progress?.recent_activity && progress.recent_activity.length > 0 ? (
                progress.recent_activity.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between py-3 transition-all duration-150 hover:bg-white/[0.02] px-2 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-xs font-bold text-sky-400">
                        {getActivityIcon(act.activity_type)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-200">
                          {act.activity_title}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatRelativeTime(act.created_at)}
                        </p>
                      </div>
                    </div>
                    {act.xp_earned > 0 && (
                      <span className="ml-3 shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-300">
                        +{act.xp_earned} XP
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-400">No activity yet. Start your first session!</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Link
                      href="/learn"
                      className="rounded-lg bg-sky-400/10 border border-sky-400/20 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/20 transition"
                    >
                      Start Learning
                    </Link>
                    <Link
                      href="/mentor"
                      className="rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition"
                    >
                      Open Mentor
                    </Link>
                    <Link
                      href="/playground"
                      className="rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition"
                    >
                      Open Playground
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}