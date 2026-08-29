'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import {
  PageContainer,
  PageHeader,
  Button,
  Card,
  Badge,
  ProgressBar,
  ContentCallout,
} from '@techseeker/ui';
import {
  generateLearningContent,
  searchKnowledgeTopics,
  type LearningResponse,
  type TopicSearchCard,
} from '../../lib/api/learning';
import { getToken } from '../../lib/api/auth';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';

const EXPLANATION_LEVELS = [
  { id: 'child', label: '🧒 Child', desc: 'ELIF5 & Simple Analogies' },
  { id: 'beginner', label: '🌱 Beginner', desc: 'Intuitive Foundations' },
  { id: 'student', label: '🎓 Student', desc: 'Computer Science Rigor' },
  { id: 'professional', label: '💼 Professional', desc: 'Senior Production Architecture' },
  { id: 'interview', label: '🎯 Interview', desc: 'FAANG Problems & Gotchas' },
];

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string>('');
  const [activeLevel, setActiveLevel] = useState<string>('beginner');
  const [topicCards, setTopicCards] = useState<TopicSearchCard[]>([]);
  const [searching, setSearching] = useState(false);

  const [lesson, setLesson] = useState<LearningResponse | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mini Quiz Interactive State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);
  const [expandedHints, setExpandedHints] = useState<Record<number, boolean>>({});

  // Initialize from search query params
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const levelParam = searchParams.get('level');

    if (levelParam && EXPLANATION_LEVELS.some((l) => l.id === levelParam)) {
      setActiveLevel(levelParam);
    }

    if (topicParam) {
      setActiveTopic(topicParam);
      loadLesson(topicParam, levelParam || activeLevel);
    } else {
      // Default: Load curated topic cards
      loadTopicCards('');
    }
  }, [searchParams]);

  async function loadTopicCards(query: string) {
    setSearching(true);
    try {
      const res = await searchKnowledgeTopics(query);
      setTopicCards(res.results);
    } catch {
      // Fail gracefully
    } finally {
      setSearching(false);
    }
  }

  async function loadLesson(topic: string, level: string) {
    if (!topic) return;
    setLoadingLesson(true);
    setError(null);
    setQuizAnswers({});
    setSubmittedQuiz(false);
    setExpandedHints({});

    try {
      const res = await generateLearningContent({
        topic,
        level,
        language: 'English',
      });
      setLesson(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate knowledge curriculum. Please try again.',
      );
    } finally {
      setLoadingLesson(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadTopicCards('');
      return;
    }
    loadTopicCards(searchQuery.trim());
  }

  function handleSelectTopic(topicTitle: string) {
    setActiveTopic(topicTitle);
    setSearchQuery('');
    router.push(`/explore?topic=${encodeURIComponent(topicTitle)}&level=${activeLevel}` as Route);
    loadLesson(topicTitle, activeLevel);
  }

  function handleSelectLevel(levelId: string) {
    setActiveLevel(levelId);
    if (activeTopic) {
      router.push(`/explore?topic=${encodeURIComponent(activeTopic)}&level=${levelId}` as Route);
      loadLesson(activeTopic, levelId);
    }
  }

  function handleOptionSelect(questionIndex: number, option: string) {
    if (submittedQuiz) return;
    setQuizAnswers((prev) => ({
      ...prev,
      [questionIndex]: option,
    }));
  }

  function handleQuizSubmit() {
    setSubmittedQuiz(true);
  }

  function handleRetakeQuiz() {
    setQuizAnswers({});
    setSubmittedQuiz(false);
  }

  function toggleHint(idx: number) {
    setExpandedHints((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  // Quiz score calculation
  const quizList = lesson?.quiz || [];
  const totalQuestions = quizList.length;
  const answeredCount = Object.keys(quizAnswers).length;
  let correctCount = 0;
  if (submittedQuiz) {
    quizList.forEach((q, idx) => {
      if (quizAnswers[idx] === q.answer) {
        correctCount++;
      }
    });
  }
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <PageContainer maxWidth="7xl" className="relative min-h-screen space-y-8 pb-16">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-subtle blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent-violet/10 blur-3xl" />
      </div>

      {/* HEADER & SEARCH BAR */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-xs text-brand font-bold">
                🔍
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Knowledge Explorer
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-content-primary sm:text-2xl">
              14-Part Adaptive Concept Intelligence
            </h1>
            <p className="text-xs text-content-secondary mt-0.5">
              Explore any technical topic across 5 multi-tier depth levels with instant AI caching and interactive verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/mentor">
              <Button variant="primary" size="sm" rightIcon={<span>✦</span>}>
                Ask AI Mentor
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Input & Controls */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadTopicCards(e.target.value);
              }}
              placeholder="Search any engineering concept (e.g. Python, Docker, Next.js, WebSockets, CAP Theorem)..."
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 pl-10 text-xs sm:text-sm text-content-primary shadow-subtle placeholder:text-content-muted outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <span className="absolute left-3.5 top-3 text-xs text-content-muted">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  loadTopicCards('');
                }}
                className="absolute right-3 top-2.5 rounded-full p-1 text-xs text-content-muted hover:text-content-primary"
              >
                ✕
              </button>
            )}
          </div>

          <Button type="submit" variant="primary" size="md" isLoading={searching}>
            Search Topic
          </Button>
        </form>

        {/* 5-Level Explanation Selector */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">
            Select Depth & Explanation Tier
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 select-none">
            {EXPLANATION_LEVELS.map((lvl) => {
              const active = activeLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => handleSelectLevel(lvl.id)}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                    active
                      ? 'border-brand bg-brand-subtle text-brand ring-2 ring-brand/30 shadow-subtle font-semibold'
                      : 'border-border-subtle bg-surface text-content-secondary hover:border-border hover:bg-surface-hover hover:text-content-primary'
                  }`}
                >
                  <span className="text-xs font-bold text-content-primary">
                    {lvl.label}
                  </span>
                  <span className="text-[10px] text-content-muted mt-0.5 leading-tight">
                    {lvl.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ERROR NOTICE */}
      {error && (
        <ContentCallout variant="danger" title="Generation Notice">
          {error}
        </ContentCallout>
      )}

      {/* TOPIC SELECTION / SEARCH CARDS (When no active topic or searching) */}
      {(!activeTopic || searchQuery) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-content-primary">
              {searchQuery ? `Search Results (${topicCards.length})` : 'Curated Topics & Concepts'}
            </h2>
            <span className="text-[10px] text-content-muted">
              Click any card to explore 14-part curriculum
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topicCards.map((card) => (
              <Card
                key={card.slug}
                variant="default"
                className="group cursor-pointer p-4 transition-all hover:border-brand hover:bg-surface-hover hover:shadow-subtle"
                onClick={() => handleSelectTopic(card.title)}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="rounded-md bg-brand-subtle px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
                    {card.category}
                  </span>
                  <span className="text-xs text-content-muted group-hover:text-brand transition-colors">
                    →
                  </span>
                </div>
                <h3 className="text-sm font-bold text-content-primary group-hover:text-brand transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-content-secondary mt-1 leading-relaxed line-clamp-2">
                  {card.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* LOADING SKELETON */}
      {loadingLesson && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-subtle/30 p-4 text-xs text-brand animate-pulse">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <span className="font-semibold">
              Generating 14-part adaptive curriculum for &quot;{activeTopic}&quot; ({activeLevel} level)...
            </span>
          </div>

          <div className="h-44 w-full animate-pulse rounded-2xl bg-surface-elevated" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-36 animate-pulse rounded-2xl bg-surface-elevated" />
            <div className="h-36 animate-pulse rounded-2xl bg-surface-elevated" />
          </div>
          <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-elevated" />
        </div>
      )}

      {/* 14-PART STRUCTURED LESSON DISPLAY */}
      {lesson && !loadingLesson && (
        <div className="space-y-8 animate-fade-in">
          {/* Topic Hero Card with Cache Indicator */}
          <Card variant="elevated" className="p-6 sm:p-8 space-y-4 shadow-elevated border-l-4 border-l-brand">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="sm">
                    {activeLevel.toUpperCase()} LEVEL
                  </Badge>
                  {lesson.cached ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ⚡ Cached AI Generation (Fast)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle border border-brand-border px-2.5 py-0.5 text-[10px] font-bold text-brand">
                      ✦ Live Gemini Generation
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-content-primary sm:text-3xl">
                  {lesson.topic}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActiveTopic('');
                    setLesson(null);
                    router.push('/explore' as Route);
                  }}
                >
                  ← Browse Topics
                </Button>
              </div>
            </div>

            {/* Part 1: Why Learn This & Part 2: Professional Definition */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-border-subtle bg-surface p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-xs text-brand font-bold">
                    1
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                    Why Learn This
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
                  {lesson.why_learn_this}
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-border-subtle bg-surface p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-violet/10 text-xs text-accent-violet font-bold">
                    2
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent-violet">
                    Professional Definition
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
                  {lesson.professional_definition}
                </p>
              </div>
            </div>

            {/* Part 3: Easy Explanation & Part 4: Real World Analogy */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-border-subtle bg-surface p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-cyan/10 text-xs text-accent-cyan font-bold">
                    3
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent-cyan">
                    Intuitive Explanation ({activeLevel})
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
                  {lesson.easy_explanation}
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-border-subtle bg-surface p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-xs text-amber-500 font-bold">
                    4
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    Real World Analogy
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-content-secondary leading-relaxed italic">
                  &quot;{lesson.real_world_analogy}&quot;
                </p>
              </div>
            </div>

            {/* Part 5: Real World Applications */}
            {lesson.real_world_applications && lesson.real_world_applications.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-xs text-emerald-500 font-bold">
                    5
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                    Real World Applications
                  </h3>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {lesson.real_world_applications.map((app, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-border-subtle bg-surface-elevated/60 p-3 text-xs text-content-secondary"
                    >
                      <span className="text-brand font-bold">✓</span>
                      <span>{app}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Part 6: Syntax & Core Concepts */}
          {lesson.syntax_or_core_concepts && (
            <Card variant="default" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-xs text-brand font-bold">
                  6
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                  Syntax Anatomy & Core Concepts
                </h3>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-elevated p-4">
                <MarkdownRenderer content={lesson.syntax_or_core_concepts} />
              </div>
            </Card>
          )}

          {/* Part 7: Examples */}
          {lesson.examples && lesson.examples.length > 0 && (
            <Card variant="default" className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-violet/10 text-xs text-accent-violet font-bold">
                  7
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent-violet">
                  Practical Applied Examples
                </h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {lesson.examples.map((ex, idx) => (
                  <Card key={idx} variant="elevated" className="p-5 space-y-3">
                    <h4 className="text-sm font-bold text-content-primary">
                      {ex.title}
                    </h4>
                    <p className="text-xs text-content-secondary leading-relaxed">
                      {ex.explanation}
                    </p>
                    {ex.code && (
                      <div className="pt-2">
                        <MarkdownRenderer content={`\`\`\`python\n${ex.code}\n\`\`\``} />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* Part 8: Common Mistakes */}
          {lesson.common_mistakes && lesson.common_mistakes.length > 0 && (
            <Card variant="default" className="p-6 sm:p-8 space-y-4 border-l-4 border-l-rose-500">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10 text-xs text-rose-500 font-bold">
                  8
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500">
                  Common Mistakes & Anti-Patterns
                </h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-content-secondary">
                {lesson.common_mistakes.map((mistake, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold">✗</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Part 9: Interactive Practice Challenges */}
          {lesson.interactive_practice && lesson.interactive_practice.length > 0 && (
            <Card variant="default" className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-cyan/10 text-xs text-accent-cyan font-bold">
                  9
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent-cyan">
                  Interactive Practice Challenges
                </h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {lesson.interactive_practice.map((prac, idx) => (
                  <Card key={idx} variant="elevated" className="p-5 space-y-3">
                    <h4 className="text-xs font-bold text-content-primary">
                      Challenge {idx + 1}: {prac.question}
                    </h4>
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleHint(idx)}
                        className="text-[11px] font-semibold text-brand hover:underline"
                      >
                        {expandedHints[idx] ? 'Hide Hint ▴' : 'Show Hint 💡'}
                      </button>
                      {expandedHints[idx] && (
                        <p className="mt-2 rounded-lg bg-brand-subtle p-2.5 text-xs text-content-secondary border border-brand-border">
                          {prac.hint}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* Part 10: Mini Quiz (5 MCQs) */}
          {quizList.length > 0 && (
            <Card variant="elevated" className="p-6 sm:p-8 space-y-6 shadow-elevated border-t-4 border-t-brand">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-xs text-brand font-bold">
                      10
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                      Mini Quiz (5 Checkpoint MCQs)
                    </h3>
                  </div>
                  <h4 className="mt-1 text-lg font-bold text-content-primary">
                    Verify Your Conceptual Mastery
                  </h4>
                </div>

                {submittedQuiz && (
                  <Badge variant={scorePercentage >= 60 ? 'success' : 'danger'} size="md">
                    Score: {correctCount}/{totalQuestions} ({scorePercentage}%)
                  </Badge>
                )}
              </div>

              {/* Quiz Questions List */}
              <div className="space-y-6">
                {quizList.map((q, qIdx) => {
                  const selectedOption = quizAnswers[qIdx];
                  const isCorrect = selectedOption === q.answer;

                  return (
                    <div key={qIdx} className="space-y-3 rounded-xl border border-border-subtle bg-surface p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                          Question {qIdx + 1}
                        </span>
                        {submittedQuiz && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              isCorrect
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-bold text-content-primary leading-relaxed">
                        {q.question}
                      </p>

                      {/* Options Grid */}
                      <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedOption === opt;
                          const isAnswer = opt === q.answer;

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={submittedQuiz}
                              onClick={() => handleOptionSelect(qIdx, opt)}
                              className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${
                                submittedQuiz
                                  ? isAnswer
                                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                                    : isSelected
                                    ? 'border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold'
                                    : 'border-border-subtle bg-surface-elevated/40 text-content-muted opacity-60'
                                  : isSelected
                                  ? 'border-brand bg-brand-subtle text-brand font-semibold ring-2 ring-brand'
                                  : 'border-border-subtle bg-surface hover:border-border hover:bg-surface-hover text-content-secondary'
                              }`}
                            >
                              <span>{opt}</span>
                              {submittedQuiz && isAnswer && <span>✓</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Reveal */}
                      {submittedQuiz && (
                        <div className="pt-2">
                          <ContentCallout
                            variant={isCorrect ? 'success' : 'info'}
                            title="Explanation"
                          >
                            {q.explanation}
                          </ContentCallout>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quiz Submit Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                <span className="text-xs text-content-muted">
                  {answeredCount} of {totalQuestions} answered
                </span>
                {!submittedQuiz ? (
                  <Button
                    variant="primary"
                    size="md"
                    disabled={answeredCount < totalQuestions}
                    onClick={handleQuizSubmit}
                  >
                    Submit Quiz Answers ✓
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={handleRetakeQuiz}>
                    Retake Quiz ↺
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Part 11: Assignment & Part 12: Mini Project */}
          <div className="grid gap-5 md:grid-cols-2">
            {lesson.assignment && (
              <Card variant="default" className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-xs text-brand font-bold">
                    11
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                    Engineering Assignment
                  </h3>
                </div>
                <h4 className="text-sm font-bold text-content-primary">
                  {lesson.assignment.title}
                </h4>
                <p className="text-xs text-content-secondary leading-relaxed">
                  {lesson.assignment.description}
                </p>
                {lesson.assignment.requirements && (
                  <ul className="space-y-1 pt-1 text-xs text-content-secondary">
                    {lesson.assignment.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-brand">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {lesson.mini_project && (
              <Card variant="default" className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-violet/10 text-xs text-accent-violet font-bold">
                    12
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent-violet">
                    Capstone Mini Project
                  </h3>
                </div>
                <h4 className="text-sm font-bold text-content-primary">
                  {lesson.mini_project.title}
                </h4>
                <p className="text-xs text-content-secondary leading-relaxed">
                  {lesson.mini_project.description}
                </p>
                {lesson.mini_project.requirements && (
                  <ul className="space-y-1 pt-1 text-xs text-content-secondary">
                    {lesson.mini_project.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-accent-violet">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>

          {/* Part 13: Related Topics & Part 14: Summary */}
          <div className="grid gap-5 md:grid-cols-2">
            {lesson.related_topics && lesson.related_topics.length > 0 && (
              <Card variant="default" className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-xs text-brand font-bold">
                    13
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                    Related Concepts & Next Topics
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {lesson.related_topics.map((rel, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectTopic(rel)}
                      className="rounded-lg border border-border-subtle bg-surface-elevated px-3 py-1 text-xs font-medium text-content-primary transition hover:border-brand hover:bg-brand-subtle hover:text-brand"
                    >
                      {rel} →
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {lesson.summary && (
              <Card variant="default" className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-xs text-emerald-500 font-bold">
                    14
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                    Summary & Takeaways
                  </h3>
                </div>
                <p className="text-xs text-content-secondary leading-relaxed">
                  {lesson.summary}
                </p>
                {lesson.next_topic && (
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-content-muted">
                      Recommended Next Mastery:
                    </span>
                    <p className="text-xs font-bold text-brand mt-0.5">
                      {lesson.next_topic}
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <PageContainer maxWidth="7xl" className="space-y-6 py-8">
          <div className="h-16 w-full animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-44 w-full animate-pulse rounded-2xl bg-surface-elevated" />
        </PageContainer>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
