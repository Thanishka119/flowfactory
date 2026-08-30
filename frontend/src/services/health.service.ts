import { apiClient } from '../lib/api';
import { ApiResponse, HealthCheckData } from '../types/api';

export const healthService = {
  getHealth: async (): Promise<HealthCheckData> => {
    const response = await apiClient.get<ApiResponse<HealthCheckData>>('/health');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch backend health status');
    }
    return response.data.data;
  },
};
