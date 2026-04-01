export { hashPassword, verifyPassword } from './password.js';

export {
  createUser,
  loadUser,
  loadUserByName,
  loadUserByEmail,
  updateUser,
  deleteUser,
  authenticateUser,
  ensureAuthTables,
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPasswordWithToken,
} from './user.js';
export type { UserData, UserCreateInput } from './user.js';

export {
  generateToken,
  createSession,
  validateToken,
  destroySession,
  destroyUserSessions,
  cleanExpiredSessions,
} from './session.js';
export type { Session } from './session.js';

export {
  definePermissions,
  getPermission,
  getAllPermissions,
  clearPermissionRegistry,
  registerBundlePermissions,
} from './permissions.js';
export type { PermissionDefinition } from './permissions.js';

export {
  userHasPermission,
  roleHasPermission,
  assignRolePermission,
  removeRolePermission,
  createRole,
  deleteRole,
  loadAllRoles,
  loadRole,
  updateRolePermissions,
  seedDefaultRoles,
} from './access.js';
export type { RoleConfig } from './access.js';

export { authenticate, requireAuth, requirePermission } from './middleware.js';

export { checkEntityAccess } from './entity-access.js';
export type { EntityOperation, EntityAccessContext } from './entity-access.js';

