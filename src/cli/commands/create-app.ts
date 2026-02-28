import * as fs from 'node:fs';
import * as path from 'node:path';

const CONFIG_TEMPLATE = `export default {
  database: {
    client: '{{DB_CLIENT}}',
    connection: {{DB_CONNECTION}},
  },
  modules: {
    directory: './modules',
  },
  entityTypes: {
    directory: './config/entity_types',
  },
};
`;

const PACKAGE_JSON_TEMPLATE = `{
  "name": "{{NAME}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "drop dev",
    "migrate": "drop migrate:run",
    "migrate:rollback": "drop migrate:rollback",
    "migrate:status": "drop migrate:status"
  },
  "dependencies": {
    "@dropjs/core": "^0.1.0",
    "@dropjs/db": "^0.1.0",
    "@dropjs/field": "^0.1.0",
    "@dropjs/cli": "^0.1.0"
  }
}
`;

const TSCONFIG_TEMPLATE = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
`;

const EXAMPLE_ENTITY_TYPE = `{
  "entity_type": "node",
  "bundle": "page",
  "label": "Page",
  "description": "A basic page content type",
  "fields": {
    "title": {
      "type": "string",
      "label": "Title",
      "required": true,
      "max_length": 255
    },
    "body": {
      "type": "text_long",
      "label": "Body",
      "required": false
    }
  }
}
`;

interface CreateAppOptions {
  db?: 'sqlite3' | 'mysql2' | 'pg';
}

export function createApp(name: string, options: CreateAppOptions = {}): void {
  const targetDir = path.resolve(process.cwd(), name);

  if (fs.existsSync(targetDir)) {
    console.error(`Error: Directory "${name}" already exists.`);
    process.exit(1);
  }

  const dbClient = options.db ?? 'sqlite3';

  let dbConnection: string;
  if (dbClient === 'sqlite3') {
    dbConnection = `{\n      filename: './data/drop.db',\n    }`;
  } else {
    dbConnection = `{\n      host: 'localhost',\n      port: ${dbClient === 'pg' ? 5432 : 3306},\n      user: 'root',\n      password: '',\n      database: '${name}',\n    }`;
  }

  // Create directories
  const dirs = [
    targetDir,
    path.join(targetDir, 'config'),
    path.join(targetDir, 'config', 'entity_types'),
    path.join(targetDir, 'modules'),
    path.join(targetDir, 'migrations'),
    path.join(targetDir, 'data'),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write files
  const config = CONFIG_TEMPLATE
    .replace('{{DB_CLIENT}}', dbClient)
    .replace('{{DB_CONNECTION}}', dbConnection);

  const packageJson = PACKAGE_JSON_TEMPLATE.replace('{{NAME}}', name);

  fs.writeFileSync(path.join(targetDir, 'drop.config.js'), config);
  fs.writeFileSync(path.join(targetDir, 'package.json'), packageJson);
  fs.writeFileSync(path.join(targetDir, 'tsconfig.json'), TSCONFIG_TEMPLATE);
  fs.writeFileSync(
    path.join(targetDir, 'config', 'entity_types', 'page.json'),
    EXAMPLE_ENTITY_TYPE
  );
  fs.writeFileSync(path.join(targetDir, 'data', '.gitkeep'), '');
  fs.writeFileSync(
    path.join(targetDir, '.gitignore'),
    'node_modules/\ndist/\n*.db\ndata/\n.env\n'
  );

  console.log(`\nCreated drop.js project: ${name}\n`);
  console.log('Next steps:');
  console.log(`  cd ${name}`);
  console.log('  npm install');
  console.log('  npx drop migrate:run');
  console.log('  npx drop dev\n');
}
