'use client';

import { useState } from 'react';

const suggestions = [
  'Explain this concept simply',
  'Help me debug my code',
  'Create a learning roadmap',
  'Quiz me on a topic',
];

export default function MentorPage() {
  const [message, setMessage] = useState('');

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-sky-500/[0.08] blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20%] h-[25rem] w-[25rem] rounded-full bg-violet-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10rem] left-[35%] h-[24rem] w-[24rem] rounded-full bg-cyan-500/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-lg font-bold text-slate-950 shadow-xl shadow-sky-500/20">
              ✦

              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#030712] bg-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight">
                  AI Mentor
                </h1>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                  Online
                </span>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Your technical learning companion
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-slate-200"
          >
            New conversation
          </button>
        </header>

        {/* Chat area */}
        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-3xl text-center">
              {/* AI Orb */}
              <div className="relative mx-auto mb-8 h-28 w-28">
                <div className="absolute inset-0 animate-pulse rounded-full bg-sky-400/10 blur-2xl" />

                <div className="absolute inset-3 rounded-[2rem] border border-sky-400/20 bg-gradient-to-br from-sky-400/15 via-cyan-400/10 to-violet-500/10 shadow-2xl shadow-sky-500/10 backdrop-blur-xl" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-violet-300 bg-clip-text text-4xl font-bold text-transparent">
                    ✦
                  </span>
                </div>

                <span className="absolute right-1 top-3 h-2 w-2 rounded-full bg-cyan-300 shadow-lg shadow-cyan-300/60" />
                <span className="absolute bottom-4 left-2 h-1.5 w-1.5 rounded-full bg-sky-300 shadow-lg shadow-sky-300/60" />
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400/80">
                TechSeeker Intelligence
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                What are you building today?
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
                Ask questions, debug code, understand difficult concepts, or
                let your AI mentor guide your next technical step.
              </p>

              {/* Suggestions */}
              <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setMessage(suggestion)}
                    className="group rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-left text-xs text-slate-400 transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/20 hover:bg-sky-400/[0.05] hover:text-slate-200"
                  >
                    <span className="mr-2 text-slate-600 transition group-hover:text-sky-400">
                      →
                    </span>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Composer */}
          <div className="pb-4">
            <div className="mx-auto max-w-4xl">
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-slate-900/80 shadow-2xl shadow-black/30 backdrop-blur-xl transition focus-within:border-sky-400/30 focus-within:shadow-sky-500/[0.05]">
                <div className="flex items-end gap-2 p-3">
                  <button
                    type="button"
                    className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
                    aria-label="Attach file"
                  >
                    +
                  </button>

                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask your AI mentor anything..."
                    rows={1}
                    className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                  />

                  <button
                    type="button"
                    className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
                    aria-label="Voice input"
                  >
                    ◉
                  </button>

                  <button
                    type="button"
                    disabled={!message.trim()}
                    className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:scale-105 hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                    aria-label="Send message"
                  >
                    ↑
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2">
                  <p className="text-[10px] text-slate-600">
                    AI can make mistakes. Verify important information.
                  </p>

                  <p className="hidden text-[10px] text-slate-600 sm:block">
                    Enter to send · Shift + Enter for new line
                  </p>
                </div>
              </div>

              <p className="mt-3 text-center text-[10px] text-slate-700">
                TechSeeker AI Mentor
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}