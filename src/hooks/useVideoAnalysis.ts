import { useState, useEffect, useCallback } from 'react';
import { videoAnalysisService, type VideoAnalysis } from '../services/videoAnalysisService';

export function useVideoAnalysis(matchId: string) {
  const [videos, setVideos] = useState<VideoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await videoAnalysisService.getMatchVideos(matchId);
      setVideos(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (matchId) {
      fetchVideos();
    }
  }, [matchId, fetchVideos]);

  const addVideo = async (videoData: Omit<VideoAnalysis, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newVideo = await videoAnalysisService.addVideoAnalysis(videoData);
      setVideos(prev => [newVideo, ...prev]);
      return newVideo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'ajout');
      throw err;
    }
  };

  const updateVideo = async (id: string, updates: Partial<VideoAnalysis>) => {
    try {
      const updated = await videoAnalysisService.updateVideoAnalysis(id, updates);
      setVideos(prev => prev.map(v => v.id === id ? updated : v));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
      throw err;
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      await videoAnalysisService.deleteVideoAnalysis(id);
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
      throw err;
    }
  };

  return {
    videos,
    loading,
    error,
    addVideo,
    updateVideo,
    deleteVideo,
    refresh: fetchVideos
  };
}
