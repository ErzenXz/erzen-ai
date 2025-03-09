import { refreshToken } from "./api";

interface MainApiUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  lastLogin: string;
  multifactorEnabled: boolean;
  emailVerified: boolean;
  externalUser: boolean;
  birthdate: string;
  language: string;
  timezone: string;
  image: string;
}

/**
 * Handles synchronization of user data between the main API and local database
 */
export const userSync = {
  /**
   * Checks if the user is logged in and redirects to auth if needed
   * @param redirectToAuth Whether to redirect to auth page if user is not logged in
   * @returns true if user is logged in, false otherwise
   */
  async ensureAuthenticated(redirectToAuth = true): Promise<boolean> {
    try {
      // Try to refresh the token
      const refreshSucceeded = await refreshToken();

      // Only redirect if refresh failed AND redirectToAuth is true
      if (!refreshSucceeded && redirectToAuth) {
        // Redirect to auth page with return URL
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://auth.erzen.tk?return_to=${returnUrl}`;
        return false;
      }

      return refreshSucceeded;
    } catch (error) {
      console.error("Authentication check failed:", error);

      if (redirectToAuth) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://auth.erzen.tk?return_to=${returnUrl}`;
      }

      return false;
    }
  },

  /**
   * Gets the current user from the local database via our API,
   * which fetches from main API if needed and syncs data based on cache expiry
   */
  async getCurrentUser() {
    try {
      // Ensure we have a valid token first
      const isAuthenticated = await this.ensureAuthenticated(true);

      // If not authenticated, return null (the redirect will happen in ensureAuthenticated)
      if (!isAuthenticated) {
        console.log("Not authenticated, returning null");
        return null;
      }

      try {
        // Get the token that was just refreshed
        const token = localStorage.getItem("accessToken");
        if (!token) {
          console.error("No access token available after successful refresh");
          return null;
        }

        // Call our local API which will handle caching and sync with main API if needed
        const response = await fetch("/api/user/info", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          let errorText = await response.text();
          try {
            // Try to parse error as JSON
            const errorJson = JSON.parse(errorText);
            errorText = JSON.stringify(errorJson);
          } catch (e) {
            // If not JSON, keep as is
          }

          // If API fails with auth error, retry auth flow
          if (response.status === 401) {
            await refreshToken();
            return null;
          }

          throw new Error(
            `Failed to get user data: ${response.status} - ${errorText}`
          );
        }

        // Get the user data (may be cached or fresh depending on sync interval)
        const localUser = await response.json();
        console.log("User data retrieved:", localUser.email);
        return localUser;
      } catch (error) {
        console.error("Error getting user data:", error);
        return null;
      }
    } catch (error) {
      console.error("Error in getCurrentUser:", error);
      return null;
    }
  },
};
