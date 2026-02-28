'use client';

import Link from 'next/link';

const categories = [
  {
    title: 'System',
    items: [
      {
        label: 'Site information',
        description: 'Basic site settings: name, slogan, email',
        to: '/config/site',
      },
    ],
  },
  {
    title: 'Content authoring',
    items: [
      {
        label: 'Text formats and editors',
        description: 'Configure text processing and editor settings',
        to: '/config/text-formats',
      },
      {
        label: 'Layout Builder',
        description: 'Configure page layouts for entity type view modes',
        to: '/config/layout-builder',
      },
    ],
  },
  {
    title: 'Media',
    items: [
      {
        label: 'Image styles',
        description: 'Configure image processing',
        to: '/config/image-styles',
      },
    ],
  },
  {
    title: 'People',
    items: [
      {
        label: 'Account settings',
        description: 'User registration and management',
        to: '/people',
      },
    ],
  },
  {
    title: 'Regional and language',
    items: [
      {
        label: 'Languages',
        description: 'Configure languages for multilingual content translation',
        to: '/config/languages',
      },
    ],
  },
  {
    title: 'Web services',
    items: [
      {
        label: 'Webhooks',
        description: 'Manage HTTP webhooks for entity and system events',
        to: '/config/webhooks',
      },
      {
        label: 'REST resources',
        description: 'Manage REST resource plugins that provide custom API endpoints',
        to: '/config/rest-resources',
      },
    ],
  },
  {
    title: 'Automation',
    items: [
      {
        label: 'Actions & Triggers',
        description: 'Configure automated actions triggered by system events',
        to: '/config/actions',
      },
      {
        label: 'Contact forms',
        description: 'Manage contact forms and submitted messages',
        to: '/config/contact',
      },
      {
        label: 'Shortcuts',
        description: 'Manage your personal admin toolbar shortcuts',
        to: '/config/shortcuts',
      },
    ],
  },
  {
    title: 'Development',
    items: [
      {
        label: 'Logging and errors',
        description: 'Site reports and status',
        to: '/reports/status',
      },
    ],
  },
  {
    title: 'Search and metadata',
    items: [
      {
        label: 'URL aliases',
        description: 'Manage URL path aliases',
        to: '/config/url-aliases',
      },
      {
        label: 'URL alias patterns (Pathauto)',
        description: 'Configure automatic URL alias generation per content type',
        to: '/config/pathauto',
      },
    ],
  },
];

export default function ConfigurationPage() {
  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-1">
        Configuration
      </h1>
      <p className="text-gin-text-light text-sm mb-6">
        Administer your site configuration.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((category) => (
          <div
            key={category.title}
            className="bg-white rounded-gin-l border border-gin-border p-5"
          >
            <h2 className="font-semibold text-gin-title mb-3">
              {category.title}
            </h2>
            <div className="space-y-2">
              {category.items.map((item) =>
                item.to ? (
                  <Link
                    key={item.label}
                    href={item.to}
                    className="block py-1.5 group"
                  >
                    <span className="text-sm text-gin-primary group-hover:underline font-medium">
                      {item.label}
                    </span>
                    <p className="text-xs text-gin-text-light mt-0.5">
                      {item.description}
                    </p>
                  </Link>
                ) : (
                  <div key={item.label} className="py-1.5">
                    <span className="text-sm text-gin-text-light font-medium">
                      {item.label}
                    </span>
                    <p className="text-xs text-gin-text-light mt-0.5">
                      {item.description}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
