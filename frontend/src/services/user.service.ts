import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { User, Role, CreateUserRequest } from '@/types/user';

export const userService = {
  list: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get<ApiResponse<User[]>>('/users');
    return response.data;
  },

  listRoles: async (): Promise<ApiResponse<Role[]>> => {
    const response = await apiClient.get<ApiResponse<Role[]>>('/users/roles');
    return response.data;
  },

  create: async (data: CreateUserRequest): Promise<ApiResponse<User>> => {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/deactivate`);
    return response.data;
  },

  activate: async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/activate`);
    return response.data;
  },
};
