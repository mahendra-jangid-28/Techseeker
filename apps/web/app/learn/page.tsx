'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
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
  const [error, setError] = useState<string | null>(null);

  // Code Editor & Execution states
  const [code, setCode] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<LessonSubmitResult | null>(null);

  // Progressive Hint Ladder state: 0 = none, 1 = hint1, 2 = hint2, 3 = hint3, 4 = solution
  const [revealedHintLevel, setRevealedHintLevel] = useState<number>(0);

  // Quiz states
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSubmitResult | null>(null);

  // Completion modal state
  const [isCompleting, setIsCompleting] = useState(false);
  const [showXpModal, setShowXpModal] = useState(false);
  const [nextModuleId, setNextModuleId] = useState<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        const roadmapData = await getUserRoadmap(token || undefined);
        setUserRoadmap(roadmapData);

        const paramModuleId = searchParams.get('module_id');
        let targetModuleId: number | null = paramModuleId ? parseInt(paramModuleId, 10) : null;

        if (!targetModuleId && roadmapData?.modules?.length) {
          // Find first unlocked or in-progress module
          const currentUnlocked = roadmapData.modules.find((m) => m.status === 'unlocked');
          targetModuleId = currentUnlocked ? currentUnlocked.id : roadmapData.modules[0].id;
        }

        // Fallback default module ID 1 if not assigned yet
        const finalModuleId = targetModuleId || 1;
        const lessonData = await getLesson(finalModuleId, token || undefined);

        setLesson(lessonData);
        setCode(lessonData.content.interactive_practice.starter_code);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson curriculum');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, searchParams]);

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

  function handleSelectQuizOption(questionId: number, option: string) {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId.toString()]: option,
    }));
  }

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
      setShowXpModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete module');
    } finally {
      setIsCompleting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-xs text-slate-500">
        Loading interactive lesson...
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-sm text-slate-400">Lesson not found or roadmap not initialized.</p>
        <Link
          href="/roadmap"
          className="rounded-xl bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950"
        >
          Select Career Roadmap →
        </Link>
      </main>
    );
  }

  const { content } = lesson;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-white sm:px-6 md:px-10">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-8">
        {/* Navigation & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/roadmap" className="hover:text-sky-300 transition">
              {userRoadmap?.title || 'Roadmap'}
            </Link>
            <span>/</span>
            <span className="text-sky-400 font-semibold">Module {lesson.lesson_order}: {lesson.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/roadmap"
              className="rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              All Modules ⇄
            </Link>
            <Link
              href="/mentor"
              className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/20 transition"
            >
              Ask AI Mentor ✦
            </Link>
          </div>
        </div>

        {/* 1. HERO & OBJECTIVE */}
        <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Interactive Lesson
            </span>
            <span className="text-xs text-slate-500">Module {lesson.lesson_order}</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            {content.title}
          </h1>

          <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
            {content.objective}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}
        </section>

        {/* 2. WHY LEARN & EXPLANATION */}
        <section className="grid gap-5 md:grid-cols-2">
          {/* Motivation card */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-6 backdrop-blur-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Why Learn This
            </span>
            <h2 className="mt-2 text-lg font-bold text-white">Engineering Relevance</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {content.why_learn}
            </p>
          </div>

          {/* Core Explanation card */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-6 backdrop-blur-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
              Core Concept
            </span>
            <h2 className="mt-2 text-lg font-bold text-white">How It Works</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {content.explanation}
            </p>
          </div>
        </section>

        {/* 3. SYNTAX & EXAMPLES */}
        <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Syntax Guide
            </span>
            <h2 className="mt-1 text-xl font-bold text-white">Code Anatomy & Patterns</h2>
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-black/40 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              <pre>{content.syntax}</pre>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 pt-2">
            {content.examples.map((ex, idx) => (
              <div key={idx} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-bold text-sky-300">{ex.title}</h3>
                <p className="mt-1 text-xs text-slate-400">{ex.explanation}</p>
                <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/50 p-3 font-mono text-xs text-slate-200 overflow-x-auto">
                  <pre>{ex.code}</pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. INTERACTIVE PRACTICE & EMBEDDED MONACO CODE RUNNER */}
        <section className="rounded-3xl border border-sky-500/20 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-sky-400">
                Interactive Challenge
              </span>
              <h2 className="mt-2 text-xl font-bold text-white">Write & Run Your Code</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCode(content.interactive_practice.starter_code)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                Reset Starter Code ↺
              </button>
            </div>
          </div>

          {/* Prompt card */}
          <div className="rounded-2xl border border-sky-400/10 bg-sky-500/[0.05] p-4">
            <p className="text-xs leading-relaxed text-slate-200">
              <strong className="text-sky-300">Prompt: </strong>
              {content.interactive_practice.prompt}
            </p>
            <div className="mt-2 text-xs font-mono text-slate-400">
              <strong className="text-slate-300">Expected Output: </strong>
              <span className="text-emerald-400 font-semibold">{content.interactive_practice.expected_output}</span>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[#1e1e1e] shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#252526] px-4 py-2 text-xs">
              <span className="font-mono text-slate-400">
                solution.{content.interactive_practice.language === 'python' ? 'py' : 'js'}
              </span>
              <span className="text-[11px] text-slate-500">Auto-validating code runner</span>
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

          {/* Run Code Control & Console Output */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={isExecuting}
                onClick={handleRunCode}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              >
                <span>{isExecuting ? 'Running & Validating...' : '▶ Run & Validate Code'}</span>
              </button>

              {execResult?.passed && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  Challenge Solved ✓ (+30 XP)
                </span>
              )}
            </div>

            {/* Console Output Box */}
            {execResult && (
              <div
                className={`rounded-2xl border p-4 font-mono text-xs transition-all ${
                  execResult.passed
                    ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                    : 'border-red-500/30 bg-red-950/20 text-red-300'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="font-bold">
                    {execResult.passed ? '✓ Output Passed (100/100)' : '✗ Output Mismatch (0/100)'}
                  </span>
                  <span className="text-[10px] opacity-70">
                    {execResult.passed ? 'All test conditions met' : 'Inspect feedback below'}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="font-sans text-xs">{execResult.feedback}</p>
                  <div>
                    <span className="text-slate-400">Actual Output: </span>
                    <pre className="mt-1 rounded bg-black/40 p-2 text-white overflow-x-auto">
                      {execResult.actual_output || '(no stdout produced)'}
                    </pre>
                  </div>
                  {execResult.error && (
                    <div>
                      <span className="text-red-400">Error: </span>
                      <pre className="mt-1 rounded bg-black/40 p-2 text-red-300 overflow-x-auto">
                        {execResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. PROGRESSIVE AI HINT LADDER */}
          <div className="pt-4 border-t border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Progressive AI Hint Ladder</h3>
                <p className="text-[11px] text-slate-400">
                  Unlock progressive clues without spoiling the solution immediately.
                </p>
              </div>

              {revealedHintLevel < 4 && (
                <button
                  type="button"
                  onClick={unlockNextHint}
                  className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-3.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/20 transition"
                >
                  {revealedHintLevel === 0
                    ? '💡 Reveal Hint 1 (Direction)'
                    : revealedHintLevel === 1
                    ? '💡 Reveal Hint 2 (Logic)'
                    : revealedHintLevel === 2
                    ? '💡 Reveal Hint 3 (Partial Code)'
                    : '🔓 Reveal Final Solution'}
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {revealedHintLevel >= 1 && (
                <div className="rounded-xl border border-sky-400/20 bg-sky-400/[0.05] p-3.5 text-xs">
                  <span className="font-bold text-sky-300">Hint 1 (Direction): </span>
                  <span className="text-slate-300">{content.hints.hint_1}</span>
                </div>
              )}

              {revealedHintLevel >= 2 && (
                <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.05] p-3.5 text-xs">
                  <span className="font-bold text-violet-300">Hint 2 (Logic): </span>
                  <span className="text-slate-300">{content.hints.hint_2}</span>
                </div>
              )}

              {revealedHintLevel >= 3 && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3.5 text-xs">
                  <span className="font-bold text-amber-300">Hint 3 (Partial Code): </span>
                  <span className="text-slate-300">{content.hints.hint_3}</span>
                </div>
              )}

              {revealedHintLevel >= 4 && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4 text-xs font-mono">
                  <div className="font-sans font-bold text-emerald-300 pb-2">Final Solution:</div>
                  <pre className="text-slate-200 overflow-x-auto">{content.hints.final_solution}</pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 6. QUIZ SECTION */}
        <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl sm:p-8 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-violet-300">
                Concept Checkpoint
              </span>
              <h2 className="mt-2 text-xl font-bold text-white">Module Knowledge Quiz</h2>
            </div>

            {quizResult && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  quizResult.passed
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                    : 'border-red-400/30 bg-red-400/10 text-red-300'
                }`}
              >
                Score: {quizResult.score}/{quizResult.total} ({quizResult.percentage}%)
              </span>
            )}
          </div>

          <div className="space-y-6">
            {content.quiz.map((q, qIdx) => {
              const selected = quizAnswers[q.id.toString()];
              const qResult = quizResult?.results.find((r) => r.question_id === q.id);

              return (
                <div key={q.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-200">
                    <span className="text-sky-400 mr-2">{qIdx + 1}.</span>
                    {q.question}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => {
                      const isSelected = selected === opt;
                      const isCorrect = qResult?.correct_answer === opt;
                      const isWrong = isSelected && qResult && !qResult.is_correct;

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectQuizOption(q.id, opt)}
                          className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${
                            isCorrect && quizResult
                              ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 font-semibold'
                              : isWrong
                              ? 'border-red-400/40 bg-red-500/15 text-red-300'
                              : isSelected
                              ? 'border-sky-400 bg-sky-500/15 text-white font-medium'
                              : 'border-white/[0.08] bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{opt}</span>
                          {isCorrect && quizResult && <span className="text-emerald-400 font-bold">✓</span>}
                          {isWrong && <span className="text-red-400 font-bold">✗</span>}
                        </button>
                      );
                    })}
                  </div>

                  {qResult && (
                    <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs text-slate-400">
                      <strong className="text-slate-300">Explanation: </strong>
                      {qResult.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={isSubmittingQuiz || Object.keys(quizAnswers).length === 0}
              onClick={handleSubmitQuiz}
              className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmittingQuiz ? 'Grading Quiz...' : 'Submit Quiz Answers'}
            </button>
          </div>
        </section>

        {/* 7. ASSIGNMENT & COMPLETE MODULE */}
        <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-6 backdrop-blur-xl sm:p-8 space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
              Module Capstone
            </span>
            <h2 className="mt-1 text-xl font-bold text-white">{content.assignment.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {content.assignment.description}
            </p>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-300">Key Requirements:</p>
              <ul className="grid gap-2 sm:grid-cols-2 text-xs text-slate-400">
                {content.assignment.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">▸</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.08] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Ready to progress?</h3>
              <p className="text-xs text-slate-400">
                Completing this module records your progress and auto-unlocks the next milestone.
              </p>
            </div>

            <button
              type="button"
              disabled={isCompleting}
              onClick={handleCompleteModule}
              className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 px-7 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-50"
            >
              {isCompleting ? 'Completing Module...' : 'Complete Module & Unlock Next (+25 XP) ✓'}
            </button>
          </div>
        </section>
      </div>

      {/* XP CELEBRATION MODAL */}
      {showXpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-sky-400/30 bg-slate-950 p-8 text-center shadow-2xl shadow-sky-500/20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-3xl font-bold text-slate-950 shadow-lg shadow-sky-500/30">
              🎉
            </div>

            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
              +25 XP Earned
            </span>

            <h2 className="mt-4 text-2xl font-bold text-white">Module Completed!</h2>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Congratulations! You have mastered Module {lesson.lesson_order} ({lesson.title}). Your next module has been unlocked.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {nextModuleId ? (
                <Link
                  href={`/learn?module_id=${nextModuleId}`}
                  onClick={() => setShowXpModal(false)}
                  className="w-full rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 py-3 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/20 hover:opacity-90 transition"
                >
                  Start Next Module →
                </Link>
              ) : (
                <Link
                  href="/roadmap"
                  onClick={() => setShowXpModal(false)}
                  className="w-full rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 py-3 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/20 hover:opacity-90 transition"
                >
                  View Career Roadmap →
                </Link>
              )}

              <button
                type="button"
                onClick={() => setShowXpModal(false)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition"
              >
                Stay on Current Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-xs text-slate-500">
          Loading learning workspace...
        </main>
      }
    >
      <LearnContent />
    </Suspense>
  );
}