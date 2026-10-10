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
  Calendar,
  Clock,
  ArrowRight,
  Sliders,
  Plus,
  Star
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlayers } from '../../hooks/usePlayers';
import { useRecruitment } from '../recruitment/hooks/useRecruitment';
import { useMatches } from '../../hooks/useMatches';
import PlayerRadarChart from '../recruitment/components/PlayerRadarChart';
import PlayerMatchEvaluationModal from './components/PlayerMatchEvaluationModal';
import { matchService } from '../../services/matchService';
import ScoutasticDenseSlotCard from '../../components/ScoutasticDenseSlotCard';
import { getPositionDetails } from '../../constants/positions';

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
  const { candidates = [], evaluations: recruitmentEvals = [] } = useRecruitment();
  const { matches = [] } = useMatches();

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
        ratingsMap.set(mp.player_id, {
          avgRating: Number(newAvg.toFixed(1)),
          count: newCount,
          lastRating: Number(mp.rating),
          lastComment: mp.rating_comment,
          lastDate: mp.matches?.match_date,
          category: mp.matches?.category,
          pillars,
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

  // Unified roster of players (Signed Squad + Trial Candidates participating in friendlies)
  const unifiedPlayers = useMemo(() => {
    const list: any[] = [];

    // 1. Signed Squad Players
    squadPlayers.forEach(p => {
      const ratingInfo = playerRatingsMap.get(p.id);
      const hasRealEval = !!ratingInfo;
      const rating = ratingInfo?.lastRating ?? ratingInfo?.avgRating ?? (p.rating || 7.0);

      const pillars = ratingInfo?.pillars || {
        technical: Number(Math.min(10, rating + 0.2).toFixed(1)),
        tactical: Number(Math.min(10, rating - 0.1).toFixed(1)),
        physical: Number(Math.min(10, rating + 0.1).toFixed(1)),
        mental: Number(Math.min(10, rating + 0.3).toFixed(1)),
      };

      list.push({
        id: p.id,
        full_name: p.full_name,
        short_name: p.full_name.split(' ').map((n: string, i: number) => i === 0 ? n[0] + '.' : n).join(' '),
        initials: p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        position: p.position || 'CM',
        roleCode: normalizeRole(p.position),
        age_category: (p.category || ratingInfo?.category || 'PRO').toUpperCase(),
        jersey_number: p.jersey_number,
        photo_url: p.photo_url,
        is_trial: false,
        status: 'signe',
        has_evaluation: hasRealEval,
        last_eval_date: ratingInfo?.lastDate,
        last_eval_comment: ratingInfo?.lastComment,
        rating: Number(rating.toFixed(1)),
        match_count: ratingInfo?.count || 1,
        team_name: 'FUS Rabat Officiel',
        pillars
      });
    });

    // 2. Trial Candidates (in stage 'under_evaluation', 'trial', 'club_trial', 'shortlist', 'shortlisted', or 'invited')
    candidates
      .filter(c => ['under_evaluation', 'trial', 'club_trial', 'shortlist', 'shortlisted', 'invited'].includes(c.pipeline_stage))
      .forEach(c => {
        const evals = recruitmentEvals.filter(e => e.candidate_id === c.id);
        const lastEval = evals[0];
        const rating = lastEval?.overall_score || 7.4;

        list.push({
          id: c.id,
          full_name: `${c.first_name} ${c.last_name}`,
          short_name: `${c.first_name[0]}. ${c.last_name}`,
          initials: `${c.first_name[0]}${c.last_name[0]}`.toUpperCase(),
          position: c.primary_position,
          roleCode: normalizeRole(c.primary_position),
          age_category: (c.age_category || 'U19').toUpperCase(),
          jersey_number: 99,
          photo_url: c.photo_url,
          is_trial: true,
          status: 'en_cours_de_test',
          has_evaluation: true,
          last_eval_date: lastEval?.evaluation_date,
          last_eval_comment: lastEval?.comments || 'Évaluation détection / essai',
          rating: Number(rating.toFixed(1)),
          match_count: 2, // Friendly trial match
          team_name: c.current_club || 'Candidat à l\'essai',
          pillars: {
            technical: lastEval?.technical_rating || 7.5,
            tactical: lastEval?.tactical_rating || 7.0,
            physical: lastEval?.physical_rating || 7.8,
            mental: lastEval?.mental_rating || 7.6,
          }
        });
      });

    return list;
  }, [squadPlayers, candidates, playerRatingsMap, recruitmentEvals]);

  // Filtered players
  const filteredPlayers = useMemo(() => {
    return unifiedPlayers.filter(p => {
      // Category filter
      if (categoryFilter !== 'ALL') {
        const cat = (p.age_category || '').toUpperCase();
        if (cat !== categoryFilter.toUpperCase()) return false;
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
      return b.rating - a.rating;
    });
  }, [unifiedPlayers, categoryFilter, onlyEvaluated, minScoreFilter, searchQuery]);

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

    filteredPlayers.forEach(p => {
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

    return map;
  }, [filteredPlayers, activeFormation]);

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
              {filteredPlayers.length} joueurs positionnés
            </span>
          </div>
          <p className="text-slate-300 text-xs max-w-2xl">
            Tous les joueurs de l'effectif FUS et les joueurs sous observation sont positionnés automatiquement selon leur poste.
            Survolez ou cliquez sur n'importe quel joueur pour afficher son panneau de performance complet et son graphique Radar.
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
      <div className="w-full overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
        <div
          className={`w-full min-w-[620px] sm:min-w-0 ${pitchHeightClass} rounded-2xl sm:rounded-3xl border border-emerald-800/40 relative overflow-hidden shadow-2xl transition-all duration-300`}
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
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 transition-all duration-300"
              style={{ top: slot.top, left: slot.left }}
            >
              {/* Slot Target Label Ring */}
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/20 text-[10px] font-black text-white shadow-xs">
                <span>{slot.label}</span>
                {slotPlayers.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">
                    {slotPlayers.length}
                  </span>
                )}
              </div>

              {/* Player Badges / Tokens */}
              {slotPlayers.length === 0 ? (
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs font-bold">
                  {slot.label}
                </div>
              ) : slotPlayers.length > 3 ? (
                /* Dense Scoutastic Card (Style Shadow Squad) dès que le poste dépasse 3 joueurs */
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
                  onSelectPlayer={(p) => setInspectedPlayer(p)}
                />
              ) : (
                <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-sm p-1.5 rounded-2xl border border-white/25 shadow-xl">
                  {slotPlayers.map((player, pIdx) => {
                    const isTopScore = pIdx === 0;

                    return (
                      <div
                        key={player.id}
                        onClick={() => setInspectedPlayer(player)}
                        className="group relative cursor-pointer flex flex-col items-center transition-all hover:scale-110 active:scale-95"
                      >
                        {/* Crown icon on top score */}
                        {isTopScore && (
                          <div className="absolute -top-2.5 left-0 z-20 text-amber-400">
                            <Crown className="w-3.5 h-3.5 fill-amber-400 drop-shadow-md" />
                          </div>
                        )}

                        {/* Player Circle Avatar + Score Badge wrapper (relative, NO overflow-hidden here) */}
                        <div className="relative">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xs text-white shadow-lg border-2 transition-all overflow-hidden ${
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
                              />
                            ) : (
                              <span>{player.initials}</span>
                            )}
                          </div>

                          {/* Score badge — OUTSIDE overflow-hidden, fully visible */}
                          <div
                            className={`absolute -bottom-2 -right-2 z-30 min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-black border-2 shadow-lg flex items-center justify-center gap-0.5 ${
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
                            <span>{player.rating}</span>
                          </div>
                        </div>

                        {/* Name badge */}
                        <div className="mt-1 text-center">
                          <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.2 rounded-md truncate max-w-[80px] block shadow-xs">
                            {player.short_name}
                          </span>
                          {player.has_evaluation ? (
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

      {/* ========================================================================= */}
      {/* PLAYER DETAILS INSPECTION DRAWER / MODAL                                   */}
      {/* ========================================================================= */}
      {inspectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-xs p-4">
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
              {/* Highlight if player has a real match evaluation */}
              {inspectedPlayer.has_evaluation && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Dernière Évaluation Enregistrée
                    </span>
                    {inspectedPlayer.last_eval_date && (
                      <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        Match du {inspectedPlayer.last_eval_date}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                      {inspectedPlayer.rating} <span className="text-xs font-medium text-slate-400">/ 10</span>
                    </div>
                    {inspectedPlayer.last_eval_comment && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic border-l-2 border-emerald-400 pl-2">
                        {inspectedPlayer.last_eval_comment}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Score & Match Rating */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                    Note Moyenne de Performance Match
                  </span>
                  <div className="text-3xl font-black text-white flex items-center gap-2 mt-0.5">
                    {inspectedPlayer.rating} <span className="text-sm font-normal text-slate-300">/ 10</span>
                  </div>
                  <span className="text-xs text-slate-300">
                    Basé sur {inspectedPlayer.match_count} match{inspectedPlayer.match_count > 1 ? 's' : ''} analysé{inspectedPlayer.match_count > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[9px] text-emerald-300 font-bold block">TECH</span>
                    <span className="font-black text-white">{inspectedPlayer.pillars?.technical}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[9px] text-blue-300 font-bold block">TACT</span>
                    <span className="font-black text-white">{inspectedPlayer.pillars?.tactical}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[9px] text-amber-300 font-bold block">PHYS</span>
                    <span className="font-black text-white">{inspectedPlayer.pillars?.physical}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[9px] text-purple-300 font-bold block">MENT</span>
                    <span className="font-black text-white">{inspectedPlayer.pillars?.mental}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Radar Chart */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Radar de Performance (4 Piliers)</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Modèle FUS</span>
                </div>
                <div className="w-full min-h-[310px]">
                  <PlayerRadarChart
                    evaluations={[
                      {
                        name: inspectedPlayer.full_name,
                        color: inspectedPlayer.is_trial ? '#f59e0b' : '#059669',
                        eval: {
                          id: inspectedPlayer.id,
                          candidate_id: inspectedPlayer.id,
                          scout_id: 'coach',
                          scout_name: 'Staff FUS',
                          evaluation_date: inspectedPlayer.last_eval_date || new Date().toISOString().split('T')[0],
                          overall_score: Number(inspectedPlayer.rating) || 7.0,
                          // 4 Piliers scores
                          technical_score: Number(inspectedPlayer.pillars?.technical) || Number(inspectedPlayer.rating) || 7.0,
                          physical_score: Number(inspectedPlayer.pillars?.physical) || Number(inspectedPlayer.rating) || 7.0,
                          tactical_score: Number(inspectedPlayer.pillars?.tactical) || Number(inspectedPlayer.rating) || 7.0,
                          mental_score: Number(inspectedPlayer.pillars?.mental) || Number(inspectedPlayer.rating) || 7.0,
                          technical_rating: Number(inspectedPlayer.pillars?.technical) || Number(inspectedPlayer.rating) || 7.0,
                          physical_rating: Number(inspectedPlayer.pillars?.physical) || Number(inspectedPlayer.rating) || 7.0,
                          tactical_rating: Number(inspectedPlayer.pillars?.tactical) || Number(inspectedPlayer.rating) || 7.0,
                          mental_rating: Number(inspectedPlayer.pillars?.mental) || Number(inspectedPlayer.rating) || 7.0,
                          potential_rating: 8.5,
                          // Critères techniques détaillés (héritent de la note technique si non saisis individuellement)
                          tech_ball_control: inspectedPlayer.pillars?.tech_ball_control ?? inspectedPlayer.pillars?.technical,
                          tech_first_touch: inspectedPlayer.pillars?.tech_first_touch ?? inspectedPlayer.pillars?.technical,
                          tech_passing_short: inspectedPlayer.pillars?.tech_passing_short ?? inspectedPlayer.pillars?.technical,
                          tech_passing_long: inspectedPlayer.pillars?.tech_passing_long ?? inspectedPlayer.pillars?.technical,
                          tech_dribbling: inspectedPlayer.pillars?.tech_dribbling ?? inspectedPlayer.pillars?.technical,
                          tech_crossing: inspectedPlayer.pillars?.tech_crossing ?? inspectedPlayer.pillars?.technical,
                          tech_finishing: inspectedPlayer.pillars?.tech_finishing ?? inspectedPlayer.pillars?.technical,
                          tech_heading: inspectedPlayer.pillars?.tech_heading ?? inspectedPlayer.pillars?.technical,
                          tech_1v1_attacking: inspectedPlayer.pillars?.tech_1v1_attacking ?? inspectedPlayer.pillars?.technical,
                          tech_1v1_defending: inspectedPlayer.pillars?.tech_1v1_defending ?? inspectedPlayer.pillars?.technical,
                          tech_weak_foot: inspectedPlayer.pillars?.tech_weak_foot ?? inspectedPlayer.pillars?.technical,
                          // Critères physiques détaillés
                          phys_acceleration: inspectedPlayer.pillars?.phys_acceleration ?? inspectedPlayer.pillars?.physical,
                          phys_sprint_speed: inspectedPlayer.pillars?.phys_sprint_speed ?? inspectedPlayer.pillars?.physical,
                          phys_agility: inspectedPlayer.pillars?.phys_agility ?? inspectedPlayer.pillars?.physical,
                          phys_balance: inspectedPlayer.pillars?.phys_balance ?? inspectedPlayer.pillars?.physical,
                          phys_strength: inspectedPlayer.pillars?.phys_strength ?? inspectedPlayer.pillars?.physical,
                          phys_endurance: inspectedPlayer.pillars?.phys_endurance ?? inspectedPlayer.pillars?.physical,
                          phys_explosiveness: inspectedPlayer.pillars?.phys_explosiveness ?? inspectedPlayer.pillars?.physical,
                          // Critères tactiques détaillés
                          tact_positioning: inspectedPlayer.pillars?.tact_positioning ?? inspectedPlayer.pillars?.tactical,
                          tact_awareness: inspectedPlayer.pillars?.tact_awareness ?? inspectedPlayer.pillars?.tactical,
                          tact_decision_making: inspectedPlayer.pillars?.tact_decision_making ?? inspectedPlayer.pillars?.tactical,
                          tact_anticipation: inspectedPlayer.pillars?.tact_anticipation ?? inspectedPlayer.pillars?.tactical,
                          tact_space_awareness: inspectedPlayer.pillars?.tact_space_awareness ?? inspectedPlayer.pillars?.tactical,
                          tact_transition: inspectedPlayer.pillars?.tact_transition ?? inspectedPlayer.pillars?.tactical,
                          // Critères mentaux détaillés
                          ment_concentration: inspectedPlayer.pillars?.ment_concentration ?? inspectedPlayer.pillars?.mental,
                          ment_discipline: inspectedPlayer.pillars?.ment_discipline ?? inspectedPlayer.pillars?.mental,
                          ment_motivation: inspectedPlayer.pillars?.ment_motivation ?? inspectedPlayer.pillars?.mental,
                          ment_confidence: inspectedPlayer.pillars?.ment_confidence ?? inspectedPlayer.pillars?.mental,
                          ment_teamwork: inspectedPlayer.pillars?.ment_teamwork ?? inspectedPlayer.pillars?.mental,
                          ment_leadership: inspectedPlayer.pillars?.ment_leadership ?? inspectedPlayer.pillars?.mental,
                          ment_coachability: inspectedPlayer.pillars?.ment_coachability ?? inspectedPlayer.pillars?.mental,
                        } as any,
                      },
                    ]}
                    height={260}
                    detailed={true}
                    showTabs={true}
                    defaultTab="summary"
                  />
                </div>
              </div>

              {/* Evaluation Action Button */}
              <button
                onClick={() => {
                  setEvaluatingPlayer(inspectedPlayer);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Sliders className="w-4 h-4" /> Noter / Évaluer ce joueur en Match (Estimée ou Approfondie)
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
      {/* DUAL-MODE EVALUATION MODAL TRIGGERED FROM SHORTLIST                      */}
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
            try {
              let commentStr = evalData.mode === 'approfondie'
                ? `[Évaluation Approfondie] Tech: ${evalData.pillars?.technical} | Phys: ${evalData.pillars?.physical} | Tact: ${evalData.pillars?.tactical} | Ment: ${evalData.pillars?.mental}`
                : `[Évaluation Estimative] Note rapide`;
              if (evalData.notes) commentStr += ` - ${evalData.notes}`;

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

            evaluatingPlayer.rating = evalData.rating;
            evaluatingPlayer.has_evaluation = true;
            if (evalData.pillars) {
              evaluatingPlayer.pillars = evalData.pillars;
            }
            setEvaluatingPlayer(null);
          }}
        />
      )}
    </div>
  );
};

export default OfficialShortlistPage;
