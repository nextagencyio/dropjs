export interface PermissionDefinition {
  title: string;
  description?: string;
  restrict?: boolean;
}

// Stored on globalThis so webpack-externalized and tsx-loaded modules share the same instance.
const g = globalThis as unknown as { __dropjs_permission_registry?: Map<string, PermissionDefinition> };
if (!g.__dropjs_permission_registry) {
  g.__dropjs_permission_registry = new Map<string, PermissionDefinition>();
}
const permissionRegistry = g.__dropjs_permission_registry;

export function definePermissions(
  permissions: Record<string, PermissionDefinition>
): void {
  for (const [name, def] of Object.entries(permissions)) {
    permissionRegistry.set(name, def);
  }
}

export function getPermission(name: string): PermissionDefinition | undefined {
  return permissionRegistry.get(name);
}

export function getAllPermissions(): Map<string, PermissionDefinition> {
  return new Map(permissionRegistry);
}

export function clearPermissionRegistry(): void {
  permissionRegistry.clear();
}

// Define core content permissions
definePermissions({
  // Content viewing
  'access content': {
    title: 'View published content',
    description: 'Allows viewing of published entities',
  },
  'view own unpublished content': {
    title: 'View own unpublished content',
    description: 'Allows users to view their own unpublished content',
  },
  'view any unpublished content': {
    title: 'View any unpublished content',
    description: 'Allows viewing all unpublished content',
    restrict: true,
  },

  // Content creation
  'create content': {
    title: 'Create new content',
    description: 'Allows creating content of any type',
  },

  // Content editing
  'edit own content': {
    title: 'Edit own content',
    description: 'Allows editing content authored by the user',
  },
  'edit any content': {
    title: 'Edit any content',
    description: 'Allows editing any content regardless of author',
    restrict: true,
  },

  // Content deletion
  'delete own content': {
    title: 'Delete own content',
    description: 'Allows deleting content authored by the user',
  },
  'delete any content': {
    title: 'Delete any content',
    description: 'Allows deleting any content regardless of author',
    restrict: true,
  },

  // Administration
  'administer nodes': {
    title: 'Administer content',
    description: 'Full content administration including structure changes',
    restrict: true,
  },
  'administer users': {
    title: 'Administer users',
    description: 'Full user and role administration',
    restrict: true,
  },
  'administer taxonomy': {
    title: 'Administer taxonomy',
    description: 'Create, edit, and delete vocabularies and terms',
    restrict: true,
  },
  'administer site': {
    title: 'Administer site configuration',
    description: 'Change site settings, themes, modules, and configuration',
    restrict: true,
  },

  // Revision management
  'view revisions': {
    title: 'View revisions',
    description: 'View content revision history',
  },
  'revert revisions': {
    title: 'Revert revisions',
    description: 'Revert content to a previous revision',
    restrict: true,
  },

  // Comments
  'administer comments': {
    title: 'Administer comments',
    description: 'Create, edit, and delete any comments',
    restrict: true,
  },
  'post comments': {
    title: 'Post comments',
    description: 'Create new comments on content',
  },

  // Blocks
  'administer blocks': {
    title: 'Administer blocks',
    description: 'Configure block layout and placements',
    restrict: true,
  },

  // Media
  'upload files': {
    title: 'Upload files',
    description: 'Upload files and media to the system',
  },
  'delete any file': {
    title: 'Delete any file',
    description: 'Remove any uploaded file',
    restrict: true,
  },
});
