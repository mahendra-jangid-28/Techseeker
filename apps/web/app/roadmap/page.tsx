'use client';
import { useRouter } from 'next/navigation';

const roadmap = [
  {
    phase: 'Phase 1',
    title: 'Programming Fundamentals',
    progress: 75,
    difficulty: 'Beginner',
    duration: '3 Weeks',
    xp: 500,
    status: 'In Progress',
    color: 'from-sky-400 to-cyan-400',
    topics: [
      'Variables & Data Types',
      'Loops & Conditions',
      'Functions',
      'Arrays & Strings',
    ],
  },
  {
    phase: 'Phase 2',
    title: 'Data Structures',
    progress: 30,
    difficulty: 'Intermediate',
    duration: '4 Weeks',
    xp: 750,
    status: 'Unlocked',
    color: 'from-violet-400 to-fuchsia-400',
    topics: ['Stack', 'Queue', 'Linked List', 'Trees'],
  },
  {
    phase: 'Phase 3',
    title: 'Algorithms',
    progress: 0,
    difficulty: 'Intermediate',
    duration: '5 Weeks',
    xp: 900,
    status: 'Locked',
    color: 'from-emerald-400 to-teal-400',
    topics: ['Searching', 'Sorting', 'Recursion', 'Dynamic Programming'],
  },
  {
    phase: 'Phase 4',
    title: 'Backend Development',
    progress: 0,
    difficulty: 'Advanced',
    duration: '6 Weeks',
    xp: 1200,
    status: 'Locked',
    color: 'from-amber-400 to-orange-400',
    topics: ['SQL', 'REST APIs', 'Authentication', 'Deployment'],
  },
];

export default function RoadmapPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-cyan-300">
              LEARNING ROADMAP
            </span>
            <span className="text-xs text-white/40">
              Structured growth path
            </span>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Become an AI & Full Stack Developer
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 md:text-base">
            Follow a guided roadmap from programming fundamentals to advanced
            backend and AI engineering.
          </p>
        </section>

        <section className="grid gap-6">
          {roadmap.map((item, index) => (
            <div
              key={item.phase}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-lg font-bold text-black`}
                  >
                    {index + 1}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      {item.phase}
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold">
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-sky-400/10 px-3 py-1 text-sky-300">
                          {item.difficulty}
                        </span>

                        <span className="rounded-full bg-violet-400/10 px-3 py-1 text-violet-300">
                          ⏱ {item.duration}
                        </span>

                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">
                          ⭐ {item.xp} XP
                        </span>
                      </div>
                      {item.title}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xs">
                 <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-white/40">{item.status}</span>

                  <span className="font-medium text-cyan-300">
                    {item.progress}%
                  </span>
                </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <button
                    onClick={() => router.push('/learn')}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-sm font-medium transition hover:bg-white/[0.08]">
                  
                    Continue →
                  </button>
                </div>
              </div>  
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Overall Journey
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                26% Roadmap Completed
              </h2>

              <p className="mt-2 text-sm text-white/50">
                Finish Programming Fundamentals to unlock the next milestone.
              </p>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-cyan-400 text-2xl font-bold">
              26%
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}