'use client';

import { ThemeProvider } from 'next-themes';

export function BusinessApplyForceLight({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false} storageKey="gastroskor-theme-business-apply">
      {children}
    </ThemeProvider>
  );
}
