import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'venodb.json');

export function readDb<T>(defaults: T): T {
  if (!fs.existsSync(DB_PATH)) {
    writeDb(defaults);
    return clone(defaults);
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    writeDb(defaults);
    return clone(defaults);
  }
}

export function writeDb<T>(db: T): void {
  const payload = JSON.stringify(db, null, 2);
  fs.writeFileSync(DB_PATH, payload, 'utf-8');
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
