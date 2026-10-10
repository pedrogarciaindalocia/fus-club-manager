import { createClient } from '@supabase/supabase-js';

const url = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.rpc('admin_provision_user_credentials', {
    target_user_id: '55de4b12-7902-42cf-a09f-a57d1a4054d3',
    temp_password: 'password123',
    target_email: 'test@example.com',
    target_full_name: 'Test',
    target_phone: null,
    target_role: 'viewer',
    target_job_title: 'Test'
  });
  console.log('Result:', data, error);
}
test();
