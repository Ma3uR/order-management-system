/**
 * Rate limiting and retry utilities for API calls
 * Helps prevent server from being flagged for network abuse
 */

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /** Minimum delay between requests in milliseconds */
  minDelayMs: number;
  /** Maximum delay between requests in milliseconds */
  maxDelayMs: number;
  /** Whether to add random jitter to delays */
  jitter: boolean;
}

/**
 * Configuration for exponential backoff retry
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds before first retry */
  initialDelayMs: number;
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number;
  /** Multiplier for exponential backoff (e.g., 2 = double each time) */
  backoffMultiplier: number;
  /** Whether to add random jitter to delays */
  jitter: boolean;
}

/**
 * Default rate limit configuration for marketplace APIs
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  minDelayMs: 500,
  maxDelayMs: 1500,
  jitter: true,
};

/**
 * Default retry configuration with exponential backoff
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Calculate delay with optional jitter
 */
function calculateDelay(baseDelay: number, jitter: boolean, maxJitter?: number): number {
  if (!jitter) return baseDelay;

  const jitterAmount = maxJitter ?? baseDelay * 0.3;
  const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
  return Math.max(0, baseDelay + randomJitter);
}

/**
 * Rate limiter class to control request frequency
 */
export class RateLimiter {
  private lastRequestTime: number = 0;
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT, ...config };
  }

  /**
   * Wait if necessary to respect rate limit, then update last request time
   */
  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    const targetDelay = calculateDelay(
      (this.config.minDelayMs + this.config.maxDelayMs) / 2,
      this.config.jitter,
      (this.config.maxDelayMs - this.config.minDelayMs) / 2
    );

    if (timeSinceLastRequest < targetDelay) {
      const waitTime = targetDelay - timeSinceLastRequest;
      await sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Reset the rate limiter (e.g., at start of new sync operation)
   */
  reset(): void {
    this.lastRequestTime = 0;
  }
}

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
): Promise<T> {
  const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier, jitter } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const baseDelay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );
      const delay = calculateDelay(baseDelay, jitter);

      if (onRetry) {
        onRetry(attempt + 1, lastError, delay);
      } else {
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a rate-limited version of an async function
 */
export function createRateLimitedFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  rateLimiter: RateLimiter
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    await rateLimiter.throttle();
    return fn(...args);
  };
}

/**
 * Simple in-memory request tracker for detecting rapid repeated calls
 * Useful for preventing double-click issues on fiscal endpoints
 */
export class RequestDebouncer {
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private recentRequests: Map<string, number> = new Map();
  private cooldownMs: number;

  constructor(cooldownMs: number = 2000) {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Check if a request with the given key is allowed
   * Returns false if the same key was requested within cooldown period
   */
  isAllowed(key: string): boolean {
    const lastRequest = this.recentRequests.get(key);
    if (lastRequest && Date.now() - lastRequest < this.cooldownMs) {
      return false;
    }
    return true;
  }

  /**
   * Mark a request as started
   */
  markStarted(key: string): void {
    this.recentRequests.set(key, Date.now());
  }

  /**
   * Execute a function with deduplication - if the same key is already being processed,
   * return the existing promise instead of starting a new request
   */
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    const existing = this.pendingRequests.get(key);
    if (existing) {
      console.log(`[Debouncer] Request for ${key} already in flight, returning existing promise`);
      return existing as Promise<T>;
    }

    // Check cooldown
    if (!this.isAllowed(key)) {
      console.log(`[Debouncer] Request for ${key} rejected - cooldown period active`);
      throw new Error('Request rejected - please wait before retrying');
    }

    // Start new request
    this.markStarted(key);
    const promise = fn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear cooldown for a specific key
   */
  clearCooldown(key: string): void {
    this.recentRequests.delete(key);
  }

  /**
   * Clear all cooldowns
   */
  clearAll(): void {
    this.recentRequests.clear();
  }
}

/**
 * Shared rate limiters for different services
 */
export const rateLimiters = {
  rozetka: new RateLimiter({ minDelayMs: 500, maxDelayMs: 1500, jitter: true }),
  epicentr: new RateLimiter({ minDelayMs: 1000, maxDelayMs: 2000, jitter: true }),
  promua: new RateLimiter({ minDelayMs: 500, maxDelayMs: 1500, jitter: true }),
  casaVchasno: new RateLimiter({ minDelayMs: 300, maxDelayMs: 800, jitter: true }),
};

/**
 * Shared request debouncer for fiscal operations
 */
export const fiscalDebouncer = new RequestDebouncer(3000); // 3 second cooldown
