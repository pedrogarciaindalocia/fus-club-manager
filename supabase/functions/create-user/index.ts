import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase admin keys not set')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body early to handle public actions
    const body = await req.json()
    const { action } = body

    // Public endpoint: get_all_profiles (no auth required)
    if (action === 'get_all_profiles') {
      const { data: profiles, error: pErr } = await supabaseAdmin
        .from('user_profiles')
        .select('id, job_title, phone_number, avatar_url, system_role, full_name, is_active')
      if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ profiles }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // Continue with auth validation for protected actions
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = authHeader.replace('Bearer ', '')
    let callerUser = null
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token)
      if (error) throw error
      callerUser = data.user
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('system_role')
      .eq('id', callerUser.id)
      .single()

    if (profileError || callerProfile?.system_role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Only super_admin can perform this action' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Duplicate get_all_profiles handling removed - early handling above
    const { email, password, full_name, system_role, categories, club_id, user_id, job_title, phone_number } = body;

    if (action === 'create') {
      if (!email || !password || !full_name || !system_role) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ system_role, force_password_change: true, default_club_id: club_id, job_title: job_title || null, phone_number: phone_number || null })
        .eq('id', authData.user.id)

      if (updateError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(JSON.stringify({ error: 'Failed to update user profile' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Assign categories if needed
      if (categories && categories.length > 0 && club_id) {
        const categoryAssignments = categories.map((cat: string) => ({ user_id: authData.user.id, category: cat, club_id }))
        await supabaseAdmin.from('user_category_assignments').insert(categoryAssignments)
      }

      return new Response(JSON.stringify({ user: authData.user, message: 'User created successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

    } else if (action === 'update') {
      if (!user_id) return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Update auth user (email, password, full_name)
      const authUpdatePayload: Record<string, any> = {}
      if (email) authUpdatePayload.email = email
      if (password) authUpdatePayload.password = password
      if (full_name) authUpdatePayload.user_metadata = { full_name }

      if (Object.keys(authUpdatePayload).length > 0) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdatePayload)
      }

      // Update profile with service_role (bypasses RLS)
      const profileUpdate: Record<string, any> = {}
      if (system_role !== undefined) profileUpdate.system_role = system_role
      if (job_title !== undefined) profileUpdate.job_title = job_title || null
      if (phone_number !== undefined) profileUpdate.phone_number = phone_number || null
      if (full_name !== undefined) profileUpdate.full_name = full_name

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(profileUpdate)
        .eq('id', user_id)

      if (updateError) return new Response(JSON.stringify({ error: 'Failed to update user profile: ' + updateError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Update category assignments if provided
      if (categories !== undefined && club_id) {
        await supabaseAdmin.from('user_category_assignments').delete().eq('user_id', user_id)
        if (categories.length > 0) {
          const categoryAssignments = categories.map((cat: string) => ({ user_id, category: cat, club_id }))
          await supabaseAdmin.from('user_category_assignments').insert(categoryAssignments)
        }
      }

      return new Response(JSON.stringify({ message: 'User updated successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
