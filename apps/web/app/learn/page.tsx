'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { clearToken, getToken } from '../../lib/api/auth';
import {
  generateLearningContent,
  type LearningResponse,
} from '../../lib/api/learning';

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

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return (
    message.includes('credentials') ||
    message.includes('unauthorized') ||
    message.includes('not authenticated') ||
    message.includes('401')
  );
}

export default function LearnPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [lessonData, setLessonData] = useState<LearningResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
    }
  }, [router]);

  async function handleGenerateTopic(targetTopic: string) {
    const trimmed = targetTopic.trim();
    if (!trimmed || isLoading) return;

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuizAnswers({});
    setRevealedHints({});

    try {
      const response = await generateLearningContent(
        {
          topic: trimmed,
          language: 'English',
          level: 'beginner',
        },
        token,
      );

      setLessonData(response);
      setTopic(response.topic);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      if (isAuthError(err)) {
        clearToken();
        router.replace('/login' as Route);
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate learning content. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (topic.trim()) {
      handleGenerateTopic(topic);
    }
  }

  function handleTopicSelect(value: string) {
    setTopic(value);
    handleGenerateTopic(value);
  }

  function handleResetToDiscovery() {
    setLessonData(null);
    setError(null);
    setQuizAnswers({});
    setRevealedHints({});
  }

  function toggleHint(index: number) {
    setRevealedHints((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  function handleSelectQuizOption(questionIndex: number, selectedOption: string) {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionIndex]: selectedOption,
    }));
  }

  return (
    <main className="min-h-screen px-4 py-8 text-white sm:px-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Error Notification */}
        {error && (
          <div className="mb-8 flex items-center justify-between rounded-2xl border border-red-400/30 bg-red-950/60 p-4 text-sm text-red-300 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateTopic(topic)}
              disabled={isLoading}
              className="rounded-xl border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/30 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Overlay / Progress Card */}
        {isLoading && (
          <div className="mb-10 flex flex-col items-center justify-center rounded-3xl border border-sky-400/20 bg-slate-950/80 p-12 text-center shadow-2xl backdrop-blur-xl">
            <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-sky-400/20" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/30">
                <svg className="h-6 w-6 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-white">
              Generating Structured Lesson
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Structuring definitions, real-world analogies, code examples, interactive quizzes, and assignments...
            </p>
          </div>
        )}

        {/* View 1: Active Lesson State */}
        {!isLoading && lessonData ? (
          <div className="space-y-10">
            {/* Header & Back Action */}
            <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <button
                  type="button"
                  onClick={handleResetToDiscovery}
                  className="mb-3 flex items-center gap-1.5 text-xs font-medium text-sky-400 transition hover:text-sky-300"
                >
                  <span>←</span>
                  <span>Explore Other Topics</span>
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                    {lessonData.topic}
                  </h1>
                  <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
                    AI Lesson
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Search another topic..."
                    className="rounded-xl border border-white/[0.1] bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !topic.trim()}
                    className="rounded-xl bg-sky-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md transition hover:bg-sky-300 disabled:opacity-50"
                  >
                    Learn
                  </button>
                </form>
              </div>
            </div>

            {/* 1. Why Learn This */}
            {lessonData.why_learn_this && (
              <section className="rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.08] via-slate-950/70 to-violet-500/[0.05] p-6 shadow-xl backdrop-blur-xl md:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/20 text-lg text-sky-300">
                    💡
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                      1. Why Learn This?
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200 md:text-base">
                      {lessonData.why_learn_this}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 2, 3, 4. Core Concepts, Definitions & Analogies */}
            <section className="grid gap-6 md:grid-cols-3">
              {/* Professional Definition */}
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-6 shadow-lg backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-base">📐</span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    2. Professional Definition
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {lessonData.professional_definition}
                </p>
              </div>

              {/* Easy Explanation */}
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-6 shadow-lg backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-base">✨</span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    3. Simple Explanation
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {lessonData.easy_explanation}
                </p>
              </div>

              {/* Real World Analogy */}
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-6 shadow-lg backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-base">🌍</span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    4. Real-World Analogy
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {lessonData.real_world_analogy}
                </p>
              </div>
            </section>

            {/* 5. Real-World Applications */}
            {lessonData.real_world_applications && lessonData.real_world_applications.length > 0 && (
              <section className="rounded-3xl border border-white/[0.08] bg-slate-950/50 p-6 shadow-lg md:p-8">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  5. Real-World Applications
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lessonData.real_world_applications.map((app, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-slate-900/60 p-4"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-xs font-bold text-cyan-300">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">{app}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Syntax or Core Mechanics */}
            {lessonData.syntax_or_core_concepts && (
              <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 shadow-lg md:p-8">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                  6. Syntax & Core Concepts
                </h2>
                <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-5 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {lessonData.syntax_or_core_concepts}
                </div>
              </section>
            )}

            {/* 7. Examples */}
            {lessonData.examples && lessonData.examples.length > 0 && (
              <section className="rounded-3xl border border-white/[0.08] bg-slate-950/50 p-6 shadow-lg md:p-8">
                <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                  7. Code & Concept Examples
                </h2>
                <div className="space-y-6">
                  {lessonData.examples.map((eg, idx) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60"
                    >
                      <div className="border-b border-white/[0.06] bg-slate-900/90 px-5 py-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Example {idx + 1}: {eg.title}
                        </span>
                        {eg.code && (
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                            Code Snippet
                          </span>
                        )}
                      </div>
                      <div className="p-5 space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {eg.explanation}
                        </p>
                        {eg.code && (
                          <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/50 p-4 font-mono text-xs text-emerald-300 leading-relaxed">
                            {eg.code}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 8. Common Mistakes */}
            {lessonData.common_mistakes && lessonData.common_mistakes.length > 0 && (
              <section className="rounded-3xl border border-amber-400/20 bg-amber-950/20 p-6 shadow-lg md:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                    8. Common Mistakes to Avoid
                  </h2>
                </div>
                <ul className="space-y-2.5 pl-2">
                  {lessonData.common_mistakes.map((mistake, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-amber-200/90 leading-relaxed">
                      <span className="text-amber-400">•</span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 9. Interactive Practice */}
            {lessonData.interactive_practice && lessonData.interactive_practice.length > 0 && (
              <section className="rounded-3xl border border-white/[0.08] bg-slate-950/50 p-6 shadow-lg md:p-8">
                <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  9. Interactive Practice Exercises
                </h2>
                <div className="space-y-4">
                  {lessonData.interactive_practice.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xs font-medium text-slate-100 leading-relaxed">
                          <strong className="text-emerald-400">Exercise {idx + 1}:</strong> {item.question}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleHint(idx)}
                          className="shrink-0 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.1]"
                        >
                          {revealedHints[idx] ? 'Hide Hint' : '💡 Show Hint'}
                        </button>
                      </div>
                      {revealedHints[idx] && (
                        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-950/30 p-3 text-xs text-emerald-200">
                          <strong className="text-emerald-300">Hint: </strong>
                          {item.hint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 10. Quiz */}
            {lessonData.quiz && lessonData.quiz.length > 0 && (
              <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 shadow-xl md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                    10. Knowledge Check Quiz
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    {Object.keys(quizAnswers).length} / {lessonData.quiz.length} Answered
                  </span>
                </div>

                <div className="space-y-6">
                  {lessonData.quiz.map((q, qIdx) => {
                    const selected = quizAnswers[qIdx];
                    const isAnswered = selected !== undefined;
                    const isCorrect = isAnswered && selected === q.answer;

                    return (
                      <div
                        key={qIdx}
                        className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5"
                      >
                        <p className="mb-4 text-xs font-semibold text-white">
                          Q{qIdx + 1}: {q.question}
                        </p>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {q.options.map((opt, optIdx) => {
                            const isThisSelected = selected === opt;
                            const isThisCorrectAnswer = opt === q.answer;

                            let buttonStyle = 'border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-white/20';

                            if (isAnswered) {
                              if (isThisCorrectAnswer) {
                                buttonStyle = 'border-emerald-500/50 bg-emerald-950/50 text-emerald-200';
                              } else if (isThisSelected && !isCorrect) {
                                buttonStyle = 'border-red-500/50 bg-red-950/50 text-red-200';
                              } else {
                                buttonStyle = 'border-white/[0.04] bg-slate-950/30 text-slate-500 opacity-60';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectQuizOption(qIdx, opt)}
                                className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-medium transition ${buttonStyle}`}
                              >
                                <span>{opt}</span>
                                {isAnswered && isThisCorrectAnswer && <span>✓</span>}
                                {isAnswered && isThisSelected && !isCorrect && <span>✗</span>}
                              </button>
                            );
                          })}
                        </div>

                        {isAnswered && (
                          <div
                            className={`mt-4 rounded-xl border p-3 text-xs leading-relaxed ${
                              isCorrect
                                ? 'border-emerald-400/20 bg-emerald-950/30 text-emerald-200'
                                : 'border-amber-400/20 bg-amber-950/30 text-amber-200'
                            }`}
                          >
                            <strong className={isCorrect ? 'text-emerald-300' : 'text-amber-300'}>
                              {isCorrect ? 'Correct! ' : 'Explanation: '}
                            </strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 11 & 12. Assignment & Mini Project */}
            <section className="grid gap-6 lg:grid-cols-2">
              {/* Assignment */}
              {lessonData.assignment && (
                <div className="rounded-3xl border border-white/[0.08] bg-slate-950/60 p-6 shadow-lg backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                      11. Hands-on Assignment
                    </h2>
                  </div>
                  <h3 className="text-sm font-bold text-white">{lessonData.assignment.title}</h3>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {lessonData.assignment.description}
                  </p>
                  {lessonData.assignment.requirements && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Requirements:
                      </p>
                      <ul className="space-y-1.5 pl-2 text-xs text-slate-300">
                        {lessonData.assignment.requirements.map((req, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-2">
                            <span className="text-cyan-400">◽</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Mini Project */}
              {lessonData.mini_project && (
                <div className="rounded-3xl border border-white/[0.08] bg-slate-950/60 p-6 shadow-lg backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                      12. Capstone Mini Project
                    </h2>
                  </div>
                  <h3 className="text-sm font-bold text-white">{lessonData.mini_project.title}</h3>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {lessonData.mini_project.description}
                  </p>
                  {lessonData.mini_project.requirements && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Requirements:
                      </p>
                      <ul className="space-y-1.5 pl-2 text-xs text-slate-300">
                        {lessonData.mini_project.requirements.map((req, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-2">
                            <span className="text-violet-400">◽</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 13 & 14. Related Topics & Next Topic */}
            <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 shadow-lg md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Related Concepts
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {lessonData.related_topics &&
                      lessonData.related_topics.map((relTopic, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleGenerateTopic(relTopic)}
                          className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-xs text-slate-300 transition hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-white disabled:opacity-50"
                        >
                          {relTopic} →
                        </button>
                      ))}
                  </div>
                </div>

                {lessonData.next_topic && (
                  <div className="shrink-0 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-5 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-400">
                      Recommended Next Topic
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">{lessonData.next_topic}</p>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleGenerateTopic(lessonData.next_topic)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:bg-sky-300 disabled:opacity-50"
                    >
                      <span>Start Next Topic</span>
                      <span>→</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          /* View 2: Discovery State (Default) */
          !isLoading && (
            <>
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
                <form
                  onSubmit={handleSearchSubmit}
                  className="rounded-3xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/20"
                >
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                      <span className="text-lg text-white/40">⌕</span>

                      <input
                        type="text"
                        value={topic}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="Search a topic... e.g. Recursion, Python, APIs"
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !topic.trim()}
                      className="rounded-2xl bg-white px-7 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                    >
                      Start Learning
                    </button>
                  </div>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs text-white/30">Try:</span>

                  {['Python', 'Recursion', 'APIs', 'Machine Learning', 'SQL'].map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
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
                      type="button"
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
                    type="button"
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
            </>
          )
        )}
      </div>
    </main>
  );
}