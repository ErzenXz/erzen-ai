// App.tsx
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { ChatInterface } from "./components/ChatInterface";
import { ParticlesBackground } from "./components/ParticlesBackground";
import { SharedConversation } from "./components/SharedConversation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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

  // Check if this is a shared conversation route
  const sharedMatch = currentRoute.match(/^\/shared\/(.+)$/);
  const shareId = sharedMatch?.[1];

  if (shareId) {
    // Render shared conversation (no authentication required)
    return (
      <>
        <SharedConversation shareId={shareId} />
        <Toaster theme={theme as "light" | "dark" | "system"} richColors />
      </>
    );
  }

  return (
    <>
      <Authenticated>
        {/* The authenticated view has its own layout and background */}
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/98 to-muted/20 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/2 via-transparent to-accent/2 pointer-events-none"></div>
          <div className="relative z-10 min-h-screen flex flex-col">
            <ChatInterface />
          </div>
        </div>
      </Authenticated>

      <Unauthenticated>
        {/* This container provides the full-screen background for the login page */}
        <div className="relative min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-muted/40 overflow-hidden">
          {/* Additional gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/8 via-transparent to-accent/8 opacity-60"></div>
          {/* Layer 1: The animated background */}
          <div className="absolute inset-0 z-0">
            <ParticlesBackground />
          </div>

          {/* Layer 2: The content, layered on top */}
          <div className="relative z-10 flex flex-col min-h-screen">
            <main className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-md mx-auto text-center">
                <h1 className="text-5xl font-bold text-foreground mb-4">
                  ErzenAI
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Sign in to start chatting
                </p>
                <SignInForm />
              </div>
            </main>
          </div>
        </div>
      </Unauthenticated>

      {/* Toaster with dynamic theme */}
      <Toaster theme={theme as "light" | "dark" | "system"} richColors />
    </>
  );
}

export default function App() {
  return <AppContent />;
}