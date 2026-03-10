import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRateLimiter } from '../../src/api/rate-limit.js';

function createMockReq(ip: string = '127.0.0.1') {
  return {
    ip,
    headers: {},
    socket: { remoteAddress: ip },
  };
}

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: any = undefined;
  return {
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      jsonBody = body;
    },
    get statusCode() { return statusCode; },
    get headers() { return headers; },
    get body() { return jsonBody; },
  };
}

describe('Rate Limiter', () => {
  const originalEnv = process.env.DROP_DISABLE_RATE_LIMIT;

  beforeEach(() => {
    delete process.env.DROP_DISABLE_RATE_LIMIT;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DROP_DISABLE_RATE_LIMIT = originalEnv;
    } else {
      delete process.env.DROP_DISABLE_RATE_LIMIT;
    }
  });

  it('should allow requests within the limit', () => {
    const limiter = createRateLimiter(60000, 3);
    const req = createMockReq();
    const res = createMockRes();
    let called = false;

    limiter(req, res, () => { called = true; });

    expect(called).toBe(true);
    expect(res.headers['X-RateLimit-Limit']).toBe('3');
    expect(res.headers['X-RateLimit-Remaining']).toBe('2');
  });

  it('should block requests over the limit', () => {
    const limiter = createRateLimiter(60000, 2);
    const req = createMockReq();

    // First two requests should pass
    for (let i = 0; i < 2; i++) {
      const res = createMockRes();
      limiter(req, res, () => {});
    }

    // Third request should be blocked
    const res = createMockRes();
    let called = false;
    limiter(req, res, () => { called = true; });

    expect(called).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.body.error.message).toContain('Too many requests');
    expect(res.headers['Retry-After']).toBeDefined();
  });

  it('should set rate limit headers on every response', () => {
    const limiter = createRateLimiter(60000, 10);
    const req = createMockReq();
    const res = createMockRes();

    limiter(req, res, () => {});

    expect(res.headers['X-RateLimit-Limit']).toBe('10');
    expect(res.headers['X-RateLimit-Remaining']).toBeDefined();
    expect(res.headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('should track different IPs independently', () => {
    const limiter = createRateLimiter(60000, 1);

    // First IP — should pass
    const req1 = createMockReq('192.168.1.1');
    const res1 = createMockRes();
    let called1 = false;
    limiter(req1, res1, () => { called1 = true; });
    expect(called1).toBe(true);

    // Second IP — should also pass (different IP)
    const req2 = createMockReq('192.168.1.2');
    const res2 = createMockRes();
    let called2 = false;
    limiter(req2, res2, () => { called2 = true; });
    expect(called2).toBe(true);

    // First IP again — should be blocked
    const res3 = createMockRes();
    let called3 = false;
    limiter(req1, res3, () => { called3 = true; });
    expect(called3).toBe(false);
    expect(res3.statusCode).toBe(429);
  });

  it('should bypass rate limiting when DROP_DISABLE_RATE_LIMIT=1', () => {
    process.env.DROP_DISABLE_RATE_LIMIT = '1';
    const limiter = createRateLimiter(60000, 1);

    // Even after exceeding the limit, requests should pass
    for (let i = 0; i < 5; i++) {
      const req = createMockReq();
      const res = createMockRes();
      let called = false;
      limiter(req, res, () => { called = true; });
      expect(called).toBe(true);
    }
  });

  it('should use x-forwarded-for header for IP when req.ip is absent', () => {
    const limiter = createRateLimiter(60000, 1);

    const req = {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = createMockRes();
    let called = false;
    limiter(req, res, () => { called = true; });
    expect(called).toBe(true);

    // Second request from same forwarded IP should be blocked
    const res2 = createMockRes();
    let called2 = false;
    limiter(req, res2, () => { called2 = true; });
    expect(called2).toBe(false);

    // Request from different IP should pass
    const req2 = {
      headers: { 'x-forwarded-for': '10.0.0.3' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res3 = createMockRes();
    let called3 = false;
    limiter(req2, res3, () => { called3 = true; });
    expect(called3).toBe(true);
  });

  it('should decrement remaining count with each request', () => {
    const limiter = createRateLimiter(60000, 5);
    const req = createMockReq();

    for (let i = 0; i < 4; i++) {
      const res = createMockRes();
      limiter(req, res, () => {});
      expect(res.headers['X-RateLimit-Remaining']).toBe(String(5 - (i + 1)));
    }
  });

  it('should return 429 status with proper error structure', () => {
    const limiter = createRateLimiter(60000, 1);
    const req = createMockReq();

    // Exhaust the limit
    limiter(req, createMockRes(), () => {});

    // Next request should get 429
    const res = createMockRes();
    limiter(req, res, () => {});

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({
      error: {
        status: 429,
        message: 'Too many requests, please try again later',
      },
    });
  });
});
