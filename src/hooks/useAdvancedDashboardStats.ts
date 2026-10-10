import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useMatches } from './useMatches';
import { getMyClubId } from '../services/_helpers';

export const useAdvancedDashboardStats = () => {
  const { matches } = useMatches();

  return useQuery({
    queryKey: ['advancedDashboardStats', matches?.length],
    queryFn: async () => {
      if (!matches || matches.length === 0) return { events: [], playerStats: [], teamStats: [] };

      const matchIds = matches.map((m) => m.id);

      const [eventsRes, playerStatsRes, teamStatsRes] = await Promise.all([
        supabase.from('match_events').select('*').in('match_id', matchIds).order('minute', { ascending: true }),
        supabase.from('player_match_stats').select('*').in('match_id', matchIds),
        supabase.from('match_stats').select('*').in('match_id', matchIds)
      ]);

      return {
        events: eventsRes.data || [],
        playerStats: playerStatsRes.data || [],
        teamStats: teamStatsRes.data || []
      };
    },
    enabled: !!matches && matches.length > 0,
  });
};
