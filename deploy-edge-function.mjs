import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase project config
const projectRef = 'fuhrxfhszttvpkmjydca';
// We need a personal access token for the Management API
// Try to use service_role as a workaround via the functions endpoint
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHJ4ZmhzenR0dnBrbWp5ZGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1Mzg3NiwiZXhwIjoyMDkwNTI5ODc2fQ.eGC5u6yitvioQTVmtWj7xfi_VYrVerHe09U7_jcZn9I';

// Read the Edge Function source
const functionPath = path.join(__dirname, 'supabase/functions/create-user/index.ts');
const functionBody = fs.readFileSync(functionPath, 'utf-8');
console.log('Function body length:', functionBody.length);

// Try the Supabase Management API
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions/create-user`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'create-user',
    body: functionBody,
    verify_jwt: true,
    import_map: false
  })
});

console.log('Response status:', response.status);
const result = await response.text();
console.log('Response:', result.substring(0, 500));
