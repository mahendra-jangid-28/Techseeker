import type { UserProfile } from '@techseeker/types';

const profile: UserProfile = {
  id: '1',
  name: 'Techseeker User',
  email: 'user@techseeker.dev'
};

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-24">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 shadow-2xl shadow-black/20">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-sky-400">Techseeker</p>
        <h1 className="text-4xl font-semibold">AI learning platform scaffold</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          A production-ready foundation for the Techseeker monorepo, ready for feature development.
        </p>
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
          <p className="text-sm text-slate-400">Connected shared types</p>
          <p className="mt-2 text-xl font-medium">{profile.name}</p>
          <p className="text-sm text-slate-400">{profile.email}</p>
        </div>
      </div>
    </main>
  );
}
