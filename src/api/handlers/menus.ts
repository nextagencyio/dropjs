import type { Request, Response } from '../types.js';
import { loadConfig, saveConfig } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  weight: number;
  parent: string | null;
  enabled: boolean;
  expanded: boolean;
  description?: string;
}

export interface MenuDefinition {
  id: string;
  label: string;
  description?: string;
  items: MenuItem[];
}

const DEFAULT_MENUS: MenuDefinition[] = [
  {
    id: 'main',
    label: 'Main navigation',
    description: 'Site-wide navigation links',
    items: [
      { id: 'home', title: 'Home', url: '/', weight: 0, parent: null, enabled: true, expanded: false, description: '' },
    ],
  },
  {
    id: 'footer',
    label: 'Footer',
    description: 'Links displayed in the site footer',
    items: [],
  },
];

async function loadMenus(): Promise<MenuDefinition[]> {
  const config = await loadConfig('system.menus');
  if (config && typeof config === 'object' && Array.isArray((config as any).menus)) {
    return (config as any).menus;
  }
  return DEFAULT_MENUS;
}

async function saveMenus(menus: MenuDefinition[]): Promise<void> {
  await saveConfig('system.menus', { menus });
}

function findMenu(menus: MenuDefinition[], menuId: string): MenuDefinition | undefined {
  return menus.find((m) => m.id === menuId);
}

// --- Handlers ---

export async function handleListMenus(
  _req: Request,
  res: Response
): Promise<void> {
  const menus = await loadMenus();
  res.json({
    data: menus.map((m) => ({
      id: m.id,
      label: m.label,
      description: m.description,
      item_count: m.items.length,
    })),
  });
}

export async function handleGetMenu(
  req: Request,
  res: Response
): Promise<void> {
  const { menuId } = req.params;
  const menus = await loadMenus();
  const menu = findMenu(menus, menuId);
  if (!menu) throw new NotFoundError(`Menu "${menuId}" not found`);

  // Build tree from flat items
  const tree = buildMenuTree(menu.items);
  res.json({ data: { ...menu, tree } });
}

export async function handleCreateMenu(
  req: Request,
  res: Response
): Promise<void> {
  const { id, label, description } = req.body;
  if (!id || !label) throw new BadRequestError('id and label are required');
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new BadRequestError('Menu id must be lowercase alphanumeric with underscores');
  }

  const menus = await loadMenus();
  if (findMenu(menus, id)) {
    throw new BadRequestError(`Menu "${id}" already exists`);
  }

  const newMenu: MenuDefinition = { id, label, description: description ?? '', items: [] };
  menus.push(newMenu);
  await saveMenus(menus);
  res.status(201).json({ data: newMenu });
}

export async function handleDeleteMenu(
  req: Request,
  res: Response
): Promise<void> {
  const { menuId } = req.params;
  if (menuId === 'main') throw new BadRequestError('Cannot delete the main menu');

  const menus = await loadMenus();
  const idx = menus.findIndex((m) => m.id === menuId);
  if (idx === -1) throw new NotFoundError(`Menu "${menuId}" not found`);

  menus.splice(idx, 1);
  await saveMenus(menus);
  res.status(204).send();
}

export async function handleAddMenuItem(
  req: Request,
  res: Response
): Promise<void> {
  const { menuId } = req.params;
  const { title, url, weight, parent, enabled, expanded, description } = req.body;
  if (!title || !url) throw new BadRequestError('title and url are required');

  const menus = await loadMenus();
  const menu = findMenu(menus, menuId);
  if (!menu) throw new NotFoundError(`Menu "${menuId}" not found`);

  const id = `${menuId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const item: MenuItem = {
    id,
    title,
    url,
    weight: weight ?? 0,
    parent: parent ?? null,
    enabled: enabled !== false,
    expanded: expanded === true,
    description: description || '',
  };

  menu.items.push(item);
  menu.items.sort((a, b) => a.weight - b.weight);
  await saveMenus(menus);
  res.status(201).json({ data: item });
}

export async function handleUpdateMenuItem(
  req: Request,
  res: Response
): Promise<void> {
  const { menuId, itemId } = req.params;

  const menus = await loadMenus();
  const menu = findMenu(menus, menuId);
  if (!menu) throw new NotFoundError(`Menu "${menuId}" not found`);

  const item = menu.items.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError(`Menu item "${itemId}" not found`);

  if (req.body.title !== undefined) item.title = req.body.title;
  if (req.body.url !== undefined) item.url = req.body.url;
  if (req.body.weight !== undefined) item.weight = req.body.weight;
  if (req.body.parent !== undefined) item.parent = req.body.parent;
  if (req.body.enabled !== undefined) item.enabled = req.body.enabled;
  if (req.body.expanded !== undefined) item.expanded = req.body.expanded;
  if (req.body.description !== undefined) item.description = req.body.description;

  menu.items.sort((a, b) => a.weight - b.weight);
  await saveMenus(menus);
  res.json({ data: item });
}

export async function handleDeleteMenuItem(
  req: Request,
  res: Response
): Promise<void> {
  const { menuId, itemId } = req.params;

  const menus = await loadMenus();
  const menu = findMenu(menus, menuId);
  if (!menu) throw new NotFoundError(`Menu "${menuId}" not found`);

  const idx = menu.items.findIndex((i) => i.id === itemId);
  if (idx === -1) throw new NotFoundError(`Menu item "${itemId}" not found`);

  // Also remove child items
  const toRemove = new Set<string>([itemId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of menu.items) {
      if (item.parent && toRemove.has(item.parent) && !toRemove.has(item.id)) {
        toRemove.add(item.id);
        changed = true;
      }
    }
  }

  menu.items = menu.items.filter((i) => !toRemove.has(i.id));
  await saveMenus(menus);
  res.status(204).send();
}

export async function handleReorderMenuItems(
  req: Request,
  res: Response
): Promise<void> {
  const { menuId } = req.params;
  const { items } = req.body;
  if (!Array.isArray(items)) throw new BadRequestError('items array is required');

  const menus = await loadMenus();
  const menu = findMenu(menus, menuId);
  if (!menu) throw new NotFoundError(`Menu "${menuId}" not found`);

  // Update weight and parent from the reorder payload
  for (const update of items) {
    const item = menu.items.find((i) => i.id === update.id);
    if (item) {
      if (update.weight !== undefined) item.weight = update.weight;
      if (update.parent !== undefined) item.parent = update.parent;
    }
  }

  menu.items.sort((a, b) => a.weight - b.weight);
  await saveMenus(menus);
  res.json({ data: menu.items });
}

// --- Tree builder ---

interface MenuTreeItem extends MenuItem {
  children: MenuTreeItem[];
}

function buildMenuTree(items: MenuItem[]): MenuTreeItem[] {
  const map = new Map<string, MenuTreeItem>();
  const roots: MenuTreeItem[] = [];

  // Initialize tree items
  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  // Build tree
  for (const item of items) {
    const treeItem = map.get(item.id)!;
    if (item.parent && map.has(item.parent)) {
      map.get(item.parent)!.children.push(treeItem);
    } else {
      roots.push(treeItem);
    }
  }

  return roots;
}
