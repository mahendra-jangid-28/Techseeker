import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import AppShellWrapper from '../components/AppShellWrapper';
import { ThemeProvider } from '../components/ThemeProvider';
import { GoogleAuthProvider } from '../components/GoogleAuthProvider';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} font-sans`}
      suppressHydrationWarning
    >
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
        <GoogleAuthProvider>
          <ThemeProvider>
            <AppShellWrapper>{children}</AppShellWrapper>
          </ThemeProvider>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}