import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@techseeker/ui';

export const metadata: Metadata = {
  title: 'Techseeker',
  description: 'AI learning platform scaffold'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
