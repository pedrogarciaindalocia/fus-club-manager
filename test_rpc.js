import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

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
