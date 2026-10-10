import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: user, error: userError } = await supabase.from('user_profiles').select('id').limit(1).single();
  if (userError) {
    console.error(userError);
    return;
  }
  
  console.log("Updating user:", user.id);
  const { data, error } = await supabase.from('user_profiles').update({ job_title: 'Test Title' }).eq('id', user.id);
  console.log("Update Data:", data);
  console.log("Update Error:", error);
}
check();
