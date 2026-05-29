import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o .env na pasta onde o comando foi rodado ou na raiz (uma pasta acima de backend)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.service_role || process.env.SUPABASE_KEY
)