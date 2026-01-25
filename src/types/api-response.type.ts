export interface ApiResponse<T = any> {
  data: T;
  statusCode: number;
  message: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
