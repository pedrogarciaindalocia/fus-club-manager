import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: profiles } = await supabase.from('user_profiles').select('*');
  console.log("Profiles:");
  console.table(profiles);

  const { data: perms } = await supabase.from('user_permissions_overrides').select('*');
  console.log("Permissions:");
  console.table(perms);
}

main();
