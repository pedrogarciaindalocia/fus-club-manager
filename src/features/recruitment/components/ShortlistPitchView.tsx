import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Users, 
  Filter, 
  CheckCircle2, 
  X, 
  Eye, 
  Shield, 
  Footprints,
  BarChart3,
  Activity,
  Compass,
  Brain,
  Target,
  SlidersHorizontal,
  ChevronRight,
  Award,
  Search,
  UserCheck,
  ArrowUpDown,
  Crown,
  GripVertical,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  TrendingUp,
  Plus,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import type { TrialCandidate, CandidateEvaluation, Scout } from '../types/recruitment';
import { RECRUITMENT_AGE_CATEGORIES } from '../types/recruitment';
import PlayerRadarChart from './PlayerRadarChart';
import ScoutasticDenseSlotCard from '../../../components/ScoutasticDenseSlotCard';
import { recruitmentService } from '../../recruitment_v2/services/recruitmentService';

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

const ROLE_FULL_NAMES: Record<string, string> = {
  'GB': 'Gardien de But',
  'DG': 'Défenseur Gauche',
  'DD': 'Défenseur Droit',
  'DC': 'Défenseur Central',
  'DCG': 'Défenseur Central Gauche',
  'DCD': 'Défenseur Central Droit',
  'MDC': 'Milieu Défensif Central',
  'MDCG': 'Milieu Défensif Gauche',
  'MDCD': 'Milieu Défensif Droit',
  'MC': 'Milieu Central',
  'MCG': 'Milieu Central Gauche',
  'MCD': 'Milieu Central Droit',
  'MOC': 'Milieu Offensif Central',
  'MG': 'Milieu Gauche',
  'MD': 'Milieu Droit',
  'AG': 'Ailier Gauche',
  'AD': 'Ailier Droit',
  'BU': 'Buteur',
  'BUG': 'Buteur Gauche',
  'BUD': 'Buteur Droit',
};

interface ShortlistPitchViewProps {
  candidates: TrialCandidate[];
  evaluations: CandidateEvaluation[];
  scouts?: Scout[];
  onOpenCandidateDetail: (candidate: TrialCandidate) => void;
  onOpenEvaluationForCandidate?: (candidate: TrialCandidate) => void;
  onUpdateCandidate?: (id: string, updates: Partial<TrialCandidate>) => Promise<any>;
}

export const ShortlistPitchView: React.FC<ShortlistPitchViewProps> = ({
  candidates,
  evaluations,
  scouts = [],
  onOpenCandidateDetail,
  onOpenEvaluationForCandidate,
  onUpdateCandidate,
}) => {
  const [selectedFormationKey, setSelectedFormationKey] = useState<string>('4-3-3');
  const [pitchHeight, setPitchHeight] = useState<'standard' | 'tall' | 'extra'>('tall');

  const [scoutFilter, setScoutFilter] = useState<string>('ALL'); // 'ALL' = tous les scouts
  const [categoryFilter, setCategoryFilter] = useState<string>(''); // '' = aucune catégorie sélectionnée (VIDE)

  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyBestScorePerPosition, setOnlyBestScorePerPosition] = useState<boolean>(false);
  const [shortlistOnly, setShortlistOnly] = useState<boolean>(false);
  // Option de tri global au-dessus du terrain : 'none' | 'score' | 'scout'
  const [pitchSortOption, setPitchSortOption] = useState<'none' | 'score' | 'scout'>('none');

  // Liste des scouts disponibles parmi les props et les candidats
  const availableScouts = useMemo(() => {
    const list: { id?: string; name: string }[] = [];
    const seen = new Set<string>();

    if (scouts && scouts.length > 0) {
      scouts.forEach(s => {
        const name = s.full_name?.trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ id: s.id, name });
        }
      });
    }

    candidates.forEach(cand => {
      const name = cand.discovering_scout_name?.trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ id: cand.discovering_scout_id, name });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [scouts, candidates]);

  const pitchHeightClass = {
    standard: 'min-h-[1050px] lg:min-h-[1180px]',
    tall: 'min-h-[1280px] lg:min-h-[1420px]',
    extra: 'min-h-[1500px] lg:min-h-[1680px]',
  }[pitchHeight];

  // Joueur survolé (infobulle) et joueur inspecté (panneau modal complet)
  const [hoveredCandidate, setHoveredCandidate] = useState<TrialCandidate | null>(null);
  const [inspectedCandidate, setInspectedCandidate] = useState<TrialCandidate | null>(null);

  // État du tiroir latéral droit pour la réorganisation d'un poste
  const [selectedSlotForDrawer, setSelectedSlotForDrawer] = useState<{
    slotIndex: number;
    label: string;
    roleCode: string;
  } | null>(null);

  // Modal d'assignation d'un joueur existant de la base de données au poste
  const [slotForAddingPlayer, setSlotForAddingPlayer] = useState<{
    slotIndex: number;
    label: string;
    roleCode: string;
    category: 'GK' | 'DEF' | 'MID' | 'ATT';
  } | null>(null);
  const [playerModalSearch, setPlayerModalSearch] = useState<string>('');
  const [positionFilterMode, setPositionFilterMode] = useState<'matching' | 'all'>('matching');
  const [isAssigningPlayer, setIsAssigningPlayer] = useState<boolean>(false);

  // Ordre personnalisé des candidats par poste (persistant en localStorage & synchronisé Supabase)
  const [customSlotOrder, setCustomSlotOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('fus_shortlist_custom_slot_order');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Chargement asynchrone de l'ordre sauvegardé dans Supabase au montage
  React.useEffect(() => {
    let isMounted = true;
    recruitmentService.getShortlistSlotOrder().then(dbOrder => {
      if (isMounted && dbOrder && Object.keys(dbOrder).length > 0) {
        setCustomSlotOrder(dbOrder);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const saveCustomSlotOrder = (newOrder: Record<string, string[]>) => {
    setCustomSlotOrder(newOrder);
    try {
      localStorage.setItem('fus_shortlist_custom_slot_order', JSON.stringify(newOrder));
    } catch {
      // Ignore localStorage error
    }
    recruitmentService.saveShortlistSlotOrder(newOrder);
  };

  // Drag & drop state dans le tiroir
  const [draggedCandidateId, setDraggedCandidateId] = useState<string | null>(null);
  const [dragOverCandidateId, setDragOverCandidateId] = useState<string | null>(null);

  const activeFormation = FORMATIONS[selectedFormationKey] || FORMATIONS['4-3-3'];

  // Map des évaluations les plus récentes par joueur
  const playerEvaluationsMap = useMemo(() => {
    const map = new Map<string, CandidateEvaluation>();
    evaluations.forEach(ev => {
      const existing = map.get(ev.candidate_id);
      if (!existing || new Date(ev.evaluation_date).getTime() > new Date(existing.evaluation_date).getTime()) {
        map.set(ev.candidate_id, ev);
      }
    });
    return map;
  }, [evaluations]);

  // Vérifie si un candidat est formellement shortlisté : par défaut, tous les talents actifs sont shortlistés
  const isCandidateShortlisted = (cand: TrialCandidate): boolean => {
    if (cand.pipeline_stage === 'rejected' || cand.pipeline_stage === 'archived') {
      return false;
    }
    return true;
  };

  // Décompte total des joueurs de la shortlist
  const shortlistedTotalCount = useMemo(() => {
    return candidates.filter(isCandidateShortlisted).length;
  }, [candidates, playerEvaluationsMap]);

  // Vérifie si un candidat a été détecté ou assigné au scout choisi
  const isCandidateDetectedBySelectedScout = (cand: TrialCandidate, sFilter: string): boolean => {
    if (!sFilter || sFilter === 'ALL' || sFilter === 'all') return true;
    const sFilterNorm = sFilter.toLowerCase().trim();
    const discName = (cand.discovering_scout_name || '').toLowerCase().trim();
    const discId = cand.discovering_scout_id || '';
    if (discName === sFilterNorm || discId === sFilter) return true;
    if (cand.assigned_scouts && cand.assigned_scouts.some(s => s.toLowerCase().trim() === sFilterNorm || s === sFilter)) {
      return true;
    }
    // Vérification dans l'évaluation
    const ev = playerEvaluationsMap.get(cand.id);
    if (ev && ((ev.scout_name || '').toLowerCase().trim() === sFilterNorm || ev.scout_id === sFilter)) {
      return true;
    }
    return false;
  };

  // Tous les candidats de la catégorie sélectionnée détectés par le scout choisi
  const categoryCandidates = useMemo(() => {
    if (!categoryFilter) {
      return [];
    }

    return candidates.filter(cand => {
      // 1. Filtrage strict par catégorie choisie
      if (cand.age_category !== categoryFilter) {
        return false;
      }

      // 2. Filtrage par scout détecteur (sauf si 'ALL')
      if (scoutFilter && scoutFilter !== 'ALL' && !isCandidateDetectedBySelectedScout(cand, scoutFilter)) {
        return false;
      }

      // 3. Filtre Shortlist uniquement (si actif)
      if (shortlistOnly && !isCandidateShortlisted(cand)) {
        return false;
      }

      // 4. Filtre score global
      if (minScoreFilter > 0) {
        const score = playerEvaluationsMap.get(cand.id)?.overall_score || 0;
        if (score < minScoreFilter) return false;
      }

      // 5. Filtre recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${cand.first_name} ${cand.last_name}`.toLowerCase();
        const club = (cand.current_club || '').toLowerCase();
        const pos = (cand.primary_position || '').toLowerCase();
        if (!fullName.includes(q) && !club.includes(q) && !pos.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const evalA = playerEvaluationsMap.get(a.id);
      const evalB = playerEvaluationsMap.get(b.id);
      const scoreA = evalA?.overall_score;
      const scoreB = evalB?.overall_score;

      // 1. Joueur avec évaluation passe avant joueur sans évaluation
      if (scoreA !== undefined && scoreB === undefined) return -1;
      if (scoreA === undefined && scoreB !== undefined) return 1;

      // 2. Meilleur score d'évaluation décroissant
      if (scoreA !== undefined && scoreB !== undefined) {
        if (scoreB !== scoreA) return scoreB - scoreA;
        // 3. En cas d'égalité, évaluation la plus récente
        const dateA = new Date(evalA.evaluation_date).getTime() || 0;
        const dateB = new Date(evalB.evaluation_date).getTime() || 0;
        return dateB - dateA;
      }

      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
  }, [candidates, scoutFilter, categoryFilter, shortlistOnly, minScoreFilter, searchQuery, playerEvaluationsMap]);

  // Fonction de placement automatique d'un candidat sur le slot tactique le plus adapté
  const mapCandidateToSlotIndex = (cand: TrialCandidate, slots: FormationSlot[]): number => {
    const pos = (cand.primary_position || '').toUpperCase();

    // 1. Gardien
    if (pos.includes('GK') || pos.includes('GARDIEN')) {
      const idx = slots.findIndex(s => s.roleCode === 'GK');
      if (idx !== -1) return idx;
    }

    // 2. Ailier Gauche
    if (pos.includes('LW') || pos.includes('AILIER G') || pos.includes('AG')) {
      const idx = slots.findIndex(s => s.roleCode === 'LW' || s.label === 'AG' || s.label === 'MG');
      if (idx !== -1) return idx;
    }

    // 3. Ailier Droit
    if (pos.includes('RW') || pos.includes('AILIER D') || pos.includes('AD')) {
      const idx = slots.findIndex(s => s.roleCode === 'RW' || s.label === 'AD' || s.label === 'MD');
      if (idx !== -1) return idx;
    }

    // 4. Avant-Centre / Buteur
    if (pos.includes('ST') || pos.includes('CF') || pos.includes('BU') || pos.includes('BUTEUR') || pos.includes('ATT')) {
      const idx = slots.findIndex(s => s.roleCode === 'ST' || s.label.includes('BU'));
      if (idx !== -1) return idx;
    }

    // 5. Latéral Gauche
    if (pos.includes('LB') || pos.includes('DG') || pos.includes('LATÉRAL G') || pos.includes('PISTON G')) {
      const idx = slots.findIndex(s => s.roleCode === 'LB' || s.label === 'DG' || s.label.includes('Piston G'));
      if (idx !== -1) return idx;
    }

    // 6. Latéral Droit
    if (pos.includes('RB') || pos.includes('DD') || pos.includes('LATÉRAL D') || pos.includes('PISTON D')) {
      const idx = slots.findIndex(s => s.roleCode === 'RB' || s.label === 'DD' || s.label.includes('Piston D'));
      if (idx !== -1) return idx;
    }

    // 7. Défenseur Central
    if (pos.includes('CB') || pos.includes('DC') || pos.includes('DÉF')) {
      const idx = slots.findIndex(s => s.roleCode === 'CB' || s.label.includes('DC'));
      if (idx !== -1) return idx;
    }

    // 8. Milieu Défensif
    if (pos.includes('CDM') || pos.includes('MDC')) {
      const idx = slots.findIndex(s => s.roleCode === 'CDM' || s.label.includes('MDC'));
      if (idx !== -1) return idx;
    }

    // 9. Milieu Offensif
    if (pos.includes('CAM') || pos.includes('MOC') || pos.includes('10')) {
      const idx = slots.findIndex(s => s.roleCode === 'CAM' || s.label === 'MOC');
      if (idx !== -1) return idx;
    }

    // 10. Milieu Central
    if (pos.includes('CM') || pos.includes('MC') || pos.includes('MILIEU')) {
      const idx = slots.findIndex(s => s.roleCode === 'CM' || s.label.includes('MC') || s.category === 'MID');
      if (idx !== -1) return idx;
    }

    // Fallbacks par catégorie générique
    if (pos.includes('ATT')) {
      const idx = slots.findIndex(s => s.category === 'ATT');
      if (idx !== -1) return idx;
    }
    if (pos.includes('MID') || pos.includes('MIL')) {
      const idx = slots.findIndex(s => s.category === 'MID');
      if (idx !== -1) return idx;
    }
    if (pos.includes('DEF')) {
      const idx = slots.findIndex(s => s.category === 'DEF');
      if (idx !== -1) return idx;
    }

    // Slot par défaut : milieu
    return Math.floor(slots.length / 2);
  };

  // Regroupement automatique des joueurs par slot tactique
  const playersBySlot = useMemo(() => {
    const map: Record<number, TrialCandidate[]> = {};
    activeFormation.slots.forEach((_, idx) => {
      map[idx] = [];
    });

    categoryCandidates.forEach(cand => {
      const slotIdx = mapCandidateToSlotIndex(cand, activeFormation.slots);
      if (map[slotIdx]) {
        map[slotIdx].push(cand);
      } else {
        map[0]?.push(cand);
      }
    });

    // Appliquer le tri selon pitchSortOption ou l'ordre personnalisé du Drag & Drop
    activeFormation.slots.forEach((slot, idx) => {
      const customIds = customSlotOrder[slot.label] || customSlotOrder[slot.roleCode];

      if (pitchSortOption === 'score') {
        // Tri forcé par dernier score d'évaluation
        if (map[idx] && map[idx].length > 1) {
          map[idx].sort((a, b) => {
            const evalA = playerEvaluationsMap.get(a.id);
            const evalB = playerEvaluationsMap.get(b.id);
            const scoreA = evalA?.overall_score;
            const scoreB = evalB?.overall_score;
            if (scoreA !== undefined && scoreB === undefined) return -1;
            if (scoreA === undefined && scoreB !== undefined) return 1;
            if (scoreA !== undefined && scoreB !== undefined) {
              if (scoreB !== scoreA) return scoreB - scoreA;
              const dateA = new Date(evalA.evaluation_date).getTime() || 0;
              const dateB = new Date(evalB.evaluation_date).getTime() || 0;
              return dateB - dateA;
            }
            return 0;
          });
        }
      } else if (pitchSortOption === 'scout') {
        // Tri par scout découvreur
        if (map[idx] && map[idx].length > 1) {
          map[idx].sort((a, b) => {
            const scoutA = (a.discovering_scout_name || 'Cellule FUS').toLowerCase();
            const scoutB = (b.discovering_scout_name || 'Cellule FUS').toLowerCase();
            const cmp = scoutA.localeCompare(scoutB);
            if (cmp !== 0) return cmp;
            const evalA = playerEvaluationsMap.get(a.id);
            const evalB = playerEvaluationsMap.get(b.id);
            const scoreA = evalA?.overall_score ?? -1;
            const scoreB = evalB?.overall_score ?? -1;
            return scoreB - scoreA;
          });
        }
      } else {
        // Ordre par défaut / Ordre personnalisé issu du Drag & Drop
        if (customIds && customIds.length > 0 && map[idx] && map[idx].length > 1) {
          map[idx].sort((a, b) => {
            const idxA = customIds.indexOf(a.id);
            const idxB = customIds.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
          });
        }
      }
    });

    // Si l'option "Meilleur Score par Poste" est active : ne garder que le 1er joueur du slot (celui avec la meilleure dernière note)
    if (onlyBestScorePerPosition) {
      Object.keys(map).forEach(key => {
        const slotIdx = Number(key);
        if (map[slotIdx].length > 1) {
          map[slotIdx] = [map[slotIdx][0]];
        }
      });
    }

    return map;
  }, [categoryCandidates, activeFormation, onlyBestScorePerPosition, customSlotOrder, pitchSortOption, playerEvaluationsMap]);

  // Handlers pour le Drag & Drop et la réorganisation dans le tiroir latéral
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCandidateId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCandidateId !== id) {
      setDragOverCandidateId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedCandidateId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId || !selectedSlotForDrawer) return;

    const currentList = [...(playersBySlot[selectedSlotForDrawer.slotIndex] || [])];
    const sourceIndex = currentList.findIndex(c => c.id === sourceId);
    const targetIndex = currentList.findIndex(c => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = currentList.splice(sourceIndex, 1);
    currentList.splice(targetIndex, 0, moved);

    const newOrderIds = currentList.map(c => c.id);
    saveCustomSlotOrder({
      ...customSlotOrder,
      [selectedSlotForDrawer.label]: newOrderIds,
      [selectedSlotForDrawer.roleCode]: newOrderIds,
    });

    setPitchSortOption('none');
    setDraggedCandidateId(null);
    setDragOverCandidateId(null);
    toast.success("Ordre personnalisé mis à jour");
  };

  const handleMovePlayer = (candidateId: string, direction: 'up' | 'down') => {
    if (!selectedSlotForDrawer) return;
    const currentList = [...(playersBySlot[selectedSlotForDrawer.slotIndex] || [])];
    const index = currentList.findIndex(c => c.id === candidateId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentList.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const [moved] = currentList.splice(index, 1);
    currentList.splice(targetIndex, 0, moved);

    const newOrderIds = currentList.map(c => c.id);
    saveCustomSlotOrder({
      ...customSlotOrder,
      [selectedSlotForDrawer.label]: newOrderIds,
      [selectedSlotForDrawer.roleCode]: newOrderIds,
    });
    setPitchSortOption('none');
  };

  const handleSortByLastScore = () => {
    if (!selectedSlotForDrawer) return;
    const updated = { ...customSlotOrder };
    delete updated[selectedSlotForDrawer.label];
    saveCustomSlotOrder(updated);
    toast.success(`Poste ${selectedSlotForDrawer.label} réordonné par note d'évaluation`);
  };

  // Vérifie si la position d'un joueur correspond au poste du slot sélectionné
  const isPlayerPositionMatchingSlot = (cand: TrialCandidate, slot: { roleCode: string; label: string; category: 'GK' | 'DEF' | 'MID' | 'ATT' }): boolean => {
    const pos = (cand.primary_position || '').toUpperCase().trim();
    const sec = (cand.secondary_position || '').toUpperCase().trim();
    const rCode = slot.roleCode.toUpperCase();
    const sLabel = slot.label.toUpperCase();
    const sCat = slot.category;

    if (pos.includes(rCode) || pos.includes(sLabel) || sec.includes(rCode) || sec.includes(sLabel)) {
      return true;
    }

    if (sCat === 'GK' || rCode === 'GK') {
      return pos.includes('GK') || pos.includes('GARDIEN') || pos.includes('GB');
    }

    if (rCode === 'RB' || sLabel.includes('DD') || sLabel.includes('PISTON D')) {
      return pos.includes('RB') || pos.includes('DD') || pos.includes('LATÉRAL D') || pos.includes('PISTON D') || pos.includes('DROIT');
    }

    if (rCode === 'LB' || sLabel.includes('DG') || sLabel.includes('PISTON G')) {
      return pos.includes('LB') || pos.includes('DG') || pos.includes('LATÉRAL G') || pos.includes('PISTON G') || pos.includes('GAUCHE');
    }

    if (rCode === 'CB' || sLabel.includes('DC')) {
      return pos.includes('CB') || pos.includes('DC') || pos.includes('DÉFENSEUR') || pos.includes('DEF');
    }

    if (rCode === 'CDM' || sLabel.includes('MDC')) {
      return pos.includes('CDM') || pos.includes('MDC') || pos.includes('DÉFENSIF') || pos.includes('MILIEU DEF');
    }

    if (rCode === 'CAM' || sLabel.includes('MOC')) {
      return pos.includes('CAM') || pos.includes('MOC') || pos.includes('OFFENSIF') || pos.includes('10');
    }

    if (rCode === 'CM' || sLabel.includes('MC') || sLabel === 'MD' || sLabel === 'MG') {
      return pos.includes('CM') || pos.includes('MC') || pos.includes('MD') || pos.includes('MG') || pos.includes('MILIEU') || pos.includes('MID');
    }

    if (rCode === 'RW' || sLabel.includes('AD')) {
      return pos.includes('RW') || pos.includes('AD') || pos.includes('AILIER D') || pos.includes('AILIER');
    }

    if (rCode === 'LW' || sLabel.includes('AG')) {
      return pos.includes('LW') || pos.includes('AG') || pos.includes('AILIER G') || pos.includes('AILIER');
    }

    if (rCode === 'ST' || sLabel.includes('BU')) {
      return pos.includes('ST') || pos.includes('BU') || pos.includes('CF') || pos.includes('BUTEUR') || pos.includes('ATTAQUANT') || pos.includes('ATT') || pos.includes('AVANT');
    }

    if (sCat === 'DEF') return pos.includes('DEF') || pos.includes('DÉF');
    if (sCat === 'MID') return pos.includes('MID') || pos.includes('MIL');
    if (sCat === 'ATT') return pos.includes('ATT');

    return false;
  };

  // Candidats disponibles dans la base de données pour l'assignation au poste
  // Filtrés prioritairement par POSITION selon la demande utilisateur
  // CONDITION STRICTE : Seuls les joueurs appartenant STRICTEMENT au Scout et à la Catégorie choisis peuvent être affichés et ajoutés !
  const candidatesForSlotSelection = useMemo(() => {
    if (!slotForAddingPlayer) return [];
    if (!categoryFilter) return [];

    const query = playerModalSearch.toLowerCase().trim();

    return candidates.filter(cand => {
      if (cand.pipeline_stage === 'archived' || cand.status === 'archived') return false;

      // 1. CONDITION DE LA CATÉGORIE SÉLECTIONNÉE
      if (cand.age_category !== categoryFilter) {
        return false;
      }

      // 2. Filtrage par position selon le mode sélectionné
      if (positionFilterMode === 'matching') {
        if (!isPlayerPositionMatchingSlot(cand, slotForAddingPlayer)) {
          return false;
        }
      }

      // 3. Filtrer par recherche textuelle si présente
      if (query) {
        const fullName = `${cand.first_name} ${cand.last_name}`.toLowerCase();
        const club = (cand.current_club || '').toLowerCase();
        const pos = (cand.primary_position || '').toLowerCase();
        const cat = (cand.age_category || '').toLowerCase();
        const scout = (cand.discovering_scout_name || '').toLowerCase();
        if (!fullName.includes(query) && !club.includes(query) && !pos.includes(query) && !cat.includes(query) && !scout.includes(query)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const aMatches = isPlayerPositionMatchingSlot(a, slotForAddingPlayer) ? 1 : 0;
      const bMatches = isPlayerPositionMatchingSlot(b, slotForAddingPlayer) ? 1 : 0;
      if (bMatches !== aMatches) return bMatches - aMatches;

      const aSameCat = a.age_category === categoryFilter ? 1 : 0;
      const bSameCat = b.age_category === categoryFilter ? 1 : 0;
      if (bSameCat !== aSameCat) return bSameCat - aSameCat;

      if (scoutFilter && scoutFilter !== 'ALL') {
        const aSameScout = isCandidateDetectedBySelectedScout(a, scoutFilter) ? 1 : 0;
        const bSameScout = isCandidateDetectedBySelectedScout(b, scoutFilter) ? 1 : 0;
        if (bSameScout !== aSameScout) return bSameScout - aSameScout;
      }

      const evalA = playerEvaluationsMap.get(a.id)?.overall_score ?? -1;
      const evalB = playerEvaluationsMap.get(b.id)?.overall_score ?? -1;
      if (evalB !== evalA) return evalB - evalA;

      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
  }, [candidates, slotForAddingPlayer, positionFilterMode, playerModalSearch, categoryFilter, scoutFilter, playerEvaluationsMap]);

  // Handler pour assigner un joueur existant de la base de données au poste sélectionné
  const handleAssignExistingCandidateToSlot = async (candidate: TrialCandidate) => {
    if (!slotForAddingPlayer) return;

    if (!categoryFilter) {
      toast.error("Veuillez d'abord sélectionner une catégorie sur le terrain.");
      return;
    }

    setIsAssigningPlayer(true);

    try {
      const targetRoleCode = slotForAddingPlayer.roleCode;
      const targetLabel = slotForAddingPlayer.label;

      const updates: Partial<TrialCandidate> = {
        primary_position: targetRoleCode || targetLabel,
      };

      if (onUpdateCandidate) {
        await onUpdateCandidate(candidate.id, updates);
      } else {
        await recruitmentService.updateCandidate(candidate.id, updates);
      }

      const existingSlotIds = customSlotOrder[targetLabel] || customSlotOrder[targetRoleCode] || [];
      const newSlotIds = [candidate.id, ...existingSlotIds.filter(id => id !== candidate.id)];
      saveCustomSlotOrder({
        ...customSlotOrder,
        [targetLabel]: newSlotIds,
        [targetRoleCode]: newSlotIds,
      });

      toast.success(
        `✓ ${candidate.first_name} ${candidate.last_name} (${scoutFilter}) assigné au poste ${targetLabel} (${targetRoleCode}) !`,
        { icon: '⭐' }
      );

      setSlotForAddingPlayer(null);
      setPlayerModalSearch('');
    } catch (err: any) {
      console.error('Erreur assignation joueur au slot:', err);
      toast.error("Erreur lors de l'assignation du joueur au poste");
    } finally {
      setIsAssigningPlayer(false);
    }
  };

  // Nombre total de joueurs effectivement affichés sur le terrain
  const positionedPlayersCount = useMemo(() => {
    return Object.values(playersBySlot).reduce((sum, list) => sum + list.length, 0);
  }, [playersBySlot]);

  // Décompte des candidats par catégorie d'âge (filtré selon le scout sélectionné)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    candidates.forEach(c => {
      if (scoutFilter && !isCandidateDetectedBySelectedScout(c, scoutFilter)) {
        return;
      }
      const cat = c.age_category || 'Inconnue';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [candidates, scoutFilter]);

  // Nombre total de joueurs détectés par le scout sélectionné (toutes catégories confondues)
  const totalScoutPlayersCount = useMemo(() => {
    if (!scoutFilter) return 0;
    return candidates.filter(c => isCandidateDetectedBySelectedScout(c, scoutFilter)).length;
  }, [candidates, scoutFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── BANDEAU DE SÉLECTION OBLIGATOIRE : SCOUT & CATÉGORIE (SHORTLIST VIDE AVANT CHOIX) ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm space-y-4">
        {/* En-tête avec explication & bouton vider */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Shortlist Tactique — Sélection du Scout & de la Catégorie
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                La shortlist est vide tant qu'un scout et une catégorie ne sont pas choisis.
              </p>
            </div>
          </div>

          {(scoutFilter || categoryFilter) && (
            <button
              type="button"
              onClick={() => {
                setScoutFilter('');
                setCategoryFilter('');
                setSelectedSlotForDrawer(null);
                toast.info("Shortlist réinitialisée (terrain vide)");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Vider la sélection</span>
            </button>
          )}
        </div>

        {/* Les 2 étapes de sélection obligatoire */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Étape 1 : Choisir le Scout Découvreur */}
          <div className="lg:col-span-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors",
                  scoutFilter ? "bg-emerald-600 text-white" : "bg-amber-400 text-slate-950 ring-2 ring-amber-300"
                )}>
                  {scoutFilter ? '✓' : '1'}
                </span>
                <span>Scout Découvreur *</span>
              </label>
              {scoutFilter && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {totalScoutPlayersCount} joueur{totalScoutPlayersCount > 1 ? 's' : ''} trouvé{totalScoutPlayersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <select
              value={scoutFilter}
              onChange={(e) => {
                setScoutFilter(e.target.value);
                setSelectedSlotForDrawer(null);
              }}
              className={cn(
                "w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2",
                scoutFilter
                  ? "bg-emerald-50 text-emerald-950 border-emerald-300 ring-emerald-400/20 font-black"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300 ring-primary/20"
              )}
            >
              <option value="">-- Choisir un Scout ({availableScouts.length}) --</option>
              {availableScouts.map(scout => (
                <option key={scout.name} value={scout.name}>
                  {scout.name}
                </option>
              ))}
            </select>
          </div>

          {/* Étape 2 : Choisir la Catégorie d'Âge */}
          <div className="lg:col-span-8 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors",
                  categoryFilter ? "bg-emerald-600 text-white" : "bg-amber-400 text-slate-950 ring-2 ring-amber-300"
                )}>
                  {categoryFilter ? '✓' : '2'}
                </span>
                <span>Catégorie d'Âge *</span>
              </label>
              {categoryFilter && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  Catégorie {categoryFilter}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {RECRUITMENT_AGE_CATEGORIES.map(cat => {
                const count = categoryCounts[cat] || 0;
                const isSelected = categoryFilter === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(prev => prev === cat ? '' : cat);
                      setSelectedSlotForDrawer(null);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs",
                      isSelected
                        ? "bg-primary text-white shadow-primary/25 font-black scale-105 ring-2 ring-primary/30"
                        : count > 0 && scoutFilter
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-black"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    )}
                    title={scoutFilter ? `${count} joueur(s) détecté(s) par ${scoutFilter} en ${cat}` : "Veuillez d'abord choisir un scout"}
                  >
                    <span>{cat}</span>
                    {scoutFilter && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                        isSelected 
                          ? "bg-white/25 text-white" 
                          : count > 0 ? "bg-amber-200 text-amber-900" : "bg-slate-200 text-slate-500"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ligne d'état & résumé dynamique */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {!scoutFilter && !categoryFilter ? (
              <span className="text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span>⚠️</span>
                <span>Sélectionnez un <strong>Scout</strong> et une <strong>Catégorie</strong> pour charger le terrain tactique.</span>
              </span>
            ) : !scoutFilter ? (
              <span className="text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span>👤</span>
                <span>Veuillez maintenant choisir un <strong>Scout</strong> dans le menu déroulant.</span>
              </span>
            ) : !categoryFilter ? (
              <span className="text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span>🏷️</span>
                <span>Scout sélectionné : <strong>{scoutFilter}</strong> — Cliquez maintenant sur une <strong>Catégorie</strong>.</span>
              </span>
            ) : (
              <span className="text-emerald-900 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 font-black flex items-center gap-2 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>
                  {categoryCandidates.length} joueur{categoryCandidates.length > 1 ? 's' : ''} détecté{categoryCandidates.length > 1 ? 's' : ''} par {scoutFilter} en {categoryFilter}
                </span>
              </span>
            )}
          </div>

          {/* Outils secondaires : recherche, tri, hauteur */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {scoutFilter && categoryFilter && (
              <>
                {/* Recherche */}
                <div className="relative w-40 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer nom..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Bouton Tri Score */}
                <button
                  type="button"
                  onClick={() => {
                    const next = pitchSortOption === 'score' ? 'none' : 'score';
                    setPitchSortOption(next);
                    toast.info(next === 'score' ? "Terrain : Trié par dernier score d'évaluation" : "Terrain : Ordre réinitialisé");
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs",
                    pitchSortOption === 'score'
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  )}
                  title="Trier par note d'évaluation décroissante"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline">Score</span>
                </button>
              </>
            )}

            {/* Hauteur du Terrain */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setPitchHeight('standard')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  pitchHeight === 'standard' ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                )}
              >
                1180px
              </button>
              <button
                type="button"
                onClick={() => setPitchHeight('tall')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  pitchHeight === 'tall' ? "bg-white text-emerald-700 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Grande
              </button>
              <button
                type="button"
                onClick={() => setPitchHeight('extra')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  pitchHeight === 'extra' ? "bg-white text-primary shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                )}
              >
                XXL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DISPOSITION CÔTE À CÔTE DANS LA PAGE (TERRAIN À GAUCHE + LISTE DU POSTE À DROITE) ── */}
      <div className={cn(
        "w-full flex flex-col gap-5 sm:gap-6 items-start transition-all duration-300",
        selectedSlotForDrawer ? "xl:flex-row items-stretch" : "items-center"
      )}>
        {/* Colonne GAUCHE : Terrain de Football */}
        <div className={cn(
          "relative bg-slate-50/50 p-2 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar transition-all duration-300",
          selectedSlotForDrawer
            ? "w-full xl:flex-1 flex justify-center min-w-0"
            : "w-full flex justify-center"
        )}>
          <div 
            className={cn(
              "w-full rounded-2xl sm:rounded-3xl relative overflow-hidden bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900 border-4 border-emerald-950 shadow-2xl select-none transition-all duration-300",
              selectedSlotForDrawer ? "max-w-[960px] min-h-[860px] aspect-[82/105]" : pitchHeightClass
            )}
          >
          {/* Pelouse Réaliste : Bandes de tonte alternées */}
          <div className="absolute inset-0 flex flex-col pointer-events-none opacity-25">
            {[...Array(18)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex-1 w-full",
                  i % 2 === 0 ? "bg-black/15" : "bg-white/10"
                )} 
              />
            ))}
          </div>

          {/* Lignes Blanches Officielles FUS */}
          <div className="absolute inset-3 sm:inset-5 border-2 border-white/75 rounded-2xl pointer-events-none">
            {/* Ligne médiane & Rond Central */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/75 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 border-2 border-white/75 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-xs" />

            {/* Surface de réparation NORD (Adversaire / Attaque) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 sm:w-80 md:w-96 h-32 sm:h-40 md:h-48 border-2 border-t-0 border-white/75 rounded-b-2xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 sm:w-36 md:w-44 h-12 sm:h-16 md:h-20 border-2 border-t-0 border-white/75 rounded-b-xl" />
            <div className="absolute top-24 sm:top-32 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
            {/* Arc de cercle surface Nord */}
            <div className="absolute top-32 sm:top-40 left-1/2 -translate-x-1/2 w-24 sm:w-28 md:w-32 h-12 sm:h-14 md:h-16 border-2 border-t-0 border-white/75 rounded-b-full" />

            {/* Surface de réparation SUD (FUS / Gardien) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 sm:w-80 md:w-96 h-32 sm:h-40 md:h-48 border-2 border-b-0 border-white/75 rounded-t-2xl" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 sm:w-36 md:w-44 h-12 sm:h-16 md:h-20 border-2 border-b-0 border-white/75 rounded-t-lg" />
            <div className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
            {/* Arc de cercle surface Sud */}
            <div className="absolute bottom-32 sm:bottom-40 left-1/2 -translate-x-1/2 w-24 sm:w-28 md:w-32 h-12 sm:h-14 md:h-16 border-2 border-b-0 border-white/75 rounded-t-full" />
          </div>

          {/* ── OVERLAY QUAND LA SHORTLIST EST VIDE (SÉLECTION NON EFFECTUÉE) ── */}
          {(!scoutFilter || !categoryFilter) && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
              <div className="max-w-md p-6 sm:p-8 bg-slate-900/95 border-2 border-amber-400/50 rounded-3xl shadow-2xl space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <UserCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Terrain Shortlist Vide
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                    Veuillez sélectionner un <strong>Scout</strong> et une <strong>Catégorie</strong> ci-dessus pour afficher sur le terrain les joueurs détectés.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-bold">
                  <span className={cn(
                    "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                    scoutFilter ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  )}>
                    {scoutFilter ? `✓ Scout : ${scoutFilter}` : '① Choisir un Scout'}
                  </span>
                  <span className={cn(
                    "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                    categoryFilter ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  )}>
                    {categoryFilter ? `✓ Catégorie : ${categoryFilter}` : '② Choisir une Catégorie'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── OVERLAY QUAND AUCUN JOUEUR N'EST DÉTECTÉ POUR CE DUO SCOUT + CATÉGORIE ── */}
          {scoutFilter && categoryFilter && categoryCandidates.length === 0 && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-200">
              <div className="max-w-md p-6 sm:p-7 bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Aucun joueur détecté
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Le scout <strong>{scoutFilter}</strong> n'a aucun joueur répertorié dans la catégorie <strong>{categoryFilter}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ── EMPLACEMENTS TACTIQUES AVEC JUXTAPOSITION DES JOUEURS ── */}
          {activeFormation.slots.map((slot, slotIdx) => {
            const slotPlayers = playersBySlot[slotIdx] || [];

            return (
              <div
                key={slotIdx}
                style={{ top: slot.top, left: slot.left }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20"
              >
                {/* Badge du rôle / poste tactique - Cliquable pour ouvrir ou fermer la liste latérale droite */}
                <button
                  type="button"
                  onClick={() => setSelectedSlotForDrawer(prev => 
                    prev?.slotIndex === slotIdx ? null : { slotIndex: slotIdx, label: slot.label, roleCode: slot.roleCode }
                  )}
                  className="mb-1.5 flex items-center gap-1 cursor-pointer group hover:scale-105 transition-transform"
                  title={`Cliquer pour afficher la liste complète de ce poste (${slot.label}) à droite du terrain`}
                >
                  <span 
                    className={cn(
                      "text-[10px] sm:text-[11px] font-black uppercase px-2 py-0.5 rounded-md backdrop-blur-xs border shadow-md transition-colors",
                      selectedSlotForDrawer?.slotIndex === slotIdx
                        ? "bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/40"
                        : "text-white bg-black/75 border-white/30 group-hover:border-amber-400 group-hover:bg-black/90"
                    )}
                  >
                    {slot.label}
                  </span>
                </button>

                {/* S'il n'y a pas de joueur à ce poste dans la catégorie */}
                {slotPlayers.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!scoutFilter || !categoryFilter) {
                        toast.info("Veuillez sélectionner un Scout et une Catégorie avant d'ajouter un joueur");
                        return;
                      }
                      setSlotForAddingPlayer({ slotIndex: slotIdx, label: slot.label, roleCode: slot.roleCode, category: slot.category });
                      setPositionFilterMode('matching');
                      setPlayerModalSearch('');
                    }}
                    className="group/empty flex flex-col items-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    title={`Ajouter un joueur de la base de données au poste ${slot.label} (${slot.roleCode})`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-white/60 group-hover/empty:border-amber-400 bg-black/35 group-hover/empty:bg-amber-400/20 flex items-center justify-center text-white/70 group-hover/empty:text-amber-300 backdrop-blur-xs shadow-lg transition-colors relative">
                      <span className="text-[9px] font-bold uppercase">{slot.roleCode}</span>
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 group-hover/empty:bg-amber-300 text-slate-950 flex items-center justify-center shadow-md font-black">
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </span>
                    </div>
                  </button>
                ) : (
                  /* Carte Compacte Scoutastic pour tous les postes avec joueurs (même 1 seul joueur) */
                  <ScoutasticDenseSlotCard
                    slotLabel={slot.label}
                    roleCode={slot.roleCode}
                    players={slotPlayers.map(cand => {
                      const ev = playerEvaluationsMap.get(cand.id);
                      return {
                        raw: cand,
                        id: cand.id,
                        shortName: `${cand.first_name[0]}. ${cand.last_name}`,
                        fullName: `${cand.first_name} ${cand.last_name}`,
                        photoUrl: cand.photo_url,
                        initials: `${cand.first_name[0]}${cand.last_name[0]}`.toUpperCase(),
                        rating: ev?.overall_score ?? null,
                        hasEvaluation: !!ev,
                        isTrial: cand.pipeline_stage === 'trial',
                        clubOrTeam: cand.current_club || 'Sans club',
                      };
                    })}
                    isSelected={selectedSlotForDrawer?.slotIndex === slotIdx}
                    onSelectPlayer={(cand) => setInspectedCandidate(cand)}
                    onOpenSlotDrawer={() => setSelectedSlotForDrawer(prev => 
                      prev?.slotIndex === slotIdx ? null : { slotIndex: slotIdx, label: slot.label, roleCode: slot.roleCode }
                    )}
                    onAddPlayer={() => {
                      if (!scoutFilter || !categoryFilter) {
                        toast.info("Veuillez sélectionner un Scout et une Catégorie avant d'ajouter un joueur");
                        return;
                      }
                      setSlotForAddingPlayer({ slotIndex: slotIdx, label: slot.label, roleCode: slot.roleCode, category: slot.category });
                      setPositionFilterMode('matching');
                      setPlayerModalSearch('');
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Colonne DROITE : Panneau détaillé du poste affiché directement dans la page (NON EN SLIDE) */}
      {selectedSlotForDrawer && (() => {
        const slotPlayers = playersBySlot[selectedSlotForDrawer.slotIndex] || [];
        const fullRoleName = ROLE_FULL_NAMES[selectedSlotForDrawer.label] || selectedSlotForDrawer.label;

        return (
          <aside 
            className="w-full xl:w-[420px] 2xl:w-[460px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl flex flex-col shrink-0 overflow-hidden xl:sticky xl:top-4 self-start max-h-[960px] animate-in fade-in zoom-in-95 duration-200"
            aria-label={`Gestion des joueurs du poste ${selectedSlotForDrawer.label}`}
          >
            {/* Entête du Panneau */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm shadow-xs">
                  {selectedSlotForDrawer.roleCode}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      {fullRoleName}
                    </h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {selectedSlotForDrawer.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {slotPlayers.length} joueur{slotPlayers.length > 1 ? 's' : ''} présélectionné{slotPlayers.length > 1 ? 's' : ''} à ce poste
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSlotForDrawer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Fermer la liste et recentrer le terrain"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre d'outils / Actions rapides */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Hiérarchie des choix
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!scoutFilter || !categoryFilter) {
                        toast.info("Veuillez sélectionner un Scout et une Catégorie avant d'ajouter un joueur");
                        return;
                      }
                      const slotCfg = activeFormation.slots[selectedSlotForDrawer.slotIndex];
                      setSlotForAddingPlayer({
                        slotIndex: selectedSlotForDrawer.slotIndex,
                        label: selectedSlotForDrawer.label,
                        roleCode: selectedSlotForDrawer.roleCode,
                        category: slotCfg?.category || 'MID',
                      });
                      setPositionFilterMode('matching');
                      setPlayerModalSearch('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors shadow-2xs cursor-pointer"
                    title="Ajouter un joueur existant de la base de données à ce poste"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Ajouter joueur</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSortByLastScore}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-amber-400 hover:bg-amber-50/40 text-slate-700 hover:text-amber-900 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    title="Classer les joueurs selon leur note d'évaluation la plus récente"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Trier score</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                Glissez-déposez les cartes (Drag & Drop) pour définir l’ordre de priorité. Le joueur en <strong>#1</strong> hérite de la couronne 👑 sur le terrain à gauche.
              </p>
            </div>

            {/* Liste des Joueurs Réordonnables */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar bg-slate-100/50 max-h-[640px]">
              {slotPlayers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Aucun joueur assigné à ce poste</p>
                    <p className="text-xs text-slate-400 mt-0.5">Choisissez un joueur existant créé dans la base de données.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const slotCfg = activeFormation.slots[selectedSlotForDrawer.slotIndex];
                      setSlotForAddingPlayer({
                        slotIndex: selectedSlotForDrawer.slotIndex,
                        label: selectedSlotForDrawer.label,
                        roleCode: selectedSlotForDrawer.roleCode,
                        category: slotCfg?.category || 'MID',
                      });
                      setPositionFilterMode('matching');
                      setPlayerModalSearch('');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer hover:scale-105"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Ajouter un joueur de la base de données</span>
                  </button>
                </div>
              ) : (
                slotPlayers.map((cand, idx) => {
                  const ev = playerEvaluationsMap.get(cand.id);
                  const isFirst = idx === 0;
                  const isDragging = draggedCandidateId === cand.id;
                  const isOver = dragOverCandidateId === cand.id;
                  const score = ev?.overall_score;

                  return (
                    <div
                      key={cand.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cand.id)}
                      onDragOver={(e) => handleDragOver(e, cand.id)}
                      onDrop={(e) => handleDrop(e, cand.id)}
                      onDragEnd={() => {
                        setDraggedCandidateId(null);
                        setDragOverCandidateId(null);
                      }}
                      className={cn(
                        "group relative flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-150 bg-white select-none cursor-grab active:cursor-grabbing shadow-2xs",
                        isDragging && "opacity-40 border-dashed border-amber-400 scale-[0.98]",
                        isOver && "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/40",
                        !isDragging && !isOver && (isFirst ? "border-amber-300 ring-1 ring-amber-200/50 bg-gradient-to-r from-amber-50/20 to-white" : "border-slate-200 hover:border-slate-300")
                      )}
                    >
                      {/* Poignée de drag */}
                      <div className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Badge de Rang */}
                      <div className="shrink-0">
                        {isFirst ? (
                          <div 
                            className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs"
                            title="Choix #1 Titulaire shortlist"
                          >
                            <Crown className="w-4 h-4 fill-slate-950" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center border border-slate-200">
                            #{idx + 1}
                          </div>
                        )}
                      </div>

                      {/* Photo / Initials */}
                      <div className="relative shrink-0">
                        {cand.photo_url ? (
                          <img
                            src={cand.photo_url}
                            alt={`${cand.first_name} ${cand.last_name}`}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                            {cand.first_name[0]}{cand.last_name[0]}
                          </div>
                        )}
                        {isFirst && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center" />
                        )}
                      </div>

                      {/* Identité Joueur */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-800 text-xs truncate">
                            {cand.first_name} {cand.last_name}
                          </span>
                          {cand.pipeline_stage === 'trial' && (
                            <span className="text-[9px] font-bold px-1 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                              Test
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{cand.current_club || 'Sans club'}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600">{cand.age_category}</span>
                          {cand.preferred_foot && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] text-slate-400">{cand.preferred_foot}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Note ou Score */}
                      <div className="shrink-0 text-right">
                        {score !== undefined ? (
                          <div className={cn(
                            "px-2 py-1 rounded-lg font-black text-xs inline-flex items-center gap-1 border",
                            score >= 7.5 ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                            score >= 6 ? "bg-blue-50 text-blue-800 border-blue-200" :
                            score >= 4 ? "bg-amber-50 text-amber-800 border-amber-200" :
                            "bg-rose-50 text-rose-800 border-rose-200"
                          )}>
                            <span>{score.toFixed(1)}</span>
                            <span className="text-[9px] opacity-70">/10</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                            Non noté
                          </span>
                        )}
                      </div>

                      {/* Contrôles de déplacement accessible & ouverture profil */}
                      <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-slate-100">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePlayer(cand.id, 'up');
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="Monter le joueur (# plus prioritaire)"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === slotPlayers.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePlayer(cand.id, 'down');
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="Descendre le joueur"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedCandidate(cand);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-0.5 cursor-pointer"
                          title="Inspecter le joueur"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pied de Page du Panneau */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span>Synchronisé Supabase</span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSlotForDrawer(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Fermer la liste
              </button>
            </div>
          </aside>
        );
      })()}
    </div>

      {/* ── GRAND PANNEAU MODAL DE PERFORMANCE (REPRODUISANT LA PHOTO UTILISATEUR) ── */}
      {inspectedCandidate && (() => {
        const ev = playerEvaluationsMap.get(inspectedCandidate.id);

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 animate-in fade-in duration-200"
            onClick={() => setInspectedCandidate(null)}
          >
            <div 
              className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border-2 border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* EN-TÊTE DU PANNEAU (STYLE PHOTO FOURNIE) */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                  {/* Photo / Avatar avec initiales */}
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center font-black text-xl text-white shrink-0 shadow-md">
                    {inspectedCandidate.photo_url ? (
                      <img src={inspectedCandidate.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{inspectedCandidate.first_name[0]}{inspectedCandidate.last_name[0]}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-xl font-black text-white tracking-tight">
                        {inspectedCandidate.first_name} {inspectedCandidate.last_name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white border border-rose-500">
                        {inspectedCandidate.primary_position}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white border border-blue-500">
                        {inspectedCandidate.age_category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
                        {inspectedCandidate.pipeline_stage?.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <span>Club : <strong>{inspectedCandidate.current_club || 'Sans club'}</strong></span>
                      <span>•</span>
                      <span>Nationalité : <strong>Marocaine</strong></span>
                      <span>•</span>
                      <span>Catégorie : <strong>{inspectedCandidate.age_category}</strong></span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectedCandidate(null)}
                  className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CORPS DU PANNEAU (RADAR & DONNÉES CLÉS) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 bg-slate-100">
                {!ev ? (
                  <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-dashed p-8">
                    <Users className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="text-base font-bold text-slate-800">Aucune évaluation enregistrée pour ce joueur</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Ce joueur n'a pas encore fait l'objet d'une notation détaillée sur les 4 piliers fondamentaux.
                    </p>
                    {onOpenEvaluationForCandidate && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenEvaluationForCandidate(inspectedCandidate);
                          setInspectedCandidate(null);
                        }}
                        className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm inline-flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Créer l'évaluation maintenant</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* COLONNE GAUCHE : RADAR DES 4 PILIERS AVEC ONGLETS */}
                      <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b mb-1">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Profil Radar des 4 Piliers (1–10)
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                              Score : {ev.overall_score}/10
                            </span>
                            {onOpenEvaluationForCandidate && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenEvaluationForCandidate(inspectedCandidate);
                                  setInspectedCandidate(null);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-primary hover:bg-primary/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                              >
                                Évaluer Test
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Composant Radar à 4 Onglets Piliers Dédiés */}
                        <div className="w-full flex items-center justify-center pt-2">
                          <PlayerRadarChart
                            evaluations={[{
                              name: `${inspectedCandidate.first_name} ${inspectedCandidate.last_name}`,
                              color: '#ef4444',
                              eval: ev,
                            }]}
                            height={310}
                            showTabs={true}
                            defaultTab="summary"
                          />
                        </div>
                      </div>

                      {/* COLONNE DROITE : DONNÉES CLÉS & VERDICT */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b">
                            Données Clés
                          </h4>

                          <div className="space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Pied Fort</span>
                              <strong className="text-slate-800">{inspectedCandidate.preferred_foot || 'Droitier'}</strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Morphologie</span>
                              <strong className="text-slate-800">
                                {inspectedCandidate.height_cm ? `${inspectedCandidate.height_cm} cm` : '-'} / {inspectedCandidate.weight_kg ? `${inspectedCandidate.weight_kg} kg` : '-'}
                              </strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Scout Découvreur</span>
                              <strong className="text-amber-600">
                                {inspectedCandidate.discovering_scout_name || 'Cellule FUS'}
                              </strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Scout Référent</span>
                              <strong className="text-amber-600">
                                {inspectedCandidate.recruiter_name || 'Staff Technique'}
                              </strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Priorité Recommandation</span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                                {inspectedCandidate.recommendation_priority || 'HIGH'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Badge Verdict Scout (Exactement comme sur la photo) */}
                        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 shadow-2xs">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">
                              Verdict Scout
                            </span>
                            <span className="text-sm font-black uppercase tracking-tight">
                              {ev.verdict?.replace('_', ' ') || 'SHORTLIST'}
                            </span>
                          </div>
                        </div>

                        {/* Synthèse Scout si disponible */}
                        {ev.strengths && (
                          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                            <span className="font-bold text-slate-700 block">Points Forts Remarqués :</span>
                            <p className="text-slate-600 leading-relaxed text-[11px]">{ev.strengths}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION BASSE : LES 4 SCORES PILIERS (STYLE EXACT PHOTO UTILISATEUR) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] text-slate-500 block font-bold">⚽ Technique (30%)</span>
                        <span className="text-xl font-black text-slate-900">{ev.technical_score}/10</span>
                      </div>
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] text-slate-500 block font-bold">🏃 Physique (25%)</span>
                        <span className="text-xl font-black text-slate-900">{ev.physical_score}/10</span>
                      </div>
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] text-slate-500 block font-bold">🧭 Tactique (25%)</span>
                        <span className="text-xl font-black text-slate-900">{ev.tactical_score}/10</span>
                      </div>
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] text-slate-500 block font-bold">🧠 Mental (20%)</span>
                        <span className="text-xl font-black text-slate-900">{ev.mental_score}/10</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* PIED DE PAGE DU MODAL */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onOpenCandidateDetail(inspectedCandidate);
                    setInspectedCandidate(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ouvrir Fiche Complète du Joueur</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectedCandidate(null)}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL : SÉLECTION D'UN JOUEUR EXISTANT DANS LA BASE DE DONNÉES POUR CE POSTE ── */}
      {slotForAddingPlayer && (() => {
        const fullRoleName = ROLE_FULL_NAMES[slotForAddingPlayer.label] || slotForAddingPlayer.label;
        const currentSlotPlayerIds = new Set(
          (playersBySlot[slotForAddingPlayer.slotIndex] || []).map(p => p.id)
        );

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => {
              if (!isAssigningPlayer) {
                setSlotForAddingPlayer(null);
                setPlayerModalSearch('');
              }
            }}
          >
            <div 
              className="bg-white w-full max-w-2xl max-h-[88vh] rounded-3xl shadow-2xl border-2 border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* En-tête du Modal */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
                    <UserPlus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                        Ajouter un joueur à ce poste
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                        {slotForAddingPlayer.label} ({slotForAddingPlayer.roleCode})
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Sélectionnez un joueur existant dans la base de données ({fullRoleName}).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAssigningPlayer}
                  onClick={() => {
                    setSlotForAddingPlayer(null);
                    setPlayerModalSearch('');
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contexte Scout & Catégorie */}
              <div className="px-5 py-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {scoutFilter && (
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                      <span>Scout cible :</span>
                      <strong className="text-primary">{scoutFilter}</strong>
                    </span>
                  )}
                  {categoryFilter && (
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                      <span>Catégorie :</span>
                      <strong className="text-amber-600">{categoryFilter}</strong>
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-bold text-slate-500">
                  {candidatesForSlotSelection.length} joueur{candidatesForSlotSelection.length > 1 ? 's' : ''} trouvé{candidatesForSlotSelection.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Barre de Filtrage par Position (Spécifique au poste cliqué vs Tous les postes du Scout) */}
              <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
                  <button
                    type="button"
                    onClick={() => setPositionFilterMode('matching')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                      positionFilterMode === 'matching'
                        ? "bg-amber-400 text-slate-950 shadow-xs ring-1 ring-amber-300"
                        : "text-slate-600 hover:text-slate-950"
                    )}
                  >
                    <span>Poste {slotForAddingPlayer.label} ({slotForAddingPlayer.roleCode})</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/10 font-bold">
                      {candidates.filter(c => 
                        c.pipeline_stage !== 'archived' && 
                        c.status !== 'archived' &&
                        scoutFilter && isCandidateDetectedBySelectedScout(c, scoutFilter) &&
                        categoryFilter && c.age_category === categoryFilter &&
                        isPlayerPositionMatchingSlot(c, slotForAddingPlayer)
                      ).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPositionFilterMode('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                      positionFilterMode === 'all'
                        ? "bg-white text-slate-900 shadow-xs border border-slate-300"
                        : "text-slate-600 hover:text-slate-950"
                    )}
                    title={`Tous les profils détectés par le scout ${scoutFilter} en ${categoryFilter}`}
                  >
                    <span>Tous les postes (Scout {scoutFilter})</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                      {candidates.filter(c => 
                        c.pipeline_stage !== 'archived' &&
                        c.status !== 'archived' &&
                        scoutFilter && isCandidateDetectedBySelectedScout(c, scoutFilter) &&
                        categoryFilter && c.age_category === categoryFilter
                      ).length}
                    </span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  {positionFilterMode === 'matching' 
                    ? `Spécialistes du poste ${slotForAddingPlayer.label} détectés par ${scoutFilter}`
                    : `Tous les profils détectés par ${scoutFilter} en ${categoryFilter}`
                  }
                </span>
              </div>

              {/* Champ de recherche rapide */}
              <div className="p-4 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={playerModalSearch}
                    onChange={(e) => setPlayerModalSearch(e.target.value)}
                    placeholder={`Rechercher un joueur pour le poste ${slotForAddingPlayer.label} (nom, club, catégorie...)...`}
                    className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-slate-900 font-medium transition-all"
                    autoFocus
                  />
                  {playerModalSearch && (
                    <button
                      type="button"
                      onClick={() => setPlayerModalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Liste des Joueurs Existant */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/60 max-h-[500px]">
                {candidatesForSlotSelection.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm space-y-2">
                    <p className="font-bold text-slate-600">Aucun joueur correspondant trouvé</p>
                    <p className="text-xs text-slate-400">Modifiez les termes de recherche pour afficher d'autres profils.</p>
                  </div>
                ) : (
                  candidatesForSlotSelection.map((cand) => {
                    const ev = playerEvaluationsMap.get(cand.id);
                    const isAlreadyOnThisSlot = currentSlotPlayerIds.has(cand.id);
                    const isSameCategory = cand.age_category === categoryFilter;
                    const score = ev?.overall_score;

                    return (
                      <div
                        key={cand.id}
                        className={cn(
                          "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 bg-white",
                          isAlreadyOnThisSlot 
                            ? "border-emerald-300 bg-emerald-50/40 opacity-75" 
                            : "border-slate-200 hover:border-amber-400 hover:shadow-md"
                        )}
                      >
                        {/* Info Joueur */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar / Photo */}
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                            {cand.photo_url ? (
                              <img src={cand.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{cand.first_name[0]}{cand.last_name[0]}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm truncate">
                                {cand.first_name} {cand.last_name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {cand.primary_position || 'Sans poste'}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                isSameCategory 
                                  ? "bg-amber-50 text-amber-900 border-amber-300 font-black" 
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {cand.age_category || 'Cat. inconnue'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-1">
                              <span>{cand.current_club || 'Sans club'}</span>
                              <span>•</span>
                              <span className="text-slate-600">
                                Scout : {cand.discovering_scout_name || 'Cellule FUS'}
                              </span>
                              {score !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="font-black text-emerald-700">
                                    ⭐ {score.toFixed(1)}/10
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bouton d'action */}
                        <div className="shrink-0">
                          {isAlreadyOnThisSlot ? (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Déjà à ce poste</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isAssigningPlayer}
                              onClick={() => handleAssignExistingCandidateToSlot(cand)}
                              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Sélectionner</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pied de page du Modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  {candidatesForSlotSelection.length} profils existants dans la base de données
                </div>

                <button
                  type="button"
                  disabled={isAssigningPlayer}
                  onClick={() => {
                    setSlotForAddingPlayer(null);
                    setPlayerModalSearch('');
                  }}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ShortlistPitchView;
