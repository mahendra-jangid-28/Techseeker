import { type ReactNode } from 'react';

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 md:flex md:flex-col">
        <div className="border-b border-slate-800 px-6 py-5">
          <h1 className="text-xl font-semibold">TechSeeker</h1>
          <p className="mt-1 text-xs text-slate-400">AI Learning Platform</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium">
            Dashboard
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
};