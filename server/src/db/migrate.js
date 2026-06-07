import 'dotenv/config';
import { migrate } from './database.js';

migrate()
  .then(() => process.exit(0))
  .catch(err => { console.error('Migration failed:', err); process.exit(1); });
