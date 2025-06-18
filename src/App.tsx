// App.tsx
import { Authenticated, Unauthenticated } from "convex/react";
import { Toaster } from "sonner";
import { ChatInterface } from "./components/ChatInterface";
import { SharedConversation } from "./components/SharedConversation";
import { Homepage } from "./components/Homepage";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { Redirect } from "./components/Redirect";

function AppContent() {
  const { theme } = useTheme();
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Shared conversation route (public)
  const sharedMatch = currentRoute.match(/^\/shared\/(.+)$/);
  const shareId = sharedMatch?.[1];
  if (shareId) {
    return (
      <>
        <SharedConversation shareId={shareId} />
        <Toaster theme={theme as "light" | "dark" | "system"} richColors />
      </>
    );
  }

  // Homepage route (public)
  if (currentRoute === '/homepage') {
    return (
      <>
        <Homepage />
        <Toaster theme={theme as "light" | "dark" | "system"} richColors />
      </>
    );
  }

  // Login page route
  if (currentRoute === '/login') {
    return (
      <>
        <Authenticated>
          <Redirect to="/" />
        </Authenticated>
        <Unauthenticated>
          <LoginPage />
        </Unauthenticated>
        <Toaster theme={theme as "light" | "dark" | "system"} richColors />
      </>
    );
  }

  // Root route (/)
  return (
    <>
      <Authenticated>
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/98 to-muted/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/2 via-transparent to-accent/2 pointer-events-none"></div>
          <div className="relative z-10 min-h-screen flex flex-col">
            <ChatInterface />
          </div>
        </div>
      </Authenticated>
      <Unauthenticated>
        <Redirect to="/homepage" />
      </Unauthenticated>
      <Toaster theme={theme as "light" | "dark" | "system"} richColors />
    </>
  );
}

export default function App() {
  return <AppContent />;
}