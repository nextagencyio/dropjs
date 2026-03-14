import type { NextConfig } from 'next';
import path from 'node:path';
import fs from 'node:fs';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // The core codebase uses Node.js ESM-style .js extensions in TypeScript
    // imports (e.g. `import { foo } from './bar.js'`). Next.js webpack needs
    // to resolve these to .ts files.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };

    if (isServer && !process.env.VERCEL) {
      // In local dev (tsx), externalize our core server modules so they're
      // resolved at runtime via Node.js require(). This ensures that Next.js
      // server components share the same module instances (and singletons like
      // DB connections, entity registries, session secrets) as the API handler.
      //
      // On Vercel there is no tsx loader, so we let webpack bundle everything.
      // The globalThis.__dropjs_* singletons ensure state is still shared.
      const coreDirs = ['api', 'core', 'auth', 'db', 'field'].map(
        (d) => path.resolve(__dirname, 'src', d)
      );

      const origExternals = config.externals;
      config.externals = [
        ...(Array.isArray(origExternals) ? origExternals : []),
        ({ request, context }: { request?: string; context?: string }, callback: Function) => {
          if (!request || !context) return callback();

          // Only externalize relative imports that resolve to our core dirs
          if (request.startsWith('.')) {
            try {
              const resolved = path.resolve(context, request);
              if (coreDirs.some((dir) => resolved.startsWith(dir))) {
                // Resolve to the actual .ts file path so Node.js module cache
                // keys match between init-time imports (with .js extension via tsx)
                // and runtime require() from webpack externals.
                let resolvedPath = resolved;
                if (!path.extname(resolved)) {
                  for (const ext of ['.ts', '.tsx', '.js']) {
                    if (fs.existsSync(resolved + ext)) {
                      resolvedPath = resolved + ext;
                      break;
                    }
                  }
                }
                return callback(null, 'commonjs ' + resolvedPath);
              }
            } catch {
              // ignore resolution errors
            }
          }
          callback();
        },
      ];
    }

    return config;
  },
  serverExternalPackages: ['knex', 'better-sqlite3', 'pg'],
};

export default nextConfig;
