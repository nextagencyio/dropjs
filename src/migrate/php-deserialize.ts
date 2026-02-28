import { unserialize } from 'php-serialize';

export function deserializePhp(data: string | Buffer): Record<string, unknown> {
  const str = typeof data === 'string' ? data : data.toString('utf-8');
  return unserialize(str) as Record<string, unknown>;
}
