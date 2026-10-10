import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTable() {
  const { data, error } = await supabase.from('match_reactions').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Table exists, data:', data);
  }
}
checkTable();
