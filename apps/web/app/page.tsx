export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 md:px-10">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Top bar */}
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                AI Mentor Online
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Build something
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                {" "}amazing.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
              Learn, practice, and build with your personal AI technical
              mentor.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-700 hover:bg-slate-800">
              Search
            </button>

            <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800">
              🔔
            </button>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20">
              TS
            </div>
          </div>
        </header>

        {/* Main feature */}
        <section className="mt-10 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* AI Mentor */}
          <div className="group relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-900/80 to-violet-500/10 p-7 shadow-2xl shadow-black/20 transition duration-300 hover:border-sky-400/40">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl transition duration-500 group-hover:bg-sky-400/20" />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-2xl">
                  ✦
                </div>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-400">
                  Ready
                </span>
              </div>

              <p className="mt-8 text-sm font-medium text-sky-400">
                AI MENTOR
              </p>

              <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
                Your technical questions,
                <br />
                answered instantly.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
                Debug code, understand complex concepts, design systems,
                prepare for interviews, or simply ask your mentor anything.
              </p>

              <button className="mt-7 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300 hover:shadow-sky-500/30">
                Start a conversation →
              </button>
            </div>
          </div>

          {/* Playground */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-7 transition duration-300 hover:border-violet-400/30">
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl transition group-hover:bg-violet-500/20" />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-2xl">
                  {"</>"}
                </div>

                <span className="text-xs text-slate-500">
                  Sandbox
                </span>
              </div>

              <p className="mt-8 text-sm font-medium text-violet-400">
                CODE PLAYGROUND
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Turn ideas into code.
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-400">
                Experiment, run programs, and practice without leaving
                TechSeeker.
              </p>

              <button className="mt-7 rounded-xl border border-slate-700 bg-slate-950/60 px-5 py-3 text-sm font-medium transition hover:border-violet-400/40 hover:bg-slate-800">
                Open Playground →
              </button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Current streak
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold">7</span>
              <span className="mb-1 text-sm text-orange-400">🔥 days</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Learning XP
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold">1,240</span>
              <span className="mb-1 text-sm text-sky-400">XP</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Problems solved
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold">32</span>
              <span className="mb-1 text-sm text-emerald-400">completed</span>
            </div>
          </div>
        </section>

        {/* Learning */}
        <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/50 p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Continue learning
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Your learning journey
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Keep building your skills one concept at a time.
              </p>
            </div>

            <button className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium transition hover:bg-slate-800">
              View roadmap →
            </button>
          </div>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Backend Development</span>
              <span className="text-sky-400">68%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}