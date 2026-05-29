import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o .env na pasta onde o comando foi rodado ou na raiz (três pastas acima)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)