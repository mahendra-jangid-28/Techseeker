'use client';

import { useState, type ReactNode } from 'react';

const navigation = [
  {
    label: 'Dashboard',
    href: '/',
    icon: '⌂',
  },
  {
    label: 'AI Mentor',
    href: '/mentor',
    icon: '✦',
  },
  {
    label: 'Playground',
    href: '/playground',
    icon: '⌘',
  },
  {
    label: 'Learn',
    href: '/learn',
    icon: '◈',
  },
  {
    label: 'Roadmap',
    href: '/roadmap',
    icon: '◇',
  },
  {
    label: 'Progress',
    href: '/progress',
    icon: '↗',
  },
];

export interface AppShellUser {
  id: number;
  email: string;
  full_name: string;
}

export interface AppShellProps {
  children: ReactNode;
  pathname: string;
  user?: AppShellUser | null;
  onLogout?: () => void;
}

function getInitials(name: string): string {
  if (!name) return 'TS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AppShell = ({
  children,
  pathname,
  user,
  onLogout,
}: AppShellProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      {/* Brand Header (Pinned) */}
      <div className="shrink-0 border-b border-white/[0.07] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 text-base font-bold text-slate-950 shadow-lg shadow-sky-500/20">
              T
            </div>

            <div>
              <h1 className="text-base font-bold tracking-tight text-white">
                TechSeeker
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Learning Intelligence
              </p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:text-white md:hidden"
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Navigation Links (Independently Scrollable) */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1">
        <p className="mb-2.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Workspace
        </p>

        <div className="space-y-1">
          {navigation.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-gradient-to-r from-sky-500/15 to-cyan-500/5 text-sky-300 shadow-inner shadow-sky-500/5'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                }`}
              >
                {active && (
                  <span className="absolute left-0 h-5 w-0.5 rounded-full bg-sky-400 shadow-lg shadow-sky-400/50" />
                )}

                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-all ${
                    active
                      ? 'bg-sky-400/10 text-sky-300'
                      : 'bg-white/[0.03] text-slate-500 group-hover:bg-white/[0.07] group-hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>

                {item.label === 'AI Mentor' && (
                  <span className="ml-auto rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                    AI
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </nav>

      {/* User Profile & Logout (Pinned to Bottom Always) */}
      <div className="shrink-0 border-t border-white/[0.07] p-3.5 bg-slate-950/95">
        {user ? (
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-slate-900/60 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white shadow-md">
                {getInitials(user.full_name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-100">
                  {user.full_name}
                </p>
                <p className="truncate text-[10px] text-slate-400" title={user.email}>
                  {user.email}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-xs text-slate-400 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                aria-label="Sign out"
              >
                ⎋
              </button>
            )}
          </div>
        ) : (
          <a
            href="/login"
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/20"
          >
            <span>Sign in</span>
            <span>→</span>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#030712] text-slate-50">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-violet-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* Desktop Sidebar (Fixed viewport height) */}
      <aside className="relative z-20 hidden h-full w-[260px] shrink-0 border-r border-white/[0.07] bg-slate-950/90 backdrop-blur-xl md:flex md:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-white/[0.08] bg-slate-950 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area (Independently Scrollable Container) */}
      <div className="relative z-10 flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-slate-950/80 px-4 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-slate-300 hover:bg-white/[0.06]"
              aria-label="Open menu"
            >
              ☰
            </button>
            <span className="text-sm font-bold text-white tracking-tight">
              TechSeeker
            </span>
          </div>

          {user && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-bold text-white">
              {getInitials(user.full_name)}
            </div>
          )}
        </header>

        {/* Page Content Viewport */}
        <main className="relative flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};