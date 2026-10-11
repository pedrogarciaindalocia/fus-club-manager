import { supabase } from '../lib/supabase';

export async function getMyClubId(): Promise<string> {
  // Default Club ID (FUS Rabat) - Must match the mobile app ID
  const DEFAULT_CLUB_ID = '45642829-a3d7-48de-afdd-3c45a1ced474';

  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    const user = session?.user;
    
    // In Dev mode, we can fallback to seed data if not authenticated
    if (import.meta.env.DEV && (!user || sessionErr)) {
      return DEFAULT_CLUB_ID;
    }

    if (sessionErr || !user) {
      return DEFAULT_CLUB_ID;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('default_club_id')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data?.default_club_id) {
       // Check if there is at least one club to fallback to
       return DEFAULT_CLUB_ID;
    }
    
    return data.default_club_id;
  } catch (err) {
    return DEFAULT_CLUB_ID;
  }
}
