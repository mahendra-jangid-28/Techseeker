import { createElement, type ReactNode } from 'react';

export const AppShell = ({ children }: { children: ReactNode }) => {
  return createElement('div', { className: 'min-h-screen bg-slate-950 text-slate-50' }, children);
};
