import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Sparkles,
  Users,
  Filter,
  CheckCircle2,
  X,
  Eye,
  Shield,
  ShieldCheck,
  Footprints,
  BarChart3,
  Activity,
  Compass,
  Brain,
  Target,
  Search,
  UserCheck,
  Crown,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  ArrowRight,
  Sliders,
  Plus,
  Star,
  Bookmark,
  Save,
  Download,
  FolderOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlayers } from '../../hooks/usePlayers';
import { useSurclassements } from '../../hooks/useSurclassements';
import { isLowerCategory } from '../../services/surclassementService';
import { normalizeAgeCategory } from '../../constants';
import { useMatches } from '../../hooks/useMatches';
import PlayerMatchEvaluationModal from './components/PlayerMatchEvaluationModal';
import { matchService } from '../../services/matchService';
import ScoutasticDenseSlotCard from '../../components/ScoutasticDenseSlotCard';
import { getPositionDetails } from '../../constants/positions';
import { recruitmentService } from '../recruitment_v2/services/recruitmentService';
import type { SavedShortlistConfig } from '../recruitment_v2/types/recruitment';

interface FormationSlot {
  roleCode: string;
  label: string;
  category: 'GK' | 'DEF' | 'MID' | 'ATT';
  top: string;
  left: string;
}

interface FormationConfig {
  id: string;
  name: string;
  slots: FormationSlot[];
}

const FORMATIONS: Record<string, FormationConfig> = {
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3 Offensif Classique',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'LB', label: 'DG', category: 'DEF', top: '72%', left: '16%' },
      { roleCode: 'CB', label: 'DCG', category: 'DEF', top: '74%', left: '38%' },
      { roleCode: 'CB', label: 'DCD', category: 'DEF', top: '74%', left: '62%' },
      { roleCode: 'RB', label: 'DD', category: 'DEF', top: '72%', left: '84%' },
      { roleCode: 'CDM', label: 'MDC', category: 'MID', top: '56%', left: '50%' },
      { roleCode: 'CM', label: 'MCG', category: 'MID', top: '44%', left: '32%' },
      { roleCode: 'CM', label: 'MCD', category: 'MID', top: '44%', left: '68%' },
      { roleCode: 'LW', label: 'AG', category: 'ATT', top: '24%', left: '20%' },
      { roleCode: 'ST', label: 'BU', category: 'ATT', top: '16%', left: '50%' },
      { roleCode: 'RW', label: 'AD', category: 'ATT', top: '24%', left: '80%' },
    ]
  },
  '4-4-2': {
    id: '4-4-2',
    name: '4-4-2 Plat Équilibré',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'LB', label: 'DG', category: 'DEF', top: '72%', left: '16%' },
      { roleCode: 'CB', label: 'DCG', category: 'DEF', top: '74%', left: '38%' },
      { roleCode: 'CB', label: 'DCD', category: 'DEF', top: '74%', left: '62%' },
      { roleCode: 'RB', label: 'DD', category: 'DEF', top: '72%', left: '84%' },
      { roleCode: 'LM', label: 'MG', category: 'MID', top: '48%', left: '18%' },
      { roleCode: 'CM', label: 'MCG', category: 'MID', top: '52%', left: '39%' },
      { roleCode: 'CM', label: 'MCD', category: 'MID', top: '52%', left: '61%' },
      { roleCode: 'RM', label: 'MD', category: 'MID', top: '48%', left: '82%' },
      { roleCode: 'ST', label: 'BUG', category: 'ATT', top: '20%', left: '38%' },
      { roleCode: 'ST', label: 'BUD', category: 'ATT', top: '20%', left: '62%' },
    ]
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    name: '4-2-3-1 Moderne',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'LB', label: 'DG', category: 'DEF', top: '72%', left: '16%' },
      { roleCode: 'CB', label: 'DCG', category: 'DEF', top: '74%', left: '38%' },
      { roleCode: 'CB', label: 'DCD', category: 'DEF', top: '74%', left: '62%' },
      { roleCode: 'RB', label: 'DD', category: 'DEF', top: '72%', left: '84%' },
      { roleCode: 'CDM', label: 'MDCG', category: 'MID', top: '56%', left: '36%' },
      { roleCode: 'CDM', label: 'MDCD', category: 'MID', top: '56%', left: '64%' },
      { roleCode: 'CAM', label: 'MOC', category: 'MID', top: '38%', left: '50%' },
      { roleCode: 'LW', label: 'AG', category: 'ATT', top: '34%', left: '20%' },
      { roleCode: 'RW', label: 'AD', category: 'ATT', top: '34%', left: '80%' },
      { roleCode: 'ST', label: 'BU', category: 'ATT', top: '16%', left: '50%' },
    ]
  },
  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2 Pistons Dynamiques',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'CB', label: 'DCG', category: 'DEF', top: '74%', left: '26%' },
      { roleCode: 'CB', label: 'DC', category: 'DEF', top: '76%', left: '50%' },
      { roleCode: 'CB', label: 'DCD', category: 'DEF', top: '74%', left: '74%' },
      { roleCode: 'LWB', label: 'Piston G', category: 'MID', top: '50%', left: '14%' },
      { roleCode: 'CDM', label: 'MDC', category: 'MID', top: '58%', left: '50%' },
      { roleCode: 'CM', label: 'MCG', category: 'MID', top: '44%', left: '36%' },
      { roleCode: 'CM', label: 'MCD', category: 'MID', top: '44%', left: '64%' },
      { roleCode: 'RWB', label: 'Piston D', category: 'MID', top: '50%', left: '86%' },
      { roleCode: 'ST', label: 'BUG', category: 'ATT', top: '20%', left: '38%' },
      { roleCode: 'ST', label: 'BUD', category: 'ATT', top: '20%', left: '62%' },
    ]
  },
  '3-4-3': {
    id: '3-4-3',
    name: '3-4-3 Pression Haute',
    slots: [
      { roleCode: 'GK', label: 'GB', category: 'GK', top: '88%', left: '50%' },
      { roleCode: 'CB', label: 'DCG', category: 'DEF', top: '74%', left: '26%' },
      { roleCode: 'CB', label: 'DC', category: 'DEF', top: '76%', left: '50%' },
      { roleCode: 'CB', label: 'DCD', category: 'DEF', top: '74%', left: '74%' },
      { roleCode: 'LM', label: 'MG', category: 'MID', top: '50%', left: '18%' },
      { roleCode: 'CM', label: 'MCG', category: 'MID', top: '52%', left: '39%' },
      { roleCode: 'CM', label: 'MCD', category: 'MID', top: '52%', left: '61%' },
      { roleCode: 'RM', label: 'MD', category: 'MID', top: '50%', left: '82%' },
      { roleCode: 'LW', label: 'AG', category: 'ATT', top: '24%', left: '22%' },
      { roleCode: 'ST', label: 'BU', category: 'ATT', top: '16%', left: '50%' },
      { roleCode: 'RW', label: 'AD', category: 'ATT', top: '24%', left: '78%' },
    ]
  }
};

const AGE_CATEGORIES = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'PRO', label: 'PRO' },
  { id: 'SENIOR', label: 'SENIOR' },
  { id: 'U23', label: 'U23' },
  { id: 'U21', label: 'U21' },
  { id: 'U19', label: 'U19' },
  { id: 'U18', label: 'U18' },
  { id: 'U17', label: 'U17' },
  { id: 'U16', label: 'U16' },
  { id: 'U15', label: 'U15' },
  { id: 'U14', label: 'U14' },
  { id: 'U13', label: 'U13' },
  { id: 'U11', label: 'U11' },
  { id: 'U9', label: 'U9' },
  { id: 'U7', label: 'U7' },
];

// Helper to normalize position using source of truth
function normalizeRole(position: string | undefined): string {
  const details = getPositionDetails(position);
  return details.code;
}

// Function to map each player to EXACTLY ONE tactical slot index on the pitch (NO duplicates)
function mapPlayerToSlotIndex(player: any, slots: FormationSlot[]): number {
  const details = getPositionDetails(player.position || player.roleCode);
  const code = details.code;
  const cat = details.category; // 'GK' | 'DF' | 'MF' | 'FW'

  // 1. Goalkeepers (Gardien)
  if (cat === 'GK' || code === 'GK') {
    const idx = slots.findIndex(s => s.category === 'GK' || s.roleCode === 'GK');
    if (idx !== -1) return idx;
  }

  // 2. Left Back / Latéral Gauche
  if (code === 'LB') {
    const idx = slots.findIndex(s => s.roleCode === 'LB' || s.label === 'DG' || s.label.includes('Piston G'));
    if (idx !== -1) return idx;
  }

  // 3. Right Back / Latéral Droit
  if (code === 'RB') {
    const idx = slots.findIndex(s => s.roleCode === 'RB' || s.label === 'DD' || s.label.includes('Piston D'));
    if (idx !== -1) return idx;
  }

  // 4. Central Defenders / Défenseurs Centraux (CB, DF)
  if (code === 'CB' || code === 'DF' || (cat === 'DF' && code !== 'LB' && code !== 'RB')) {
    const cbIndices = slots
      .map((s, i) => (s.category === 'DEF' && (s.roleCode === 'CB' || s.label.includes('DC')) ? i : -1))
      .filter(i => i !== -1);
    if (cbIndices.length > 0) {
      const hash = (player.id || player.full_name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      return cbIndices[hash % cbIndices.length];
    }
    const defIdx = slots.findIndex(s => s.category === 'DEF');
    if (defIdx !== -1) return defIdx;
  }

  // 5. Defensive Midfield / Milieu Défensif (CDM)
  if (code === 'CDM') {
    const cdmIndices = slots
      .map((s, i) => (s.category === 'MID' && (s.roleCode === 'CDM' || s.label.includes('MDC')) ? i : -1))
      .filter(i => i !== -1);
    if (cdmIndices.length > 0) {
      const hash = (player.id || player.full_name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      return cdmIndices[hash % cdmIndices.length];
    }
  }

  // 6. Attacking Midfield / Milieu Offensif (CAM)
  if (code === 'CAM') {
    const camIdx = slots.findIndex(s => s.roleCode === 'CAM' || s.label.includes('MOC'));
    if (camIdx !== -1) return camIdx;
  }

  // 7. Left Winger / Ailier Gauche (LW)
  if (code === 'LW') {
    const lwIdx = slots.findIndex(s => s.roleCode === 'LW' || s.label === 'AG' || s.label === 'MG');
    if (lwIdx !== -1) return lwIdx;
  }

  // 8. Right Winger / Ailier Droit (RW)
  if (code === 'RW') {
    const rwIdx = slots.findIndex(s => s.roleCode === 'RW' || s.label === 'AD' || s.label === 'MD');
    if (rwIdx !== -1) return rwIdx;
  }

  // 9. Central Midfield / Milieux Centraux (CM, CAM fallback, generic MF)
  if (code === 'CM' || cat === 'MF') {
    const cmIndices = slots
      .map((s, i) => (s.category === 'MID' && (s.roleCode === 'CM' || s.label.includes('MC')) ? i : -1))
      .filter(i => i !== -1);
    if (cmIndices.length > 0) {
      const hash = (player.id || player.full_name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      return cmIndices[hash % cmIndices.length];
    }
    const midIdx = slots.findIndex(s => s.category === 'MID');
    if (midIdx !== -1) return midIdx;
  }

  // 10. Strikers & Attackers / Attaquants & Buteurs (ST, SS, generic FW)
  if (code === 'ST' || code === 'SS' || cat === 'FW') {
    const stIndices = slots
      .map((s, i) => (s.category === 'ATT' && (s.roleCode === 'ST' || s.label.includes('BU')) ? i : -1))
      .filter(i => i !== -1);
    if (stIndices.length > 0) {
      const hash = (player.id || player.full_name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      return stIndices[hash % stIndices.length];
    }
    const attIdx = slots.findIndex(s => s.category === 'ATT');
    if (attIdx !== -1) return attIdx;
  }

  return Math.floor(slots.length / 2);
}

export const OfficialShortlistPage: React.FC = () => {
  const { players: squadPlayers = [], isLoading: playersLoading } = usePlayers();
  const { matches = [] } = useMatches();
  const { surclassements = [] } = useSurclassements();

  const [selectedFormationKey, setSelectedFormationKey] = useState<string>('4-3-3');
  const [pitchHeight, setPitchHeight] = useState<'standard' | 'tall' | 'extra'>('tall');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyBestScorePerPosition, setOnlyBestScorePerPosition] = useState<boolean>(false);
  const [onlyEvaluated, setOnlyEvaluated] = useState<boolean>(false);

  // Direct ratings from match_players table
  const [directMatchRatings, setDirectMatchRatings] = useState<any[]>([]);

  // Selected player for detail drawer
  const [inspectedPlayer, setInspectedPlayer] = useState<any | null>(null);
  const [evaluatingPlayer, setEvaluatingPlayer] = useState<any | null>(null);
  const [isPitchFullscreen, setIsPitchFullscreen] = useState(false);
  const [shortlistedPlayerIds, setShortlistedPlayerIds] = useState<string[]>([]);

  // Drag and drop custom slot assignments (playerId -> slotIdx)
  const [customSlotAssignments, setCustomSlotAssignments] = useState<Record<string, number>>({});
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPitchFullscreen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPitchFullscreen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPitchFullscreen]);

  // Saved shortlists management
  const [savedShortlists, setSavedShortlists] = useState<SavedShortlistConfig[]>([]);
  const [selectedShortlistId, setSelectedShortlistId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch saved shortlists on mount
  useEffect(() => {
    recruitmentService.getSavedShortlists().then(res => {
      if (Array.isArray(res)) setSavedShortlists(res);
    });
  }, []);

  const availableShortlists = useMemo(() => {
    if (categoryFilter === 'ALL') return savedShortlists;
    return savedShortlists.filter(sl => !sl.category_filter || normalizeAgeCategory(sl.category_filter) === normalizeAgeCategory(categoryFilter));
  }, [savedShortlists, categoryFilter]);

  const handleLoadShortlist = (shortlistId: string) => {
    setSelectedShortlistId(shortlistId);
    if (!shortlistId) {
      setCustomSlotAssignments({});
      setShortlistedPlayerIds([]);
      return;
    }
    const sl = savedShortlists.find(s => s.id === shortlistId);
    if (!sl) return;
    setShortlistedPlayerIds(sl.candidate_ids || []);
    if (sl.formation_key && FORMATIONS[sl.formation_key]) {
      setSelectedFormationKey(sl.formation_key);
    }
    if (sl.category_filter && sl.category_filter !== categoryFilter) {
      setCategoryFilter(sl.category_filter);
    }
    if (sl.custom_slot_order && typeof sl.custom_slot_order === 'object') {
      setCustomSlotAssignments(sl.custom_slot_order as Record<string, number>);
    }
  };

  const handleSaveShortlist = async () => {
    if (!saveTitle.trim()) return;
    setIsSaving(true);
    try {
      const newConfig = await recruitmentService.saveShortlistConfig({
        title: saveTitle.trim(),
        category_filter: categoryFilter === 'ALL' ? undefined : categoryFilter,
        formation_key: selectedFormationKey,
        candidate_ids: shortlistedPlayerIds,
        custom_slot_order: customSlotAssignments,
        manager_notes: `Shortlist tactique enregistrée (${selectedFormationKey}) le ${new Date().toLocaleDateString('fr-FR')}`
      });
      const updated = await recruitmentService.getSavedShortlists();
      setSavedShortlists(updated);
      setSelectedShortlistId(newConfig.id);
      setShowSaveModal(false);
      setSaveTitle('');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDropPlayerToSlot = (playerId: string, targetSlotIdx: number) => {
    setShortlistedPlayerIds(prev => prev.includes(playerId) ? prev : [...prev, playerId]);
    setCustomSlotAssignments(prev => ({
      ...prev,
      [playerId]: targetSlotIdx,
    }));
    setDraggedPlayerId(null);
  };

  const handleRemovePlayerFromShortlist = (playerId: string) => {
    setShortlistedPlayerIds(prev => prev.filter(id => id !== playerId));
    setCustomSlotAssignments(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  };

  const handleAddPlayerToShortlist = (playerId: string) => {
    setShortlistedPlayerIds(prev => prev.includes(playerId) ? prev : [...prev, playerId]);
    const player = filteredPlayers.find(item => item.id === playerId);
    if (!player) return;
    const details = getPositionDetails(player.position || player.roleCode);
    const code = details.code;
    const desiredLabels: Record<string, string[]> = {
      GK: ['GB'], LB: ['DG'], RB: ['DD'], CB: ['DCG', 'DCD'], CDM: ['MDC'],
      CM: ['MCG', 'MCD', 'MC'], CAM: ['MOC', 'MCO', 'MCG', 'MCD'],
      LW: ['AG', 'MG'], RW: ['AD', 'MD'], ST: ['BU', 'BUG', 'BUD'], SS: ['BU', 'BUG', 'BUD'],
    };
    const labels = desiredLabels[code] || [];
    const targetSlotIdx = activeFormation.slots.findIndex(slot => slot.roleCode === code || labels.includes(slot.label));
    if (targetSlotIdx >= 0) {
      setCustomSlotAssignments(prev => ({ ...prev, [playerId]: targetSlotIdx }));
    }
  };

  const handleSelectPlayer = (player: any) => {
    setInspectedPlayer(player);
    setEvaluatingPlayer(player);
  };

  // Fetch match_players directly from Supabase and listen to real-time changes
  useEffect(() => {
    const fetchRatings = () => {
      supabase
        .from('match_players')
        .select('match_id, player_id, rating, rating_comment, is_starting, matches(category, match_date)')
        .not('rating', 'is', null)
        .then(({ data, error }) => {
          if (!error && data) {
            setDirectMatchRatings(data);
          }
        });
    };

    fetchRatings();

    const channel = supabase
      .channel('shortlist-match-evaluations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players' }, () => {
        fetchRatings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pitchHeightClass = {
    standard: 'min-h-[1050px] lg:min-h-[1180px]',
    tall: 'min-h-[1280px] lg:min-h-[1420px]',
    extra: 'min-h-[1500px] lg:min-h-[1680px]',
  }[pitchHeight];

  const activeFormation = FORMATIONS[selectedFormationKey] || FORMATIONS['4-3-3'];

  // Map match ratings for squad players
  const playerRatingsMap = useMemo(() => {
    const ratingsMap = new Map<string, {
          avgRating: number;
      count: number;
      lastRating?: number;
      lastComment?: string;
      lastDate?: string;
      category?: string;
      pillars?: { technical: number; tactical: number; physical: number; mental: number };
    }>();

    // 1. Direct match_players ratings (most accurate and current)
    directMatchRatings.forEach((mp: any) => {
      if (mp.player_id && mp.rating != null) {
        let pillars: any = undefined;
        if (mp.rating_comment && mp.rating_comment.includes('Tech:')) {
          const techMatch = mp.rating_comment.match(/Tech:\s*([0-9.]+)/);
          const physMatch = mp.rating_comment.match(/Phys:\s*([0-9.]+)/);
          const tactMatch = mp.rating_comment.match(/Tact:\s*([0-9.]+)/);
          const mentMatch = mp.rating_comment.match(/Ment:\s*([0-9.]+)/);
          if (techMatch || physMatch || tactMatch || mentMatch) {
            pillars = {
              technical: techMatch ? Number(techMatch[1]) : Number(mp.rating),
              physical: physMatch ? Number(physMatch[1]) : Number(mp.rating),
              tactical: tactMatch ? Number(tactMatch[1]) : Number(mp.rating),
              mental: mentMatch ? Number(mentMatch[1]) : Number(mp.rating),
            };
          }
        }

        const current = ratingsMap.get(mp.player_id) || { avgRating: 0, count: 0 };
        const newCount = current.count + 1;
        const newAvg = (current.avgRating * current.count + Number(mp.rating)) / newCount;
        const matchDate = mp.matches?.match_date;
        const latestIsCurrent = !current.lastDate || (matchDate && new Date(matchDate).getTime() > new Date(current.lastDate).getTime());
        ratingsMap.set(mp.player_id, {
          avgRating: Number(newAvg.toFixed(1)),
          count: newCount,
          lastRating: latestIsCurrent ? Number(mp.rating) : current.lastRating,
          lastComment: latestIsCurrent ? mp.rating_comment : current.lastComment,
          lastDate: latestIsCurrent ? matchDate : current.lastDate,
          category: latestIsCurrent ? mp.matches?.category : current.category,
          pillars: latestIsCurrent ? pillars : current.pillars,
        });
      }
    });

    // 2. Also incorporate from matches state if not yet present
    matches.forEach(m => {
      if (m.match_players && Array.isArray(m.match_players)) {
        m.match_players.forEach((mp: any) => {
          if (mp.player_id && mp.rating != null && !ratingsMap.has(mp.player_id)) {
            ratingsMap.set(mp.player_id, {
              avgRating: Number(Number(mp.rating).toFixed(1)),
              count: 1,
              lastRating: Number(mp.rating),
              lastComment: mp.rating_comment,
              lastDate: m.match_date,
              category: m.category,
            });
          }
        });
      }
    });

    return ratingsMap;
  }, [directMatchRatings, matches]);

  // La shortlist officielle est réservée aux joueurs inscrits dans l'effectif du club.
  const unifiedPlayers = useMemo(() => {
    const list: any[] = [];

    // 1. Signed Squad Players
    squadPlayers.forEach(p => {
      const ratingInfo = playerRatingsMap.get(p.id);
      const profileRating = Number((p as any).rating);
      const hasProfileRating = (p as any).rating != null && Number.isFinite(profileRating);
      const hasRealEval = !!ratingInfo || hasProfileRating;
      const rating = ratingInfo?.lastRating ?? ratingInfo?.avgRating ?? (hasProfileRating ? profileRating : null);
      const surclass = surclassements.find(s => s.player_id === p.id && s.status === 'active');

      const pillars = ratingInfo?.pillars || null;

      list.push({
        id: p.id,
        full_name: p.full_name,
        short_name: p.full_name.split(' ').map((n: string, i: number) => i === 0 ? n[0] + '.' : n).join(' '),
        initials: p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        position: p.position || 'CM',
        roleCode: normalizeRole(p.position),
        age_category: (p.category || ratingInfo?.category || 'PRO').toUpperCase(),
        jersey_number: surclass?.target_jersey_number ?? p.jersey_number,
        surclassement: surclass || null,
        photo_url: p.photo_url,
        is_trial: false,
        status: 'signe',
        has_evaluation: hasRealEval,
        last_eval_date: ratingInfo?.lastDate,
        last_eval_comment: ratingInfo?.lastComment,
        rating: rating == null ? null : Number(rating.toFixed(1)),
        match_count: ratingInfo?.count || (hasProfileRating ? 1 : 0),
        team_name: 'FUS Rabat Officiel',
        pillars
      });
    });

    return list;
  }, [squadPlayers, playerRatingsMap, surclassements]);

  // Filtered players
  const filteredPlayers = useMemo(() => {
    return unifiedPlayers.filter(p => {
      // Category filter
      if (categoryFilter !== 'ALL') {
        const cat = normalizeAgeCategory(p.age_category || '');
        const targetCat = p.surclassement ? normalizeAgeCategory(p.surclassement.target_category) : null;
        const normFilter = normalizeAgeCategory(categoryFilter);
        if (cat !== normFilter && targetCat !== normFilter) return false;
      }

      // Only evaluated filter
      if (onlyEvaluated && !p.has_evaluation) return false;

      // Min score filter
      if (minScoreFilter > 0 && p.rating < minScoreFilter) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.full_name.toLowerCase().includes(q);
        const matchPos = (p.position || '').toLowerCase().includes(q);
        if (!matchName && !matchPos) return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize evaluated players if any, then by rating
      if (a.has_evaluation && !b.has_evaluation) return -1;
      if (!a.has_evaluation && b.has_evaluation) return 1;
      return (b.rating ?? -1) - (a.rating ?? -1);
    });
  }, [unifiedPlayers, categoryFilter, onlyEvaluated, minScoreFilter, searchQuery]);

  const shortlistedPlayers = useMemo(
    () => filteredPlayers.filter(player => shortlistedPlayerIds.includes(player.id)),
    [filteredPlayers, shortlistedPlayerIds]
  );
  const availablePlayers = useMemo(
    () => filteredPlayers.filter(player => !shortlistedPlayerIds.includes(player.id)),
    [filteredPlayers, shortlistedPlayerIds]
  );

  // Group players by slot index so each player is placed in EXACTLY ONE slot without duplicates
  const playersBySlotIndex = useMemo(() => {
    const map = new Map<number, any[]>();
    activeFormation.slots.forEach((_, i) => map.set(i, []));

    // Positional buckets based on standardized source of truth
    const gks: any[] = [];
    const lbs: any[] = [];
    const rbs: any[] = [];
    const cbs: any[] = [];
    const cdms: any[] = [];
    const cms: any[] = [];
    const lws: any[] = [];
    const rws: any[] = [];
    const sts: any[] = [];

    shortlistedPlayers.forEach(p => {
      const details = getPositionDetails(p.position || p.roleCode);
      const code = details.code;
      const cat = details.category;

      if (cat === 'GK' || code === 'GK') gks.push(p);
      else if (code === 'LB') lbs.push(p);
      else if (code === 'RB') rbs.push(p);
      else if (cat === 'DF' || code === 'CB') cbs.push(p);
      else if (code === 'CDM') cdms.push(p);
      else if (code === 'LW') lws.push(p);
      else if (code === 'RW') rws.push(p);
      else if (code === 'ST' || code === 'SS' || cat === 'FW') sts.push(p);
      else cms.push(p); // CM, CAM, generic MF
    });

    const slots = activeFormation.slots;
    const gkSlots = slots.map((s, i) => s.category === 'GK' || s.roleCode === 'GK' ? i : -1).filter(i => i !== -1);
    const lbSlots = slots.map((s, i) => s.roleCode === 'LB' || s.label === 'DG' || s.label.includes('Piston G') ? i : -1).filter(i => i !== -1);
    const rbSlots = slots.map((s, i) => s.roleCode === 'RB' || s.label === 'DD' || s.label.includes('Piston D') ? i : -1).filter(i => i !== -1);
    const cbSlots = slots.map((s, i) => s.category === 'DEF' && (s.roleCode === 'CB' || s.label.includes('DC')) ? i : -1).filter(i => i !== -1);
    const cdmSlots = slots.map((s, i) => s.roleCode === 'CDM' || s.label.includes('MDC') ? i : -1).filter(i => i !== -1);
    const cmSlots = slots.map((s, i) => s.category === 'MID' && (s.roleCode === 'CM' || s.label.includes('MC') || s.roleCode === 'CAM' || s.label.includes('MOC')) ? i : -1).filter(i => i !== -1);
    const lwSlots = slots.map((s, i) => s.roleCode === 'LW' || s.label === 'AG' || s.label === 'MG' ? i : -1).filter(i => i !== -1);
    const rwSlots = slots.map((s, i) => s.roleCode === 'RW' || s.label === 'AD' || s.label === 'MD' ? i : -1).filter(i => i !== -1);
    const stSlots = slots.map((s, i) => s.category === 'ATT' && (s.roleCode === 'ST' || s.label.includes('BU')) ? i : -1).filter(i => i !== -1);

    const assign = (list: any[], targets: number[]) => {
      if (!targets.length) return;
      list.forEach((player, idx) => {
        const targetSlot = targets[idx % targets.length];
        map.get(targetSlot)?.push(player);
      });
    };

    assign(gks, gkSlots);
    assign(lbs, lbSlots);
    assign(rbs, rbSlots);
    assign(cbs, cbSlots.length ? cbSlots : [1]);
    assign(cdms, cdmSlots.length ? cdmSlots : cmSlots);
    assign(cms, cmSlots.length ? cmSlots : cdmSlots);
    assign(lws, lwSlots);
    assign(rws, rwSlots);
    assign(sts, stSlots);

    // Override placement based on customSlotAssignments (Drag and Drop or loaded shortlist)
    shortlistedPlayers.forEach(p => {
      const customSlot = customSlotAssignments[p.id];
      if (customSlot !== undefined && customSlot >= 0 && customSlot < activeFormation.slots.length) {
        map.forEach(slotList => {
          const idx = slotList.findIndex(item => item.id === p.id);
          if (idx !== -1) slotList.splice(idx, 1);
        });
        map.get(customSlot)?.push(p);
      }
    });

    return map;
  }, [shortlistedPlayers, activeFormation, customSlotAssignments]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Banner exactly as in screenshot */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-emerald-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Trophy className="w-4 h-4" />
            <span>SHORTLIST & ONZE IDÉAL — PLACEMENT AUTOMATIQUE PAR POSTE</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-100">
              Terrain Tactique Pleine Largeur
            </h1>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-3 py-0.5 rounded-full text-xs border border-emerald-500/30">
              {shortlistedPlayerIds.length} joueurs sur la shortlist
            </span>
          </div>
          <p className="text-slate-300 text-xs max-w-2xl">
            Les joueurs restent dans la liste jusqu’à ce que vous les ajoutiez au terrain. Cliquez sur un joueur du terrain pour lui attribuer sa note sur 10.
          </p>
        </div>

        {/* Height & System Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {/* Height pills */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700 text-xs">
            <span className="text-slate-400 px-2 font-bold">↕ Hauteur :</span>
            <button
              onClick={() => setPitchHeight('standard')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${pitchHeight === 'standard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              1180px
            </button>
            <button
              onClick={() => setPitchHeight('tall')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${pitchHeight === 'tall' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ★ 1420px (Grande)
            </button>
            <button
              onClick={() => setPitchHeight('extra')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${pitchHeight === 'extra' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              1680px (XXL)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPitchFullscreen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-md transition hover:bg-emerald-500"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Plein écran terrain
          </button>

          {/* Formations pills */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700 text-xs">
            <span className="text-slate-400 px-2 font-bold">Système :</span>
            {['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3'].map(fmt => (
              <button
                key={fmt}
                onClick={() => setSelectedFormationKey(fmt)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  selectedFormationKey === fmt ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Shortlist Load & Save Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/90 rounded-xl px-2.5 py-1.5 border border-slate-700 text-xs shadow-xs">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
              <select
                value={selectedShortlistId}
                onChange={e => handleLoadShortlist(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  {availableShortlists.length > 0 ? '📂 Charger une shortlist...' : 'Aucune shortlist'}
                </option>
                {availableShortlists.map(sl => (
                  <option key={sl.id} value={sl.id} className="bg-slate-900 text-white">
                    {sl.title} ({sl.formation_key || '4-3-3'})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setSaveTitle(`Onze FUS ${categoryFilter !== 'ALL' ? categoryFilter : ''} ${selectedFormationKey}`);
                setShowSaveModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl font-black text-xs bg-red-600 hover:bg-red-700 text-white shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer sous...</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Row exactly as in screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          <span className="font-bold text-slate-400 uppercase tracking-wider mr-1">Catégorie :</span>
          {AGE_CATEGORIES.map(cat => {
            const isSelected = categoryFilter === cat.id;
            const count = cat.id === 'ALL'
              ? unifiedPlayers.length
              : unifiedPlayers.filter(p => (p.age_category || '').toUpperCase() === cat.id).length;
            const evalCount = cat.id === 'ALL'
              ? unifiedPlayers.filter(p => p.has_evaluation).length
              : unifiedPlayers.filter(p => (p.age_category || '').toUpperCase() === cat.id && p.has_evaluation).length;

            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
                {evalCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-xs" title={`${evalCount} joueur(s) évalué(s)`}>
                    ★ {evalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          {/* Bouton Dernières Évaluations Match */}
          <button
            onClick={() => setOnlyEvaluated(!onlyEvaluated)}
            className={`px-3.5 py-2 rounded-xl font-black border transition flex items-center gap-1.5 ${
              onlyEvaluated
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyEvaluated ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
            <span>Dernières Évaluations</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-black">
              {unifiedPlayers.filter(p => p.has_evaluation).length}
            </span>
          </button>

          {/* Meilleur Score par Poste */}
          <button
            onClick={() => setOnlyBestScorePerPosition(!onlyBestScorePerPosition)}
            className={`px-3.5 py-2 rounded-xl font-black border transition flex items-center gap-1.5 ${
              onlyBestScorePerPosition
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100'
            }`}
          >
            <Crown className="w-3.5 h-3.5 fill-current" />
            Meilleur Score
          </button>

          {/* Min score dropdown */}
          <select
            value={minScoreFilter}
            onChange={e => setMinScoreFilter(parseFloat(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="0">Toutes les notes</option>
            <option value="8.0">Note ≥ 8.0</option>
            <option value="7.5">Note ≥ 7.5</option>
            <option value="7.0">Note ≥ 7.0</option>
            <option value="6.0">Note ≥ 6.0</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher joueur / poste..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs w-44 focus:w-60 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULL WIDTH TACTICAL FOOTBALL PITCH                                         */}
      {/* ========================================================================= */}
      <div className={isPitchFullscreen
        ? 'fixed inset-0 z-[70] flex flex-col overflow-hidden bg-slate-950 p-3'
        : 'w-full -mx-2 px-2 sm:mx-0 sm:px-0'}>
        {isPitchFullscreen && (
          <header className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">Shortlist officielle · {categoryFilter === 'ALL' ? 'Toutes catégories' : categoryFilter}</p>
              <p className="text-xs text-slate-400">{shortlistedPlayerIds.length} joueur{shortlistedPlayerIds.length > 1 ? 's' : ''} sur le terrain</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => { if (!saveTitle.trim()) setSaveTitle(`Shortlist ${categoryFilter !== 'ALL' ? categoryFilter : ''} ${selectedFormationKey}`); setShowSaveModal(true); }} className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-black hover:bg-red-500">
                <Save className="h-4 w-4" /> Enregistrer
              </button>
              <button type="button" onClick={() => setIsPitchFullscreen(false)} className="flex items-center gap-2 rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-xs font-bold hover:bg-slate-700">
                <Minimize2 className="h-4 w-4" /> Retour
              </button>
            </div>
          </header>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 gap-3">
        <div className="min-w-0 flex-1 overflow-auto no-scrollbar">
        <div
          className={`w-full min-w-[620px] ${isPitchFullscreen ? 'h-full min-h-[680px]' : pitchHeightClass} ${isPitchFullscreen ? 'rounded-xl' : 'rounded-2xl sm:rounded-3xl'} border border-emerald-800/40 relative overflow-hidden shadow-2xl transition-all duration-300`}
          style={{
            background: 'linear-gradient(180deg, #064e3b 0%, #065f46 50%, #064e3b 100%)',
          }}
        >
          {/* Pitch mowing stripes */}
          <div className="absolute inset-0 flex flex-col pointer-events-none opacity-25">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 ${i % 2 === 0 ? 'bg-black/15' : 'bg-white/10'}`}
              />
            ))}
          </div>

          {/* Pitch line markings */}
          <div className="absolute inset-6 border-2 border-white/40 rounded-2xl pointer-events-none">
            {/* Center line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/40 -translate-y-1/2"></div>
            {/* Center circle */}
            <div className="absolute left-1/2 top-1/2 w-48 h-48 border-2 border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            {/* Penalty box Top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-36 border-2 border-t-0 border-white/40"></div>
            <div className="absolute top-36 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-t-0 border-white/40 rounded-b-full"></div>
            {/* Penalty box Bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-36 border-2 border-b-0 border-white/40"></div>
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-b-0 border-white/40 rounded-t-full"></div>
          </div>

          {/* Position Slots with Placed Players */}
          {activeFormation.slots.map((slot, slotIdx) => {
            let slotPlayers = playersBySlotIndex.get(slotIdx) || [];
            if (onlyBestScorePerPosition && slotPlayers.length > 0) {
              slotPlayers = [slotPlayers[0]];
            }

            return (
              <div
                key={slot.roleCode + slot.label}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const playerId = e.dataTransfer.getData('text/plain');
                  if (playerId) {
                    handleDropPlayerToSlot(playerId, slotIdx);
                  }
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 transition-all duration-300 z-10 hover:z-30"
                style={{ top: slot.top, left: slot.left }}
              >
                {/* Slot Target Label Ring */}
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-black text-white shadow-xs">
                  <span>{slot.label}</span>
                  {slotPlayers.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold">
                      {slotPlayers.length}
                    </span>
                  )}
                </div>

                {/* Player Badges / Tokens */}
                {slotPlayers.length === 0 ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const playerId = e.dataTransfer.getData('text/plain');
                      if (playerId) handleDropPlayerToSlot(playerId, slotIdx);
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-white/40 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white/60 text-xs font-bold transition hover:border-red-500 hover:bg-red-500/20 cursor-pointer"
                  >
                    {slot.label}
                  </div>
                ) : slotPlayers.length > 3 ? (
                  /* Dense Scoutastic Card dès que le poste dépasse 3 joueurs */
                  <ScoutasticDenseSlotCard
                    slotLabel={slot.label}
                    roleCode={slot.roleCode}
                    players={slotPlayers.map(p => ({
                      raw: p,
                      id: p.id,
                      shortName: p.short_name,
                      fullName: p.full_name,
                      photoUrl: p.photo_url,
                      initials: p.initials,
                      rating: p.rating,
                      hasEvaluation: p.has_evaluation,
                      isTrial: p.is_trial,
                      clubOrTeam: p.team_name || p.current_club,
                    }))}
                    onSelectPlayer={handleSelectPlayer}
                    onDragStartPlayer={(p) => setDraggedPlayerId(p.id)}
                    onDragEndPlayer={() => setDraggedPlayerId(null)}
                    onRemovePlayer={handleRemovePlayerFromShortlist}
                  />
                ) : (
                  /* File de joueurs l'un après l'autre en ligne si <= 3 joueurs */
                  <div className="flex items-center gap-2.5 bg-black/45 backdrop-blur-md p-2 rounded-2xl border border-white/25 shadow-2xl">
                    {slotPlayers.map((player, pIdx) => {
                      const isTopScore = pIdx === 0;

                      return (
                        <div
                          key={player.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', player.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedPlayerId(player.id);
                          }}
                          onDragEnd={() => setDraggedPlayerId(null)}
                          onClick={() => handleSelectPlayer(player)}
                          className={`group relative cursor-grab active:cursor-grabbing flex flex-col items-center transition-all hover:scale-110 active:scale-95 ${
                            draggedPlayerId === player.id ? 'opacity-50 scale-95' : ''
                          }`}
                        >
                          {/* Crown icon on top score */}
                          {isTopScore && (
                            <div className="absolute -top-2.5 left-0 z-20 text-amber-400">
                              <Crown className="w-4 h-4 fill-amber-400 drop-shadow-md" />
                            </div>
                          )}

                          {/* Player Circle Avatar + Score Badge wrapper */}
                          <div className="relative">
                            <button type="button" aria-label={`Retirer ${player.full_name} du terrain`} onClick={(event) => { event.stopPropagation(); handleRemovePlayerFromShortlist(player.id); }} className="absolute -right-2 -top-2 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-slate-800 text-white shadow-lg transition hover:scale-110 hover:bg-red-600" title="Retirer du terrain"><X className="h-3.5 w-3.5" /></button>
                            {player.surclassement && (() => {
                              const isSousClass = isLowerCategory(player.surclassement.original_category, player.surclassement.target_category);
                              return (
                                <span
                                  title={isSousClass ? `Sous-classé depuis ${player.surclassement.original_category}` : `Surclassé depuis ${player.surclassement.original_category}`}
                                  className={`absolute -top-1.5 -left-1.5 z-30 h-4 w-4 rounded-full flex items-center justify-center p-0 border border-white text-[8px] font-black shadow-md cursor-help ${
                                    isSousClass ? 'bg-sky-500 text-white' : 'bg-amber-400 text-slate-950'
                                  }`}
                                >
                                  {isSousClass ? '⬇️' : '⭐'}
                                </span>
                              );
                            })()}
                            <div
                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-black text-xs text-white shadow-xl border-2 transition-all overflow-hidden ${
                                player.has_evaluation
                                  ? 'bg-slate-950 border-emerald-400 ring-2 ring-amber-400/60'
                                  : player.is_trial
                                  ? 'bg-slate-900 border-amber-400'
                                  : 'bg-slate-950 border-emerald-400'
                              }`}
                            >
                              {player.photo_url ? (
                                <img
                                  src={player.photo_url}
                                  alt={player.full_name}
                                  className="w-full h-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = '/assets/avatar.svg';
                                  }}
                                />
                              ) : (
                                <span className="text-sm font-black">{player.initials}</span>
                              )}
                            </div>

                            {/* Score badge — OUTSIDE overflow-hidden, fully visible */}
                            <div
                              className={`absolute -bottom-1 -right-1 z-30 min-w-[24px] h-[24px] px-1.5 rounded-full text-[11px] font-black border-2 shadow-lg flex items-center justify-center gap-0.5 ${
                                player.has_evaluation
                                  ? 'bg-emerald-500 text-white border-white shadow-emerald-500/60'
                                  : player.rating >= 8.0
                                  ? 'bg-amber-400 text-slate-950 border-white shadow-amber-400/60'
                                  : player.rating >= 7.0
                                  ? 'bg-emerald-500 text-white border-white shadow-emerald-400/60'
                                  : 'bg-slate-700 text-white border-slate-500 shadow-slate-700/60'
                              }`}
                              style={{ boxShadow: player.has_evaluation ? '0 0 8px 2px rgba(16,185,129,0.55)' : undefined }}
                            >
                              {player.has_evaluation && <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-200 shrink-0" />}
                              <span>{player.rating == null ? '—' : player.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          {/* Name badge */}
                          <div className="mt-1 text-center">
                            <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-md truncate max-w-[90px] block shadow-xs">
                              {player.short_name}
                            </span>
                            {player.surclassement ? (() => {
                              const isSousClass = isLowerCategory(player.surclassement.original_category, player.surclassement.target_category);
                              return (
                                <span className={`text-[7.5px] font-black px-1 rounded-sm mt-0.5 block border ${
                                  isSousClass
                                    ? 'text-sky-300 bg-sky-950/90 border-sky-500/40'
                                    : 'text-amber-300 bg-amber-950/90 border-amber-500/40'
                                }`}>
                                  {isSousClass ? '⬇️' : '⭐'} {player.surclassement.original_category}
                                </span>
                              );
                            })() : player.has_evaluation ? (
                              <span className="text-[7.5px] font-extrabold text-emerald-300 bg-emerald-950/90 px-1 rounded-sm mt-0.5 block border border-emerald-500/40">
                                Évalué ({player.rating})
                              </span>
                            ) : player.is_trial ? (
                              <span className="text-[8px] font-extrabold text-amber-300 bg-amber-950/80 px-1 rounded-sm mt-0.5 block border border-amber-500/40">
                                En test
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
          <aside className={`flex ${isPitchFullscreen ? 'h-full min-h-[680px]' : 'sticky top-3 h-[min(75dvh,1000px)] min-h-[500px]'} w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 text-white shadow-xl`}>
            <div className="border-b border-white/10 p-4">
              <h2 className="text-sm font-black">Joueurs de la catégorie</h2>
              <p className="mt-1 text-xs text-slate-400">{availablePlayers.length} joueur{availablePlayers.length > 1 ? 's' : ''} à ajouter au terrain</p>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
              {availablePlayers.map(player => (
                <div key={player.id} draggable onDragStart={event => { event.dataTransfer.setData('text/plain', player.id); event.dataTransfer.effectAllowed = 'move'; setDraggedPlayerId(player.id); }} onDragEnd={() => setDraggedPlayerId(null)} className={`flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/80 p-2.5 transition-all duration-300 animate-in fade-in slide-in-from-right-2 ${draggedPlayerId === player.id ? 'opacity-50' : 'hover:border-emerald-500/50'}`}>
                  <img src={player.photo_url || '/assets/avatar.svg'} alt={player.full_name} className="h-12 w-12 shrink-0 rounded-full border border-white/15 object-cover" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/avatar.svg'; }} />
                  <button type="button" onClick={() => handleSelectPlayer(player)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-xs font-black">{player.full_name}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-400">{player.position} · {player.age_category}</span>
                    <span className="mt-1 inline-flex rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-amber-300">{player.rating == null ? 'Non noté' : `${player.rating}/10`}</span>
                  </button>
                  <button type="button" onClick={() => handleAddPlayerToShortlist(player.id)} className="shrink-0 rounded-lg bg-red-600 px-2.5 py-2 text-[10px] font-black text-white transition hover:bg-red-500"><Plus className="mr-1 inline h-3 w-3" />Shortlister</button>
                </div>
              ))}
              {availablePlayers.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-xs text-slate-400">Tous les joueurs visibles sont déjà sur le terrain.</p>}
            </div>
          </aside>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PLAYER DETAILS INSPECTION DRAWER / MODAL                                   */}
      {/* ========================================================================= */}
      {inspectedPlayer && (
        <div className="fixed inset-0 z-[80] flex items-center justify-end bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200 flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 relative flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 p-0.5 border border-white/20 shrink-0 overflow-hidden shadow-lg">
                  <img
                    src={
                      inspectedPlayer.photo_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(inspectedPlayer.full_name)}&background=047857&color=fff&size=140`
                    }
                    alt={inspectedPlayer.full_name}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/assets/avatar.svg';
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {inspectedPlayer.is_trial ? (
                      <span className="bg-amber-500/20 text-amber-300 font-black px-2.5 py-0.5 rounded-full text-xs border border-amber-500/30 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Sous Observation (Test)
                      </span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-300 font-black px-2.5 py-0.5 rounded-full text-xs border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Joueur Signé FUS
                      </span>
                    )}
                    <span className="text-xs text-slate-300 font-semibold">{inspectedPlayer.age_category}</span>
                  </div>
                  <h3 className="text-xl font-black text-white">{inspectedPlayer.full_name}</h3>
                  <p className="text-xs text-slate-300">
                    Poste : {inspectedPlayer.position} • #{inspectedPlayer.jersey_number || 'N/A'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectedPlayer(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Score & Match Rating */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                    {inspectedPlayer.rating == null ? 'Évaluation de match' : 'Note de performance match'}
                  </span>
                  <div className="text-3xl font-black text-white flex items-center gap-2 mt-0.5">
                    {inspectedPlayer.rating == null ? 'Non noté' : <>{inspectedPlayer.rating} <span className="text-sm font-normal text-slate-300">/ 10</span></>}
                  </div>
                  <span className="text-xs text-slate-300">
                    {inspectedPlayer.match_count > 0
                      ? `Basé sur ${inspectedPlayer.match_count} match${inspectedPlayer.match_count > 1 ? 's' : ''} analysé${inspectedPlayer.match_count > 1 ? 's' : ''}`
                      : 'Aucune note de match enregistrée'}
                  </span>
                </div>

              </div>

              {/* Evaluation Action Button */}
              <button
                onClick={() => {
                  setEvaluatingPlayer(inspectedPlayer);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Sliders className="w-4 h-4" /> Attribuer une note unique sur 10
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectedPlayer(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE SCORE MODAL TRIGGERED FROM SHORTLIST                               */}
      {/* ========================================================================= */}
      {evaluatingPlayer && (
        <PlayerMatchEvaluationModal
          player={evaluatingPlayer}
          matchInfo={{
            opponent_name: 'Dernier Match Officiel / Amical',
            match_date: new Date().toISOString().split('T')[0],
            competition: 'Botola Pro / Match Amical de Préparation',
            is_friendly: evaluatingPlayer.is_trial,
          }}
          initialRating={evaluatingPlayer.rating}
          onClose={() => setEvaluatingPlayer(null)}
          onSave={async (evalData) => {
            const targetMatchId = matches[0]?.id || '885f1d7b-b875-4e7b-9912-b008a37369b4';
            const commentStr = `[Note officielle] ${evalData.rating}/10`;
            try {
              await matchService.savePlayerRating(targetMatchId, evaluatingPlayer.id, evalData.rating, commentStr);
              
              const { data } = await supabase
                .from('match_players')
                .select('match_id, player_id, rating, rating_comment, is_starting, matches(category, match_date)')
                .not('rating', 'is', null)
                .order('rating', { ascending: false });
              if (data) setDirectMatchRatings(data);
            } catch (err) {
              console.error('Failed to persist rating:', err);
            }

            const evaluatedAt = new Date().toISOString().split('T')[0];
            setInspectedPlayer(current => current?.id === evaluatingPlayer.id
              ? {
                  ...current,
                  rating: evalData.rating,
                  has_evaluation: true,
                  last_eval_date: evaluatedAt,
                  last_eval_comment: commentStr,
                  match_count: Math.max(current.match_count || 0, 1),
                  pillars: undefined,
                }
              : current);
            setEvaluatingPlayer(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL ENREGISTRER SOUS... (SHORTLIST TACTIQUE)                            */}
      {/* ========================================================================= */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-500 font-black text-sm uppercase tracking-wide">
                <Save className="w-4 h-4" />
                <span>Enregistrer la Shortlist</span>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nom de la Shortlist / Composition
                </label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={e => setSaveTitle(e.target.value)}
                  placeholder="Ex: Onze Type U19 - Derby FAR"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Système tactique :</span>
                  <span className="font-bold text-slate-800 dark:text-white">{selectedFormationKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Catégorie :</span>
                  <span className="font-bold text-slate-800 dark:text-white">{categoryFilter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Joueurs positionnés :</span>
                  <span className="font-bold text-red-500">{shortlistedPlayerIds.length} joueurs</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveShortlist}
                disabled={!saveTitle.trim() || isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md disabled:opacity-50 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer la Shortlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialShortlistPage;
