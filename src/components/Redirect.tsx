import { useEffect } from 'react';

export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [to]);

  return null;
} 