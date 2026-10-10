import { supabase } from '../lib/supabase';

const FUS_CLUB_ID = '45642829-a3d7-48de-afdd-3c45a1ced474';

async function fixSettingsRLS() {
  console.log('Fixing RLS policies for settings table...');

  try {
    // Supprime les anciennes policies
    console.log('Dropping existing policies...');
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "settings_select" ON public.settings;
        DROP POLICY IF EXISTS "settings_insert" ON public.settings;
        DROP POLICY IF EXISTS "settings_update" ON public.settings;
        DROP POLICY IF EXISTS "settings_delete" ON public.settings;
      `
    });

    // Crée les nouvelles policies
    console.log('Creating new policies...');
    const policies = [
      {
        name: 'settings_select',
        action: 'FOR SELECT',
        using: `club_id = public.get_my_club_id() OR (auth.uid() IS NULL AND club_id = '${FUS_CLUB_ID}')`
      },
      {
        name: 'settings_insert',
        action: 'FOR INSERT',
        with_check: `club_id = public.get_my_club_id() OR (auth.uid() IS NULL AND club_id = '${FUS_CLUB_ID}')`
      },
      {
        name: 'settings_update',
        action: 'FOR UPDATE',
        using: `club_id = public.get_my_club_id() OR (auth.uid() IS NULL AND club_id = '${FUS_CLUB_ID}')`,
        with_check: `club_id = public.get_my_club_id() OR (auth.uid() IS NULL AND club_id = '${FUS_CLUB_ID}')`
      },
      {
        name: 'settings_delete',
        action: 'FOR DELETE',
        using: `club_id = public.get_my_club_id() OR (auth.uid() IS NULL AND club_id = '${FUS_CLUB_ID}')`
      }
    ];

    for (const policy of policies) {
      let sql = `CREATE POLICY "${policy.name}" ON public.settings ${policy.action}`;
      if (policy.using) {
        sql += ` USING (${policy.using})`;
      }
      if (policy.with_check) {
        sql += ` WITH CHECK (${policy.with_check})`;
      }

      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`Error creating policy ${policy.name}:`, error);
      } else {
        console.log(`✓ Created policy ${policy.name}`);
      }
    }

    console.log('RLS policies fixed successfully!');
  } catch (error) {
    console.error('Error fixing RLS policies:', error);
  }
}

fixSettingsRLS();
