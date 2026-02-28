/**
 * Batch API types.
 *
 * Allows executing multiple API operations in a single HTTP request.
 */

export interface BatchOperation {
  /** HTTP method for this sub-operation. */
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** API path, e.g. "/api/node/article". */
  path: string;
  /** Optional request body (for POST / PATCH). */
  body?: unknown;
  /** Optional extra headers for this sub-operation. */
  headers?: Record<string, string>;
}

export interface BatchResult {
  /** HTTP status code of the sub-operation. */
  status: number;
  /** Response body returned by the sub-operation. */
  body: unknown;
  /** Error message if the sub-operation failed. */
  error?: string;
}

export interface BatchRequest {
  /** Array of operations to execute. */
  operations: BatchOperation[];
  /**
   * When true, operations run sequentially and processing stops on the
   * first error.  Remaining operations are marked as skipped (status 0).
   * Defaults to false.
   */
  sequential?: boolean;
}

export interface BatchResponse {
  /** Results in the same order as the submitted operations. */
  results: BatchResult[];
  /** Summary metadata. */
  meta: {
    total: number;
    succeeded: number;
    failed: number;
  };
}
