export interface ApiError {
    code: string;
    message: string;
    traceId?: string;
    details?: Record<string, unknown>;
}
