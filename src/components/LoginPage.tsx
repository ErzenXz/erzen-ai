import { SignInForm } from "../SignInForm";
import { ParticlesBackground } from "./ParticlesBackground";
import { Brain } from "lucide-react";

export function LoginPage() {
  const handleGoToHomepage = () => {
    window.history.pushState({}, '', '/homepage');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-muted/40 overflow-hidden">
      <div
        className="absolute top-4 left-4 z-20 flex items-center space-x-2 cursor-pointer"
        onClick={handleGoToHomepage}
      >
        <Brain className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold text-foreground">ErzenAI</span>
      </div>

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
              Welcome Back
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Sign in to continue to ErzenAI
            </p>
            <SignInForm />
          </div>
        </main>
      </div>
    </div>
  );
} 