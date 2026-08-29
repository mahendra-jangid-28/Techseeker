'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { AppShell } from '@techseeker/ui';
import { clearToken, getCurrentUser, getToken, type UserResponse } from '../lib/api/auth';
import { useTheme } from './ThemeProvider';

export default function AppShellWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const token = getToken();
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const userData = await getCurrentUser(token);
        if (!cancelled) {
          setUser(userData);
        }
      } catch {
        if (!cancelled) {
          clearToken();
          setUser(null);
        }
      }
    }

    loadUser();

    function handleAuthChange() {
      loadUser();
    }

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      cancelled = true;
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [pathname]);

  function handleLogout() {
    clearToken();
    setUser(null);
    router.push('/login' as Route);
  }

  return (
    <AppShell
      pathname={pathname}
      user={user}
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {children}
    </AppShell>
  );
}