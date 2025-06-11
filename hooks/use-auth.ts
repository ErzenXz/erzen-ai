"use client";

import { useUser } from "@clerk/nextjs";

/**
 * Small wrapper around Clerk's `useUser` hook that exposes the interface
 * expected by the legacy codebase (`user`, `isLoading`).
 *
 * It converts Clerk's `user` object into the simplified shape that the
 * components previously consumed: `{ id, name, email, image }`.
 */
export function useAuth() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  const user = clerkUser
    ? {
        id: clerkUser.id,
        name:
          clerkUser.fullName ||
          clerkUser.username ||
          clerkUser.primaryEmailAddress?.emailAddress ||
          "",
        email:
          // Prefer the primary email, otherwise fallback to the first email on record
          (clerkUser.primaryEmailAddress as any)?.emailAddress ||
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          "",
        image: clerkUser.imageUrl || "",
      }
    : null;

  return {
    user,
    userId: user?.id ?? null,
    isLoading: !isLoaded,
    isSignedIn,
  };
}
