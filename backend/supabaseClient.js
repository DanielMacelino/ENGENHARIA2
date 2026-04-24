import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.service_role || process.env.SUPABASE_KEY
)