import type { Metadata } from 'next';
import './globals.css';
import AppShellWrapper from '../components/AppShellWrapper';

export const metadata: Metadata = {
  title: 'Techseeker',
  description: 'AI learning platform scaffold',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShellWrapper>{children}</AppShellWrapper>
      </body>
    </html>
  );
}