import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // 1. Check get_all_users RPC output columns
  const { data: users, error: rpcErr } = await supabase.rpc('get_all_users');
  if (rpcErr) { console.log("RPC Error:", rpcErr); return; }
  console.log("RPC columns (first user keys):", users?.[0] ? Object.keys(users[0]) : "no users");
  console.log("First user:", JSON.stringify(users?.[0], null, 2));

  // 2. Check direct user_profiles query
  const { data: profiles, error: pErr } = await supabase.from('user_profiles').select('id, job_title, system_role, phone_number');
  if (pErr) { console.log("Profiles Error:", pErr); return; }
  console.log("Profiles (job_title):", profiles?.map(p => ({ id: p.id, job_title: p.job_title })));
}
check();
