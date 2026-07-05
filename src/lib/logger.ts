/**
 * Central error logger. Logs to console in development.
 * Swap the body of logError to send to Sentry / Datadog / etc. when ready.
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[Waymark] ${context}:`, error);
  }
}
