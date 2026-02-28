import type { AnalysisReport } from './types.js';
import { getFieldTypeMap } from './field-type-map.js';

export function formatAnalysisReport(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push('=== Drupal Database Analysis ===\n');
  lines.push(`Total nodes: ${report.totalNodes}`);
  lines.push(`Total taxonomy terms: ${report.totalTerms}`);
  lines.push(`Field storages: ${report.fieldStorages.length}\n`);

  lines.push('--- Content Types ---');
  for (const ct of report.contentTypes) {
    lines.push(`  ${ct.name} (${ct.type}): ${ct.nodeCount} nodes`);
    if (ct.description) lines.push(`    ${ct.description}`);
    for (const field of ct.fields) {
      lines.push(`    - ${field.field_name} [${field.field_type}] "${field.label}"${field.required ? ' (required)' : ''}`);
    }
  }

  lines.push('\n--- Vocabularies ---');
  for (const vocab of report.vocabularies) {
    lines.push(`  ${vocab.name} (${vocab.vid}): ${vocab.termCount} terms`);
  }

  if (report.paragraphTypes.length > 0) {
    lines.push('\n--- Paragraph Types ---');
    for (const para of report.paragraphTypes) {
      lines.push(`  ${para.type}: ${para.count} items`);
      for (const field of para.fields) {
        lines.push(`    - ${field.field_name} [${field.field_type}] "${field.label}"`);
      }
    }
  }

  lines.push('\n--- Field Type Mapping ---');
  const map = getFieldTypeMap();
  const usedTypes = new Set(report.fieldStorages.map((s) => s.type));
  for (const type of usedTypes) {
    const mapped = map[type];
    lines.push(`  ${type} -> ${mapped?.type ?? 'json (fallback)'}`);
  }

  lines.push('');
  return lines.join('\n');
}
