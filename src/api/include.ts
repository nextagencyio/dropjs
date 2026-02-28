import { Entity, getEntityTypeDefinition } from '../core/index.js';

/**
 * Expand entity_reference fields inline in response data.
 * For ?include=field_tags,field_category
 */
export async function expandReferences(
  entityType: string,
  bundle: string,
  data: Record<string, unknown>[],
  includes: string[]
): Promise<Record<string, unknown>[]> {
  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) return data;

  for (const fieldName of includes) {
    const fieldDef = definition.fields[fieldName];
    if (!fieldDef || fieldDef.type !== 'entity_reference') continue;

    const targetType =
      (fieldDef.settings?.target_type as string) ??
      (fieldDef.target_type as string | undefined);
    if (!targetType) continue;

    // Collect all referenced IDs across all entities
    const allRefIds = new Set<number>();
    for (const item of data) {
      const refValue = item[fieldName];
      if (Array.isArray(refValue)) {
        for (const id of refValue) {
          if (typeof id === 'number') allRefIds.add(id);
        }
      } else if (typeof refValue === 'number') {
        allRefIds.add(refValue);
      }
    }

    if (allRefIds.size === 0) continue;

    // Batch load all referenced entities
    const refEntities = await Entity.loadMultiple(targetType, [...allRefIds]);
    const refMap = new Map(refEntities.map((e) => [e.nid!, e.toJSON()]));

    // Replace IDs with expanded entity data
    for (const item of data) {
      const refValue = item[fieldName];
      if (Array.isArray(refValue)) {
        item[fieldName] = refValue.map((id) =>
          typeof id === 'number' ? (refMap.get(id) ?? id) : id
        );
      } else if (typeof refValue === 'number') {
        item[fieldName] = refMap.get(refValue) ?? refValue;
      }
    }
  }

  return data;
}
