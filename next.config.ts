import type { NextConfig } from 'next';
import path from 'node:path';
import fs from 'node:fs';

const nextConfig: NextConfig = {
  webpack: (config, { isServer, dev }) => {
    // The core codebase uses Node.js ESM-style .js extensions in TypeScript
    // imports (e.g. `import { foo } from './bar.js'`). Next.js webpack needs
    // to resolve these to .ts files.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };

    // No custom externals needed — all server code is bundled by webpack.
    // globalThis.__dropjs_* singletons ensure state is shared across
    // webpack module boundaries (server components, API routes, server actions).

    return config;
  },
  serverExternalPackages: ['knex', 'better-sqlite3', 'pg'],
};

export default nextConfig;
