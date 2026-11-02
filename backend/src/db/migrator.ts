import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './client.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations(): void {
  const db = getDb();

  // Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const possiblePaths = [
    path.resolve(currentDir, 'migrations'),
    path.resolve(process.cwd(), 'backend', 'src', 'db', 'migrations'),
    path.resolve(process.cwd(), 'src', 'db', 'migrations'),
    path.resolve(process.cwd(), 'dist', 'db', 'migrations'),
  ];

  let migrationsDir = possiblePaths.find(p => fs.existsSync(p));

  if (!migrationsDir) {
    throw new Error('Migrations directory not found in candidate paths: ' + possiblePaths.join(', '));
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const getAppliedStmt = db.prepare('SELECT version FROM schema_migrations WHERE version = ?');
  const insertStmt = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)');

  for (const file of files) {
    const applied = getAppliedStmt.get(file);
    if (!applied) {
      console.log(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      db.transaction(() => {
        db.exec(sql);
        insertStmt.run(file);
      })();
      console.log(`Successfully applied migration: ${file}`);
    }
  }
}
