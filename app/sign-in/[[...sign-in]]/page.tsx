"use client";

import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="space-y-6 w-full max-w-md">
        <h1 className="text-center text-2xl font-bold">Sign in to ErzenAI</h1>
        <SignIn path="/sign-in" routing="path" />
      </div>
    </div>
  );
} 