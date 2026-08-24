'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { login, register, saveToken } from '../../lib/api/auth';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      {/* Ambient backgrounds */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-sky-500/[0.08] blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20%] h-[25rem] w-[25rem] rounded-full bg-violet-500/[0.07] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-950/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20">
            TS
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-white">
            {mode === 'login' ? 'Sign in to TechSeeker' : 'Create your account'}
          </h1>

          <p className="mt-1.5 text-xs text-slate-400">
            {mode === 'login'
              ? 'Access your AI Mentor & Code workspace'
              : 'Join TechSeeker to start your AI learning journey'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mb-6 flex rounded-xl border border-white/[0.08] bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-sky-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              mode === 'register'
                ? 'bg-sky-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
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
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                disabled={loading}
                autoComplete="name"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400/40 disabled:opacity-50"
                placeholder="Jane Doe"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-slate-400"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400/40 disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-slate-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400/40 disabled:opacity-50"
              placeholder={mode === 'login' ? 'Enter your password' : 'Create a secure password'}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400/40 disabled:opacity-50"
                placeholder="Repeat your password"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 px-4 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? mode === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-xs text-slate-500">
          Loading authentication...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
