import type { Request, Response } from '../types.js';
import { getAllEntityTypes, severityLabel } from '../../core/index.js';
import { db, getConnection } from '../../db/index.js';

export async function getStatusReport(
  _req: Request,
  res: Response
): Promise<void> {
  let databaseStatus = 'ok';
  let databaseType = 'unknown';
  let totalNodes = 0;
  let totalUsers = 0;

  try {
    const { getConnection } = await import('../../db/index.js');
    const conn = getConnection();
    databaseType = (conn.client as { config?: { client?: string } })?.config?.client ?? 'unknown';
    await conn.raw('SELECT 1');
  } catch {
    databaseStatus = 'error';
  }

  try {
    const nodeRows = await db
      .select('node_field_data')
      .fields(['nid'])
      .execute<{ nid: number }>();
    totalNodes = nodeRows.length;
  } catch {
    // Table may not exist yet
  }

  try {
    const userRows = await db
      .select('users')
      .fields(['uid'])
      .execute<{ uid: number }>();
    totalUsers = userRows.length;
  } catch {
    // Table may not exist yet
  }

  const entityTypes = getAllEntityTypes();

  res.json({
    data: {
      dropjs_version: '0.1.0',
      node_version: process.version,
      database_type: databaseType,
      database_status: databaseStatus,
      entity_types_count: entityTypes.length,
      total_nodes: totalNodes,
      total_users: totalUsers,
      uptime: process.uptime(),
      platform: process.platform,
      memory: process.memoryUsage(),
    },
  });
}

export async function getLogs(
  req: Request,
  res: Response,
): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
  const offset = (page - 1) * limit;
  const typeFilter = req.query.type as string | undefined;
  const severityFilter = req.query.severity as string | undefined;

  let query = db.select('watchdog').fields([
    'wid', 'uid', 'type', 'message', 'variables', 'severity',
    'link', 'location', 'referer', 'hostname', 'timestamp',
  ]);

  if (typeFilter) {
    query = query.condition('type', typeFilter);
  }
  if (severityFilter !== undefined && severityFilter !== '') {
    query = query.condition('severity', parseInt(severityFilter, 10));
  }

  query = query.orderBy('wid', 'DESC').range(offset, limit);

  const rows = await query.execute<{
    wid: number;
    uid: number;
    type: string;
    message: string;
    variables: string | null;
    severity: number;
    link: string;
    location: string;
    referer: string;
    hostname: string;
    timestamp: number;
  }>();

  // Get total count for pagination
  const conn = getConnection();
  let countQuery = conn('watchdog').count('* as total');
  if (typeFilter) {
    countQuery = countQuery.where('type', typeFilter);
  }
  if (severityFilter !== undefined && severityFilter !== '') {
    countQuery = countQuery.where('severity', parseInt(severityFilter, 10));
  }
  const countResult = await countQuery;
  const total = (countResult[0] as { total: number }).total;

  // Get distinct types for filter dropdown
  const typeRows = await conn('watchdog').distinct('type').orderBy('type');
  const types = typeRows.map((r: { type: string }) => r.type);

  res.json({
    data: rows.map((row) => ({
      ...row,
      severity_label: severityLabel(row.severity),
    })),
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      types,
    },
  });
}

export async function clearLogs(
  _req: Request,
  res: Response,
): Promise<void> {
  await db.delete('watchdog').execute();
  res.status(204).send();
}

export async function getTopPages(
  req: Request,
  res: Response,
): Promise<void> {
  const period = req.query.period as string || '7d';
  let since = 0;
  const now = Math.floor(Date.now() / 1000);

  switch (period) {
    case 'today':
      since = now - 86400;
      break;
    case '7d':
      since = now - 7 * 86400;
      break;
    case '30d':
      since = now - 30 * 86400;
      break;
    case 'all':
      since = 0;
      break;
    default:
      since = now - 7 * 86400;
  }

  const conn = getConnection();
  let query = conn('access_log')
    .select('path')
    .count('* as hits')
    .groupBy('path')
    .orderBy('hits', 'desc')
    .limit(100);

  if (since > 0) {
    query = query.where('timestamp', '>=', since);
  }

  const rows = await query;

  res.json({
    data: rows as Array<{ path: string; hits: number }>,
    meta: { period },
  });
}
