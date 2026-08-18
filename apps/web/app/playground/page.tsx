'use client';

import { useState } from 'react';

const starterCode = `function greet(name: string) {
  return \`Hello, \${name}! Welcome to TechSeeker.\`;
}

const user = 'Developer';

console.log(greet(user));`;

export default function PlaygroundPage() {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState(
    'Hello, Developer! Welcome to TechSeeker.'
  );

  const runCode = () => {
    setOutput('Code execution will be connected to the secure runtime.');
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-violet-500/[0.08] blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20%] h-[28rem] w-[28rem] rounded-full bg-sky-500/[0.06] blur-[120px]" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-5 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-lg font-bold text-white shadow-xl shadow-violet-500/20">
              {'</>'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight">
                  Code Playground
                </h1>

                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300">
                  Sandbox
                </span>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Experiment, practice, and build in one place
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={runCode}
              className="rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:scale-[1.02] hover:shadow-violet-500/30"
            >
              ▶ Run code
            </button>
          </div>
        </header>

        {/* Workspace */}
        <section className="grid min-h-[calc(100vh-120px)] gap-4 py-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Editor */}
          <div className="flex min-h-[550px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-950/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>

                <span className="text-xs font-medium text-slate-400">
                  main.ts
                </span>
              </div>

              <span className="text-[10px] uppercase tracking-wider text-slate-600">
                TypeScript
              </span>
            </div>

            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              spellCheck={false}
              className="min-h-[500px] flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-7 text-slate-300 outline-none placeholder:text-slate-700"
            />
          </div>

          {/* Side panel */}
          <div className="flex flex-col gap-4">
            {/* Output */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-950/70 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                  <span className="text-xs font-medium text-slate-300">
                    Console output
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setOutput('')}
                  className="text-[10px] text-slate-600 transition hover:text-slate-300"
                >
                  Clear
                </button>
              </div>

              <div className="min-h-[220px] p-4">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-emerald-300/80">
                  {output || 'Waiting for output...'}
                </pre>
              </div>
            </div>

            {/* AI assistance */}
            <div className="relative overflow-hidden rounded-2xl border border-sky-400/10 bg-gradient-to-br from-sky-500/[0.08] via-slate-950/70 to-violet-500/[0.08] p-5">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-400/10 text-sm text-sky-300">
                    ✦
                  </span>

                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      AI Code Assistant
                    </p>

                    <p className="text-[10px] text-slate-500">
                      Coming to the playground
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Soon you will be able to explain code, detect bugs, generate
                  examples, and get help directly inside your workspace.
                </p>

                <button
                  type="button"
                  className="mt-4 text-xs font-medium text-sky-300 transition hover:text-sky-200"
                >
                  Ask AI about this code →
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Runtime status
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Secure execution
                </span>

                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-medium text-amber-300">
                  In development
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}