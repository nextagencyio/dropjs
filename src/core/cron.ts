import { EventBus } from './event-bus.js';
import { createLogger } from './logger.js';

const logger = createLogger('cron');

export interface CronJob {
  name: string;
  interval: number; // milliseconds
  handler: () => Promise<void> | void;
  lastRun?: number;
}

interface RegisteredJob extends CronJob {
  lastRun: number;
}

// Stored on globalThis for webpack module sharing.
const gCron = globalThis as unknown as {
  __dropjs_cron_jobs?: Map<string, RegisteredJob>;
  __dropjs_cron_timer?: ReturnType<typeof setInterval> | null;
  __dropjs_cron_running?: boolean;
};
if (!gCron.__dropjs_cron_jobs) gCron.__dropjs_cron_jobs = new Map<string, RegisteredJob>();
const jobs = gCron.__dropjs_cron_jobs;

function getCronTimer() { return gCron.__dropjs_cron_timer ?? null; }
function setCronTimer(t: ReturnType<typeof setInterval> | null) { gCron.__dropjs_cron_timer = t; }
function isCronRunning() { return gCron.__dropjs_cron_running ?? false; }
function setCronRunning(v: boolean) { gCron.__dropjs_cron_running = v; }

/**
 * Register a cron job.
 * @param name Unique identifier for the job
 * @param interval How often to run in milliseconds
 * @param handler The function to execute
 */
export function registerCronJob(
  name: string,
  interval: number,
  handler: () => Promise<void> | void
): void {
  jobs.set(name, { name, interval, handler, lastRun: 0 });
}

/**
 * Unregister a cron job.
 */
export function unregisterCronJob(name: string): void {
  jobs.delete(name);
}

/**
 * Get all registered cron jobs with their status.
 */
export function getCronJobs(): Array<{
  name: string;
  interval: number;
  lastRun: number;
  nextRun: number;
}> {
  const now = Date.now();
  return [...jobs.values()].map((job) => ({
    name: job.name,
    interval: job.interval,
    lastRun: job.lastRun,
    nextRun: job.lastRun === 0 ? now : job.lastRun + job.interval,
  }));
}

/**
 * Run all cron jobs that are due.
 * Also emits `system:cron` on the EventBus so modules can hook in.
 */
export async function runCron(): Promise<{ ran: string[]; errors: string[] }> {
  if (isCronRunning()) {
    return { ran: [], errors: ['Cron already running'] };
  }

  setCronRunning(true);
  const now = Date.now();
  const ran: string[] = [];
  const errors: string[] = [];

  try {
    // Run registered jobs that are due
    for (const job of jobs.values()) {
      if (now - job.lastRun >= job.interval) {
        try {
          await job.handler();
          job.lastRun = now;
          ran.push(job.name);
        } catch (err) {
          const msg = `Cron job "${job.name}" failed: ${err instanceof Error ? err.message : String(err)}`;
          logger.error(msg);
          errors.push(msg);
          job.lastRun = now; // Don't retry immediately on failure
        }
      }
    }

    // Emit system:cron event for modules that registered via EventBus
    await EventBus.emit('system:cron', { timestamp: now });
  } finally {
    setCronRunning(false);
  }

  if (ran.length > 0) {
    logger.info(`Cron completed: ${ran.length} jobs ran [${ran.join(', ')}]`);
  }

  return { ran, errors };
}

/**
 * Start the cron scheduler.
 * Checks every `tickInterval` ms (default 60s) and runs due jobs.
 */
export function startCron(tickInterval: number = 60_000): void {
  if (getCronTimer()) return; // Already running

  logger.info(`Cron scheduler started (tick every ${tickInterval / 1000}s)`);

  // Run immediately on start
  runCron().catch((err) => {
    logger.error(`Cron tick failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  setCronTimer(setInterval(() => {
    runCron().catch((err) => {
      logger.error(`Cron tick failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, tickInterval));
}

/**
 * Stop the cron scheduler.
 */
export function stopCron(): void {
  const timer = getCronTimer();
  if (timer) {
    clearInterval(timer);
    setCronTimer(null);
    logger.info('Cron scheduler stopped');
  }
}

/**
 * Register default cron jobs (session cleanup, log rotation, etc.)
 */
export function registerDefaultCronJobs(): void {
  // Clean expired sessions every 15 minutes
  registerCronJob('session_cleanup', 15 * 60 * 1000, async () => {
    try {
      const { cleanExpiredSessions } = await import('../auth/index.js');
      await cleanExpiredSessions();
    } catch {
      // Auth package may not be available
    }
  });

  // Clean expired password reset tokens every hour
  registerCronJob('password_reset_cleanup', 60 * 60 * 1000, async () => {
    try {
      const { cleanExpiredResetTokens } = await import('../auth/index.js');
      await cleanExpiredResetTokens();
    } catch {
      // Auth package may not be available
    }
  });
}

/**
 * Clear all registered jobs and stop the scheduler (for testing).
 */
export function clearCronJobs(): void {
  stopCron();
  jobs.clear();
}
