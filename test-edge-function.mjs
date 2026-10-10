import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fuhrxfhszttvpkmjydca.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTM4NzYsImV4cCI6MjA5MDUyOTg3Nn0.bl-YL0RpUdCiNO5VKZqwgzj5lXnTCzB7s0rONscheOQ';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';

const supabase = createClient(supabaseUrl, anonKey);

// Sign in as super_admin to get a real user token
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'badr.belabbes.pro@gmail.com',
  password: 'test123' // This will fail if wrong password - just trying
});

if (authError) {
  console.log("Login error:", authError.message);
  console.log("\nTrying with service role key to call Edge Function directly...");
  
  // Try calling with service role as bearer
  const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({ action: 'get_all_profiles' })
  });
  
  console.log("Status:", response.status);
  const result = await response.json();
  console.log("Result:", JSON.stringify(result, null, 2).substring(0, 500));
} else {
  console.log("Logged in as:", authData.user?.email);
  const token = authData.session?.access_token;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'get_all_profiles' })
  });
  
  console.log("EF Status:", response.status);
  const result = await response.json();
  console.log("Result:", JSON.stringify(result, null, 2).substring(0, 500));
}
