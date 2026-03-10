import { getModules } from '@/lib/server/data';

export default async function HelpPage() {
  const modules = await getModules();

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-tight mb-1 text-gin-title">
        Help
      </h1>
      <p className="text-gin-text-light text-sm mb-6">
        Get help with using and extending drop.js.
      </p>

      {/* Getting started */}
      <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
        <h2 className="text-lg font-semibold text-gin-title mb-3">
          Getting started
        </h2>
        <p className="text-sm text-gin-text leading-relaxed">
          drop.js is a modern content management framework built on Node.js with
          a Drupal-compatible entity and field system. It provides a structured
          approach to content modeling with support for custom entity types,
          fields, taxonomy vocabularies, user management, and a RESTful JSON API.
          Use the administration pages to create content, define content types,
          manage users, and configure your site.
        </p>
      </div>

      {/* Administration pages */}
      <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
        <h2 className="text-lg font-semibold text-gin-title mb-3">
          Administration pages
        </h2>
        <div className="space-y-3">
          {adminSections.map((section) => (
            <div key={section.name}>
              <h3 className="text-sm font-medium text-gin-title">
                {section.name}
              </h3>
              <p className="text-sm text-gin-text-light">{section.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Module help */}
      <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
        <h2 className="text-lg font-semibold text-gin-title mb-3">
          Module help
        </h2>
        {modules.length > 0 ? (
          <div className="space-y-3">
            {modules.map((mod) => (
              <div key={mod.name}>
                <h3 className="text-sm font-medium text-gin-title">
                  {mod.label}
                  <span className="ml-2 text-[11px] text-gin-text-light font-normal">
                    v{mod.version}
                  </span>
                </h3>
                <p className="text-sm text-gin-text-light">
                  {mod.description || 'No description available.'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gin-text-light">No modules found.</p>
        )}
      </div>

      {/* API documentation */}
      <div className="bg-white border border-gin-border rounded-gin p-6">
        <h2 className="text-lg font-semibold text-gin-title mb-3">
          API documentation
        </h2>
        <p className="text-sm text-gin-text mb-3">
          drop.js provides a RESTful JSON API for programmatic access to all
          content and configuration.
        </p>
        <a
          href="/api/docs"
          className="text-sm text-gin-primary hover:underline font-medium"
        >
          View API documentation
        </a>
      </div>
    </div>
  );
}

const adminSections = [
  { name: 'Content', description: 'Create and manage content items like articles and pages.' },
  { name: 'Structure', description: 'Define content types, manage fields, and configure taxonomies.' },
  { name: 'Appearance', description: 'Manage the visual presentation and theming of your site.' },
  { name: 'Extend', description: 'Enable and disable modules to extend site functionality.' },
  { name: 'Configuration', description: 'Configure site settings, media handling, and system behavior.' },
  { name: 'People', description: 'Manage user accounts, roles, and permissions.' },
  { name: 'Reports', description: 'View system status, logs, and site analytics.' },
];
