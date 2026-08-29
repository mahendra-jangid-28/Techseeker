'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { Button, Card, Input } from '@techseeker/ui';
import { login, register, saveToken } from '../../lib/api/auth';

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
        // Step 1: Create the account
        await register(trimmedEmail, trimmedName, password);

        // Step 2: Automatically log in to obtain JWT
        const authResponse = await login(trimmedEmail, password);
        saveToken(authResponse.access_token);

        // Step 3: Seamless redirect to mentor workspace
        router.push('/mentor' as Route);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);

      try {
        const authResponse = await login(trimmedEmail, password);
        saveToken(authResponse.access_token);
        router.push('/mentor' as Route);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid email or password');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6 bg-canvas text-content-primary">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-brand-subtle blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20%] h-[25rem] w-[25rem] rounded-full bg-accent-violet/10 blur-[120px]" />
      </div>

      <Card variant="elevated" className="relative w-full max-w-md p-6 sm:p-8 shadow-elevated">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-glow">
            TS
          </div>

          <h1 className="text-xl font-bold tracking-tight text-content-primary">
            {mode === 'login' ? 'Sign in to TechSeeker' : 'Create your account'}
          </h1>

          <p className="mt-1.5 text-xs text-content-secondary">
            {mode === 'login'
              ? 'Access your AI Mentor & Code workspace'
              : 'Join TechSeeker to start your AI learning journey'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mb-6 flex rounded-lg border border-border-subtle bg-surface-elevated p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-brand text-content-inverse shadow-subtle'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition ${
              mode === 'register'
                ? 'bg-brand text-content-inverse shadow-subtle'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="fullName"
                className="mb-1.5 block text-xs font-medium text-content-secondary"
              >
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                disabled={loading}
                autoComplete="name"
                placeholder="Jane Doe"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-content-secondary"
            >
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-content-secondary"
            >
              Password
            </label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'login' ? 'Enter your password' : 'Create a secure password'}
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

          {mode === 'register' && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-xs font-medium text-content-secondary"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
                placeholder="Repeat your password"
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
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-2.5 text-xs text-status-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="hero"
            disabled={loading}
            isLoading={loading}
            className="w-full h-10 text-xs font-bold"
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </Card>
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
