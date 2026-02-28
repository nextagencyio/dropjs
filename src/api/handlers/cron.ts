import type { Request, Response } from '../types.js';
import { runCron, getCronJobs } from '../../core/index.js';

export async function handleRunCron(
  _req: Request,
  res: Response
): Promise<void> {
  const result = await runCron();
  res.json({
    data: {
      ran: result.ran,
      errors: result.errors,
      timestamp: Date.now(),
    },
  });
}

export async function handleGetCronStatus(
  _req: Request,
  res: Response
): Promise<void> {
  const jobs = getCronJobs();
  res.json({ data: jobs });
}
