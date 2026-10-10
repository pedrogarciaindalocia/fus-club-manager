import { createClient } from '@supabase/supabase-js';

const url = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  console.log('Result:', data, error);
}
test();
