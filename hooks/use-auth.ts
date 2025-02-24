"use client";

import { useState, useEffect } from "react";
import { UserInfo } from "@/lib/types";
import { fetchUserInfo } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userInfo = await fetchUserInfo();
        setUser(userInfo);
        setError(null);
      } catch (err) {
        // Clear tokens if authentication fails
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        // const currentUrl = encodeURIComponent(window.location.href);
        // window.location.href = `https://auth.erzen.tk?returnTo=${currentUrl}`;
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  return { user, isLoading, error };
}
