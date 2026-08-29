'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { Button, Input } from '@techseeker/ui';
import { login, loginWithGoogle, register, saveToken } from '../../lib/api/auth';

function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </svg>
  );
}

function CodeBranchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" x2="6" y1="3" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function TerminalIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialMode = searchParams.get('mode');
    if (initialMode === 'register') {
      setMode('register');
    } else {
      setMode('login');
    }
  }, [searchParams]);

  function switchMode(newMode: 'login' | 'register') {
    setMode(newMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleGoogleSuccess(credential: string) {
    setError(null);
    setLoading(true);

    try {
      const authResponse = await loginWithGoogle(credential);
      saveToken(authResponse.access_token || authResponse.token || '');
      router.push('/mentor' as Route);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (mode === 'register') {
      if (!trimmedName) {
        setError('Please enter your full name');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setLoading(true);

      try {
        await register(trimmedEmail, trimmedName, password);
        const authResponse = await login(trimmedEmail, password);
        saveToken(authResponse.access_token || authResponse.token || '');
        router.push('/mentor' as Route);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);

      try {
        const authResponse = await login(trimmedEmail, password);
        saveToken(authResponse.access_token || authResponse.token || '');
        router.push('/mentor' as Route);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid email or password');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col lg:grid lg:grid-cols-12 bg-canvas text-content-primary overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-8rem] h-[32rem] w-[32rem] rounded-full bg-brand-subtle blur-[130px] opacity-60" />
        <div className="absolute right-[-10rem] top-[30%] h-[28rem] w-[28rem] rounded-full bg-accent-violet/10 blur-[140px] opacity-50" />
        <div className="absolute left-[40%] bottom-[-10rem] h-[26rem] w-[26rem] rounded-full bg-data-subtle blur-[120px] opacity-40" />
      </div>

      {/* ── Left Column: Form & Authentication ── */}
      <section className="relative z-10 flex flex-col justify-between p-6 sm:p-10 lg:col-span-6 xl:col-span-5 lg:p-12 xl:p-16">
        {/* Brand Wordmark & Top Row */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-glow">
              TS
            </div>
            <div>
              <span className="font-heading text-lg font-bold tracking-tight text-content-primary block leading-none">
                TechSeeker
              </span>
              <span className="text-[10px] font-medium tracking-wide text-content-muted uppercase">
                Learning Intelligence
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-elevated/70 px-2.5 py-1 text-[11px] font-medium text-content-secondary backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Mentor Live</span>
          </div>
        </header>

        {/* Center Form Container */}
        <div className="my-auto py-8 sm:py-10 max-w-md w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full rounded-2xl border border-border-subtle bg-surface/85 backdrop-blur-xl p-6 sm:p-8 shadow-elevated"
          >
            {/* Heading & Subtitle */}
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-content-primary sm:text-3xl">
                {mode === 'login' ? 'Welcome back' : 'Start your journey'}
              </h1>
              <p className="mt-1.5 text-xs text-content-secondary sm:text-sm">
                {mode === 'login'
                  ? 'Access your personal AI Mentor & structured code sandboxes.'
                  : 'Join developers mastering algorithms and architectures.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mb-6 flex rounded-xl border border-border-subtle bg-surface-elevated/80 p-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
                  mode === 'login'
                    ? 'bg-surface text-content-primary shadow-subtle border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
                  mode === 'register'
                    ? 'bg-surface text-content-primary shadow-subtle border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Google OAuth Button */}
            <div className="mb-5">
              <div className="flex w-full justify-center">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                      handleGoogleSuccess(credentialResponse.credential);
                    } else {
                      setError('No credential token received from Google');
                    }
                  }}
                  onError={() => {
                    setError('Google sign-in was cancelled or encountered an error');
                  }}
                  text={mode === 'login' ? 'signin_with' : 'signup_with'}
                  shape="rectangular"
                  size="large"
                  theme="outline"
                  width="100%"
                />
              </div>

              {/* Polished Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-surface px-3 text-content-muted font-medium">
                    or continue with email
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {mode === 'register' && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-xs font-semibold text-content-secondary"
                    >
                      Full Name
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="name"
                      placeholder="Jane Doe"
                      className="h-10 text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold text-content-secondary"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-10 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-content-secondary"
                  >
                    Password
                  </label>
                  {mode === 'login' && (
                    <span className="text-[11px] text-content-muted hover:text-brand transition cursor-pointer">
                      Forgot password?
                    </span>
                  )}
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'}
                  className="h-10 text-sm"
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-content-muted hover:text-content-primary transition p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <AnimatePresence mode="popLayout">
                {mode === 'register' && (
                  <motion.div
                    key="confirm-password-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1.5 block text-xs font-semibold text-content-secondary"
                    >
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      className="h-10 text-sm"
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-content-muted hover:text-content-primary transition p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-xs text-status-danger flex items-start gap-2"
                >
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                variant="hero"
                disabled={loading}
                isLoading={loading}
                className="w-full h-11 text-sm font-semibold mt-2 shadow-glow"
              >
                {mode === 'login' ? 'Sign In to Workspace' : 'Create Your Free Account'}
              </Button>
            </form>
          </motion.div>
        </div>

        {/* Footer Security Note */}
        <footer className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-content-muted gap-2 pt-4 border-t border-border-subtle">
          <span>🔒 256-bit encrypted authentication</span>
          <div className="flex items-center gap-3">
            <span className="hover:text-content-secondary transition cursor-pointer">Privacy</span>
            <span>•</span>
            <span className="hover:text-content-secondary transition cursor-pointer">Terms</span>
          </div>
        </footer>
      </section>

      {/* ── Right Column: Rich Visual Showcase Panel ── */}
      <section className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-12 xl:p-16 border-l border-border-subtle bg-surface/50 overflow-hidden backdrop-blur-2xl">
        {/* Dynamic mesh gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-10 h-80 w-80 rounded-full bg-data/15 blur-3xl" />
          <div className="absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-accent-hero-to/15 blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Showcase Header Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated/80 px-3.5 py-1.5 text-xs font-medium text-content-primary shadow-subtle backdrop-blur-md">
            <SparklesIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Next-Gen Learning Intelligence</span>
          </div>
          <span className="text-xs font-mono text-content-muted">v1.0.0</span>
        </div>

        {/* Showcase Center: Floating Interactive Mockups */}
        <div className="relative z-10 my-auto py-10 space-y-5 max-w-lg mx-auto w-full">
          {/* Card 1: AI Mentor Chat Snippet */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-border-subtle bg-surface-elevated/90 p-5 shadow-elevated backdrop-blur-md transition-all hover:border-brand-border"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-brand/15 text-brand flex items-center justify-center font-bold text-xs">
                  AI
                </div>
                <div>
                  <span className="font-heading text-xs font-bold text-content-primary block leading-none">
                    Senior Architect Mentor
                  </span>
                  <span className="text-[10px] text-content-muted">Active Pair Programming</span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold px-2 py-0.5 border border-emerald-500/20">
                Instant Feedback
              </span>
            </div>
            <p className="text-xs text-content-secondary leading-relaxed mb-3">
              &ldquo;In Python, decorators wrap functions with closures. Here is how you profile latency without mutating logic:&rdquo;
            </p>
            <div className="rounded-lg bg-canvas p-3 font-mono text-[11px] text-content-primary border border-border-subtle">
              <span className="text-indigo-400">@timing_decorator</span>
              <br />
              <span className="text-pink-400">def</span> <span className="text-amber-400">execute_pipeline</span>(data: List[Node]):
              <br />
              &nbsp;&nbsp;<span className="text-teal-400">return</span> process_parallel(data)
            </div>
          </motion.div>

          {/* Card 2: Interactive Metrics & Roadmap Row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="rounded-xl border border-border-subtle bg-surface-elevated/80 p-4 shadow-subtle backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 text-data mb-1.5">
                <CodeBranchIcon className="w-4 h-4" />
                <span className="text-[11px] font-semibold text-content-secondary">Adaptive Roadmap</span>
              </div>
              <div className="text-base font-heading font-bold text-content-primary">
                Full-Stack AI
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-surface">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 w-[78%]" />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-content-muted">
                <span>Progress</span>
                <span className="font-semibold text-content-secondary">78% Complete</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="rounded-xl border border-border-subtle bg-surface-elevated/80 p-4 shadow-subtle backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 text-reward mb-1.5">
                <TerminalIcon className="w-4 h-4" />
                <span className="text-[11px] font-semibold text-content-secondary">Code Sandbox</span>
              </div>
              <div className="text-base font-heading font-bold text-content-primary">
                14/14 Tests
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>100% Score • 0.04s</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Showcase Bottom Value Proposition */}
        <div className="relative z-10 pt-6 border-t border-border-subtle">
          <blockquote className="font-heading text-lg xl:text-xl font-bold tracking-tight text-content-primary">
            &ldquo;Learn any topic. Master any language. One AI mentor.&rdquo;
          </blockquote>
          <div className="mt-3 flex items-center gap-6 text-xs text-content-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              50+ Languages & Frameworks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-data" />
              Zero-Config Sandboxes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-reward" />
              Personalized Roadmaps
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-xs text-content-muted">
          Loading authentication...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
