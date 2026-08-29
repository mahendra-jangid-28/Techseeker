import type { Metadata } from 'next';
import './globals.css';
import AppShellWrapper from '../components/AppShellWrapper';
import { ThemeProvider } from '../components/ThemeProvider';

export const metadata: Metadata = {
  title: 'TechSeeker — Learning Intelligence System',
  description: 'AI-powered personal learning intelligence for developers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('techseeker-theme') || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-canvas text-content-primary antialiased">
        <ThemeProvider>
          <AppShellWrapper>{children}</AppShellWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}