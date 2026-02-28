import { authenticateUser, createUser } from './user.js';
import { createSession, destroySession } from './session.js';
import { floodRegister, floodIsAllowed, floodClear } from '../core/flood.js';

// Express-compatible types
interface Req {
  body?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  connection?: { remoteAddress?: string };
}

interface Res {
  status(code: number): Res;
  json(data: unknown): void;
  send(data?: unknown): void;
}

// Flood thresholds (matches Drupal defaults)
const LOGIN_FLOOD_IP_LIMIT = 50;
const LOGIN_FLOOD_IP_WINDOW = 3600;
const LOGIN_FLOOD_USER_LIMIT = 5;
const LOGIN_FLOOD_USER_WINDOW = 21600;

function getClientIp(req: Req): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

/**
 * POST /api/auth/login
 * Body: { name: string, password: string }
 *
 * Uses Drupal-compatible flood control to rate-limit login attempts.
 */
export async function loginHandler(req: Req, res: Res): Promise<void> {
  const { name, password } = (req.body ?? {}) as Record<string, string>;
  if (!name || !password) {
    res.status(400).json({
      error: { status: 400, message: 'name and password are required' },
    });
    return;
  }

  const ip = getClientIp(req);

  // Check flood: too many attempts from this IP?
  const ipAllowed = await floodIsAllowed(
    'user.failed_login_ip', LOGIN_FLOOD_IP_LIMIT, LOGIN_FLOOD_IP_WINDOW, ip
  );
  if (!ipAllowed) {
    res.status(429).json({
      error: { status: 429, message: 'Too many login attempts from your IP address. Try again later.' },
    });
    return;
  }

  // Check flood: too many attempts for this username?
  const userAllowed = await floodIsAllowed(
    'user.failed_login_user', LOGIN_FLOOD_USER_LIMIT, LOGIN_FLOOD_USER_WINDOW, name
  );
  if (!userAllowed) {
    res.status(429).json({
      error: { status: 429, message: 'Too many failed login attempts for this account. Try again later.' },
    });
    return;
  }

  const user = await authenticateUser(name, password);
  if (!user) {
    // Record failed attempt in flood table
    await floodRegister('user.failed_login_ip', ip, LOGIN_FLOOD_IP_WINDOW);
    await floodRegister('user.failed_login_user', name, LOGIN_FLOOD_USER_WINDOW);

    res.status(401).json({
      error: { status: 401, message: 'Invalid credentials' },
    });
    return;
  }

  // Successful login — clear flood entries for this user
  await floodClear('user.failed_login_user', name);

  const session = await createSession(user.uid!);
  res.json({
    data: {
      user,
      token: session.token,
      expires: session.expires,
    },
  });
}

/**
 * POST /api/auth/logout
 * Requires Bearer token.
 */
export async function logoutHandler(req: Req, res: Res): Promise<void> {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await destroySession(token);
  }
  res.status(204).send();
}

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
export async function registerHandler(req: Req, res: Res): Promise<void> {
  const { name, email, password } = (req.body ?? {}) as Record<string, string>;
  if (!name || !email || !password) {
    res.status(400).json({
      error: {
        status: 400,
        message: 'name, email, and password are required',
      },
    });
    return;
  }

  try {
    // First registered user automatically gets administrator role
    const { db } = await import('../db/index.js');
    const existingUsers = await db
      .select('users_field_data')
      .fields(['uid'])
      .execute<{ uid: number }>();
    const isFirstUser = existingUsers.length === 0;

    const user = await createUser({
      name,
      email,
      password,
      roles: isFirstUser ? ['authenticated', 'admin'] : ['authenticated'],
    });
    const session = await createSession(user.uid!);
    res.status(201).json({
      data: {
        user,
        token: session.token,
        expires: session.expires,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Registration failed';
    res.status(422).json({
      error: { status: 422, message },
    });
  }
}
