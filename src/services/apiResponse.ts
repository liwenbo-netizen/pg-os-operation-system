import type { ApiError, ApiResponse } from "../types/api";

export function createTraceId() {
  return crypto.randomUUID();
}

export function ok<T>(data: T, traceId = createTraceId()): ApiResponse<T> {
  return {
    data,
    error: null,
    trace_id: traceId
  };
}

export function fail<T>(error: ApiError, traceId = createTraceId()): ApiResponse<T> {
  return {
    data: null,
    error,
    trace_id: traceId
  };
}

