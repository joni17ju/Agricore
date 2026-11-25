/**
 * Error shaped like an HTTP error response, so pages handle a failed API call
 * exactly as they handled a failed mock call.
 *
 * Lives in its own module so apiClient.js can use it without importing the
 * mock database (and dragging the seed data into the bundle).
 */
export class ServiceError extends Error {
  constructor(message, status = 400, code = undefined) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    // The API's machine-readable reason, e.g. "attempt_replaced", when it sent one.
    if (code) this.code = code;
  }
}
