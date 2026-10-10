import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';
const supabase = createClient(supabaseUrl, supabaseKey);

// Try reading the current function definition
async function check() {
  // Check if rawProfiles query is blocked by RLS
  const { data: rawProfiles, error } = await supabase.from('user_profiles').select('id, avatar_url, job_title, system_role, phone_number');
  console.log("RLS check (service_role, no anon):");
  console.log("Error:", error);
  console.log("All profiles job_title values:", rawProfiles?.map(p => ({ id: p.id, job_title: p.job_title })));
}
check();
