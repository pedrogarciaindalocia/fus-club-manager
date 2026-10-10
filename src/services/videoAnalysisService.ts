import { supabase } from '../lib/supabase';

export interface VideoAnalysis {
  id: string;
  match_id: string;
  video_url: string;
  analyst_id?: string;
  analysis_type: 'full_match' | 'highlights' | 'tactical' | 'player_focus';
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export const videoAnalysisService = {
  async getMatchVideos(matchId: string): Promise<VideoAnalysis[]> {
    const { data, error } = await supabase
      .from('match_video_analysis')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addVideoAnalysis(analysis: Omit<VideoAnalysis, 'id' | 'created_at' | 'updated_at'>): Promise<VideoAnalysis> {
    const { data, error } = await supabase
      .from('match_video_analysis')
      .insert([{
        ...analysis,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateVideoAnalysis(id: string, updates: Partial<VideoAnalysis>): Promise<VideoAnalysis> {
    const { data, error } = await supabase
      .from('match_video_analysis')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteVideoAnalysis(id: string): Promise<void> {
    const { error } = await supabase
      .from('match_video_analysis')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
