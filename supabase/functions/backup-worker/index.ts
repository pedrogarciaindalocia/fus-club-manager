// supabase/functions/backup-worker/index.ts
// Deno Edge Function — performs the actual backup work server-side
//
// Invoked by the frontend via supabase.functions.invoke('backup-worker', { body })
// Requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS and read all tables.
//
// Environment secrets (set via `supabase secrets set`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (optional)
//   ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_REFRESH_TOKEN (optional)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DB_TABLES = [
  'players', 'staff', 'teams', 'matches', 'match_events',
  'match_players', 'match_staff', 'clubs', 'leagues', 'stadiums',
  'settings', 'user_profiles', 'user_roles', 'roles', 'permissions',
];

const STORAGE_BUCKETS = ['logos', 'players', 'staff'];

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { backupId, type, destination } = await req.json();

    if (!backupId) {
      return new Response(JSON.stringify({ error: 'backupId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Admin client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const logs: string[] = [];
    const addLog = async (message: string) => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      logs.push(`[${timestamp}] ${message}`);
      // Persist logs in real-time so the frontend can poll them
      await supabase
        .from('backups')
        .update({ logs, status: 'running' })
        .eq('id', backupId);
    };

    // Mark as running
    await supabase
      .from('backups')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', backupId);

    await addLog('Backup worker started');

    const zip = new JSZip();
    const tablesExported: string[] = [];
    const bucketsExported: string[] = [];

    // ── DATABASE EXPORT ──────────────────────────────────────
    if (type === 'full' || type === 'database_only') {
      await addLog('Starting database export...');
      const dbFolder = zip.folder('database')!;

      for (const table of DB_TABLES) {
        try {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
            await addLog(`⚠ Table "${table}" skipped: ${error.message}`);
            continue;
          }
          const rows = data || [];
          dbFolder.file(`${table}.json`, JSON.stringify(rows, null, 2));
          tablesExported.push(table);
          await addLog(`✓ ${table}: ${rows.length} rows exported`);
        } catch (e: any) {
          await addLog(`⚠ Table "${table}" error: ${e.message}`);
        }
      }
      await addLog(`Database export complete: ${tablesExported.length}/${DB_TABLES.length} tables`);
    }

    // ── STORAGE EXPORT ───────────────────────────────────────
    if (type === 'full' || type === 'storage_only') {
      await addLog('Starting storage export...');
      const storageFolder = zip.folder('storage')!;

      for (const bucket of STORAGE_BUCKETS) {
        try {
          const { data: files, error: listError } = await supabase.storage
            .from(bucket)
            .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } });

          if (listError) {
            await addLog(`⚠ Bucket "${bucket}" listing failed: ${listError.message}`);
            continue;
          }

          const bucketFolder = storageFolder.folder(bucket)!;
          let fileCount = 0;

          for (const file of (files || [])) {
            // Skip folder entries
            if (!file.name || file.metadata?.mimetype === undefined && file.id === null) continue;
            try {
              const { data: fileData, error: dlError } = await supabase.storage
                .from(bucket)
                .download(file.name);

              if (dlError || !fileData) {
                await addLog(`  ⚠ ${bucket}/${file.name}: download failed`);
                continue;
              }

              const arrayBuffer = await fileData.arrayBuffer();
              bucketFolder.file(file.name, arrayBuffer);
              fileCount++;
            } catch (e: any) {
              await addLog(`  ⚠ ${bucket}/${file.name}: ${e.message}`);
            }
          }

          bucketsExported.push(bucket);
          await addLog(`✓ Bucket "${bucket}": ${fileCount} files exported`);
        } catch (e: any) {
          await addLog(`⚠ Bucket "${bucket}" error: ${e.message}`);
        }
      }
      await addLog(`Storage export complete: ${bucketsExported.length}/${STORAGE_BUCKETS.length} buckets`);
    }

    // ── ZIP GENERATION ───────────────────────────────────────
    await addLog('Generating ZIP archive...');
    const zipBlob = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const zipSizeBytes = zipBlob.byteLength;
    const sizeMB = (zipSizeBytes / (1024 * 1024)).toFixed(2);
    await addLog(`ZIP archive generated: ${sizeMB} MB`);

    let fileUrl: string | null = null;

    // ── UPLOAD TO DESTINATION ────────────────────────────────
    if (destination === 'local') {
      // Upload to a 'backups' Supabase storage bucket
      const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      await addLog(`Uploading to Supabase Storage (backups/${fileName})...`);

      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(fileName, zipBlob, {
          contentType: 'application/zip',
          upsert: false,
        });

      if (uploadError) {
        await addLog(`⚠ Storage upload failed: ${uploadError.message}. The backup will be marked complete without a download URL.`);
      } else {
        const { data: urlData } = supabase.storage.from('backups').getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
        await addLog(`✓ Uploaded to storage: ${fileName}`);
      }
    } else if (destination === 'google_drive') {
      await addLog('Google Drive upload requested...');
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

      if (!clientId || !clientSecret || !refreshToken) {
        await addLog('⚠ Google Drive credentials not configured. Skipping cloud upload.');
      } else {
        try {
          // Exchange refresh token for access token
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }),
          });
          const { access_token } = await tokenRes.json();

          // Upload via resumable upload API
          const fileName = `fusclub-backup-${new Date().toISOString().split('T')[0]}.zip`;
          const metadata = { name: fileName, mimeType: 'application/zip' };

          const uploadRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${access_token}` },
              body: createMultipartBody(metadata, new Uint8Array(zipBlob)),
            }
          );

          if (uploadRes.ok) {
            const driveFile = await uploadRes.json();
            fileUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
            await addLog(`✓ Uploaded to Google Drive: ${fileName}`);
          } else {
            const errorText = await uploadRes.text();
            await addLog(`⚠ Google Drive upload failed: ${errorText}`);
          }
        } catch (e: any) {
          await addLog(`⚠ Google Drive error: ${e.message}`);
        }
      }
    } else if (destination === 'onedrive') {
      await addLog('OneDrive upload requested...');
      const clientId = Deno.env.get('ONEDRIVE_CLIENT_ID');
      const clientSecret = Deno.env.get('ONEDRIVE_CLIENT_SECRET');
      const refreshToken = Deno.env.get('ONEDRIVE_REFRESH_TOKEN');

      if (!clientId || !clientSecret || !refreshToken) {
        await addLog('⚠ OneDrive credentials not configured. Skipping cloud upload.');
      } else {
        try {
          // Exchange refresh token for access token
          const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
              scope: 'Files.ReadWrite.All offline_access',
            }),
          });
          const { access_token } = await tokenRes.json();

          const fileName = `fusclub-backup-${new Date().toISOString().split('T')[0]}.zip`;

          const uploadRes = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/root:/Backups/${fileName}:/content`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/zip',
              },
              body: new Uint8Array(zipBlob),
            }
          );

          if (uploadRes.ok) {
            const driveItem = await uploadRes.json();
            fileUrl = driveItem.webUrl || null;
            await addLog(`✓ Uploaded to OneDrive: ${fileName}`);
          } else {
            const errorText = await uploadRes.text();
            await addLog(`⚠ OneDrive upload failed: ${errorText}`);
          }
        } catch (e: any) {
          await addLog(`⚠ OneDrive error: ${e.message}`);
        }
      }
    }

    // ── FINALIZE ─────────────────────────────────────────────
    await addLog('Backup completed successfully ✓');

    await supabase.from('backups').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      file_url: fileUrl,
      file_size_bytes: zipSizeBytes,
      tables_exported: tablesExported,
      storage_buckets_exported: bucketsExported,
      logs,
    }).eq('id', backupId);

    return new Response(JSON.stringify({ success: true, backupId }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Backup worker error:', error);

    // Try to mark the backup as failed
    try {
      const { backupId } = await req.clone().json();
      if (backupId) {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        await supabase.from('backups').update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
        }).eq('id', backupId);
      }
    } catch (_) { /* ignore secondary errors */ }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

// Helper for Google Drive multipart upload
function createMultipartBody(metadata: Record<string, string>, fileData: Uint8Array): Uint8Array {
  const boundary = '---backup-boundary---';
  const encoder = new TextEncoder();

  const metadataPart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  );
  const filePart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/zip\r\n\r\n`
  );
  const ending = encoder.encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(metadataPart.length + filePart.length + fileData.length + ending.length);
  body.set(metadataPart, 0);
  body.set(filePart, metadataPart.length);
  body.set(fileData, metadataPart.length + filePart.length);
  body.set(ending, metadataPart.length + filePart.length + fileData.length);

  return body;
}
