/**
 * FlowFactory Backend Standard Types
 * Client-agnostic response envelope interfaces
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: ApiPaginationMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: 'connected' | 'disconnected';
}

