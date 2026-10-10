import { createClient } from '@supabase/supabase-js';

const url = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';
const supabase = createClient(url, key);

const sql = `
CREATE OR REPLACE FUNCTION public.test_identities_insert()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
  ) VALUES (
    new_id,
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', 'test@test.com'),
    'email',
    now(),
    now(),
    now(),
    new_id::text
  ) ON CONFLICT (provider, id) DO NOTHING;
END;
$$;
`;

async function test() {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) console.log('Exec error:', error);
  const res = await supabase.rpc('test_identities_insert');
  console.log('Result:', res);
}
test();
