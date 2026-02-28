import type { Request, Response } from '../types.js';
import { getEnabledModules, getAllModules, saveConfig, loadConfig } from '../../core/index.js';
import { NotFoundError, BadRequestError } from '../errors.js';

const MODULE_CONFIG_KEY = 'core.extension';

async function loadModuleStates(): Promise<Record<string, boolean>> {
  const config = await loadConfig(MODULE_CONFIG_KEY);
  if (!config || !config.modules) return {};
  return config.modules as Record<string, boolean>;
}

async function saveModuleStates(states: Record<string, boolean>): Promise<void> {
  await saveConfig(MODULE_CONFIG_KEY, { modules: states });
}

export async function listModules(
  _req: Request,
  res: Response
): Promise<void> {
  const allModules = getAllModules();
  const enabledNames = new Set(getEnabledModules().map((m) => m.name));
  const persisted = await loadModuleStates();

  const data = allModules.map((m) => {
    if (m.required) return { ...m, enabled: true };
    // Use persisted state if available, otherwise fall back to in-memory registry
    const enabled = persisted[m.name] !== undefined
      ? persisted[m.name]
      : enabledNames.has(m.name);
    return { ...m, enabled };
  });

  res.json({ data });
}

export async function enableModule(
  req: Request,
  res: Response
): Promise<void> {
  const { name } = req.params;
  const allModules = getAllModules();
  const mod = allModules.find((m) => m.name === name);
  if (!mod) {
    throw new NotFoundError(`Module "${name}" not found`);
  }

  const states = await loadModuleStates();
  states[name] = true;
  await saveModuleStates(states);

  res.json({ data: { ...mod, enabled: true } });
}

export async function disableModule(
  req: Request,
  res: Response
): Promise<void> {
  const { name } = req.params;
  const allModules = getAllModules();
  const mod = allModules.find((m) => m.name === name);
  if (!mod) {
    throw new NotFoundError(`Module "${name}" not found`);
  }
  if (mod.required) {
    throw new BadRequestError(`Module "${name}" is required and cannot be disabled`);
  }

  const states = await loadModuleStates();
  states[name] = false;
  await saveModuleStates(states);

  res.json({ data: { ...mod, enabled: false } });
}
