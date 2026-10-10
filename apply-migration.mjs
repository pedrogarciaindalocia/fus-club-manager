import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';

const sql = `
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
SET search_path = public
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
GRANT EXECUTE ON FUNCTION public.get_all_users() TO service_role;
`;

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
console.log("Project ref:", projectRef);

// The Supabase Management API - uses postgres directly via the service role
// We can use the pg endpoint
const response = await fetch(`${supabaseUrl}/rest/v1/rpc/pg`, {
  method: 'POST',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
});

if (response.ok) {
  const result = await response.json();
  console.log("Success:", result);
} else {
  const errText = await response.text();
  console.log("Response status:", response.status);
  console.log("Error:", errText.substring(0, 500));
  
  // Alternative: try supabase admin endpoint
  console.log("\nTrying alternative: /pg/query endpoint...");
  const r2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  console.log("Admin API status:", r2.status);
  const r2Text = await r2.text();
  console.log("Admin API response:", r2Text.substring(0, 500));
}
