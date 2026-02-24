/** Generic API success response */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
}

/** Paginated API response */
export interface PaginatedApiResponse<T> {
  data: T[];
  item_count: number;
  page_count: number;
}

/** API error */
export interface ApiError {
  code: number;
  message: string;
  status?: number;
}

/** Pagination options */
export interface PaginationOptions {
  page?: number;
  page_size?: number;
}

/** Sort options */
export interface SortOptions {
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}
