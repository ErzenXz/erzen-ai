"use client";

import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="space-y-6 w-full max-w-md">
        <h1 className="text-center text-2xl font-bold">Create your ErzenAI account</h1>
        <SignUp path="/sign-up" routing="path" />
      </div>
    </div>
  );
} 