import type { IdMapEntry } from './types.js';

export class IdMap {
  private map = new Map<string, number>();

  private key(entityType: string, sourceId: number): string {
    return `${entityType}:${sourceId}`;
  }

  set(entityType: string, sourceId: number, targetId: number): void {
    this.map.set(this.key(entityType, sourceId), targetId);
  }

  get(entityType: string, sourceId: number): number | undefined {
    return this.map.get(this.key(entityType, sourceId));
  }

  has(entityType: string, sourceId: number): boolean {
    return this.map.has(this.key(entityType, sourceId));
  }

  getAll(): IdMapEntry[] {
    const entries: IdMapEntry[] = [];
    for (const [key, targetId] of this.map) {
      const [sourceEntityType, sourceIdStr] = key.split(':');
      entries.push({
        sourceEntityType,
        sourceId: parseInt(sourceIdStr, 10),
        targetEntityType: sourceEntityType,
        targetId,
      });
    }
    return entries;
  }

  size(): number {
    return this.map.size;
  }
}
