'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import {
  PageContainer,
  PageHeader,
  Button,
  Card,
  Badge,
  ProgressBar,
  ContentCallout,
  CodeBlock,
} from '@techseeker/ui';
import {
  getLesson,
  submitLessonCode,
  submitLessonQuiz,
  type LessonDetail,
  type LessonSubmitResult,
  type QuizSubmitResult,
} from '../../lib/api/lessons';
import {
  completeModule,
  getUserRoadmap,
  type UserRoadmapDetail,
} from '../../lib/api/roadmap';
import { getToken } from '../../lib/api/auth';

function LearnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [userRoadmap, setUserRoadmap] = useState<UserRoadmapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModuleSwitching, setIsModuleSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInitialMountRef = useRef(true);

  // Code Editor & Execution states (Hands-on Challenge)
  const [code, setCode] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<LessonSubmitResult | null>(null);

  // Progressive Hint Ladder state: 0 = none, 1 = hint1, 2 = hint2, 3 = hint3, 4 = solution
  const [revealedHintLevel, setRevealedHintLevel] = useState<number>(0);

  // Checkpoint Quiz states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [shuffledOptions, setShuffledOptions] = useState<Record<number, string[]>>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSubmitResult | null>(null);

  // Completion modal state
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [nextModuleId, setNextModuleId] = useState<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        if (!isInitialMountRef.current) {
          setIsModuleSwitching(true);
          setQuizResult(null);
          setQuizAnswers({});
          setCurrentQuestionIndex(0);
          setExecResult(null);
          setRevealedHintLevel(0);
        } else {
          isInitialMountRef.current = false;
        }

        const roadmapData = await getUserRoadmap(token || undefined);
        setUserRoadmap(roadmapData);

        const paramModuleId = searchParams.get('module_id');
        let targetModuleId: number | null = paramModuleId ? parseInt(paramModuleId, 10) : null;

        if (!targetModuleId && roadmapData?.modules?.length) {
          // Find first unlocked or in-progress module
          const currentUnlocked = roadmapData.modules.find((m) => m.status === 'unlocked');
          targetModuleId = currentUnlocked ? currentUnlocked.id : roadmapData.modules[0].id;
        }

        const finalModuleId = targetModuleId || 1;
        const lessonData = await getLesson(finalModuleId, token || undefined);

        setLesson(lessonData);
        setCode(lessonData.content.interactive_practice?.starter_code || '');

        // Shuffle quiz options ONCE per session upon loading lesson
        if (lessonData.content?.quiz) {
          const optionMap: Record<number, string[]> = {};
          lessonData.content.quiz.forEach((q) => {
            const arr = [...q.options];
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            optionMap[q.id] = arr;
          });
          setShuffledOptions(optionMap);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson curriculum');
      } finally {
        setLoading(false);
        setIsModuleSwitching(false);
      }
    }

    loadData();
  }, [router, searchParams]);

  // Handle Coding Challenge Run
  async function handleRunCode() {
    if (!lesson) return;
    setIsExecuting(true);
    setError(null);
    try {
      const result = await submitLessonCode(
        lesson.id,
        code,
        lesson.content.interactive_practice.language || 'python',
      );
      setExecResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code execution failed');
    } finally {
      setIsExecuting(false);
    }
  }

  function unlockNextHint() {
    setRevealedHintLevel((prev) => Math.min(4, prev + 1));
  }

  // Handle Quiz Option Selection (disabled in review mode)
  function handleSelectQuizOption(questionId: number, option: string) {
    if (quizResult) return; // Prevent changing answers during review mode
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId.toString()]: option,
    }));
  }

  // Handle Quiz Submission
  async function handleSubmitQuiz() {
    if (!lesson) return;
    setIsSubmittingQuiz(true);
    setError(null);
    try {
      const result = await submitLessonQuiz(lesson.id, quizAnswers);
      setQuizResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz submission failed');
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  // Handle Retake Assessment
  function handleRetakeAssessment() {
    setQuizAnswers({});
    setQuizResult(null);
    setCurrentQuestionIndex(0);
    setError(null);
  }

  // Handle Roadmap Module Completion
  async function handleCompleteModule() {
    if (!lesson) return;
    setIsCompleting(true);
    setError(null);
    try {
      const updatedRoadmap = await completeModule(lesson.roadmap_module_id);
      setUserRoadmap(updatedRoadmap);

      // Find next unlocked module if available
      const nextMod = updatedRoadmap.modules.find(
        (m) => m.order_index === lesson.lesson_order + 1,
      );
      setNextModuleId(nextMod ? nextMod.id : null);
      setShowCompletionModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete module');
    } finally {
      setIsCompleting(false);
    }
  }

  if (loading) {
    return (
      <PageContainer maxWidth="7xl" className="space-y-6">
        <div className="h-16 w-full animate-pulse rounded-xl bg-surface-elevated" />
        <div className="h-44 w-full animate-pulse rounded-2xl bg-surface-elevated" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-36 animate-pulse rounded-2xl bg-surface-elevated" />
          <div className="h-36 animate-pulse rounded-2xl bg-surface-elevated" />
        </div>
        <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-elevated" />
      </PageContainer>
    );
  }

  if (!lesson) {
    return (
      <PageContainer maxWidth="5xl" className="py-16 text-center">
        <Card variant="elevated" className="p-8 sm:p-12 space-y-4">
          <span className="text-3xl">📚</span>
          <h2 className="text-xl font-bold text-content-primary">
            Curriculum Not Found
          </h2>
          <p className="text-xs sm:text-sm text-content-secondary max-w-md mx-auto">
            We could not locate an active lesson for this module or your roadmap has not been selected yet.
          </p>
          <div className="pt-2">
            <Link href="/roadmap">
              <Button variant="primary" size="md">
                Select Career Roadmap →
              </Button>
            </Link>
          </div>
        </Card>
      </PageContainer>
    );
  }

  const { content } = lesson;
  const quizList = content.quiz || [];
  const totalQuestions = quizList.length;
  const answeredCount = Object.keys(quizAnswers).length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const currentQuestion = quizList[currentQuestionIndex] || quizList[0];

  return (
    <PageContainer maxWidth="7xl" className="relative min-h-screen space-y-8">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-subtle blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent-violet/10 blur-3xl" />
      </div>

      {/* BREADCRUMB & MODULE TRACKER */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2 text-xs text-content-secondary">
            <Link href="/roadmap" className="hover:text-brand transition font-medium">
              {userRoadmap?.title || 'Career Roadmap'}
            </Link>
            <span className="text-content-muted">/</span>
            <span className="text-brand font-semibold">
              Module {lesson.lesson_order}: {lesson.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/roadmap">
              <Button variant="secondary" size="sm">
                All Modules ⇄
              </Button>
            </Link>
            <Link href="/mentor">
              <Button variant="primary" size="sm" rightIcon={<span>✦</span>}>
                Ask AI Mentor
              </Button>
            </Link>
          </div>
        </div>

        {/* Module Switcher Tabs */}
        {userRoadmap?.modules && userRoadmap.modules.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
            {userRoadmap.modules.map((mod) => {
              const isCurrent = mod.id === lesson.roadmap_module_id || mod.order_index === lesson.lesson_order;
              const isDone = mod.status === 'completed';
              const isLocked = mod.status === 'locked';

              return (
                <Link
                  key={mod.id}
                  href={isLocked ? '#' : `/learn?module_id=${mod.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shrink-0 transition-all ${
                    isCurrent
                      ? 'bg-brand text-content-inverse font-bold shadow-subtle'
                      : isDone
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      : isLocked
                      ? 'bg-surface-elevated text-content-muted opacity-60 cursor-not-allowed'
                      : 'bg-surface border border-border-subtle text-content-secondary hover:bg-surface-hover hover:text-content-primary'
                  }`}
                  aria-disabled={isLocked}
                >
                  <span>{isDone ? '✓' : `M${mod.order_index}`}</span>
                  <span className="truncate max-w-[140px]">{mod.title}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Localized Module Transition Feedback */}
        {isModuleSwitching && (
          <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-subtle/30 px-3.5 py-2.5 text-xs text-brand animate-pulse">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <span className="font-semibold">Loading module curriculum & challenge...</span>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 1 — LEARN: CORE CONCEPTS & SYNTAX REFERENCE     */}
      {/* ======================================================== */}
      <section className="space-y-6">
        <PageHeader
          title={content.title}
          description={content.objective}
          badge={
            <Badge variant="primary" size="sm">
              Module {lesson.lesson_order} • Concept Foundations
            </Badge>
          }
        />

        {error && (
          <ContentCallout variant="danger" title="System Notice">
            {error}
          </ContentCallout>
        )}

        {/* Dual Core Cards: Why Learn & How It Works */}
        <div className="grid gap-5 md:grid-cols-2">
          <Card variant="default" className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-xs text-brand font-bold">
                ✦
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand">
                Why Learn This — Engineering Relevance
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
              {content.why_learn}
            </p>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-violet/10 text-xs text-accent-violet font-bold">
                ⚙
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-accent-violet">
                Core Concept & Architectural Mechanics
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
              {content.explanation}
            </p>
          </Card>
        </div>

        {/* Syntax & Practical Examples */}
        {(content.syntax || (content.examples && content.examples.length > 0)) && (
          <Card variant="default" className="p-6 sm:p-7 space-y-6">
            {content.syntax && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Syntax Anatomy
                </span>
                <h3 className="text-sm font-bold text-content-primary">
                  Code Structure & Usage Patterns
                </h3>
                <CodeBlock
                  code={content.syntax}
                  language={content.interactive_practice?.language || 'python'}
                  title="Syntax Reference"
                />
              </div>
            )}

            {content.examples && content.examples.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent-violet">
                  Practical Applied Examples
                </span>
                <div className="grid gap-4 md:grid-cols-2">
                  {content.examples.map((ex, idx) => (
                    <Card key={idx} variant="elevated" className="p-5 space-y-2">
                      <h4 className="text-xs sm:text-sm font-bold text-content-primary">
                        {ex.title}
                      </h4>
                      <p className="text-xs text-content-secondary leading-relaxed">
                        {ex.explanation}
                      </p>
                      {ex.code && (
                        <div className="pt-2">
                          <CodeBlock
                            code={ex.code}
                            language={content.interactive_practice?.language || 'python'}
                            title={ex.title}
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </section>

      {/* ======================================================== */}
      {/* SECTION 2 — ASSESS: CHECKPOINT CONCEPT ASSESSMENT        */}
      {/* ======================================================== */}
      {totalQuestions > 0 && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-xs text-brand font-bold">
                  ✓
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand">
                  Checkpoint Assessment
                </h2>
              </div>
              <h3 className="mt-1 text-lg font-bold text-content-primary">
                Conceptual Knowledge Verification
              </h3>
              <p className="text-xs text-content-secondary">
                Test your conceptual understanding before writing solution code.
              </p>
            </div>

            {/* Assessment Progress Status */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-xs font-semibold text-content-primary">
                  {quizResult
                    ? `Score: ${quizResult.score}/${quizResult.total} (${quizResult.percentage}%)`
                    : `${answeredCount} of ${totalQuestions} Answered`}
                </span>
                <div className="w-32 mt-1">
                  <ProgressBar
                    value={quizResult ? quizResult.percentage : (answeredCount / totalQuestions) * 100}
                    max={100}
                    size="xs"
                    variant={quizResult ? (quizResult.passed ? 'success' : 'amber') : 'brand'}
                  />
                </div>
              </div>

              {quizResult && (
                <Badge
                  variant={quizResult.passed ? 'success' : 'danger'}
                  size="md"
                >
                  {quizResult.passed ? '✓ PASSED' : 'REVIEW REQUIRED'}
                </Badge>
              )}
            </div>
          </div>

          {/* Question Navigation Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
            <span className="text-xs text-content-muted font-semibold mr-1 shrink-0">
              Questions:
            </span>
            {quizList.map((q, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              const hasAnswered = !!quizAnswers[q.id.toString()];
              const qRes = quizResult?.results.find((r) => r.question_id === q.id);

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  aria-label={`Go to question ${idx + 1}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                    isCurrent
                      ? 'border-brand bg-brand-subtle text-brand ring-2 ring-brand/30 shadow-subtle'
                      : quizResult
                      ? qRes?.is_correct
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : hasAnswered
                      ? 'border-brand-border bg-surface text-brand font-semibold'
                      : 'border-border-subtle bg-surface text-content-muted hover:bg-surface-hover hover:text-content-primary'
                  }`}
                >
                  {quizResult ? (qRes?.is_correct ? '✓' : '✗') : idx + 1}
                </button>
              );
            })}
          </div>

          {/* Focused Question Card */}
          {currentQuestion && (
            <Card variant="elevated" className="p-6 sm:p-8 space-y-6 shadow-elevated">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>

                {quizResult && (
                  <Badge
                    variant={
                      quizResult.results.find((r) => r.question_id === currentQuestion.id)?.is_correct
                        ? 'success'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {quizResult.results.find((r) => r.question_id === currentQuestion.id)?.is_correct
                      ? '✓ Correct Answer'
                      : '✗ Incorrect'}
                  </Badge>
                )}
              </div>

              {/* Question Text */}
              <h4 className="text-base sm:text-lg font-bold text-content-primary leading-relaxed">
                {currentQuestion.question}
              </h4>

              {/* Radio Card Options */}
              <div
                role="radiogroup"
                aria-label={`Options for Question ${currentQuestionIndex + 1}`}
                className="grid gap-3 sm:grid-cols-2"
              >
                {(shuffledOptions[currentQuestion.id] || currentQuestion.options).map((opt) => {
                  const selected = quizAnswers[currentQuestion.id.toString()] === opt;
                  const qRes = quizResult?.results.find((r) => r.question_id === currentQuestion.id);
                  const isCorrect = qRes?.correct_answer === opt;
                  const isWrong = selected && qRes && !qRes.is_correct;

                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!!quizResult}
                      onClick={() => handleSelectQuizOption(currentQuestion.id, opt)}
                      className={`group flex items-center justify-between rounded-xl border p-4 text-left text-xs transition-all duration-150 ${
                        quizResult
                          ? isCorrect
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold cursor-default'
                            : isWrong
                            ? 'border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold cursor-default'
                            : 'border-border-subtle bg-surface-elevated/40 text-content-muted opacity-60 cursor-default'
                          : selected
                          ? 'border-brand bg-brand-subtle text-brand font-semibold ring-2 ring-brand shadow-subtle cursor-pointer'
                          : 'border-border-subtle bg-surface text-content-secondary hover:border-border hover:bg-surface-hover hover:text-content-primary cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Radio Dot Indicator */}
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                            quizResult
                              ? isCorrect
                                ? 'border-emerald-500 bg-emerald-500 text-white text-[10px]'
                                : isWrong
                                ? 'border-rose-500 bg-rose-500 text-white text-[10px]'
                                : 'border-border-subtle'
                              : selected
                              ? 'border-brand bg-brand text-content-inverse'
                              : 'border-border-subtle group-hover:border-border'
                          }`}
                        >
                          {quizResult ? (
                            isCorrect ? '✓' : isWrong ? '✗' : null
                          ) : selected ? (
                            <div className="h-1.5 w-1.5 rounded-full bg-current" />
                          ) : null}
                        </div>
                        <span className="leading-relaxed">{opt}</span>
                      </div>

                      {/* Post-submission result badge */}
                      {quizResult && isCorrect && (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 shrink-0">
                          ✓ Correct Answer
                        </span>
                      )}
                      {quizResult && isWrong && (
                        <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 shrink-0">
                          ✗ Your Answer
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Per-Question Explanation (Post-Submission) */}
              {quizResult && (
                <div className="pt-2">
                  <ContentCallout
                    variant={
                      quizResult.results.find((r) => r.question_id === currentQuestion.id)?.is_correct
                        ? 'success'
                        : 'info'
                    }
                    title="Technical Concept Explanation"
                  >
                    {quizResult.results.find((r) => r.question_id === currentQuestion.id)?.explanation ||
                      currentQuestion.explanation}
                  </ContentCallout>
                </div>
              )}

              {/* Card Navigation & Submission Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  >
                    ← Previous
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  >
                    Next →
                  </Button>
                </div>

                <div className="flex items-center gap-2.5">
                  {!quizResult ? (
                    <Button
                      variant="primary"
                      size="md"
                      disabled={isSubmittingQuiz || !allAnswered}
                      isLoading={isSubmittingQuiz}
                      onClick={handleSubmitQuiz}
                      className="px-6 font-bold shadow-subtle"
                    >
                      {isSubmittingQuiz
                        ? 'Evaluating Assessment...'
                        : allAnswered
                        ? 'Submit Assessment Answers ✓'
                        : `Answer All Questions (${answeredCount}/${totalQuestions})`}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRetakeAssessment}
                      className="text-xs font-semibold"
                    >
                      Retake Assessment ↺
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Score Intelligence Summary Panel (Post-Submission) */}
          {quizResult && (
            <Card
              variant={quizResult.passed ? 'selected' : 'default'}
              className="p-6 sm:p-7 space-y-4 animate-fade-in"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
                    Assessment Evaluation Report
                  </span>
                  <h3 className="text-xl font-bold text-content-primary mt-1">
                    {quizResult.passed ? 'Conceptual Mastery Verified' : 'Conceptual Review Recommended'}
                  </h3>
                  <p className="text-xs text-content-secondary mt-1">
                    {quizResult.summary_explanation}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center sm:text-right">
                    <div className="text-2xl font-bold font-mono text-content-primary">
                      {quizResult.score} / {quizResult.total}
                    </div>
                    <span className="text-xs font-semibold text-brand">
                      {quizResult.percentage}% Score
                    </span>
                  </div>

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-lg ${
                      quizResult.passed
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {quizResult.passed ? '✓' : '✗'}
                  </div>
                </div>
              </div>

              {/* XP Feedback & Mastery Guidance */}
              {quizResult.passed ? (
                <ContentCallout variant="success" title="+20 XP Earned" icon="⭐">
                  <p>
                    Assessment passed successfully! Your verified learning progress and streak have been recorded in the command center.
                  </p>
                </ContentCallout>
              ) : (
                <ContentCallout variant="warning" title="Concept Solidification Required" icon="💡">
                  <p>
                    Your assessment score was below the 60% passing threshold. Inspect the technical explanations for the questions above, review the syntax reference, and click <span className="font-semibold">Retake Assessment</span> to try again.
                  </p>
                </ContentCallout>
              )}
            </Card>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* SECTION 3 — APPLY: HANDS-ON CHALLENGE & CAPSTONE         */}
      {/* ======================================================== */}
      {content.interactive_practice && (
        Boolean(content.interactive_practice.starter_code?.trim() || content.interactive_practice.expected_output?.trim()) ? (
          /* Coding Challenge Execution Box */
          <Card variant="elevated" className="p-6 sm:p-8 space-y-6 shadow-elevated">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4">
              <div>
                <Badge variant="primary" size="sm">
                  Apply Concept
                </Badge>
                <h2 className="mt-2 text-xl font-bold text-content-primary">
                  Hands-on Code Challenge
                </h2>
                <p className="text-xs text-content-secondary mt-0.5">
                  Implement working code in the sandbox to verify practical output.
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCode(content.interactive_practice.starter_code)}
              >
                Reset Starter Code ↺
              </Button>
            </div>

            {/* Prompt Callout */}
            <ContentCallout variant="info" title="Challenge Prompt">
              <p>{content.interactive_practice.prompt}</p>
              {content.interactive_practice.expected_output && (
                <div className="mt-2 pt-2 border-t border-brand-border/40 font-mono text-[11px]">
                  <span className="text-content-secondary">Expected Output: </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {content.interactive_practice.expected_output}
                  </span>
                </div>
              )}
            </ContentCallout>

            {/* Monaco Editor Frame */}
            <div className="overflow-hidden rounded-xl border border-border-default bg-surface shadow-subtle">
              <div className="flex items-center justify-between border-b border-border-subtle bg-surface-elevated px-4 py-2 text-xs">
                <span className="font-mono text-content-secondary">
                  solution.{content.interactive_practice.language === 'python' ? 'py' : 'js'}
                </span>
                <span className="text-[11px] text-content-muted">Monaco Sandbox</span>
              </div>
              <Editor
                height="280px"
                language={content.interactive_practice.language || 'python'}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                }}
              />
            </div>

            {/* Run Code Control & Output Panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="primary"
                  size="md"
                  disabled={isExecuting}
                  isLoading={isExecuting}
                  onClick={handleRunCode}
                  className="px-6 font-bold"
                >
                  {isExecuting ? 'Running Code...' : '▶ Run & Validate Code'}
                </Button>

                {execResult?.passed && (
                  <Badge variant="success" size="md">
                    Output Passed (100/100) ✓
                  </Badge>
                )}
              </div>

              {/* Console Output Display */}
              {execResult && (
                <div
                  className={`rounded-xl border p-4 font-mono text-xs transition-all ${
                    execResult.passed
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle font-sans">
                    <span className="font-bold">
                      {execResult.passed ? '✓ Output Passed (+30 XP)' : '✗ Output Mismatch (0/100)'}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {execResult.passed ? 'All conditions satisfied' : 'Inspect feedback below'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 font-sans">
                    <p className="text-xs">{execResult.feedback}</p>
                    {execResult.actual_output && (
                      <div>
                        <span className="text-[11px] font-semibold text-content-secondary">
                          Actual stdout:
                        </span>
                        <pre className="mt-1 rounded-lg bg-surface p-2.5 font-mono text-xs text-content-primary overflow-x-auto border border-border-subtle">
                          {execResult.actual_output}
                        </pre>
                      </div>
                    )}
                    {execResult.error && (
                      <div>
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          Execution Error:
                        </span>
                        <pre className="mt-1 rounded-lg bg-surface p-2.5 font-mono text-xs text-rose-600 dark:text-rose-400 overflow-x-auto border border-rose-500/20">
                          {execResult.error}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Progressive AI Hint Ladder */}
            {content.hints && (
              <div className="pt-4 border-t border-border-subtle space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-content-primary">
                      Progressive AI Hint Ladder
                    </h3>
                    <p className="text-[11px] text-content-secondary">
                      Reveal progressive clues dynamically without spoiling the final answer.
                    </p>
                  </div>

                  {revealedHintLevel < 4 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={unlockNextHint}
                      className="text-xs"
                    >
                      {revealedHintLevel === 0
                        ? '💡 Reveal Hint 1 (Direction)'
                        : revealedHintLevel === 1
                        ? '💡 Reveal Hint 2 (Logic)'
                        : revealedHintLevel === 2
                        ? '💡 Reveal Hint 3 (Partial Code)'
                        : '🔓 Reveal Final Solution'}
                    </Button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {revealedHintLevel >= 1 && content.hints.hint_1 && (
                    <ContentCallout variant="info" title="Hint 1 — Directional Cue">
                      {content.hints.hint_1}
                    </ContentCallout>
                  )}

                  {revealedHintLevel >= 2 && content.hints.hint_2 && (
                    <ContentCallout variant="warning" title="Hint 2 — Algorithmic Logic">
                      {content.hints.hint_2}
                    </ContentCallout>
                  )}

                  {revealedHintLevel >= 3 && content.hints.hint_3 && (
                    <ContentCallout variant="neutral" title="Hint 3 — Partial Code Structure">
                      {content.hints.hint_3}
                    </ContentCallout>
                  )}

                  {revealedHintLevel >= 4 && content.hints.final_solution && (
                    <ContentCallout variant="success" title="Final Reference Solution">
                      <pre className="mt-1 font-mono text-xs text-content-primary overflow-x-auto">
                        {content.hints.final_solution}
                      </pre>
                    </ContentCallout>
                  )}
                </div>
              </div>
            )}
          </Card>
        ) : (
          /* Conceptual Reflection Box */
          <Card variant="default" className="p-6 sm:p-8 space-y-4">
            <Badge variant="neutral" size="sm">
              Conceptual Practice
            </Badge>
            <h2 className="text-xl font-bold text-content-primary">
              Knowledge Check & Reflection
            </h2>
            <ContentCallout variant="info" title="Reflection Question">
              {content.interactive_practice.prompt}
            </ContentCallout>
          </Card>
        )
      )}

      {/* Capstone Assignment & Module Completion */}
      {content.assignment && (
        <Card variant="default" className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent-amber">
              Capstone Assignment
            </span>
            <h2 className="text-xl font-bold text-content-primary">
              {content.assignment.title}
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
              {content.assignment.description}
            </p>

            {content.assignment.requirements && content.assignment.requirements.length > 0 && (
              <div className="mt-4 space-y-2 pt-2">
                <p className="text-xs font-semibold text-content-primary">Requirements Checklist:</p>
                <ul className="grid gap-2 sm:grid-cols-2 text-xs text-content-secondary">
                  {content.assignment.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-brand font-bold">▸</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-border-subtle flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-content-primary">
                Ready to record module milestone?
              </h3>
              <p className="text-xs text-content-secondary">
                Completing this module records progress in your career roadmap and awards +25 XP.
              </p>
            </div>

            <Button
              variant="success"
              size="lg"
              disabled={isCompleting}
              isLoading={isCompleting}
              onClick={handleCompleteModule}
              className="font-bold text-xs"
            >
              {isCompleting ? 'Recording...' : 'Complete Module & Unlock Next ✓'}
            </Button>
          </div>
        </Card>
      )}

      {/* COMPLETION SUCCESS MODAL */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card variant="elevated" className="relative w-full max-w-md p-8 text-center shadow-elevated border-brand space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-subtle text-2xl text-brand">
              🎉
            </div>

            <Badge variant="success" size="md">
              Module Completed
            </Badge>

            <h2 className="text-xl font-bold text-content-primary">
              Milestone Reached!
            </h2>

            <p className="text-xs text-content-secondary leading-relaxed">
              You have completed Module {lesson.lesson_order} ({lesson.title}). Your roadmap progress and streak have been recorded.
            </p>

            <div className="pt-4 flex flex-col gap-2.5">
              {nextModuleId ? (
                <Link
                  href={`/learn?module_id=${nextModuleId}`}
                  onClick={() => setShowCompletionModal(false)}
                >
                  <Button variant="primary" size="md" className="w-full font-bold">
                    Start Next Module →
                  </Button>
                </Link>
              ) : (
                <Link
                  href="/roadmap"
                  onClick={() => setShowCompletionModal(false)}
                >
                  <Button variant="primary" size="md" className="w-full font-bold">
                    View Career Roadmap →
                  </Button>
                </Link>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompletionModal(false)}
                className="w-full text-xs text-content-secondary"
              >
                Stay on Current Lesson
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <PageContainer maxWidth="7xl" className="space-y-6">
          <div className="h-16 w-full animate-pulse rounded-xl bg-surface-elevated" />
          <div className="h-44 w-full animate-pulse rounded-2xl bg-surface-elevated" />
        </PageContainer>
      }
    >
      <LearnContent />
    </Suspense>
  );
}