// components/SignInForm.tsx
"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, KeyRound, LoaderCircle, User, Github } from "lucide-react";

// This component is now just the form card, without any background logic.
export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.target as HTMLFormElement);
    formData.set("flow", flow);

    signIn("password", formData)
      .catch((error) => {
        let toastTitle = "An error occurred";
        if (error.message.includes("Invalid password")) {
          toastTitle = "Invalid password. Please try again.";
        } else {
          toastTitle =
            flow === "signIn"
              ? "Could not sign in. Do you need to sign up?"
              : "Could not sign up. Do you already have an account?";
        }
        toast.error(toastTitle);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="w-full bg-black/50 backdrop-blur-lg p-8 rounded-2xl shadow-2xl shadow-cyan-500/10">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="relative">
          <label htmlFor="email" className="sr-only">Email</label>
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="email"
            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="relative">
          <label htmlFor="password" className="sr-only">Password</label>
          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="password"
            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
            type="password"
            name="password"
            placeholder="Password"
            required
          />
        </div>

        <button
          className="w-full flex items-center justify-center bg-cyan-500 text-black font-semibold py-3 px-4 rounded-lg hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 transition-colors duration-300 disabled:bg-cyan-800/50 disabled:cursor-not-allowed"
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <LoaderCircle className="animate-spin h-6 w-6" />
          ) : (
            <span>{flow === "signIn" ? "Sign In" : "Create Account"}</span>
          )}
        </button>
      </form>

      <div className="text-center text-sm text-gray-400 mt-6">
        <span>
          {flow === "signIn"
            ? "Don't have an account? "
            : "Already have an account? "}
        </span>
        <button
          type="button"
          className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
          onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
        >
          {flow === "signIn" ? "Sign up" : "Sign in"}
        </button>
      </div>

      <div className="flex items-center my-6">
        <hr className="flex-grow border-t border-gray-700" />
        <span className="mx-4 text-xs font-semibold text-gray-500 uppercase">
          OR
        </span>
        <hr className="flex-grow border-t border-gray-700" />
      </div>

      <div className="space-y-3">
        {/* OAuth buttons in a row */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white transition-colors duration-300"
            onClick={() => void signIn("google")}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Google</span>
          </button>

          <button
            className="flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg border border-gray-600 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-colors duration-300"
            onClick={() => void signIn("github")}
          >
            <Github className="h-5 w-5" />
            <span>GitHub</span>
          </button>
        </div>

        <button
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition-colors duration-300 disabled:bg-purple-800/50 disabled:cursor-not-allowed"
          onClick={() => {
            if (email) {
              setSubmitting(true);
              signIn("email", { email })
                .then(() => {
                  toast.success(`Verification email sent to ${email}! Check your inbox.`);
                })
                .catch((error) => {
                  toast.error("Failed to send verification email. Please try again.");
                })
                .finally(() => {
                  setSubmitting(false);
                });
            } else {
              toast.error("Please enter your email address first.");
            }
          }}
          disabled={submitting || !email}
        >
          {submitting ? (
            <LoaderCircle className="animate-spin h-5 w-5" />
          ) : (
            <>
              <Mail className="h-5 w-5" />
              <span>Send Magic Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}