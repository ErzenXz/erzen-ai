"use client";
import { useState, useEffect } from "react";
import { UserInfo } from "@/lib/types";
import { userSync } from "@/lib/user-sync";

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);

        // This will automatically handle authentication, redirect to auth if needed,
        // and synchronize user data between main API and local database
        const localUser = await userSync.getCurrentUser();

        if (localUser) {
          setUser(localUser as unknown as UserInfo);
          setError(null);
        } else {
          setUser(null);
          setError("Failed to authenticate");

          // Don't redirect here - the userSync.getCurrentUser already handles redirects
        }
      } catch (err) {
        console.error("Authentication error:", err);
        setUser(null);
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  return { user, isLoading, error };
}
