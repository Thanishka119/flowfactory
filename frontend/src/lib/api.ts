import axios, { type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@/lib/tokenStorage';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ---------------------------------------------------------------------------
// Request interceptor — inject Bearer token automatically
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — silent token refresh on 401
// ---------------------------------------------------------------------------

/** Prevent concurrent refresh attempts */
let isRefreshing = false;

/** Queue of resolvers waiting for the refresh to complete */
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function notifySubscribers(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  // Pass successful responses through unchanged
  (response) => response,

  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;

    // Only attempt refresh on 401 and only once per request
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefreshToken();

      // No refresh token available — redirect to login
      if (!refreshToken) {
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another request is already refreshing — queue this one
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call the refresh endpoint directly (no authService import) to avoid
        // a circular dependency: api.ts → authService → api.ts.
        const refreshResponse = await axios.post<{
          success: boolean;
          data?: { accessToken: string };
          error?: { message: string };
        }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        if (!refreshResponse.data.success || !refreshResponse.data.data) {
          throw new Error(
            refreshResponse.data.error?.message ?? 'Token refresh failed',
          );
        }

        const { accessToken } = refreshResponse.data.data;
        tokenStorage.setAccessToken(accessToken);
        notifySubscribers(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear tokens and redirect to login
        tokenStorage.clearTokens();
        refreshSubscribers = [];
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors, normalise the error message
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'Unknown network error';
    return Promise.reject(new Error(message));
  },
);
