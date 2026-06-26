import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.BUNDLED_DATABASE_URL;
if (!url) {
  console.warn('[inject-config] BUNDLED_DATABASE_URL ayarlanmamış — bundled-config.json atlanıyor');
  process.exit(0);
}

const config = { DATABASE_URL: url };
writeFileSync(join(__dirname, 'bundled-config.json'), JSON.stringify(config, null, 2), 'utf8');
console.log('[inject-config] bundled-config.json yazıldı');
