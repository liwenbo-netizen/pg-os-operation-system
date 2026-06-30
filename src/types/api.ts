export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
  trace_id: string;
};

export type ApiError = {
  code:
    | "AUTH_REQUIRED"
    | "FORBIDDEN"
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "CONFLICT"
    | "GUARD_BLOCKED"
    | "RLS_DENIED"
    | "DATABASE_ERROR"
    | "UNKNOWN_ERROR";
  message: string;
  details?: unknown;
  field_errors?: Record<string, string[]>;
};

export type ApiMeta = {
  page?: number;
  page_size?: number;
  total?: number;
  request_id?: string;
};

