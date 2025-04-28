'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Force a remount of children on theme change
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
    
    // Apply theme class to body to help with transitions
    const handleThemeChange = () => {
      document.documentElement.classList.add('theme-transition');
      window.setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 300);
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);
  
  return (
    <NextThemesProvider
      {...props}
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange={false}
      themes={["light", "dark", "blue", "green", "purple", "yellow", "pink", "orange", "teal", "gray", "system"]}
    >
      {mounted ? children : null}
    </NextThemesProvider>
  );
}