/**
 * Build-time script — generates desktop/bundled-config.json from environment variables.
 * Run before electron-builder so the config is embedded in the packaged exe/dmg/AppImage.
 *
 * Required env vars:
 *   SUPABASE_DATABASE_URL  (or DATABASE_URL) — Supabase connection string
 *
 * Optional env vars:
 *   GEMINI_API_KEY         — enables ARIA assistant & individual conversation features
 *
 * Usage:
 *   SUPABASE_DATABASE_URL="postgresql://..." node desktop/inject-config.mjs
 *
 * In CI / GitHub Actions:
 *   Set SUPABASE_DATABASE_URL as a repository secret, then run this script
 *   as part of the dist step.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbUrl = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || '').trim();

if (!dbUrl) {
  console.error('');
  console.error('  HATA: Supabase bağlantı adresi bulunamadı.');
  console.error('');
  console.error('  Kullanım:');
  console.error('    SUPABASE_DATABASE_URL="postgresql://..." node desktop/inject-config.mjs');
  console.error('');
  process.exit(1);
}

if (!/^postgresql:\/\/|^postgres:\/\//.test(dbUrl)) {
  console.error('HATA: DATABASE_URL geçerli bir PostgreSQL bağlantı adresi değil.');
  process.exit(1);
}

const config = { DATABASE_URL: dbUrl };

if (process.env.GEMINI_API_KEY) {
  config.GEMINI_API_KEY = process.env.GEMINI_API_KEY.trim();
  console.log('  ✓ GEMINI_API_KEY eklendi');
}

const outPath = join(__dirname, 'bundled-config.json');
writeFileSync(outPath, JSON.stringify(config, null, 2), 'utf8');

const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':***@');
console.log(`✅ desktop/bundled-config.json oluşturuldu`);
console.log(`   DATABASE_URL: ${maskedUrl}`);
