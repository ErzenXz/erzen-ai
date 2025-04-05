"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { UserInfo } from "@/lib/types";
import { userSync } from "@/lib/user-sync";

// Create a global cache for user data to prevent multiple API calls
// Use a more robust cache with timestamps
const userCache = {
  data: null as UserInfo | null,
  timestamp: 0,
  loading: false,
  promise: null as Promise<UserInfo | null> | null
};

const USER_CACHE_DURATION = 60000; // 1 minute cache

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  
  // Use a stable loadUser function with useCallback to prevent recreation on each render
  const loadUser = useCallback(async (forceRefresh = false) => {
    // Use the cache if we're not forcing a refresh
    const now = Date.now();
    if (!forceRefresh && userCache.data && now - userCache.timestamp < USER_CACHE_DURATION) {
      setUser(userCache.data);
      setIsLoading(false);
      setError(null);
      return userCache.data;
    }
    
    // If another instance is already loading the user, use that promise
    if (userCache.loading && userCache.promise) {
      try {
        const result = await userCache.promise;
        if (mountedRef.current) {
          setUser(result);
          setIsLoading(false);
          setError(null);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setUser(null);
          setError(err instanceof Error ? err.message : "Authentication failed");
          setIsLoading(false);
        }
        return null;
      }
    }
    
    // Start a new loading operation
    userCache.loading = true;
    userCache.promise = (async () => {
      try {
        setIsLoading(true);

        // This will automatically handle authentication, redirect to auth if needed,
        // and synchronize user data between main API and local database
        const localUser = await userSync.getCurrentUser();

        if (localUser) {
          // Update the user cache
          userCache.data = localUser as unknown as UserInfo;
          userCache.timestamp = now;
          
          if (mountedRef.current) {
            setUser(localUser as unknown as UserInfo);
            setError(null);
          }
          return localUser as unknown as UserInfo;
        } else {
          if (mountedRef.current) {
            setUser(null);
            setError("Failed to authenticate");
          }
          return null;
        }
      } catch (err) {
        console.error("Authentication error:", err);
        if (mountedRef.current) {
          setUser(null);
          setError(err instanceof Error ? err.message : "Authentication failed");
        }
        return null;
      } finally {
        userCache.loading = false;
        userCache.promise = null;
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    })();
    
    return await userCache.promise;
  }, []);

  // Load user data on mount
  useEffect(() => {
    // Set mountedRef to true on mount
    mountedRef.current = true;
    
    // Don't unnecessarily reload if we already have cached user data
    const now = Date.now();
    if (userCache.data && now - userCache.timestamp < USER_CACHE_DURATION) {
      setUser(userCache.data);
      setIsLoading(false);
    } else {
      loadUser();
    }

    // Set up a refresh interval to validate the token periodically
    // but only if there's an active user and with a reasonable interval
    const intervalId = setInterval(() => {
      if (user) {
        // Just validate the token, don't force a full reload
        userSync.ensureAuthenticated(false);
      }
    }, USER_CACHE_DURATION * 2); // Double the cache duration for validation checks

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [loadUser, user]);

  // Memoize the return value to prevent unnecessary re-renders in consuming components
  const authValue = useMemo(() => ({ 
    user, 
    isLoading, 
    error,
    refreshUser: loadUser 
  }), [user, isLoading, error, loadUser]);
  
  return authValue;
}
