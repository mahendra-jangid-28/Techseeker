'use client';

const weeklyActivity = [
  { day: 'Mon', value: 4 },
  { day: 'Tue', value: 2 },
  { day: 'Wed', value: 6 },
  { day: 'Thu', value: 5 },
  { day: 'Fri', value: 8 },
  { day: 'Sat', value: 7 },
  { day: 'Sun', value: 3 },
];

const achievements = [
  { title: '7 Day Streak', icon: '🔥', earned: true },
  { title: 'Python Explorer', icon: '🐍', earned: true },
  { title: 'DSA Beginner', icon: '🌱', earned: true },
  { title: '1000 XP Club', icon: '⭐', earned: true },
  { title: 'Algorithm Master', icon: '🧠', earned: false },
  { title: 'Backend Hero', icon: '⚡', earned: false },
];

const heatmap = [
  [1, 0, 2, 3, 0, 1, 2],
  [2, 3, 1, 0, 2, 3, 1],
  [0, 1, 2, 2, 3, 1, 0],
  [3, 2, 1, 3, 2, 0, 1],
  [1, 2, 3, 1, 0, 2, 3],
];

export default function ProgressPage() {
  return (
    <main className="min-h-screen px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-cyan-300">
              LEARNING PROGRESS
            </span>
            <span className="text-xs text-white/40">
              Track your consistency
            </span>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Your Learning Analytics
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 md:text-base">
            Monitor XP, streaks, completed lessons and weekly learning activity.
          </p>
        </section>

        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: 'Learning XP',
              value: '1,240',
              color: 'text-cyan-300',
              icon: '⭐',
            },
            {
              title: 'Current Streak',
              value: '7 Days',
              color: 'text-orange-300',
              icon: '🔥',
            },
            {
              title: 'Completed Lessons',
              value: '32',
              color: 'text-emerald-300',
              icon: '📘',
            },
            {
              title: 'Roadmap Progress',
              value: '26%',
              color: 'text-violet-300',
              icon: '🎯',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-xs text-white/30">Today</span>
              </div>

              <h3 className="mt-4 text-sm text-white/50">{card.title}</h3>

              <p className={`mt-1 text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))}
        </section>

        {/* Weekly Activity */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Weekly Activity
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Learning Consistency
              </h2>
            </div>

            <span className="text-sm text-white/40">Last 7 days</span>
          </div>

          <div className="flex h-56 items-end justify-between gap-3">
            {weeklyActivity.map((item) => (
              <div key={item.day} className="flex flex-1 flex-col items-center">
                <div className="flex h-44 items-end">
                  <div
                    className="w-8 rounded-t-xl bg-gradient-to-t from-cyan-500 to-sky-300 transition-all"
                    style={{ height: `${item.value * 18}px` }}
                  />
                </div>

                <span className="mt-3 text-xs text-white/50">{item.day}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Activity Heatmap */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
              Activity Heatmap
            </p>

            <h2 className="mt-2 text-2xl font-semibold">Last 35 Days</h2>

            <p className="mt-1 text-sm text-white/45">
              Darker squares indicate higher learning activity.
            </p>
          </div>

          <div className="flex gap-1">
            {heatmap.map((week, i) => (
              <div key={i} className="flex flex-col gap-1">
                {week.map((level, j) => (
                  <div
                    key={j}
                    className={`h-5 w-5 rounded-[4px] ${
                      level === 0
                        ? 'bg-white/5'
                        : level === 1
                        ? 'bg-emerald-900'
                        : level === 2
                        ? 'bg-emerald-600'
                        : 'bg-emerald-400'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
            <span>Less</span>
            <div className="h-3 w-3 rounded bg-white/5" />
            <div className="h-3 w-3 rounded bg-emerald-900" />
            <div className="h-3 w-3 rounded bg-emerald-600" />
            <div className="h-3 w-3 rounded bg-emerald-400" />
            <span>More</span>
          </div>
        </section>

        {/* Achievements */}
        <section className="mb-8">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Achievements
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Milestones Unlocked
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((badge) => (
              <div
                key={badge.title}
                className={`rounded-2xl border p-5 transition ${
                  badge.earned
                    ? 'border-cyan-400/20 bg-cyan-500/[0.06]'
                    : 'border-white/10 bg-white/[0.03] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{badge.icon}</span>

                  {badge.earned ? (
                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/40">
                      LOCKED
                    </span>
                  )}
                </div>

                <h3 className="mt-4 font-semibold">{badge.title}</h3>

                <p className="mt-2 text-sm text-white/45">
                  {badge.earned
                    ? 'Achievement earned successfully.'
                    : 'Complete more roadmap phases to unlock.'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Summary */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Next Goal
              </p>

              <h2 className="mt-2 text-2xl font-semibold">Reach 2,000 XP</h2>

              <p className="mt-2 max-w-lg text-sm text-white/50">
                Complete 12 more lessons and finish Data Structures to unlock the
                Algorithm track.
              </p>
            </div>

            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-cyan-400 text-center">
              <div>
                <div className="text-2xl font-bold">62%</div>
                <div className="text-xs text-white/40">Goal</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}