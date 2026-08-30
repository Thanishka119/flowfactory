import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor for generic handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standard error logging
    const message = error.response?.data?.error?.message || error.message || 'Unknown network error';
    return Promise.reject(new Error(message));
  }
);
