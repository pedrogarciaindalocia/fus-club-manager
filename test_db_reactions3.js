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
  const { data, error } = await supabase.from('match_reactions').select('*').limit(1);
  if (error) {
    console.error("Error selecting:", error);
  } else {
    console.log("Success! Data:", data);
  }
  
  // attempt to insert to see if it fails due to foreign key or similar
  const { data: d2, error: e2 } = await supabase.from('match_reactions').insert({ match_id: '123e4567-e89b-12d3-a456-426614174000', reaction: 'fire' });
  console.log("Insert result:", e2);
}
run();
