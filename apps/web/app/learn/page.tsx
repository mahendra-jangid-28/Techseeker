'use client';

import { useState } from 'react';

const popularTopics = [
  {
    title: 'Python',
    description: 'Learn Python from fundamentals to practical programming.',
    icon: '🐍',
    level: 'Beginner',
  },
  {
    title: 'JavaScript',
    description: 'Understand modern JavaScript and web programming.',
    icon: 'JS',
    level: 'Beginner',
  },
  {
    title: 'Machine Learning',
    description: 'Build a strong foundation in ML concepts and algorithms.',
    icon: 'ML',
    level: 'Intermediate',
  },
  {
    title: 'APIs',
    description: 'Understand how applications communicate through APIs.',
    icon: 'API',
    level: 'Beginner',
  },
  {
    title: 'Data Structures',
    description: 'Master arrays, stacks, queues, trees, graphs and more.',
    icon: 'DS',
    level: 'Intermediate',
  },
  {
    title: 'SQL',
    description: 'Learn databases, queries, joins and data manipulation.',
    icon: 'SQL',
    level: 'Beginner',
  },
];

const learningFramework = [
  'Why Learn This?',
  'Professional Definition',
  'Easy Explanation',
  'Real-World Analogy',
  'Real-World Applications',
  'Examples',
  'Common Mistakes',
  'Interactive Practice',
  'Quiz',
  'Assignment',
  'Mini Project',
];

export default function LearnPage() {
  const [topic, setTopic] = useState('');

  const handleSearch = () => {
    const value = topic.trim();

    if (!value) return;

    console.log('Learning topic:', value);
  };

  const handleTopicSelect = (value: string) => {
    setTopic(value);
  };

  return (
    <main className="min-h-screen px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-cyan-300">
              KNOWLEDGE EXPLORER
            </span>

            <span className="text-xs text-white/40">
              Learn anything, step by step
            </span>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            What do you want to learn?
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 md:text-base">
            Explore technical concepts, programming languages, AI topics and
            more through structured learning instead of random explanations.
          </p>
        </section>

        {/* Search */}
        <section className="mb-12">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <span className="text-lg text-white/40">⌕</span>

                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Search a topic... e.g. Recursion, Python, APIs"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>

              <button
                onClick={handleSearch}
                className="rounded-2xl bg-white px-7 py-4 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Start Learning
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-white/30">Try:</span>

            {['Python', 'Recursion', 'APIs', 'Machine Learning', 'SQL'].map(
              (item) => (
                <button
                  key={item}
                  onClick={() => handleTopicSelect(item)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/50 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </section>

        {/* Popular Topics */}
        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/70">
                Explore
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Popular topics
              </h2>
            </div>

            <span className="text-xs text-white/30">
              Start anywhere
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularTopics.map((item) => (
              <button
                key={item.title}
                onClick={() => handleTopicSelect(item.title)}
                className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white/80">
                    {item.icon}
                  </div>

                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/40">
                    {item.level}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  {item.description}
                </p>

                <div className="mt-5 text-xs font-medium text-white/40 transition group-hover:text-cyan-300">
                  Explore topic →
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Learning Framework */}
        <section className="mb-12 rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/70">
                Structured Learning
              </span>

              <h2 className="mt-3 text-2xl font-semibold">
                Learn beyond a simple AI answer.
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
                Every topic is designed around a consistent educational
                structure so you can understand, practice and test what you
                learn.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
                    AI
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      TechSeeker Intelligence
                    </p>

                    <p className="text-xs text-white/30">
                      Structured explanation engine
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {learningFramework.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-medium text-white/50">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="text-xs text-white/60">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.015] p-7 md:p-9">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/30">
                Your learning journey
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Pick a topic. Build real understanding.
              </h2>

              <p className="mt-2 max-w-xl text-sm text-white/40">
                Start with a concept today and progressively move toward
                practice, projects and deeper technical understanding.
              </p>
            </div>

            <button
              onClick={() => {
                const input = document.querySelector(
                  'input[placeholder*="Search a topic"]',
                ) as HTMLInputElement | null;

                input?.focus();
              }}
              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.1]"
            >
              Explore Topics →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}