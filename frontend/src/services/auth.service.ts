import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  MeResponse,
} from '@/types/auth';

export const authService = {
  /**
   * Authenticate with email and password.
   * Returns accessToken, refreshToken and user profile on success.
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      credentials,
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Login failed');
    }
    return response.data.data;
  },

  /**
   * Revoke the stored refresh token on the backend.
   * Must be called on logout so the token cannot be reused.
   */
  logout: async (refreshToken: string): Promise<void> => {
    // Best-effort — ignore network errors so the frontend always clears state
    try {
      await apiClient.post<ApiResponse<{ message: string }>>('/auth/logout', {
        refreshToken,
      });
    } catch {
      // Silently swallow — local state will still be cleared by AuthContext
    }
  },

  /**
   * Exchange a valid refresh token for a new access token.
   */
  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await apiClient.post<ApiResponse<RefreshResponse>>(
      '/auth/refresh',
      { refreshToken },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || 'Token refresh failed',
      );
    }
    return response.data.data;
  },

  /**
   * Fetch the currently authenticated user's profile.
   * Used to restore session from a stored access token.
   */
  getMe: async (): Promise<MeResponse> => {
    const response = await apiClient.get<ApiResponse<MeResponse>>('/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || 'Failed to fetch user profile',
      );
    }
    return response.data.data;
  },
};
