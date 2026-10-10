import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Club, Settings } from '../types';

export interface CurrentClubState {
  clubId: string | null;
  club: Club | null;
  settings: Settings | null;
  isLoading: boolean;
  error: Error | null;
  /** Recharge manuellement le contexte club (ex: après mise à jour settings) */
  refresh: () => Promise<void>;
}

/**
 * Retourne le club courant de l'utilisateur authentifié.
 * Lit user_profiles.default_club_id puis joint clubs + settings.
 * Toutes les queries enfant (matchs, joueurs…) doivent utiliser clubId comme filtre.
 */
export function useCurrentClub(): CurrentClubState {
  const [state, setState] = useState<Omit<CurrentClubState, 'refresh'>>({
    clubId: null,
    club: null,
    settings: null,
    isLoading: true,
    error: null,
  });

  async function load() {
    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const user = session?.user;
      if (sessionError || !user) {
        setState({ clubId: null, club: null, settings: null, isLoading: false, error: null });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('default_club_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const clubId = profile?.default_club_id ?? null;
      if (!clubId) {
        setState({ clubId: null, club: null, settings: null, isLoading: false, error: null });
        return;
      }

      const [clubRes, settingsRes] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', clubId).single(),
        supabase.from('settings').select('*').eq('club_id', clubId).maybeSingle(),
      ]);

      if (clubRes.error) throw clubRes.error;

      setState({
        clubId,
        club: clubRes.data,
        settings: settingsRes.data ?? null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }

  useEffect(() => {
    load();

    // Resync si l'utilisateur change de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { ...state, refresh: load };
}
