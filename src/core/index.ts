export { Entity } from './entity.js';
export type { EntityData } from './entity.js';

export { EntityQuery } from './entity-query.js';

export { EventBus } from './event-bus.js';

export {
  registerEntityType,
  getEntityTypeDefinition,
  getAllEntityTypes,
  getEntityTypesForType,
  unregisterEntityType,
  clearEntityTypeRegistry,
  NODE_BASE_FIELDS,
  MEDIA_BASE_FIELDS,
} from './entity-type.js';
export type {
  EntityTypeDefinition,
  FieldDefinition,
  DisplaySettings,
} from './entity-type.js';

export {
  loadModule,
  installModule,
  uninstallModule,
  getModule,
  getEnabledModules,
  getAllModules,
  getModuleRoutes,
  getModuleMiddleware,
  isModuleEnabled,
  onModuleChange,
  loadEntityTypesFromDir,
  clearModuleRegistry,
} from './module-loader.js';
export type { ModuleDefinition, ModuleContext, CoreModuleInfo, ModuleRoute, ModuleMiddleware } from './module-loader.js';

export {
  ensureConfigTable,
  saveConfig,
  loadConfig,
  loadAllConfig,
  deleteConfig,
  saveNodeTypeConfig,
  saveFieldStorageConfig,
  saveFieldInstanceConfig,
  saveTaxonomyVocabularyConfig,
} from './config-storage.js';

export {
  exportAllConfig,
  importConfig,
  exportConfigYaml,
  importConfigYaml,
  diffConfig,
} from './config-sync.js';

export {
  DRUPAL_NODE_TABLE,
  DRUPAL_NODE_FIELD_DATA_TABLE,
  DRUPAL_NODE_REVISION_TABLE,
  DRUPAL_NODE_FIELD_REVISION_TABLE,
  DRUPAL_TAXONOMY_TERM_DATA_TABLE,
  DRUPAL_TAXONOMY_TERM_FIELD_DATA_TABLE,
  DRUPAL_TAXONOMY_TERM_PARENT_TABLE,
  DRUPAL_MEDIA_TABLE,
  DRUPAL_MEDIA_FIELD_DATA_TABLE,
  DRUPAL_MEDIA_REVISION_TABLE,
  DRUPAL_MEDIA_FIELD_REVISION_TABLE,
  DRUPAL_CONFIG_TABLE,
  DRUPAL_KEY_VALUE_TABLE,
  DRUPAL_SEQUENCES_TABLE,
  DRUPAL_BLOCK_CONTENT_TABLE,
  DRUPAL_BLOCK_CONTENT_FIELD_DATA_TABLE,
  DRUPAL_BLOCK_CONTENT_REVISION_TABLE,
  DRUPAL_BLOCK_CONTENT_FIELD_REVISION_TABLE,
  DRUPAL_MENU_LINK_CONTENT_TABLE,
  DRUPAL_MENU_LINK_CONTENT_DATA_TABLE,
  DRUPAL_MENU_LINK_CONTENT_REVISION_TABLE,
  DRUPAL_FLOOD_TABLE,
  DRUPAL_HISTORY_TABLE,
  DRUPAL_MENU_TREE_TABLE,
  DRUPAL_BATCH_TABLE,
} from './drupal-schema.js';

export { createLogger, setLogLevel } from './logger.js';
export type { Logger, LogLevel } from './logger.js';

export {
  sendMail,
  sendTemplatedMail,
  sendPasswordResetEmail,
  sendContactNotification,
  sendRegistrationEmail,
  setMailTemplate,
  getMailTemplate,
  listMailTemplates,
  resetMailTemplate,
  sendWorkflowTransitionEmail,
} from './mail.js';
export type { MailMessage, MailTemplateResult, MailTemplateRenderer, MailTemplateContext, WorkflowTransitionMailData } from './mail.js';

export {
  ensureUrlAliasTable,
  createAlias,
  resolveAlias,
  getAliasForSource,
  deleteAlias,
  deleteAliasesBySource,
  listAliases,
  slugify,
  autoGenerateAlias,
} from './url-alias.js';
export type { UrlAlias } from './url-alias.js';

export { registerAliasHooks } from './alias-hooks.js';

export {
  ensureWebhooksTable,
  createWebhook,
  loadWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  registerWebhookHooks,
} from './webhooks.js';
export type { Webhook } from './webhooks.js';

export {
  ensureWatchdogTable,
  watchdog,
  severityLabel,
  SEVERITY_LEVELS,
} from './watchdog.js';
export type { WatchdogSeverity, WatchdogEntry, WatchdogOptions } from './watchdog.js';

export {
  ensureAccessLogTable,
  logAccess,
} from './access-log.js';

export {
  registerCronJob,
  unregisterCronJob,
  getCronJobs,
  runCron,
  startCron,
  stopCron,
  registerDefaultCronJobs,
  clearCronJobs,
} from './cron.js';
export type { CronJob } from './cron.js';

export {
  saveView,
  loadView,
  listViews,
  deleteView,
  executeView,
  getDefaultViews,
} from './views.js';
export type { ViewDefinition, ViewFilter, ViewSort, ViewField, ViewResult } from './views.js';

export {
  ensureKeyValueTable,
  stateGet,
  stateSet,
  stateDelete,
  stateGetMultiple,
  stateDeletePrefix,
} from './state.js';

export {
  ensureQueueTable,
  createQueueItem,
  claimQueueItem,
  deleteQueueItem,
  releaseQueueItem,
  getQueueCount,
  purgeQueue,
  listQueues,
  registerQueueWorker,
  unregisterQueueWorker,
  processQueueItem,
  processQueue,
  startQueueProcessor,
  stopQueueProcessor,
} from './queue.js';
export type { QueueItem, QueueWorker } from './queue.js';

export {
  ensureSearchIndex,
  indexEntity,
  removeFromIndex,
  searchIndex,
  isFtsAvailable,
  getActiveSearchBackend,
  rebuildSearchIndex,
  registerSearchHooks,
} from './search.js';

export {
  ensureCommentTables,
  createComment,
  loadComment,
  loadComments,
  updateComment,
  deleteComment,
  countComments,
  registerCommentEntityType,
  COMMENT_TABLE,
  COMMENT_FIELD_DATA_TABLE,
} from './comments.js';
export type { CommentData, CreateCommentInput } from './comments.js';

export {
  registerBlock,
  unregisterBlock,
  getBlock,
  getAllBlocks,
  clearBlockRegistry,
  saveBlockPlacement,
  loadBlockPlacement,
  listBlockPlacements,
  deleteBlockPlacement,
  saveThemeRegions,
  loadThemeRegions,
  getDefaultRegions,
  renderRegion,
  checkVisibility,
  registerDefaultBlocks,
} from './blocks.js';
export type {
  BlockDefinition,
  BlockContext,
  BlockContent,
  BlockPlacement,
  VisibilityCondition,
  RegionDefinition,
  ThemeRegions,
} from './blocks.js';

export {
  getCacheBin,
  cacheGet,
  cacheSet,
  cacheInvalidateTags,
  cacheClearAll,
  cacheStats,
  entityCacheTags,
  configCacheTags,
  registerCacheHooks,
} from './cache.js';

export {
  saveViewMode,
  loadViewMode,
  listViewModes,
  deleteViewMode,
  saveViewDisplay,
  loadViewDisplay,
  listViewDisplays,
  deleteViewDisplay,
  getOrCreateViewDisplay,
  applyViewDisplay,
  saveFormDisplay,
  loadFormDisplay,
  getOrCreateFormDisplay,
} from './display-modes.js';
export type {
  FieldDisplay,
  EntityViewDisplay,
  ViewMode,
  FieldFormDisplay,
  EntityFormDisplay,
} from './display-modes.js';

export {
  saveWorkflow,
  loadWorkflow,
  listWorkflows,
  deleteWorkflow,
  getWorkflowForBundle,
  getAvailableTransitions,
  applyTransition,
  getModerationHistory,
  seedDefaultWorkflow,
} from './workflow.js';
export type { Workflow, WorkflowState, WorkflowTransition } from './workflow.js';

export {
  getLanguages,
  getEnabledLanguages,
  getDefaultLanguage,
  setLanguageEnabled,
  addLanguage,
  updateLanguage,
  removeLanguage,
  getTranslationStatus,
  getExistingTranslations,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  negotiateLanguage,
} from './translation.js';
export type { Language, TranslationInfo } from './translation.js';

export {
  scheduleTransition,
  cancelScheduledTransition,
  getScheduledTransition,
  getUpcomingScheduledTransitions,
  processScheduledTransitions,
  registerSchedulerCronJob,
} from './scheduler.js';
export type { ScheduledTransition } from './scheduler.js';

export {
  getLayoutTypes,
  getLayoutType,
  saveLayout,
  loadLayout,
  deleteLayout,
  addSection,
  removeSection,
  addComponent,
  removeComponent,
  renderLayout,
} from './layout-builder.js';
export type {
  LayoutSection,
  LayoutComponent,
  LayoutRegion,
  LayoutTypeDefinition,
  LayoutRenderContext,
  RenderedComponent,
  RenderedSection,
} from './layout-builder.js';

export {
  acquireLock,
  releaseLock,
  checkLock,
  renewLock,
  breakLock,
  getActiveLocks,
  cleanExpiredLocks,
  registerLockCleanupCronJob,
} from './content-lock.js';
export type { ContentLock, LockResult } from './content-lock.js';

export {
  getPathautoPatterns,
  getPathautoPattern,
  savePathautoPattern,
  deletePathautoPattern,
  resolvePattern,
  generateAlias as pathautoGenerateAlias,
  bulkGenerateAliases,
  registerPathautoHooks,
} from './pathauto.js';
export type { PathautoPattern } from './pathauto.js';

export type {
  BatchOperation,
  BatchResult,
  BatchRequest,
  BatchResponse,
} from './batch.js';

export {
  ensureParagraphsTable,
  registerParagraphType,
  getParagraphType,
  getAllParagraphTypes,
  deleteParagraphType,
  createParagraph,
  loadParagraphs,
  loadParagraph,
  updateParagraph,
  deleteParagraph,
  reorderParagraphs,
  deleteParagraphsByParent,
  registerParagraphHooks,
  PARAGRAPHS_TABLE,
} from './paragraphs.js';
export type {
  ParagraphType,
  ParagraphTypeFieldDefinition,
  ParagraphItem,
} from './paragraphs.js';

export {
  validateEntity,
  getFieldConstraints,
  setFieldConstraints,
  removeFieldConstraints,
  registerValidationHooks,
  registerCustomValidator,
} from './validation.js';
export type {
  ConstraintType,
  FieldConstraint,
  ValidationError as FieldValidationError,
  ValidationResult,
} from './validation.js';

export {
  registerRestResource,
  getRestResource,
  getAllRestResources,
  unregisterRestResource,
  enableRestResource,
  disableRestResource,
} from './rest-resource.js';
export type { RestResource, RestResourceConfig, RestMethod } from './rest-resource.js';

export {
  ensurePreviewTable,
  createPreview,
  loadPreview,
  deletePreview,
  cleanExpiredPreviews,
  registerPreviewCleanupCronJob,
} from './preview.js';
export type { PreviewData } from './preview.js';

export {
  saveFieldGroup,
  loadFieldGroup,
  listFieldGroups,
  deleteFieldGroup,
  reorderFieldGroups,
  addFieldToGroup,
  removeFieldFromGroup,
  moveFieldBetweenGroups,
  getGroupedFieldLayout,
} from './field-group.js';
export type {
  GroupFormat,
  FieldGroup,
  FieldGroupSettings,
} from './field-group.js';

export {
  registerAction,
  unregisterAction,
  getAction,
  getAllActions,
  createTrigger,
  loadTrigger,
  listTriggers,
  updateTrigger,
  deleteTrigger,
  executeTrigger,
  matchesConditions,
  registerTriggerHooks,
  registerDefaultActions,
  ensureActionTriggersTable,
} from './actions.js';
export type {
  ActionDefinition,
  ActionContext,
  ActionTrigger,
} from './actions.js';

export {
  ensureContactTables,
  createContactForm,
  loadContactForm,
  listContactForms,
  updateContactForm,
  deleteContactForm,
  submitContactMessage,
  loadContactMessage,
  listContactMessages,
  updateMessageStatus,
  deleteContactMessage,
  countContactMessages,
} from './contact.js';
export type {
  ContactForm,
  ContactMessage,
} from './contact.js';

export {
  ensureShortcutTables,
  createShortcutSet,
  listShortcutSets,
  deleteShortcutSet,
  addShortcut,
  listShortcuts,
  updateShortcut,
  deleteShortcut,
  reorderShortcuts,
  getDefaultShortcuts,
} from './shortcuts.js';
export type {
  ShortcutSet,
  Shortcut,
} from './shortcuts.js';

export {
  ensureAuditLogTable,
  logAuditEntry,
  getAuditLog,
  getRecentAuditLog,
  registerAuditLogHooks,
} from './audit-log.js';
export type { AuditLogEntry, AuditLogQueryOptions } from './audit-log.js';

export { ensureDrupalCompat } from './drupal-compat.js';

export {
  ensureRedirectTable,
  createRedirect,
  updateRedirect,
  deleteRedirect,
  resolveRedirect,
  listRedirects,
  registerRedirectHooks,
} from './redirect.js';
export type { Redirect } from './redirect.js';

export {
  ensureFloodTable,
  floodRegister,
  floodIsAllowed,
  floodClear,
  floodPurgeExpired,
  registerFloodCronJob,
} from './flood.js';

export {
  registerTokenType,
  unregisterTokenType,
  getTokenTypes,
  getTokenInfo,
  replaceTokens,
  registerDefaultTokens,
} from './token.js';
export type {
  TokenType,
  TokenInfo,
  TokenData,
} from './token.js';
