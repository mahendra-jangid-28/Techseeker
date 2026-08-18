'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@techseeker/ui';

export default function AppShellWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return <AppShell pathname={pathname}>{children}</AppShell>;
}