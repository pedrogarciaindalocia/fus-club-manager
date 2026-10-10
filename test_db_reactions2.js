import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) env[key.trim()] = val.trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'match_reactions' });
  if (error) {
     const { data: cols, error: err2 } = await supabase.from('match_reactions').select('*').limit(1);
     console.log("Cols:", cols);
  } else {
    console.log("Info:", data);
  }
}
run();
