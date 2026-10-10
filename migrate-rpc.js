import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://fuhrxfhszttvpkmjydca.supabase.co';
// Using service_role key for DDL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';
const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Drop and recreate get_all_users to include job_title and phone_number
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  system_role text,
  is_active boolean,
  job_title text,
  phone_number text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    au.id,
    au.email,
    COALESCE(up.full_name, au.raw_user_meta_data->>'full_name', 'Utilisateur') AS full_name,
    COALESCE(up.avatar_url, '') AS avatar_url,
    COALESCE(up.system_role, 'viewer') AS system_role,
    COALESCE(up.is_active, true) AS is_active,
    up.job_title,
    up.phone_number
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON up.id = au.id
  ORDER BY au.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
`;

async function migrate() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ data: null, error: { message: 'exec_sql not available' } }));
  if (error) {
    console.log("exec_sql not available, trying via REST API...");
    // Try using the management API endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: sql })
    });
    const result = await response.json();
    console.log("Result:", JSON.stringify(result, null, 2));
  } else {
    console.log("Migration success:", data);
  }
}
migrate();
