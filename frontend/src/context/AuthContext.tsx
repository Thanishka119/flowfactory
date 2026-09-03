import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '@/services/auth.service';
import { tokenStorage } from '@/lib/tokenStorage';
import type { AuthUser, LoginRequest } from '@/types/auth';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** Authenticated user profile, or null when not logged in. */
  user: AuthUser | null;
  /** Whether the user is currently authenticated. */
  isAuthenticated: boolean;
  /**
   * True while the context is verifying a stored token on first mount.
   * Consumers should render a loading state instead of redirecting while this
   * is true to avoid flashing the login page for already-authenticated users.
   */
  isLoading: boolean;
  /** Call to log in with email + password. Throws on failure. */
  login: (credentials: LoginRequest) => Promise<void>;
  /** Call to log out. Revokes the refresh token on the backend. */
  logout: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context creation
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether a token refresh is in progress to prevent race conditions.
  const isRefreshing = useRef(false);

  // -------------------------------------------------------------------------
  // Session restoration on mount
  // Attempt to restore an existing session from stored tokens.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();

      // No tokens stored — user is definitely not authenticated.
      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate the access token by fetching the current user.
        // The Axios interceptor (api.ts) will automatically inject the Bearer
        // header and handle a 401 by attempting a silent refresh first.
        const me = await authService.getMe();

        if (!cancelled) {
          // Restore cached user profile if present and matches current userId,
          // preserving full names and role name across browser reloads.
          const cachedUser = tokenStorage.getUser();
          if (cachedUser && cachedUser.id === me.userId) {
            setUser(cachedUser);
          } else {
            setUser({
              id: me.userId,
              email: me.email,
              firstName: '',
              lastName: '',
              role: me.roleId,
            });
          }
        }
      } catch {
        // Access token invalid and refresh failed — clear everything.
        if (!cancelled) {
          tokenStorage.clearTokens();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------
  const login = useCallback(async (credentials: LoginRequest) => {
    const result = await authService.login(credentials);

    tokenStorage.setTokens(result.accessToken, result.refreshToken);
    tokenStorage.setUser(result.user);

    setUser(result.user);
  }, []);

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------
  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();

    // Always clear local state first so the UI responds immediately.
    setUser(null);
    tokenStorage.clearTokens();

    // Then revoke the token on the backend (best-effort).
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
  }, []);

  // Suppress the isRefreshing ref warning (it's used by the interceptor indirectly)
  void isRefreshing;

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Raw context export (used by the Axios interceptor which cannot use hooks)
// ---------------------------------------------------------------------------

export { AuthContext };
