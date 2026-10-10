import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('user_profiles').select('id, job_title').not('job_title', 'is', null);
  console.log("Users with job_title:", data);
  console.log("Error:", error);
}
check();
