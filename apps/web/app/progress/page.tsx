'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserProgress, type UserProgressResponse } from '../../lib/api/progress';
import { getToken } from '../../lib/api/auth';

function getIntensityClass(level: number): string {
  switch (level) {
    case 1:
      return 'bg-emerald-800/80 border-emerald-700/60';
    case 2:
      return 'bg-emerald-600 border-emerald-500';
    case 3:
      return 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.4)]';
    case 0:
    default:
      return 'bg-white/[0.04] border-white/[0.06]';
  }
}

export default function ProgressPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgressResponse | null>(null);
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
        const data = await getUserProgress(token || undefined);
        setProgress(data);
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
      <main className="flex min-h-screen items-center justify-center text-xs text-slate-500">
        Loading verified learning analytics...
      </main>
    );
  }

  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? 1;
  const streak = progress?.streak ?? 0;
  const lessonsCompleted = progress?.lessons_completed ?? 0;
  const roadmapPct = progress?.roadmap_progress_percentage ?? 0;
  const quizzesCompleted = progress?.quizzes_completed ?? 0;
  const challengesPassed = progress?.challenges_passed ?? 0;
  const nextLevelXp = level * 100;
  const currentLevelProgressXp = xp % 100;

  const achievements = [
    {
      title: 'First Step',
      desc: 'Completed your first learning activity',
      icon: '🌱',
      earned: xp > 0 || lessonsCompleted > 0,
    },
    {
      title: 'Consistent Learner',
      desc: 'Maintained an active streak',
      icon: '🔥',
      earned: streak >= 1,
    },
    {
      title: 'Quiz Champion',
      desc: 'Passed knowledge quizzes',
      icon: '✓',
      earned: quizzesCompleted >= 1,
    },
    {
      title: 'Code Builder',
      desc: 'Passed interactive coding challenges',
      icon: '⚡',
      earned: challengesPassed >= 1,
    },
    {
      title: '100 XP Pioneer',
      desc: 'Earned 100+ total XP',
      icon: '⭐',
      earned: xp >= 100,
    },
    {
      title: 'Level 5 Master',
      desc: 'Reached Developer Level 5',
      icon: '🧠',
      earned: level >= 5,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-white sm:px-6 md:px-10">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-400">
                Learning Analytics
              </span>
              <span className="text-xs text-slate-500">
                Verified Progress & Consistency
              </span>
            </div>

            <Link
              href="/"
              className="rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              ← Back to Command Center
            </Link>
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            {progress?.name ? `${progress.name}'s Analytics` : 'Learning Analytics'}
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            Real-time verified metrics computed from your lessons, quizzes, coding sandbox challenges, and roadmap milestones.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}
        </section>

        {/* 1. REAL STATS BAR */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Total XP',
              value: xp.toLocaleString(),
              sub: `Level ${level} Developer`,
              color: 'text-sky-300',
              borderColor: 'hover:border-sky-500/30',
              icon: '⭐',
            },
            {
              title: 'Current Streak',
              value: `${streak} ${streak === 1 ? 'Day' : 'Days'}`,
              sub: streak > 0 ? 'Daily momentum active' : 'Start learning today',
              color: 'text-orange-300',
              borderColor: 'hover:border-orange-500/30',
              icon: '🔥',
            },
            {
              title: 'Completed Modules',
              value: lessonsCompleted.toString(),
              sub: `${quizzesCompleted} quizzes · ${challengesPassed} challenges`,
              color: 'text-emerald-300',
              borderColor: 'hover:border-emerald-500/30',
              icon: '📘',
            },
            {
              title: 'Roadmap Progress',
              value: `${roadmapPct}%`,
              sub: roadmapPct > 0 ? 'Active career trajectory' : 'No active roadmap',
              color: 'text-violet-300',
              borderColor: 'hover:border-violet-500/30',
              icon: '🎯',
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`rounded-2xl border border-white/[0.08] bg-slate-950/70 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 ${card.borderColor}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{card.icon}</span>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] text-slate-400">
                  Verified
                </span>
              </div>

              <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">
                {card.title}
              </h3>

              <p className={`mt-1 text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>

              <p className="mt-2 text-[11px] text-slate-500">{card.sub}</p>
            </div>
          ))}
        </section>

        {/* 2. WEEKLY ACTIVITY & HEATMAP SECTION */}
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          {/* Weekly Consistency Bar Chart */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-400 font-semibold">
                    Weekly Activity
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Learning Consistency
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Last 7 days</span>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                Active minutes practiced based on verified learning actions.
              </p>
            </div>

            <div className="mt-8 flex h-44 items-end justify-between gap-2 px-2">
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
                    <div className="relative flex h-28 w-full items-end justify-center rounded-lg bg-white/[0.02]">
                      <div
                        className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-sky-500 to-cyan-400 transition-all duration-300 hover:brightness-110"
                        style={{ height: `${heightPercent}%` }}
                        title={`${item.day}: ${item.minutes} minutes`}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 35-Day Real Activity Heatmap */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-semibold">
                    Activity Heatmap
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Last 35 Days
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Meaningful events only</span>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                Reflects verified lesson completions, quizzes, coding exercises, and roadmap progress.
              </p>
            </div>

            {/* Heatmap Grid */}
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
                      return (
                        <div
                          key={dIdx}
                          className={`h-7 w-full rounded-lg border transition-all ${getIntensityClass(level)}`}
                          title={
                            dayObj
                              ? `${dayObj.date} (${dayObj.day}): ${dayObj.count} verified learning events`
                              : `Intensity Level: ${level}`
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[11px] text-slate-500">
                <span>5-Week Activity Spectrum</span>
                <div className="flex items-center gap-1.5">
                  <span>Less</span>
                  <div className="h-3 w-3 rounded border border-white/[0.06] bg-white/[0.04]" />
                  <div className="h-3 w-3 rounded border border-emerald-700/60 bg-emerald-800/80" />
                  <div className="h-3 w-3 rounded border border-emerald-500 bg-emerald-600" />
                  <div className="h-3 w-3 rounded border border-emerald-300 bg-emerald-400" />
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ACHIEVEMENTS & MILESTONES SECTION */}
        <section className="mb-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-semibold">
                Milestones & Badges
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Unlocked Competencies
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {achievements.filter((a) => a.earned).length} of {achievements.length} Unlocked
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((badge) => (
              <div
                key={badge.title}
                className={`rounded-2xl border p-5 transition-all duration-200 ${
                  badge.earned
                    ? 'border-sky-400/30 bg-sky-500/[0.06] shadow-lg shadow-sky-500/5'
                    : 'border-white/[0.06] bg-slate-950/40 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{badge.icon}</span>

                  {badge.earned ? (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      UNLOCKED ✓
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      LOCKED 🔒
                    </span>
                  )}
                </div>

                <h3 className="mt-4 font-bold text-white">{badge.title}</h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{badge.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. NEXT LEVEL TARGET GOAL */}
        <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
                Current Level Target
              </span>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Advance to Level {level + 1}
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                Earn {nextLevelXp - xp} more XP by completing interactive lessons, passing knowledge quizzes, or mastering coding challenges.
              </p>

              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                  <span>Level {level} Progress</span>
                  <span className="font-semibold text-violet-400">
                    {currentLevelProgressXp} / 100 XP ({currentLevelProgressXp}%)
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, currentLevelProgressXp))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-violet-400/30 bg-violet-400/10 text-center shadow-lg shadow-violet-500/10">
              <div>
                <div className="text-xl font-bold text-violet-300">LVL {level}</div>
                <div className="text-[10px] text-slate-400">Current</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}