import React, { useState, useMemo, useEffect } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { useCompetitions } from '../../hooks/useCompetitions';
import { usePlayers } from '../../hooks/usePlayers';
import { useStaff } from '../../hooks/useStaff';
import { useMatches } from '../../hooks/useMatches';
import { useTeams } from '../../hooks/useTeams';
import { useTouchDragAndDrop } from '../../hooks/useTouchDragAndDrop';
import { useArbitres } from '../../hooks/useArbitres';
import { useOpponentPlayers } from '../../hooks/useOpponentPlayers';
import { usePermissions } from '../../context/PermissionsContext';
import type { OpponentPlayer } from '../../types';
import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../../constants';
import { useSurclassements } from '../../hooks/useSurclassements';
import { isLowerCategory } from '../../services/surclassementService';
import { FusLogoLoader } from '../../components/ui/FusLogoLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  ChevronRight, ChevronLeft, Check,
  Calendar, MapPin, Trophy, Users, Briefcase,
  Shield, Layout, CheckCircle2,
  Globe, Target, Save, Search, Filter, Loader2,
  Trash2, X, UserCheck, ArrowUpDown, Clock, Sparkles, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { OpponentSquadModal } from '../club-management/components/OpponentSquadModal';
import type { Match, Player, MatchPhase } from '../../types';
import { getFusAcademyStadium } from '../../utils/stadiumHelpers';

interface ScheduleMatchWizardProps {
  onBack: () => void;
  onSuccess?: () => void;
  initialMatch?: Match | null;
}

type WizardStep = 'setup' | 'arbitres' | 'staff' | 'lineup' | 'opponent' | 'validate';

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: 'setup', label: 'Setup', icon: Calendar },
  { key: 'arbitres', label: 'Arbitres', icon: UserCheck },
  { key: 'staff', label: 'Staff', icon: Briefcase },
  { key: 'lineup', label: 'Compo', icon: Users },
  { key: 'opponent', label: 'Adversaire', icon: Target },
  { key: 'validate', label: 'Valider', icon: CheckCircle2 },
];

import {
  FORMATIONS_BY_FORMAT,
  ALL_FORMATION_ROLES,
  getFormationPositions,
  inferMatchFormat
} from './tacticalFormations';
export {
  FORMATIONS_BY_FORMAT,
  ALL_FORMATION_ROLES,
  getFormationPositions,
  inferMatchFormat
} from './tacticalFormations';

const FORMATIONS = FORMATIONS_BY_FORMAT[11];
const CATEGORIES = PLAYER_CATEGORIES;

export const getCategoryRelativeLabel = (currentCat: string, targetCat: string) => {
  const normCurrent = normalizeAgeCategory(currentCat);
  const normTarget = normalizeAgeCategory(targetCat);
  const currentIdx = PLAYER_CATEGORIES.indexOf(normCurrent as any);
  const targetIdx = PLAYER_CATEGORIES.indexOf(normTarget as any);
  if (currentIdx === -1 || targetIdx === -1 || currentIdx === targetIdx) {
    return { label: 'Même Catégorie', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', isHigher: null };
  }
  if (targetIdx < currentIdx) {
    return { label: 'Catégorie Supérieure ↗', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', isHigher: true };
  }
  return { label: 'Catégorie Inférieure ↘', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', isHigher: false };
};

export const classifyPosition = (position?: string | null): 'Gardiens' | 'Défenseurs' | 'Milieux' | 'Attaquants' => {
  if (!position) return 'Milieux';
  const raw = String(position).toUpperCase().trim();

  // 1. Direct Goalkeeper check
  if (/\b(GK|GKP|GARDIEN|GOAL|GOALKEEPER)\b/.test(raw) || raw === 'G' || raw.startsWith('G/')) {
    return 'Gardiens';
  }

  // 2. Tokenized check (splits on slashes, spaces, commas, hyphens, plus)
  // Handles composite positions: "CDM / 6", "ST / CF", "RW / LW", "RB/LB", "CAM / 10", "FW", "CB", etc.
  const tokens = raw.split(/[\/\s,\-\+]+/).filter(Boolean);

  const defTokens = new Set([
    'CB', 'LB', 'RB', 'LWB', 'RWB', 'DC', 'DG', 'DD', 'DF', 'DEF', 'DEFENDER',
    'LATERAL', 'ARRIERE', 'D', 'DÉFENSEUR', 'DEFENSEUR'
  ]);
  const midTokens = new Set([
    'CDM', 'MDC', 'CM', 'MC', 'CAM', 'MO', 'LM', 'RM', 'MD', 'MG', 'MID', 'MF',
    'MILIEU', 'RELAYEUR', 'RECUPERATEUR', 'M', '6', '8', '10'
  ]);
  const attTokens = new Set([
    'ST', 'CF', 'SS', 'BU', 'RW', 'LW', 'AD', 'AG', 'FW', 'ATT', 'FORWARD',
    'AILIER', 'BUTEUR', 'POINTE', 'FOR', 'A', 'WG', '9', '7', '11', 'ATTAQUANT'
  ]);

  for (const token of tokens) {
    if (defTokens.has(token)) return 'Défenseurs';
    if (midTokens.has(token)) return 'Milieux';
    if (attTokens.has(token)) return 'Attaquants';
  }

  // 3. Regex keyword fallback
  if (/(GARDIEN|GOAL)/i.test(raw)) return 'Gardiens';
  if (/(DEF|CB|LB|RB|ARRIERE|LATERAL|BACK)/i.test(raw)) return 'Défenseurs';
  if (/(MILIEU|MID|CAM|CDM|CENTRE|RELAYEUR)/i.test(raw)) return 'Milieux';
  if (/(ATT|AILIER|BUTEUR|ST|CF|FW|AVANT)/i.test(raw)) return 'Attaquants';

  return 'Milieux';
};

export const isPlayerMatchingRole = (playerPosition?: string | null, roleLabel?: string): boolean => {
  if (!playerPosition || !roleLabel) return false;
  const raw = String(playerPosition).toUpperCase().trim();
  const target = String(roleLabel).toUpperCase().trim();
  if (raw === target) return true;

  const tokens = raw.split(/[\/\s,\-\+]+/).filter(Boolean);
  if (tokens.includes(target)) return true;

  return classifyPosition(raw) === classifyPosition(target);
};

const POSITION_GROUPS = [
  { label: 'Gardiens', category: 'Gardiens' as const, color: 'from-amber-400 to-amber-600' },
  { label: 'Défenseurs', category: 'Défenseurs' as const, color: 'from-blue-500 to-blue-700' },
  { label: 'Milieux', category: 'Milieux' as const, color: 'from-emerald-500 to-emerald-700' },
  { label: 'Attaquants', category: 'Attaquants' as const, color: 'from-rose-500 to-rose-700' }
];

const getPositionColor = (position: string) => {
  const cat = classifyPosition(position);
  if (cat === 'Gardiens') return 'from-amber-400 to-amber-600';
  if (cat === 'Défenseurs') return 'from-blue-500 to-blue-700';
  if (cat === 'Milieux') return 'from-emerald-500 to-emerald-700';
  if (cat === 'Attaquants') return 'from-rose-500 to-rose-700';
  return 'from-slate-500 to-slate-700';
};

const getPositionPriority = (position: string) => {
  const cat = classifyPosition(position);
  if (cat === 'Gardiens') return 0;
  if (cat === 'Défenseurs') return 1;
  if (cat === 'Milieux') return 4;
  if (cat === 'Attaquants') return 7;
  return 9;
};

const ScheduleMatchWizard: React.FC<ScheduleMatchWizardProps> = ({ onBack, onSuccess, initialMatch }) => {
  const { mainClub, opponentClubs: allOpponentClubs, isLoading: clubLoading } = useClubData();
  // Exclude any club with the same name as mainClub to prevent "FUS vs FUS"
  const opponentClubs = allOpponentClubs.filter(
    c => c.name?.toLowerCase().trim() !== mainClub?.name?.toLowerCase().trim()
  );
  const { leagues, stadiums, isLoading: compLoading } = useCompetitions();
  const { players, isLoading: playersLoading } = usePlayers();
  const { staff, isLoading: staffLoading } = useStaff();
  const { arbitres } = useArbitres();
  const { teams } = useTeams();
  const { addMatch, updateMatch } = useMatches();
  const { surclassements, isLoading: surclassementsLoading } = useSurclassements();

  const isLoading = clubLoading || compLoading || playersLoading || staffLoading || surclassementsLoading;

  const [currentStep, setCurrentStep] = useState<WizardStep>('setup');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Arbitres State
  const [selectedReferees, setSelectedReferees] = useState<{
    central_id: number | null;
    assistant1_id: number | null;
    assistant2_id: number | null;
    fourth_id: number | null;
    commissaire_id: number | null;
  }>({
    central_id: null,
    assistant1_id: null,
    assistant2_id: null,
    fourth_id: null,
    commissaire_id: null,
  });

  // Step 1
  const [setup, setSetup] = useState({
    match_type: 'league' as 'amical' | 'league' | 'internal_scrimmage',
    internal_opposition_type: 'intra_squad' as 'intra_squad' | 'inter_category',
    internal_target_category: '' as string,
    internal_opponent_team_id: '' as string,
    match_format: 11 as number,
    opponent_id: '',
    league_id: '',
    stadium_id: '',
    pitch_number: '' as string,
    team_id: '',
    match_date: new Date().toISOString().split('T')[0],
    match_time: '18:00',
    category: 'SENIOR',
    is_home: true,
    round_name: 'Journée 1',
    match_phase: '' as MatchPhase | '',
    qualif_status: '' as 'won' | 'lost' | '',
  });

  const {
    players: rawOpponentSquad = [],
    addOpponentPlayer,
    addManyOpponentPlayers,
  } = useOpponentPlayers(setup.opponent_id, setup.category);

  const opponentClub = setup.match_type === 'internal_scrimmage'
    ? mainClub
    : (opponentClubs.find(c => c.id === setup.opponent_id) || allOpponentClubs.find(c => c.id === setup.opponent_id));

  // Match timing configuration
  const [halfDuration, setHalfDuration] = useState<number>(45);
  const [enableExtraTime, setEnableExtraTime] = useState(false);
  const [enablePenalties, setEnablePenalties] = useState(false);

  // Step 2
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Auto-sélection automatique du stade FUS ACADEMY à Domicile
  useEffect(() => {
    if (stadiums.length > 0 && setup.is_home && !setup.stadium_id && !initialMatch?.stadium_id) {
      const fusStadium = getFusAcademyStadium(stadiums, mainClub?.id);
      if (fusStadium) {
        setSetup(prev => ({
          ...prev,
          stadium_id: fusStadium.id,
          location: prev.pitch_number ? `${fusStadium.name} — Terrain ${prev.pitch_number}` : fusStadium.name,
        }));
      }
    }
  }, [stadiums, setup.is_home, setup.stadium_id, initialMatch?.stadium_id, mainClub?.id]);

  // Step 3
  const [formation, setFormation] = useState('4-3-3');
  const [startingXI, setStartingXI] = useState<string[]>(Array(11).fill(''));
  const [substitutes, setSubstitutes] = useState<string[]>([]);

  // Step 4 (Opponent)
  const [opponentFormation, setOpponentFormation] = useState('4-4-2');
  const [opponentLineup, setOpponentLineup] = useState<string[]>(Array(11).fill(''));
  const [opponentSubs, setOpponentSubs] = useState<string[]>([]);

  // Opponent Squad Management
  const [showFullOpponentSquadModal, setShowFullOpponentSquadModal] = useState(false);
  const [showQuickOpponentModal, setShowQuickOpponentModal] = useState(false);
  const [quickOpponentTab, setQuickOpponentTab] = useState<'single' | 'batch'>('single');
  const [quickSinglePlayer, setQuickSinglePlayer] = useState({
    full_name: '',
    jersey_number: '',
    position: 'CM',
    is_starting: false,
  });
  const [quickBatchRows, setQuickBatchRows] = useState<Array<{ full_name: string; jersey_number: string; position: string; is_starting: boolean }>>([
    { full_name: '', jersey_number: '', position: 'FW', is_starting: false },
    { full_name: '', jersey_number: '', position: 'MF', is_starting: false },
    { full_name: '', jersey_number: '', position: 'DF', is_starting: false },
  ]);
  const [isSubmittingOpponent, setIsSubmittingOpponent] = useState(false);

  const handleSaveQuickSingle = async (keepOpen = false) => {
    if (!setup.opponent_id && setup.match_type !== 'internal_scrimmage') {
      toast.error('Veuillez sélectionner un club adverse dans l’étape Setup.');
      return;
    }
    const name = quickSinglePlayer.full_name.trim();
    if (!name) {
      toast.error('Le nom du joueur adverse est requis.');
      return;
    }
    const num = parseInt(quickSinglePlayer.jersey_number, 10);
    const resolvedNum = !isNaN(num) && num > 0 ? num : (rawOpponentSquad.length + 1);

    setIsSubmittingOpponent(true);
    try {
      const targetClubId = setup.match_type === 'internal_scrimmage' ? (mainClub?.id || '') : setup.opponent_id;
      const res = await addOpponentPlayer({
        club_id: targetClubId,
        category: setup.category,
        full_name: name,
        jersey_number: resolvedNum,
        position: quickSinglePlayer.position || 'CM',
        is_captain: false,
      });

      if (quickSinglePlayer.is_starting && res?.id) {
        const emptyIdx = opponentLineup.findIndex(x => !x);
        if (emptyIdx !== -1) {
          setOpponentLineup(prev => {
            const next = [...prev];
            next[emptyIdx] = res.id;
            return next;
          });
        }
      }

      if (keepOpen) {
        setQuickSinglePlayer(prev => ({
          ...prev,
          full_name: '',
          jersey_number: String(resolvedNum + 1),
        }));
        toast.success(`Joueur #${resolvedNum} ${name} ajouté ! Vous pouvez saisir le suivant.`);
      } else {
        setShowQuickOpponentModal(false);
        setQuickSinglePlayer({ full_name: '', jersey_number: '', position: 'CM', is_starting: false });
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsSubmittingOpponent(false);
    }
  };

  const handleSaveQuickBatch = async () => {
    if (!setup.opponent_id && setup.match_type !== 'internal_scrimmage') {
      toast.error('Veuillez sélectionner un club adverse dans l’étape Setup.');
      return;
    }
    const validRows = quickBatchRows.filter(r => r.full_name.trim());
    if (validRows.length === 0) {
      toast.error('Veuillez saisir au moins un nom de joueur valide.');
      return;
    }

    setIsSubmittingOpponent(true);
    try {
      const targetClubId = setup.match_type === 'internal_scrimmage' ? (mainClub?.id || '') : setup.opponent_id;
      const inserts = validRows.map((r, i) => {
        const num = parseInt(r.jersey_number, 10);
        return {
          club_id: targetClubId,
          category: setup.category,
          full_name: r.full_name.trim(),
          jersey_number: !isNaN(num) && num > 0 ? num : (rawOpponentSquad.length + 1 + i),
          position: r.position || 'CM',
          is_captain: false,
        };
      });

      const inserted = await addManyOpponentPlayers(inserts);

      const startingToAssign = inserted.filter((_, idx) => validRows[idx]?.is_starting);
      if (startingToAssign.length > 0) {
        setOpponentLineup(prev => {
          const next = [...prev];
          let assignIdx = 0;
          for (let i = 0; i < next.length && assignIdx < startingToAssign.length; i++) {
            if (!next[i]) {
              next[i] = startingToAssign[assignIdx].id;
              assignIdx++;
            }
          }
          return next;
        });
      }

      toast.success(`${inserted.length} joueur(s) adverse(s) créés avec succès !`);
      setShowQuickOpponentModal(false);
      setQuickBatchRows([
        { full_name: '', jersey_number: '', position: 'FW', is_starting: false },
        { full_name: '', jersey_number: '', position: 'MF', is_starting: false },
        { full_name: '', jersey_number: '', position: 'DF', is_starting: false },
      ]);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsSubmittingOpponent(false);
    }
  };

  const handleBatchPreset = (count: number, asStarters = false) => {
    const existingCount = rawOpponentSquad.length;
    const presets: Array<{ full_name: string; jersey_number: string; position: string; is_starting: boolean }> = [];
    const positionsCycle = ['GK', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW', 'DF', 'MF', 'FW', 'GK'];
    for (let i = 0; i < count; i++) {
      const num = existingCount + quickBatchRows.filter(r => r.full_name).length + i + 1;
      const pos = positionsCycle[i % positionsCycle.length];
      presets.push({
        full_name: `Adversaire #${num}`,
        jersey_number: String(num),
        position: pos,
        is_starting: asStarters,
      });
    }
    setQuickBatchRows(prev => [...prev.filter(r => r.full_name.trim()), ...presets]);
    toast.info(`${count} joueurs pré-remplis. Personnalisez les noms ou validez.`);
  };

  const handleFormatChange = (newFormat: number) => {
    if (newFormat === setup.match_format) return;
    setSetup(prev => ({ ...prev, match_format: newFormat }));

    const defaultFormation = FORMATIONS_BY_FORMAT[newFormat]?.[0] || '4-3-3';
    setFormation(defaultFormation);
    setOpponentFormation(defaultFormation);

    setStartingXI(prev => {
      const copy = [...prev];
      if (copy.length < newFormat) {
        return [...copy, ...Array(newFormat - copy.length).fill('')];
      }
      return copy.slice(0, newFormat);
    });

    setOpponentLineup(prev => {
      const copy = [...prev];
      if (copy.length < newFormat) {
        return [...copy, ...Array(newFormat - copy.length).fill('')];
      }
      return copy.slice(0, newFormat);
    });
  };

  // Pre-fill wizard if editing / orchestrating an existing match
  useEffect(() => {
    if (initialMatch) {
      const rawLineup = initialMatch.lineup as any;
      const internalMeta = rawLineup?.internal_opposition;
      const isInternalMatch = (initialMatch as any).match_type === 'internal_scrimmage'
        || !!internalMeta?.is_internal_scrimmage
        || (initialMatch.notes && initialMatch.notes.includes('[Opposition Interne]'))
        || (mainClub && initialMatch.opponent_id === mainClub.id);
      const initialFormat = inferMatchFormat(initialMatch);

      setSetup({
        match_type: isInternalMatch ? 'internal_scrimmage' : (initialMatch.league_id ? 'league' : 'amical'),
        internal_opposition_type: internalMeta?.internal_opposition_type || (initialMatch.notes?.includes('Vs ') ? 'inter_category' : 'intra_squad'),
        internal_target_category: internalMeta?.internal_target_category || (initialMatch.notes?.match(/Vs\s+([A-Z0-9]+)/)?.[1] || ''),
        internal_opponent_team_id: internalMeta?.internal_opponent_team_id || '',
        match_format: initialFormat,
        opponent_id: initialMatch.opponent_id || (isInternalMatch ? (mainClub?.id || '') : ''),
        league_id: initialMatch.league_id || '',
        stadium_id: initialMatch.stadium_id || '',
        pitch_number: rawLineup?.pitch_number || (initialMatch as any).pitch_number || '',
        team_id: initialMatch.team_id || '',
        match_date: initialMatch.match_date || new Date().toISOString().split('T')[0],
        match_time: initialMatch.match_time || '18:00',
        category: initialMatch.category || 'SENIOR',
        is_home: initialMatch.is_home ?? true,
        round_name: (!isInternalMatch && Boolean(initialMatch.league_id))
          ? ((initialMatch as any).round_name || ((initialMatch as any).lineup as any)?.round_name || 'Journée 1')
          : '',
        match_phase: (initialMatch.match_phase as MatchPhase) || '',
        qualif_status: (initialMatch.match_phase as 'won' | 'lost' | '') || '',
      });

      // Formation & Compo
      const defaultForm = FORMATIONS_BY_FORMAT[initialFormat]?.[0] || '4-3-3';
      const initialFormation = initialMatch.formation || rawLineup?.formation || defaultForm;
      setFormation(initialFormation);

      if (initialMatch.half_duration_minutes) setHalfDuration(Number(initialMatch.half_duration_minutes));
      if (initialMatch.enable_extra_time !== undefined) setEnableExtraTime(initialMatch.enable_extra_time);
      if (initialMatch.enable_penalties !== undefined) setEnablePenalties(initialMatch.enable_penalties);

      // Arbitres
      if (initialMatch.referees_assigned) {
        setSelectedReferees({
          central_id: (initialMatch.referees_assigned as any).central_id || null,
          assistant1_id: (initialMatch.referees_assigned as any).assistant1_id || null,
          assistant2_id: (initialMatch.referees_assigned as any).assistant2_id || null,
          fourth_id: (initialMatch.referees_assigned as any).fourth_id || null,
          commissaire_id: (initialMatch.referees_assigned as any).commissaire_id || (initialMatch as any).referee_commissaire_id || null,
        });
      } else if (initialMatch.referee_central_id || initialMatch.referee_assistant1_id || (initialMatch as any).referee_commissaire_id) {
        setSelectedReferees({
          central_id: initialMatch.referee_central_id || null,
          assistant1_id: initialMatch.referee_assistant1_id || null,
          assistant2_id: initialMatch.referee_assistant2_id || null,
          fourth_id: initialMatch.referee_fourth_id || null,
          commissaire_id: (initialMatch as any).referee_commissaire_id || null,
        });
      }

      // Staff
      if (initialMatch.staff_ids && Array.isArray(initialMatch.staff_ids)) {
        setSelectedStaffIds(initialMatch.staff_ids.map(String));
      }

      // Starting XI
      const rawStarting = initialMatch.starting_eleven || rawLineup?.startingXI;
      if (rawStarting && Array.isArray(rawStarting)) {
        const sanitizedXI = rawStarting.map(item => {
          if (!item) return '';
          if (typeof item === 'object') return String(item.player_id || item.id || '');
          return String(item);
        });
        while (sanitizedXI.length < initialFormat) sanitizedXI.push('');
        setStartingXI(sanitizedXI.slice(0, initialFormat));
      } else {
        setStartingXI(Array(initialFormat).fill(''));
      }

      // Substitutes
      const rawSubs = initialMatch.substitutes || rawLineup?.substitutes;
      if (rawSubs && Array.isArray(rawSubs)) {
        setSubstitutes(rawSubs.map(item => {
          if (!item) return '';
          if (typeof item === 'object') return String(item.player_id || item.id || '');
          return String(item);
        }));
      }

      // Opponent Lineup & Formation
      if (initialMatch.opponent_formation) {
        setOpponentFormation(initialMatch.opponent_formation);
      } else {
        setOpponentFormation(defaultForm);
      }
      if (initialMatch.opponent_lineup && Array.isArray(initialMatch.opponent_lineup)) {
        const sanitizedOpp = initialMatch.opponent_lineup.map(item => {
          if (!item) return '';
          if (typeof item === 'object') return String(item.jersey_number || item.player_id || item.id || '');
          return String(item);
        });
        while (sanitizedOpp.length < initialFormat) sanitizedOpp.push('');
        setOpponentLineup(sanitizedOpp.slice(0, initialFormat));
      } else {
        setOpponentLineup(Array(initialFormat).fill(''));
      }
      if (initialMatch.opponent_subs && Array.isArray(initialMatch.opponent_subs)) {
        setOpponentSubs(initialMatch.opponent_subs.map(item => {
          if (!item) return '';
          if (typeof item === 'object') return String(item.jersey_number || item.player_id || item.id || '');
          return String(item);
        }));
      }
    }
  }, [initialMatch]);

  // Check permissions
  const { canManageCategory, authState } = usePermissions();
  const ALLOWED_CATEGORIES = Array.from(new Set([
    ...CATEGORIES.filter(c => canManageCategory(c)),
    ...(authState.userCategories || [])
  ]));

  // Auto-select team when category changes in wizard setup (safeguarded against infinite loops)
  useEffect(() => {
    if (!initialMatch && currentStep === 'setup' && setup.category) {
      const matchingTeams = teams.filter(t => t.category === setup.category);
      const targetTeamId = matchingTeams.length > 0 ? matchingTeams[0].id : '';

      setSetup(prev => {
        let changed = false;
        let next = prev;

        if (prev.team_id !== targetTeamId) {
          next = { ...next, team_id: targetTeamId };
          changed = true;
        }

        if (prev.league_id) {
          // Si une compétition est déjà sélectionnée, la conserver
        } else if (leagues.length > 0) {
          const matchingLeague = leagues.find(l => l.category === setup.category) || leagues[0];
          if (matchingLeague) {
            next = { ...next, league_id: matchingLeague.id };
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }
  }, [setup.category, teams, leagues, currentStep, initialMatch]);

  // Auto-sélection de la compétition officielle au chargement initial
  useEffect(() => {
    if (!initialMatch && leagues.length > 0 && !setup.league_id && setup.match_type !== 'internal_scrimmage') {
      const bestLeague = leagues.find(l => l.category === setup.category) || leagues[0];
      if (bestLeague) {
        setSetup(prev => ({ ...prev, league_id: bestLeague.id }));
      }
    }
  }, [leagues, setup.category, initialMatch, setup.league_id, setup.match_type]);

  // Auto-select staff when category changes in wizard setup (safeguarded against infinite loops)
  useEffect(() => {
    if (!initialMatch && setup.category && staff.length > 0) {
      const matchingStaff = staff.filter(s => s.category === setup.category);
      const newIds = matchingStaff.map(s => s.id);
      setSelectedStaffIds(prev => {
        if (prev.length === newIds.length && prev.every((id, i) => id === newIds[i])) {
          return prev;
        }
        return newIds;
      });
    }
  }, [setup.category, staff, initialMatch]);

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  const goNext = () => {
    if (currentStep === 'setup') {
      const effectiveOpp = setup.match_type === 'internal_scrimmage' ? (mainClub?.id || setup.opponent_id || 'internal') : setup.opponent_id;
      if (!setup.team_id || !effectiveOpp) {
        alert("Veuillez sélectionner l'équipe et l'adversaire.");
        return;
      }
      if (setup.match_type === 'internal_scrimmage' && setup.internal_opposition_type === 'inter_category' && !setup.internal_target_category) {
        alert("Veuillez sélectionner la catégorie adverse pour l'opposition inter-catégorie.");
        return;
      }
    }
    const idx = STEPS.findIndex(s => s.key === currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].key);
  };

  const goPrev = () => {
    const idx = STEPS.findIndex(s => s.key === currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1].key);
    else onBack();
  };

  const toggleStaff = (id: string) =>
    setSelectedStaffIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const toggleLineupPlayer = (player: Player) => {
    const isStarter = startingXI.includes(player.id);
    const isSub = substitutes.includes(player.id);

    if (isStarter || isSub) {
      setStartingXI(prev => prev.map(id => id === player.id ? '' : id));
      setSubstitutes(prev => prev.filter(id => id !== player.id));
    } else {
      const isGK = ['GK', 'G', 'GARDIEN'].includes(player.position?.toUpperCase() || '');

      if (isGK && startingXI[0] === '') {
        const nextXI = [...startingXI];
        nextXI[0] = player.id;
        setStartingXI(nextXI);
      } else {
        const roles = getFormationPositions(formation);
        let placed = false;
        const nextXI = [...startingXI];

        const matchingSlot = roles.findIndex((r, idx) =>
          idx > 0 && r.label === player.position?.toUpperCase() && nextXI[idx] === ''
        );

        if (matchingSlot !== -1) {
          nextXI[matchingSlot] = player.id;
          setStartingXI(nextXI);
          placed = true;
        } else {
          const emptySlot = nextXI.findIndex((id, idx) => idx > 0 && id === '');
          if (emptySlot !== -1) {
            nextXI[emptySlot] = player.id;
            setStartingXI(nextXI);
            placed = true;
          }
        }

        if (!placed) {
          const filledStartersCount = startingXI.filter(id => id !== '').length;
          if (filledStartersCount >= setup.match_format) {
            setSubstitutes(prev => [...prev, player.id]);
          } else {
            const firstFree = nextXI.indexOf('');
            if (firstFree !== -1) {
              nextXI[firstFree] = player.id;
              setStartingXI(nextXI);
            }
          }
        }
      }
    }
  };

  const handleSwap = (draggedPlayerId: string, slotIndex: number) => {
    const nextXI = [...startingXI];
    const oldIndex = nextXI.indexOf(draggedPlayerId);

    if (oldIndex !== -1) {
      const playerAtTarget = nextXI[slotIndex];
      nextXI[slotIndex] = draggedPlayerId;
      nextXI[oldIndex] = playerAtTarget;
    } else if (substitutes.includes(draggedPlayerId)) {
      const playerAtTarget = nextXI[slotIndex];
      nextXI[slotIndex] = draggedPlayerId;

      let nextSubs = substitutes.filter(id => id !== draggedPlayerId);
      if (playerAtTarget) nextSubs.push(playerAtTarget);

      setSubstitutes(nextSubs);
    }
    setStartingXI(nextXI);
  };

  const updateOpponentJersey = (idx: number, jersey: string) => {
    const next = [...opponentLineup];
    next[idx] = jersey;
    setOpponentLineup(next);
  };

  const handleOpponentSwap = (draggedId: string, targetIdx: number) => {
    const nextLineup = [...opponentLineup];
    const sourceIdx = parseInt(draggedId);

    // Swap player in slots
    const targetJersey = nextLineup[targetIdx];
    nextLineup[targetIdx] = nextLineup[sourceIdx];
    nextLineup[sourceIdx] = targetJersey;

    setOpponentLineup(nextLineup);
  };

  const handleOpponentClear = (idx: number) => {
    const nextLineup = [...opponentLineup];
    nextLineup[idx] = '';
    setOpponentLineup(nextLineup);
  };

  const addOpponentSub = () => setOpponentSubs(prev => [...prev, '']);
  const updateOpponentSub = (idx: number, jersey: string) => {
    const next = [...opponentSubs];
    next[idx] = jersey;
    setOpponentSubs(next);
  };
  const removeOpponentSub = (idx: number) => setOpponentSubs(prev => prev.filter((_, i) => i !== idx));

  const toggleOpponentStarter = (playerId: string) => {
    const playerObj = effectiveOpponentSquad.find(p => p.id === playerId);
    const jerseyStr = playerObj?.jersey_number != null ? String(playerObj.jersey_number) : null;
    const isStarter = opponentLineup.includes(playerId) || (jerseyStr ? opponentLineup.includes(jerseyStr) : false);

    if (isStarter) {
      setOpponentLineup(prev => prev.map(val => (val === playerId || (jerseyStr && val === jerseyStr)) ? '' : val));
    } else {
      if (setup.match_type === 'internal_scrimmage') {
        setSubstitutes(prev => prev.filter(id => id !== playerId));
      }
      setOpponentSubs(prev => prev.filter(id => id !== playerId && (!jerseyStr || id !== jerseyStr)));
      const emptySlot = opponentLineup.findIndex(slot => slot === '');
      if (emptySlot !== -1) {
        updateOpponentJersey(emptySlot, playerId);
      } else {
        toast.error(`Tous les ${setup.match_format} postes de titulaires sont déjà occupés.`);
      }
    }
  };

  // Auto-position players for home team
  const autoPositionPlayers = () => {
    const format = setup.match_format || 11;
    const isIntraSquad = setup.match_type === 'internal_scrimmage' && setup.internal_opposition_type === 'intra_squad';
    // Use allGroupPlayers so that search query filter in step 3 doesn't exclude valid squad players from auto-aligning
    const availablePlayers = [...allGroupPlayers].sort((a, b) => {
      const priorityA = getPositionPriority(a.position);
      const priorityB = getPositionPriority(b.position);
      return priorityA - priorityB;
    });

    const newXI = Array(format).fill('');
    const newSubs: string[] = [];

    // First, place the goalkeeper
    const gk = availablePlayers.find(p => classifyPosition(p.position) === 'Gardiens');
    if (gk) {
      newXI[0] = gk.id;
    }

    // Get formation positions
    const roles = getFormationPositions(formation, format);

    // Place remaining players by matching position
    const remainingPlayers = availablePlayers.filter(p => p.id !== gk?.id);

    for (let i = 1; i < format; i++) {
      if (newXI[i]) continue;

      const positionLabel = roles[i]?.label;
      const matchingPlayer = remainingPlayers.find(p =>
        !newXI.includes(p.id) &&
        !newSubs.includes(p.id) &&
        isPlayerMatchingRole(p.position, positionLabel)
      );

      if (matchingPlayer) {
        newXI[i] = matchingPlayer.id;
      }
    }

    // Fill remaining slots with any available player
    for (let i = 1; i < format; i++) {
      if (!newXI[i]) {
        const anyPlayer = remainingPlayers.find(p => !newXI.includes(p.id) && !newSubs.includes(p.id));
        if (anyPlayer) {
          newXI[i] = anyPlayer.id;
        }
      }
    }

    // Only dump remaining players into substitutes if NOT an internal scrimmage intra-squad!
    // In intra-squad scrimmage, remaining players MUST stay available for Team B (Chasubles / Reste du groupe)
    if (!isIntraSquad) {
      remainingPlayers.forEach(p => {
        if (!newXI.includes(p.id) && !newSubs.includes(p.id)) {
          newSubs.push(p.id);
        }
      });
    }

    setStartingXI(newXI);
    setSubstitutes(newSubs);
  };

  // Auto-position opponent players with real squad players
  const autoPositionOpponent = () => {
    const format = setup.match_format || 11;
    const availablePlayers = [...effectiveOpponentSquad].sort((a, b) => {
      const priorityA = getPositionPriority(a.position);
      const priorityB = getPositionPriority(b.position);
      return priorityA - priorityB;
    });
    const newLineup = Array(format).fill('');
    const newSubs: string[] = [];

    // First, place the goalkeeper
    const gk = availablePlayers.find(p => classifyPosition(p.position) === 'Gardiens');
    if (gk) {
      newLineup[0] = gk.id;
    }

    const roles = getFormationPositions(opponentFormation, format);
    const remainingPlayers = availablePlayers.filter(p => p.id !== gk?.id);

    for (let i = 1; i < format; i++) {
      if (newLineup[i]) continue;
      const positionLabel = roles[i]?.label;
      const matchingPlayer = remainingPlayers.find(p =>
        !newLineup.includes(p.id) &&
        !newSubs.includes(p.id) &&
        isPlayerMatchingRole(p.position, positionLabel)
      );
      if (matchingPlayer) {
        newLineup[i] = matchingPlayer.id;
      }
    }

    for (let i = 1; i < format; i++) {
      if (!newLineup[i]) {
        const anyPlayer = remainingPlayers.find(p => !newLineup.includes(p.id) && !newSubs.includes(p.id));
        if (anyPlayer) {
          newLineup[i] = anyPlayer.id;
        }
      }
    }

    remainingPlayers.forEach(p => {
      if (!newLineup.includes(p.id) && !newSubs.includes(p.id)) {
        newSubs.push(p.id);
      }
    });

    setOpponentLineup(newLineup);
    setOpponentSubs(newSubs);

    // If internal scrimmage, ensure any player assigned to opponent lineup/subs is removed from Team A substitutes
    if (setup.match_type === 'internal_scrimmage') {
      const usedIds = new Set([...newLineup, ...newSubs].filter(Boolean));
      setSubstitutes(prev => prev.filter(id => !usedIds.has(id)));
    }
  };

  const handleSave = async () => {
    if (!setup.team_id && !teams.find(t => t.category === setup.category)) {
      alert("Veuillez sélectionner une équipe. Si aucune n'apparaît, créez d'abord l'équipe dans la gestion des effectifs.");
      return;
    }
    const isInternal = setup.match_type === 'internal_scrimmage';
    const effectiveOpponentId = isInternal ? (mainClub?.id || setup.opponent_id) : setup.opponent_id;
    if (!effectiveOpponentId) {
      alert("Veuillez sélectionner le club adverse.");
      return;
    }
    if (isInternal && setup.internal_opposition_type === 'inter_category' && !setup.internal_target_category) {
      alert("Veuillez sélectionner la catégorie adverse pour l'opposition interne.");
      return;
    }
    setSaving(true);
    try {
      const {
        qualif_status,
        match_phase: _mp,
        match_type,
        match_format: _mf,
        round_name: _rn,
        internal_opposition_type,
        internal_target_category,
        internal_opponent_team_id,
        pitch_number,
        ...setupBase
      } = setup;

      const internalMeta = isInternal ? {
        is_internal_scrimmage: true,
        internal_opposition_type,
        internal_target_category: internal_opposition_type === 'inter_category' ? internal_target_category : null,
        internal_opponent_team_id: internal_opposition_type === 'inter_category' ? (internal_opponent_team_id || null) : null,
      } : null;

      const isOfficialLeague = match_type === 'league';
      const effectiveRoundName = isOfficialLeague ? (setup.round_name || 'Journée 1') : null;

      const matchPayload: any = {
        ...setupBase,
        round_name: effectiveRoundName,
        opponent_id: effectiveOpponentId,
        league_id: isOfficialLeague && setup.league_id !== '' ? setup.league_id : null,
        stadium_id: setup.stadium_id === '' ? null : setup.stadium_id,
        match_time: setup.match_time,
        category: setup.category,
        is_home: setup.is_home,
        formation: formation,
        score_home: initialMatch ? (initialMatch.score_home ?? 0) : 0,
        score_away: initialMatch ? (initialMatch.score_away ?? 0) : 0,
        status: initialMatch ? (initialMatch.status ?? 'scheduled') : 'scheduled',
        match_format: setup.match_format,
        lineup: {
          round_name: effectiveRoundName,
          startingXI,
          substitutes,
          formation,
          match_format: setup.match_format,
          match_type: setup.match_type,
          pitch_number: pitch_number || null,
          internal_opposition: internalMeta,
          live_operator: (initialMatch?.lineup as any)?.live_operator ?? null,
          jerseyOverrides: Object.fromEntries(
            Array.from(surclassedTargetMap.entries())
              .filter(([_, s]) => s.target_jersey_number != null)
              .map(([pid, s]) => [pid, s.target_jersey_number])
          ),
          surclasses: Array.from(surclassedTargetMap.values()).map(s => ({
            player_id: s.player_id,
            original_category: s.original_category,
            target_category: s.target_category,
            original_team_id: s.original_team_id,
            target_team_id: s.target_team_id,
          }))
        },
        opponent_formation: opponentFormation,
        opponent_lineup: opponentLineup,
        opponent_subs: opponentSubs,
        staff_ids: selectedStaffIds,
        ...(initialMatch?.live_operator_id ? { live_operator_id: initialMatch.live_operator_id } : {}),
        ...(initialMatch?.live_operator_name ? { live_operator_name: initialMatch.live_operator_name } : {}),
        ...(initialMatch?.live_operator_role ? { live_operator_role: initialMatch.live_operator_role } : {}),
        ...(initialMatch?.live_operator_avatar_url ? { live_operator_avatar_url: initialMatch.live_operator_avatar_url } : {}),
        ...(initialMatch?.live_operator_permissions ? { live_operator_permissions: initialMatch.live_operator_permissions } : {}),
        referee_central_id: selectedReferees.central_id,
        referee_assistant1_id: selectedReferees.assistant1_id,
        referee_assistant2_id: selectedReferees.assistant2_id,
        referee_fourth_id: selectedReferees.fourth_id,
        referee_commissaire_id: selectedReferees.commissaire_id,
        referees_assigned: selectedReferees,
        team_id: setup.team_id || teams.find(t => t.category === setup.category)?.id || null,
        match_phase: qualif_status !== '' ? qualif_status : (_mp === '' ? null : _mp),
        notes: isInternal
          ? `[Opposition Interne] ${internal_opposition_type === 'intra_squad' ? 'Entre le groupe' : `Vs ${internal_target_category}`} (${setup.match_format}v${setup.match_format}) - ${setup.category}`
          : (initialMatch?.notes || null),
        // Match timing configuration
        half_duration_minutes: halfDuration,
        enable_extra_time: enableExtraTime,
        enable_penalties: enablePenalties,
        current_half: initialMatch?.current_half ?? 1,
        time_elapsed_seconds: initialMatch?.time_elapsed_seconds ?? 0,
        added_time_first_half: initialMatch?.added_time_first_half ?? 0,
        added_time_second_half: initialMatch?.added_time_second_half ?? 0,
        penalty_score_home: initialMatch?.penalty_score_home ?? 0,
        penalty_score_away: initialMatch?.penalty_score_away ?? 0,
      };
      if (initialMatch) {
        await updateMatch({ id: initialMatch.id, data: matchPayload });
        toast.success("✅ Match orchestré et mis à jour avec succès !");
      } else {
        await addMatch(matchPayload);
        toast.success("🎉 Match planifié avec succès !");
      }
      onSuccess?.();
      onBack();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erreur lors de la sauvegarde du match");
    } finally {
      setSaving(false);
    }
  };

  const getOpponentName = (id: string) => {
    if (setup.match_type === 'internal_scrimmage' || (mainClub && id === mainClub.id)) {
      if (setup.internal_opposition_type === 'intra_squad') {
        const team = teams.find(t => t.id === setup.team_id);
        const groupLabel = team ? team.name : setup.category;
        return `${mainClub?.club_name || mainClub?.name || 'FUS Rabat'} (${groupLabel} — Chasubles / Reste du groupe)`;
      }
      return `${mainClub?.club_name || mainClub?.name || 'FUS Rabat'} (Cat. ${setup.internal_target_category || 'Adverse'})`;
    }
    return opponentClubs.find(c => c.id === id)?.name || '—';
  };
  const getLeagueName = (id: string) => leagues.find(l => l.id === id)?.name || '—';
  const getStadiumName = (id: string) => {
    const found = stadiums.find(s => s.id === id);
    if (found) return `${found.name}${found.city ? ` (${found.city})` : ''}`;
    if (setup.is_home) {
      const fusStadium = getFusAcademyStadium(stadiums, mainClub?.id);
      return fusStadium ? `${fusStadium.name}${fusStadium.city ? ` (${fusStadium.city})` : ''}` : 'FUS ACADEMY (Rabat)';
    }
    return '—';
  };
  // Ne reprendre que les affectations de cette rencontre, jamais celles d'un autre match.
  const surclassedTargetMap = useMemo(() => {
    const map = new Map<string, any>();
    const lineupSurclasses = ((initialMatch as any)?.lineup as any)?.surclasses;
    const lineupEntries: Array<[string, any]> = Array.isArray(lineupSurclasses)
      ? lineupSurclasses.map((item: any) => [String(item.player_id), item])
      : Object.entries(lineupSurclasses || {});
    lineupEntries.forEach(([playerId, assignment]) => {
      const rosterPlayer = players.find(p => p.id === playerId);
      if (!rosterPlayer) return;
      map.set(playerId, {
        ...assignment,
        player_id: playerId,
        original_category: assignment?.original_category || (rosterPlayer as any).category,
        target_category: assignment?.target_category || initialMatch?.category || setup.category,
        original_team_id: rosterPlayer.team_id,
        target_team_id: initialMatch?.team_id || setup.team_id,
        target_jersey_number: assignment?.target_jersey_number ?? assignment?.jersey_number ?? null,
      });
    });

    surclassements.forEach(s => {
      if (s.status !== 'active' || !initialMatch?.id) return;
      try {
        const details = typeof s.notes === 'string' ? JSON.parse(s.notes) : s.notes;
        if (String(details?.match_id || '') !== String(initialMatch.id)) return;
      } catch { return; }
      const matchesTeam = setup.team_id ? s.target_team_id === setup.team_id : false;
      const matchesCat = setup.category ? normalizeAgeCategory(s.target_category) === normalizeAgeCategory(setup.category) : false;
      if (matchesTeam || matchesCat) map.set(s.player_id, s);
    });
    return map;
  }, [surclassements, setup.team_id, setup.category, initialMatch, players]);

  const getPlayerById = (id: string) => {
    const p = players.find(pl => pl.id === id);
    if (!p) return undefined;
    const surclass = surclassedTargetMap.get(p.id);
    if (surclass?.target_jersey_number != null) {
      return { ...p, jersey_number: surclass.target_jersey_number };
    }
    return p;
  };

  const positions = useMemo(() => getFormationPositions(formation, setup.match_format), [formation, setup.match_format]);
  const opponentPositions = useMemo(() => getFormationPositions(opponentFormation, setup.match_format), [opponentFormation, setup.match_format]);

  const allGroupPlayers = useMemo(() => {
    let filtered: Player[] = [];

    if (setup.team_id) {
      const teamPlayers = players.filter(p => p.team_id === setup.team_id);
      // Joueurs surclassés actifs vers cette équipe
      const surclassedForTeam = players.filter(
        p => p.team_id !== setup.team_id && surclassedTargetMap.has(p.id)
      );
      if (teamPlayers.length > 0 || surclassedForTeam.length > 0) {
        filtered = [...teamPlayers, ...surclassedForTeam];
      } else if (setup.category) {
        const catPlayers = players.filter(p => normalizeAgeCategory(p.category) === normalizeAgeCategory(setup.category));
        const surclassedForCat = players.filter(
          p => normalizeAgeCategory(p.category) !== normalizeAgeCategory(setup.category) && surclassedTargetMap.has(p.id)
        );
        filtered = [...catPlayers, ...surclassedForCat];
      }
    } else if (setup.category) {
      const catPlayers = players.filter(p => normalizeAgeCategory(p.category) === normalizeAgeCategory(setup.category));
      const surclassedForCat = players.filter(
        p => normalizeAgeCategory(p.category) !== normalizeAgeCategory(setup.category) && surclassedTargetMap.has(p.id)
      );
      filtered = [...catPlayers, ...surclassedForCat];
    } else {
      filtered = players;
    }

    // S'assurer également que tout joueur déjà convoqué (startingXI ou substitutes) n'est jamais exclu
    const existingIds = new Set(filtered.map(p => p.id));
    const activeConvoqueIds = new Set([...startingXI.filter(Boolean), ...substitutes.filter(Boolean)]);
    if (activeConvoqueIds.size > 0) {
      const extraConvoques = players.filter(p => activeConvoqueIds.has(p.id) && !existingIds.has(p.id));
      if (extraConvoques.length > 0) {
        filtered = [...filtered, ...extraConvoques];
      }
    }

    return filtered.sort((a, b) => {
      const numA = surclassedTargetMap.get(a.id)?.target_jersey_number ?? a.jersey_number ?? 0;
      const numB = surclassedTargetMap.get(b.id)?.target_jersey_number ?? b.jersey_number ?? 0;
      return numA - numB;
    });
  }, [players, setup.category, setup.team_id, surclassedTargetMap, startingXI, substitutes]);

  const surclassedConvoques = useMemo(() => {
    const convoqueIds = new Set([...startingXI.filter(Boolean), ...substitutes.filter(Boolean)]);
    return players.filter(p => convoqueIds.has(p.id) && surclassedTargetMap.has(p.id));
  }, [players, startingXI, substitutes, surclassedTargetMap]);

  const matchPlayers = useMemo(() => {
    if (!searchQuery.trim()) return allGroupPlayers;
    return allGroupPlayers.filter(p => p.full_name?.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [allGroupPlayers, searchQuery]);

  const effectiveOpponentSquad = useMemo<OpponentPlayer[]>(() => {
    if (setup.match_type === 'internal_scrimmage') {
      if (setup.internal_opposition_type === 'intra_squad') {
        // En opposition interne intra-groupe, l'effectif restant pour l'adversaire (Chasubles)
        // comprend tous les joueurs du groupe qui ne sont PAS dans le 11/8 de départ de l'équipe principale (startingXI).
        // Si certains sont remplaçants de l'équipe A, ils restent sélectionnables et basculent dans l'équipe B sans conflit.
        const remainingPlayers = allGroupPlayers.filter(p => !startingXI.includes(p.id));
        return remainingPlayers.map(p => ({
          id: p.id,
          club_id: mainClub?.id || '',
          full_name: p.full_name,
          jersey_number: p.jersey_number ?? 0,
          position: p.position || 'CM',
          category: p.category || setup.category,
          photo_url: p.photo_url || null,
          nationality: p.nationality || 'Maroc',
          is_captain: false,
          notes: substitutes.includes(p.id) ? 'Remplaçant Équipe A (cliquer pour basculer)' : 'Opposition Interne - Reste du groupe',
          created_at: '',
          updated_at: '',
        } as OpponentPlayer));
      } else if (setup.internal_opposition_type === 'inter_category' && setup.internal_target_category) {
        let targetPlayers = players.filter(p => normalizeAgeCategory(p.category) === normalizeAgeCategory(setup.internal_target_category));
        if (setup.internal_opponent_team_id) {
          const byTeam = targetPlayers.filter(p => p.team_id === setup.internal_opponent_team_id);
          if (byTeam.length > 0) targetPlayers = byTeam;
        }
        return targetPlayers.map(p => ({
          id: p.id,
          club_id: mainClub?.id || '',
          full_name: p.full_name,
          jersey_number: p.jersey_number ?? 0,
          position: p.position || 'CM',
          category: p.category || setup.internal_target_category,
          photo_url: p.photo_url || null,
          nationality: p.nationality || 'Maroc',
          is_captain: false,
          notes: `Opposition Interne - Catégorie ${setup.internal_target_category}`,
          created_at: '',
          updated_at: '',
        } as OpponentPlayer));
      }
    }
    return rawOpponentSquad;
  }, [setup.match_type, setup.internal_opposition_type, setup.internal_target_category, setup.internal_opponent_team_id, allGroupPlayers, players, startingXI, substitutes, mainClub, rawOpponentSquad, setup.category]);

  const groupedPlayers = useMemo(() => {
    const map: Record<'Gardiens' | 'Défenseurs' | 'Milieux' | 'Attaquants', Player[]> = {
      Gardiens: [],
      Défenseurs: [],
      Milieux: [],
      Attaquants: []
    };

    matchPlayers.forEach(p => {
      const cat = classifyPosition(p.position);
      map[cat].push(p);
    });

    return POSITION_GROUPS.map(group => ({
      ...group,
      players: map[group.category] || []
    })).filter(g => g.players.length > 0);
  }, [matchPlayers]);

  if (isLoading) {
    return <FusLogoLoader fullPage size="lg" label="Préparation de l'assistant match…" />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* Premium Gradient Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-primary to-blue-900 rounded-[3rem] px-10 pt-10 pb-14 text-white overflow-hidden shadow-2xl border-b-[8px] border-primary/20">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '18px 18px' }} />

        <div className="relative z-10 flex items-center justify-between mb-10">
          <div className="flex items-center gap-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="w-16 h-16 rounded-[2rem] bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 mb-2">
                {initialMatch?.id ? 'Orchestration & Édition de Match' : 'Planning Orchestration'}
              </p>
              <h2 className="text-4xl font-black uppercase italic tracking-tight leading-none">
                {initialMatch?.id ? 'Orchestrer le Match' : 'Planifier un Match'}
              </h2>
            </div>
          </div>

          <Badge className="bg-white/10 text-white border-white/20 font-black text-xs px-6 py-3 backdrop-blur-md rounded-2xl">
            Étape {stepIndex + 1} / {STEPS.length}
          </Badge>
        </div>

        <div className="relative z-10 flex items-center justify-center">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = step.key === currentStep;
            const isClickable = Boolean(initialMatch?.id) || idx <= stepIndex;
            const isDone = Boolean(initialMatch?.id) ? idx !== stepIndex : idx < stepIndex;
            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => isClickable && setCurrentStep(step.key)}
                  className={`flex flex-col items-center gap-3 transition-all ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'} group`}
                >
                  <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center font-black transition-all duration-500 shadow-lg
                    ${isDone ? 'bg-emerald-400 text-white scale-90 translate-y-1'
                      : isActive ? 'bg-white text-primary scale-125 shadow-2xl shadow-primary/40 -translate-y-1'
                        : 'bg-white/10 text-white/60 group-hover:bg-white/20'}`}>
                    {isDone ? <Check className="w-7 h-7 stroke-[3]" /> : <Icon className="w-7 h-7" />}
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${isActive ? 'text-white' : 'text-white/30'}`}>
                    {step.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mx-6 mb-8 rounded-full transition-all duration-700 ${idx < stepIndex || Boolean(initialMatch?.id) ? 'bg-emerald-400' : 'bg-white/20'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-secondary/60 overflow-hidden min-h-[750px] flex flex-col">
          {currentStep === 'setup' && (
            <div key="setup" className="p-12 space-y-12 flex-1">
              <SectionTitle icon={<Calendar className="w-5 h-5 text-primary" />} title="Logistique du Match" subtitle="Initialisez les informations logistiques de la rencontre" />
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 bg-secondary/10 p-12 rounded-[3.5rem] border-2 border-dashed border-secondary">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3"><Globe className="inline w-3.5 h-3.5 mr-2 text-primary" /> Catégorie Sportive</label>
                    <select className="w-full h-16 rounded-2xl bg-white border border-transparent px-8 font-black text-lg outline-none focus:ring-4 ring-primary/20 appearance-none shadow-sm transition-all"
                      value={setup.category || 'SENIOR'} onChange={e => setSetup({ ...setup, category: e.target.value, team_id: '' })}>
                      {ALLOWED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3"><Layout className="inline w-3.5 h-3.5 mr-2 text-primary" /> Notre Équipe</label>
                    <select
                      className="w-full h-16 rounded-2xl bg-white border border-transparent px-8 font-black text-lg outline-none focus:ring-4 ring-primary/20 appearance-none shadow-sm transition-all"
                      value={setup.team_id || ''}
                      onChange={e => setSetup({ ...setup, team_id: e.target.value })}
                    >
                      <option value="">Sélectionner l'équipe...</option>
                      {teams.filter(t => t.category === setup.category).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {/* Affichage du Coach assigné */}
                    {(() => {
                      const selectedTeam = teams.find(t => t.id === setup.team_id);
                      if (!selectedTeam?.coach_id) return null;
                      const coach = staff.find(s => s.id === selectedTeam.coach_id);
                      if (!coach) return null;
                      return (
                        <div className="mt-3 flex items-center gap-3 bg-primary/5 p-3 rounded-2xl border border-primary/20">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                            <img
                              src={(coach.photo_url && coach.photo_url !== 'null')
                                ? coach.photo_url
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.full_name)}&background=random&color=fff&size=200`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-tight truncate">{coach.full_name}</p>
                            <p className="text-[9px] font-bold text-primary/70 uppercase tracking-wider">Entraîneur • {selectedTeam.name}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3"><Trophy className="inline w-3.5 h-3.5 mr-2 text-primary" /> Type de Match</label>
                    <select className="w-full h-16 rounded-2xl bg-white border border-transparent px-8 font-black text-lg outline-none focus:ring-4 ring-primary/20 appearance-none shadow-sm transition-all"
                      value={setup.match_type}
                      onChange={e => {
                        const val = e.target.value as 'amical' | 'league' | 'internal_scrimmage';
                        setSetup(prev => ({
                          ...prev,
                          match_type: val,
                          league_id: val === 'league' ? prev.league_id : '',
                          match_phase: val === 'league' ? prev.match_phase : '',
                          round_name: val === 'league' ? (prev.round_name || 'Journée 1') : '',
                          opponent_id: val === 'internal_scrimmage' ? (mainClub?.id || prev.opponent_id) : (prev.opponent_id === mainClub?.id ? '' : prev.opponent_id),
                        }));
                      }}
                    >
                      <option value="league">Match Officiel (Compétition)</option>
                      <option value="amical">Match Amical (Club Extérieur)</option>
                      <option value="internal_scrimmage">Opposition Interne (FUS Scrimmage)</option>
                    </select>
                  </div>

                  {/* Configuration Opposition Interne : Entre le groupe OU Vs une catégorie */}
                  {setup.match_type === 'internal_scrimmage' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 p-5 rounded-3xl bg-white/80 border-2 border-primary/25 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <ArrowUpDown className="w-4 h-4" /> Modalité d'Opposition Interne
                        </label>
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-wider">
                          FUS Club
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Option 1: Entre le groupe */}
                        <div
                          onClick={() => setSetup(prev => ({ ...prev, internal_opposition_type: 'intra_squad' }))}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${setup.internal_opposition_type === 'intra_squad'
                            ? 'bg-red-50/50 border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${setup.internal_opposition_type === 'intra_squad' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-tight text-slate-900">Entre le groupe</p>
                                <p className="text-[10px] font-semibold text-slate-500">Même effectif</p>
                              </div>
                            </div>
                            <input
                              type="radio"
                              name="internal_op_type"
                              checked={setup.internal_opposition_type === 'intra_squad'}
                              onChange={() => setSetup(prev => ({ ...prev, internal_opposition_type: 'intra_squad' }))}
                              className="w-4 h-4 accent-primary cursor-pointer mt-1"
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-3 font-semibold">
                            Équipe A vs Équipe B (Chasubles / Remplaçants)
                          </p>
                        </div>

                        {/* Option 2: Vs une catégorie */}
                        <div
                          onClick={() => setSetup(prev => ({ ...prev, internal_opposition_type: 'inter_category' }))}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${setup.internal_opposition_type === 'inter_category'
                            ? 'bg-red-50/50 border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${setup.internal_opposition_type === 'inter_category' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                <ArrowUpDown className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-tight text-slate-900">Vs une catégorie</p>
                                <p className="text-[10px] font-semibold text-slate-500">Autre niveau</p>
                              </div>
                            </div>
                            <input
                              type="radio"
                              name="internal_op_type"
                              checked={setup.internal_opposition_type === 'inter_category'}
                              onChange={() => setSetup(prev => ({ ...prev, internal_opposition_type: 'inter_category' }))}
                              className="w-4 h-4 accent-primary cursor-pointer mt-1"
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-3 font-semibold">
                            Opposition Inférieure ↘ ou Supérieure ↗
                          </p>
                        </div>
                      </div>

                      {/* Sélecteur de Catégorie cible si "Vs une catégorie" */}
                      {setup.internal_opposition_type === 'inter_category' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-2 pt-2 border-t border-slate-200"
                        >
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">
                            Catégorie Adverse à affronter :
                          </label>
                          <select
                            value={setup.internal_target_category || ''}
                            onChange={e => setSetup(prev => ({ ...prev, internal_target_category: e.target.value }))}
                            className="w-full h-14 rounded-2xl bg-white border-2 border-primary/20 px-4 font-black text-sm outline-none focus:ring-4 ring-primary/20 shadow-sm cursor-pointer"
                          >
                            <option value="">— Choisir la catégorie adverse —</option>
                            {CATEGORIES.filter(c => c !== setup.category).map(c => {
                              const rel = getCategoryRelativeLabel(setup.category, c);
                              return (
                                <option key={c} value={c}>
                                  {c} — {rel.label}
                                </option>
                              );
                            })}
                          </select>

                          {setup.internal_target_category && (
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[11px] font-bold text-slate-700">
                                  Affiche : <span className="text-primary font-black">{setup.category}</span> vs <span className="text-slate-900 font-black">{setup.internal_target_category}</span>
                                </span>
                                {(() => {
                                  const rel = getCategoryRelativeLabel(setup.category, setup.internal_target_category);
                                  return (
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${rel.badgeClass}`}>
                                      {rel.label}
                                    </span>
                                  );
                                })()}
                              </div>

                              {/* Équipe adverse spécifique si plusieurs équipes dans cette catégorie */}
                              {teams.filter(t => t.category === setup.internal_target_category).length > 0 && (
                                <div className="pt-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 block mb-1.5">
                                    Équipe adverse ({setup.internal_target_category}) :
                                  </label>
                                  <select
                                    value={setup.internal_opponent_team_id || ''}
                                    onChange={e => setSetup(prev => ({ ...prev, internal_opponent_team_id: e.target.value }))}
                                    className="w-full h-12 rounded-xl bg-white border border-slate-200 px-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20"
                                  >
                                    <option value="">Toutes les équipes ({setup.internal_target_category})</option>
                                    {teams.filter(t => t.category === setup.internal_target_category).map(t => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3"><Shield className="inline w-3.5 h-3.5 mr-2 text-primary" /> Club Adversaire</label>
                    {setup.match_type === 'internal_scrimmage' ? (
                      <div className="h-16 rounded-2xl bg-white border-2 border-primary/20 px-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center p-1.5 border border-primary/20">
                            {mainClub?.logo_url ? (
                              <img src={mainClub.logo_url} alt="FUS" className="w-full h-full object-contain" />
                            ) : (
                              <Shield className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight text-slate-900">
                              {mainClub?.club_name || mainClub?.name || 'FUS Rabat'}
                            </p>
                            <p className="text-[10px] font-bold text-primary">
                              {setup.internal_opposition_type === 'intra_squad'
                                ? `${teams.find(t => t.id === setup.team_id)?.name || setup.category} — Chasubles / Reste du groupe`
                                : (setup.internal_target_category ? `Catégorie ${setup.internal_target_category}` : 'Autre Catégorie')}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase px-3 py-1">
                          Interne FUS
                        </Badge>
                      </div>
                    ) : (
                      <select className="w-full h-16 rounded-2xl bg-white border border-transparent px-8 font-black text-lg outline-none focus:ring-4 ring-primary/20 appearance-none shadow-sm transition-all"
                        value={setup.opponent_id || ''} onChange={e => setSetup({ ...setup, opponent_id: e.target.value })}>
                        <option value="">Sélectionner...</option>
                        {opponentClubs.map(c => {
                          const cNorm = (c.name || '').toUpperCase().trim();
                          const sNorm = ((c as any).short_name || '').toUpperCase().trim();
                          const label =
                            cNorm === 'AMF' || sNorm === 'AMF'
                              ? 'AMF — Académie Mohammed VI'
                              : cNorm === 'AAMF' || sNorm === 'AAMF'
                              ? 'AAMF — Association AMF'
                              : c.name;
                          return <option key={c.id} value={c.id}>{label}</option>;
                        })}
                      </select>
                    )}
                  </div>
                  {setup.match_type === 'league' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <Trophy className="inline w-3.5 h-3.5 mr-2 text-primary" /> Compétition / Saison
                        </label>
                      </div>
                      <select className="w-full h-16 rounded-2xl bg-white border border-transparent px-8 font-black text-lg outline-none focus:ring-4 ring-primary/20 appearance-none shadow-sm transition-all"
                        value={setup.league_id || ''} onChange={e => setSetup({ ...setup, league_id: e.target.value })}>
                        <option value="">Sélectionner la compétition...</option>
                        {leagues
                          .slice()
                          .sort((a, b) => {
                            const aMatch = a.category === setup.category ? -1 : 1;
                            const bMatch = b.category === setup.category ? -1 : 1;
                            return aMatch - bMatch;
                          })
                          .map(l => (
                            <option key={l.id} value={l.id}>
                              {l.name} — {l.season}{l.category ? ` (${l.category})` : ''}
                            </option>
                          ))}
                      </select>
                      {(() => {
                        const selLeague = leagues.find(l => l.id === setup.league_id);
                        if (!selLeague) return null;
                        return (
                          <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl mt-2 animate-in fade-in">
                            <div className="w-9 h-9 rounded-xl bg-white border border-amber-200 flex items-center justify-center p-1 shrink-0 shadow-sm">
                              {selLeague.logo_url ? (
                                <img src={selLeague.logo_url} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <Trophy className="w-5 h-5 text-amber-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-tight text-slate-900 truncate">{selLeague.name}</p>
                              <p className="text-[10px] font-bold text-amber-700 uppercase">
                                Saison {selLeague.season}{selLeague.category ? ` · ${selLeague.category}` : ''} · Compétition Officielle
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {setup.is_home ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <span className="inline-block mr-2">🟩</span> Quel Terrain à Domicile ?
                        </label>
                        {(() => {
                          const fusStadium = getFusAcademyStadium(stadiums, mainClub?.id);
                          return (
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              🏟️ {fusStadium?.name || 'FUS ACADEMY'} (Auto Domicile)
                            </span>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {['1', '2', '3', '4'].map(n => {
                          const fusStadium = getFusAcademyStadium(stadiums, mainClub?.id);
                          const isSel = setup.pitch_number === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => {
                                const nextPitch = isSel ? '' : n;
                                const stadiumName = fusStadium?.name || 'FUS ACADEMY';
                                setSetup(prev => ({
                                  ...prev,
                                  pitch_number: nextPitch,
                                  stadium_id: fusStadium?.id || prev.stadium_id || '',
                                  location: nextPitch ? `${stadiumName} — Terrain ${nextPitch}` : stadiumName
                                }));
                              }}
                              className={`h-16 rounded-2xl font-black text-xl tracking-tight transition-all border-2 ${isSel
                                  ? 'bg-primary text-white border-primary shadow-xl shadow-primary/30 scale-105'
                                  : 'bg-white text-slate-700 border-transparent hover:border-primary/30 hover:bg-primary/5 shadow-sm'
                                }`}
                            >
                              Terrain {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3">
                        <MapPin className="inline w-3.5 h-3.5 mr-2 text-primary" /> Choisir le Stade (Extérieur)
                      </label>
                      <select
                        className="w-full h-16 rounded-2xl bg-white border border-transparent px-8 font-black text-lg outline-none focus:ring-4 ring-primary/20 appearance-none shadow-sm transition-all"
                        value={setup.stadium_id || ''}
                        onChange={e => {
                          const sId = e.target.value;
                          const found = stadiums.find(s => s.id === sId);
                          setSetup(prev => ({
                            ...prev,
                            stadium_id: sId,
                            pitch_number: '',
                            location: found ? `${found.name}${found.city ? ` (${found.city})` : ''}` : (prev as any).location || ''
                          }));
                        }}
                      >
                        <option value="">Sélectionner stade...</option>
                        {stadiums.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city})</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  {/* PILIER 2 (US-DASH-146 & US-DASH-148) : Choix de la Journée UNIQUEMENT pour le Championnat Officiel */}
                  {setup.match_type === 'league' ? (
                    <div className="space-y-3 p-5 rounded-3xl bg-white border-2 border-primary/25 shadow-sm ring-4 ring-primary/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                            Journée de Championnat Officiel
                          </label>
                          <span className="text-[8px] font-black uppercase tracking-wider bg-red-100 text-[#FF3737] px-2 py-0.5 rounded-full border border-red-200">
                            Paramètre Primordial
                          </span>
                        </div>
                        <span className="text-[11px] font-black uppercase text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                          {setup.round_name || 'Journée 1'}
                        </span>
                      </div>

                      {/* Raccourcis rapides J1 à J15 */}
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(jNum => {
                          const val = `Journée ${jNum}`;
                          const isSel = setup.round_name === val;
                          return (
                            <button
                              key={jNum}
                              type="button"
                              onClick={() => setSetup(prev => ({ ...prev, round_name: val }))}
                              className={`h-8 rounded-xl text-[11px] font-black transition-all border ${isSel
                                  ? 'bg-primary text-white border-primary shadow-md scale-105'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                            >
                              J{jNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Sélecteur J1 à J38 + Tournois + Champ libre */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <select
                          className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-black text-xs text-slate-800 outline-none focus:ring-2 ring-primary/20 cursor-pointer"
                          value={setup.round_name || 'Journée 1'}
                          onChange={e => setSetup(prev => ({ ...prev, round_name: e.target.value }))}
                        >
                          {Array.from({ length: 38 }, (_, i) => `Journée ${i + 1}`).map(rName => (
                            <option key={rName} value={rName}>{rName}</option>
                          ))}
                          <option value="Match de Coupe">Match de Coupe</option>
                          <option value="Tour préliminaire">Tour préliminaire</option>
                          <option value="16ème de finale">16ème de finale</option>
                          <option value="8ème de finale">8ème de finale</option>
                          <option value="Quart de finale">Quart de finale</option>
                          <option value="Demi-finale">Demi-finale</option>
                          <option value="Finale">Finale</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Intitulé libre (ex: J4 - Match en retard)..."
                          value={setup.round_name || ''}
                          onChange={e => setSetup(prev => ({ ...prev, round_name: e.target.value }))}
                          className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-xs text-slate-800 outline-none focus:ring-2 ring-primary/20"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <Trophy className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight text-slate-800">
                            {setup.match_type === 'amical' ? 'Match Amical' : 'Opposition Interne'}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500">
                            Rencontre hors championnat
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                        Pas de Journée de Championnat
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3">Date Prévue</label>
                      <Input type="date" value={setup.match_date || ''} onChange={e => setSetup({ ...setup, match_date: e.target.value })} className="h-16 rounded-2xl bg-white border-transparent font-black shadow-sm text-lg focus:ring-4 ring-primary/20" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3">Coup d'envoi</label>
                      <Input type="time" value={setup.match_time || ''} onChange={e => setSetup({ ...setup, match_time: e.target.value })} className="h-16 rounded-2xl bg-white border-transparent font-black shadow-sm text-lg focus:ring-4 ring-primary/20" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="bg-white/50 rounded-[2.5rem] p-3 flex border-2 border-secondary shadow-inner">
                      <button
                        type="button"
                        onClick={() => {
                          const fusStadium = getFusAcademyStadium(stadiums, mainClub?.id);
                          setSetup(prev => ({
                            ...prev,
                            is_home: true,
                            stadium_id: fusStadium?.id || prev.stadium_id || '',
                            location: prev.pitch_number && fusStadium ? `${fusStadium.name} — Terrain ${prev.pitch_number}` : (fusStadium?.name || prev.location || '')
                          }));
                        }}
                        className={`flex-1 h-16 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all ${setup.is_home ? 'bg-primary text-white shadow-2xl scale-105' : 'text-muted-foreground hover:bg-white'}`}
                      >
                        Domicile
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetup(prev => ({ ...prev, is_home: false, pitch_number: '', stadium_id: '', location: '' }))}
                        className={`flex-1 h-16 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all ${!setup.is_home ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-muted-foreground hover:bg-white'}`}
                      >
                        Extérieur
                      </button>
                    </div>
                  </div>

                  {/* Format du match (6v6 à 11v11) */}
                  <div className="space-y-3 p-6 rounded-3xl bg-white border-2 border-primary/20 shadow-md">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Users className="w-4 h-4" /> Format de Match (Effectif)
                      </label>
                      <Badge className="bg-primary text-white font-black text-[10px] px-3 py-1 rounded-xl shadow-sm">
                        {setup.match_format} vs {setup.match_format}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-6 gap-2 pt-1">
                      {[6, 7, 8, 9, 10, 11].map(fmt => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleFormatChange(fmt)}
                          className={`h-12 rounded-2xl font-black text-xs transition-all flex flex-col items-center justify-center border-2 ${setup.match_format === fmt
                            ? 'bg-primary text-white border-primary shadow-lg scale-105 ring-2 ring-primary/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-primary/40'
                            }`}
                        >
                          <span>{fmt}v{fmt}</span>
                          <span className="text-[8px] opacity-70 font-semibold">{fmt} tit.</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground font-semibold">
                      Configure les terrains tactiques ({setup.match_format} titulaires + remplaçants).
                    </p>
                  </div>

                  {/* Durée d'une mi-temps (Minutes) */}
                  <div className="space-y-3 p-6 rounded-3xl bg-white border-2 border-primary/20 shadow-md">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Durée d'une Mi-Temps
                      </label>
                      <Badge className="bg-slate-900 text-white font-black text-[10px] px-3 py-1 rounded-xl shadow-sm">
                        2 × {halfDuration}' = {halfDuration * 2} min
                      </Badge>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 pt-1">
                      {[15, 20, 25, 30, 35, 40, 45].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setHalfDuration(mins)}
                          className={`h-11 rounded-xl font-black text-xs transition-all border-2 ${halfDuration === mins
                            ? 'bg-primary text-white border-primary shadow-md scale-105'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-primary/40'
                            }`}
                        >
                          {mins}'
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Personnalisé :</span>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min={5}
                          max={60}
                          value={halfDuration ?? 45}
                          onChange={e => {
                            const val = Math.max(1, Math.min(120, parseInt(e.target.value) || 45));
                            setHalfDuration(val);
                          }}
                          className="h-11 rounded-xl bg-slate-50 border-slate-200 font-black text-sm px-3"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">min / mi-temps</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {currentStep === 'arbitres' && (
            <div key="arbitres" className="p-12 space-y-10 flex-1">
              <SectionTitle icon={<UserCheck className="w-5 h-5 text-primary" />} title="Corps d'Arbitrage" subtitle="Désignez les arbitres officiels de la rencontre (chaque arbitre ne peut être sélectionné qu'une seule fois)" />

              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-secondary/10 p-8 rounded-[3rem] border-2 border-dashed border-secondary">
                {[
                  { key: 'central_id', label: 'Arbitre Principal', icon: UserCheck, required: true, preferredRole: 'central' },
                  { key: 'assistant1_id', label: 'Arbitre Assistant 1', icon: UserCheck, required: false, preferredRole: 'assistant' },
                  { key: 'assistant2_id', label: 'Arbitre Assistant 2', icon: UserCheck, required: false, preferredRole: 'assistant' },
                  { key: 'fourth_id', label: '4ème Officiel', icon: UserCheck, required: false, preferredRole: 'quatrieme' },
                  { key: 'commissaire_id', label: 'Commissaire du Match', icon: Shield, required: false, preferredRole: 'commissaire' },
                ].map((slot) => {
                  const currentSelectedId = selectedReferees[slot.key as keyof typeof selectedReferees];
                  const selectedArbitre = currentSelectedId ? arbitres.find(a => a.id === currentSelectedId) : null;

                  // Filter available referees: exclude ones assigned to OTHER slots
                  const otherAssignedIds = Object.entries(selectedReferees)
                    .filter(([k, val]) => k !== slot.key && val !== null)
                    .map(([_, val]) => Number(val));

                  // Available active referees not assigned to other slots, sorted with preferred role first
                  const availableReferees = arbitres
                    .filter(a => a.statut === 'actif' && !otherAssignedIds.includes(a.id))
                    .sort((a, b) => {
                      const aMatch = a.role_principal === slot.preferredRole ? 0 : 1;
                      const bMatch = b.role_principal === slot.preferredRole ? 0 : 1;
                      return aMatch - bMatch;
                    });

                  return (
                    <div key={slot.key} className="space-y-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-secondary/40 shadow-md">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                          <slot.icon className="w-4 h-4" /> {slot.label} {slot.required && '*'}
                        </label>
                        {selectedArbitre && (
                          <span className="text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            ✅ Assigné
                          </span>
                        )}
                      </div>

                      <select
                        className="w-full h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 font-bold text-xs outline-none focus:ring-4 ring-primary/20 shadow-sm transition-all cursor-pointer text-foreground"
                        value={currentSelectedId || ''}
                        onChange={e => setSelectedReferees({
                          ...selectedReferees,
                          [slot.key]: e.target.value ? Number(e.target.value) : null
                        })}
                      >
                        <option value="">-- Choisir {slot.label} --</option>
                        {availableReferees.map(a => {
                          const roleName = a.role_principal === 'central'
                            ? 'Principal'
                            : a.role_principal === 'commissaire'
                              ? 'Commissaire'
                              : a.role_principal === 'quatrieme'
                                ? '4ème Officiel'
                                : a.role_principal === 'var'
                                  ? 'VAR'
                                  : 'Assistant';
                          return (
                            <option key={a.id} value={a.id}>
                              {a.prenom} {a.nom} ({roleName} • {a.grade})
                            </option>
                          );
                        })}
                      </select>

                      {/* Selected Referee Profile Photo & Details Preview */}
                      {selectedArbitre ? (
                        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-indigo-900 text-white p-3.5 rounded-2xl shadow-lg border border-slate-700 mt-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-white/10 border-2 border-primary/40 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                              <img
                                src={(selectedArbitre.photo_url && selectedArbitre.photo_url !== 'null')
                                  ? selectedArbitre.photo_url
                                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(`${selectedArbitre.prenom} ${selectedArbitre.nom}`)}&background=10b981&color=fff&size=200`}
                                alt={selectedArbitre.nom}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="font-black text-xs uppercase tracking-tight text-white truncate">
                                {selectedArbitre.prenom} {selectedArbitre.nom}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap text-[9px]">
                                <span className="bg-emerald-500/80 text-white px-2 py-0.5 rounded-md font-bold uppercase">
                                  {selectedArbitre.grade}
                                </span>
                                <span className="text-white/70 font-medium">
                                  {selectedArbitre.role_principal === 'central'
                                    ? 'Arbitre Principal'
                                    : selectedArbitre.role_principal === 'commissaire'
                                      ? 'Commissaire du Match'
                                      : selectedArbitre.role_principal === 'quatrieme'
                                        ? '4ème Officiel'
                                        : 'Arbitre Assistant'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedReferees({ ...selectedReferees, [slot.key]: null })}
                            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center transition-all shrink-0"
                            title="Retirer cet officiel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-[10px] text-slate-400 font-bold">
                          Aucun officiel sélectionné pour ce poste
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 'staff' && (
            <div key="staff" className="p-12 space-y-10 flex-1">
              <SectionTitle icon={<Briefcase className="w-5 h-5 text-primary" />} title="Membres du Staff" subtitle="Désignez les membres techniques présents pour cette rencontre" />
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {staff.map(member => {
                  const isSelected = selectedStaffIds.includes(member.id);
                  return (
                    <motion.button key={member.id} onClick={() => toggleStaff(member.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                      className={`relative p-8 rounded-[3.5rem] border-2 text-center transition-all duration-500 overflow-hidden group
                        ${isSelected ? 'border-primary bg-primary/5 shadow-2xl' : 'border-secondary hover:border-primary/40 bg-white'}`}>
                      <div className={`w-20 h-20 rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl transition-all duration-700
                        ${isSelected ? 'bg-primary scale-110' : 'bg-secondary group-hover:scale-105'}`}>
                        <img src={(member.photo_url && member.photo_url !== 'null') ? member.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random&color=fff&size=200`} className="w-full h-full object-cover" />
                      </div>
                      <p className="font-black text-sm uppercase tracking-tighter leading-none">{member.full_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 font-bold opacity-60">{member.role}</p>
                      {isSelected && (
                        <div className="absolute top-5 right-5 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white"><Check className="w-4 h-4 text-white stroke-[3]" /></div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 'lineup' && (
            <div key="lineup" className="p-8 space-y-8 flex-1">
              <SectionTitle icon={<Users className="w-5 h-5 text-primary" />} title="Organisation Tactique" subtitle="Définissez votre système et convoquez l'équipe type" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-8 flex flex-col">
                  <div className="bg-secondary/20 p-6 rounded-[2.5rem] border border-secondary/50 shadow-inner">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-primary mb-4 flex items-center justify-between">
                      <span>Système Tactique ({setup.match_format}v{setup.match_format})</span>
                      <Badge variant="outline" className="text-[8px] bg-white border-primary/20">{formation}</Badge>
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(FORMATIONS_BY_FORMAT[setup.match_format] || FORMATIONS).map(f => (
                        <button key={f} onClick={() => setFormation(f)} className={`h-11 rounded-xl text-[10px] font-black border-2 transition-all ${formation === f ? 'border-primary bg-primary text-white shadow-lg' : 'border-secondary text-muted-foreground bg-white hover:border-primary/10'}`}>{f}</button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0 bg-white border-2 border-secondary/20 rounded-[3rem] p-6 shadow-sm overflow-hidden">

                    {/* Team Selector — shown only if multiple teams for this category */}
                    {teams.filter(t => t.category === setup.category).length > 1 && (
                      <div className="mb-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Layout className="w-3 h-3 text-primary" /> Équipe
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {teams.filter(t => t.category === setup.category).map(team => (
                            <button
                              key={team.id}
                              type="button"
                              onClick={() => setSetup(prev => ({ ...prev, team_id: team.id }))}
                              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border-2 transition-all ${setup.team_id === team.id ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-500 border-secondary hover:border-primary/40'}`}
                            >
                              {team.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Generate Lineup Button */}
                    <button
                      onClick={autoPositionPlayers}
                      className="mb-3 w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                    >
                      <Users className="w-4 h-4" />
                      ⚡ Aligner {setup.match_format} Titulaires
                      <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-lg text-[8px] font-black">
                        {setup.match_type === 'internal_scrimmage' && setup.internal_opposition_type === 'intra_squad'
                          ? `${setup.match_format} tit. (reste dispo pour Chasubles)`
                          : `${setup.match_format} + ${Math.min(Math.max(matchPlayers.length - setup.match_format, 0), setup.match_format)} subs`
                        }
                      </span>
                    </button>

                    {/* Reset Button */}
                    {(startingXI.some(id => id !== '') || substitutes.length > 0) && (
                      <button
                        onClick={() => { setStartingXI(Array(setup.match_format).fill('')); setSubstitutes([]); }}
                        className="mb-3 w-full h-9 rounded-xl bg-red-50 text-red-500 border-2 border-red-100 hover:bg-red-100 font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Réinitialiser la sélection
                      </button>
                    )}

                    <div className="relative mb-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-30" />
                      <input
                        type="text"
                        placeholder="Chercher joueur..."
                        value={searchQuery || ''}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-12 pr-4 rounded-2xl bg-secondary/10 border-none font-bold text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Effectif disponible
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const surclassedCount = Array.from(surclassedTargetMap.values()).filter(s => !isLowerCategory(s.original_category, s.target_category)).length;
                          const sousclassedCount = Array.from(surclassedTargetMap.values()).filter(s => isLowerCategory(s.original_category, s.target_category)).length;
                          return (
                            <>
                              {surclassedCount > 0 && (
                                <Badge className="text-[9px] font-black bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                                  ⭐ {surclassedCount} surclassé{surclassedCount > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {sousclassedCount > 0 && (
                                <Badge className="text-[9px] font-black bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300">
                                  ⬇️ {sousclassedCount} sous-classé{sousclassedCount > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                        <Badge variant="outline" className="text-[10px] font-black bg-slate-50 border-slate-200">
                          {matchPlayers.length} joueur{matchPlayers.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    {matchPlayers.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                          <Users className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Aucun joueur trouvé</p>
                        <p className="text-[10px] text-slate-300 font-medium">Sélectionnez une équipe ou ajoutez des joueurs</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 max-h-[620px]">
                        {groupedPlayers.map(group => (
                          <div key={group.label} className="space-y-3">
                            <div className="flex items-center gap-3 px-3">
                              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${group.color}`} />
                              <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{group.label}</h5>
                              <Badge className={`bg-gradient-to-br ${group.color} text-white border-none text-[8px] font-black rounded-lg px-2`}>{group.players.length}</Badge>
                              <div className="flex-1 h-px bg-secondary" />
                            </div>
                            <div className="space-y-2">
                              {group.players.map(p => {
                                const isStarter = startingXI.includes(p.id);
                                const isSub = substitutes.includes(p.id);
                                const positionColor = getPositionColor(p.position);
                                const surclass = surclassedTargetMap.get(p.id);
                                const displayJersey = surclass?.target_jersey_number ?? p.jersey_number;
                                const isSousClass = surclass ? isLowerCategory(surclass.original_category, surclass.target_category) : false;
                                return (
                                  <motion.div
                                    key={p.id}
                                    layout
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('playerId', p.id); }}
                                    className={`p-3 rounded-[1.8rem] border-2 transition-all flex items-center gap-4 cursor-grab active:cursor-grabbing hover:bg-black/5 ${isStarter
                                        ? `border-transparent bg-gradient-to-r ${positionColor} text-white shadow-md`
                                        : isSub
                                          ? 'border-emerald-400 bg-emerald-50/20'
                                          : surclass
                                            ? isSousClass
                                              ? 'border-sky-300 dark:border-sky-700/60 bg-sky-50/30 dark:bg-sky-950/20'
                                              : 'border-amber-300 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-950/20'
                                            : 'border-secondary bg-white'
                                      }`}
                                  >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs overflow-hidden border-2 border-white relative ${isStarter ? 'bg-white/20' : 'bg-secondary'}`}>
                                      <img src={(p.photo_url && p.photo_url !== 'null') ? p.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=200`} className="w-full h-full object-cover" />
                                      {surclass && (
                                        <span className={`absolute bottom-0 right-0 text-white text-[7px] font-black px-0.5 rounded-tl shadow-xs ${isSousClass ? 'bg-sky-600' : 'bg-amber-400 !text-slate-950'
                                          }`}>
                                          {isSousClass ? '⬇️' : '⭐'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className={`font-black text-[11px] uppercase ${isStarter ? 'text-white' : ''} truncate`}>{p.full_name}</p>
                                        {surclass && (
                                          <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${isStarter
                                              ? isSousClass ? 'bg-sky-500 text-white shadow-xs' : 'bg-amber-400 text-slate-950 shadow-xs'
                                              : isSousClass
                                                ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60'
                                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                                            }`}>
                                            {isSousClass ? '⬇️ Sous-classé' : '⭐ Surclassé'} ({surclass.original_category})
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-[8px] font-bold opacity-60 ${isStarter ? 'text-white/80' : 'text-muted-foreground'}`}>
                                        #{displayJersey} • {p.position} {surclass ? `• Origine : ${surclass.original_category}` : ''}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isStarter && <span className="text-[8px] font-black bg-white/20 px-1.5 py-0.5 rounded-lg">TIT</span>}
                                      {isSub && <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-lg">SUB</span>}
                                      <button onClick={() => toggleLineupPlayer(p)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${(isStarter || isSub) ? 'bg-white text-primary shadow-lg' : 'bg-secondary text-muted-foreground hover:bg-primary/20'}`}>
                                        {(isStarter || isSub) ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-8 flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-6 px-10">
                    <div className="flex items-center gap-4">
                      <Badge className="bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-[10px]">Titulaires: {startingXI.filter(id => id !== '').length}/{setup.match_format}</Badge>
                      <Badge className="bg-blue-500 text-white font-black px-4 py-2 rounded-xl text-[10px]">Subs: {substitutes.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2 opacity-50 italic text-[10px] font-bold uppercase">
                      <Filter className="w-3.5 h-3.5" /> Glisser pour permuter • 2× clic pour retirer
                    </div>
                  </div>
                  <Pitch positions={positions} startingXI={startingXI} getPlayerById={getPlayerById} surclassedMap={surclassedTargetMap} onDropPlayer={handleSwap} onClearSlot={(idx) => {
                    const playerId = startingXI[idx];
                    if (playerId) {
                      setStartingXI(prev => prev.map((id, i) => i === idx ? '' : id));
                      setSubstitutes(prev => [...prev, playerId]);
                    }
                  }} />

                  <div className="w-full mt-8 bg-secondary/10 p-6 rounded-[3rem] border-2 border-dashed border-secondary/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-4 flex items-center gap-2"><Layout className="w-3.5 h-3.5" /> Remplaçants convoqués</p>
                    <div className="flex flex-wrap gap-3">
                      {substitutes.map(sid => {
                        const p = getPlayerById(sid);
                        if (!p) return null;
                        const surclass = surclassedTargetMap.get(p.id);
                        const displayJersey = surclass?.target_jersey_number ?? p.jersey_number;
                        const isSousClass = surclass ? isLowerCategory(surclass.original_category, surclass.target_category) : false;
                        return (
                          <motion.div
                            key={sid}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('playerId', sid); }}
                            className={`flex items-center gap-2.5 p-2 pr-4 rounded-2xl border-2 transition-all shadow-sm cursor-grab active:cursor-grabbing hover:scale-105 ${surclass
                                ? isSousClass
                                  ? 'border-sky-400 bg-sky-50/40 dark:bg-sky-950/30'
                                  : 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/30'
                                : 'border-emerald-400 bg-white'
                              }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-secondary overflow-hidden border border-secondary shadow-inner relative shrink-0">
                              <img src={(p.photo_url && p.photo_url !== 'null') ? p.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=200`} className="w-full h-full object-cover" />
                              {surclass && (
                                <span className={`absolute bottom-0 right-0 text-[7px] leading-none px-0.5 py-0.5 rounded-tl font-black ${isSousClass ? 'bg-sky-600 text-white' : 'bg-amber-400 text-slate-950'
                                  }`}>
                                  {isSousClass ? '⬇️' : '⭐'}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-black uppercase truncate max-w-[110px]">{p.full_name.split(' ').pop()}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-bold text-muted-foreground">#{displayJersey}</span>
                                {surclass && (
                                  <span className={`text-[7.5px] font-black uppercase tracking-tight ${isSousClass ? 'text-sky-700 dark:text-sky-400' : 'text-amber-700 dark:text-amber-400'
                                    }`}>
                                    {isSousClass ? '⬇️' : '⭐'} {surclass.original_category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      {substitutes.length === 0 && <p className="text-[10px] italic text-muted-foreground/40 px-4">Aucun remplaçant sélectionné</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'opponent' && (
            <div key="opponent" className="p-8 space-y-8 flex-1">
              <SectionTitle icon={<Target className="w-5 h-5 text-primary" />} title="Scouting Tactique Adverse" subtitle="Configurez le système et les forces de l'opposition" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4">
                <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                  <Card className="rounded-[3rem] border-secondary/50 shadow-xl overflow-hidden bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-6 border-b pb-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center p-3 border-2 border-white shadow-inner">
                          {setup.match_type === 'internal_scrimmage' ? (
                            mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-7 h-7 text-primary" />
                          ) : (
                            opponentClubs.find(c => c.id === setup.opponent_id)?.logo_url ? <img src={opponentClubs.find(c => c.id === setup.opponent_id)?.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-7 h-7 text-muted-foreground opacity-10" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none">{getOpponentName(setup.opponent_id)}</h3>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">
                            {setup.match_type === 'internal_scrimmage' ? 'Opposition Interne FUS' : 'Scouting Adverse'}
                          </p>
                          {setup.match_type === 'league' && setup.league_id && (() => {
                            const selLeague = leagues.find(l => l.id === setup.league_id);
                            if (!selLeague) return null;
                            return (
                              <div className="mt-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl">
                                {selLeague.logo_url ? (
                                  <img src={selLeague.logo_url} className="w-4 h-4 object-contain" alt="" />
                                ) : (
                                  <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <span className="text-[9px] font-black uppercase text-amber-900 truncate block leading-tight">{selLeague.name}</span>
                                  <span className="text-[8px] font-bold text-amber-700/80 uppercase">Saison {selLeague.season}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex justify-between items-center">
                        SYSTÈME ADVERSE ({setup.match_format}v{setup.match_format}) <Badge className="bg-primary/10 text-primary border-none text-[9px] uppercase">{opponentFormation}</Badge>
                      </h4>

                      {/* Magic Wand: Même système que mon club */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpponentFormation(formation);
                          toast.success(`🪄 Système adverse aligné sur mon club : ${formation}`);
                        }}
                        className={`w-full py-2.5 px-3 mb-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 border-2 transition-all ${opponentFormation === formation
                          ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                          : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                          }`}
                        title="Adopter exactement le même système tactique que mon club"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>🪄 Même système que mon club ({formation})</span>
                      </button>

                      <div className="grid grid-cols-4 gap-2">
                        {(FORMATIONS_BY_FORMAT[setup.match_format] || FORMATIONS).map(f => (
                          <button key={f} onClick={() => setOpponentFormation(f)} className={`h-9 rounded-lg text-[9px] font-black border-2 transition-all ${opponentFormation === f ? 'bg-primary border-primary text-white shadow-lg' : 'bg-slate-50 border-transparent text-muted-foreground hover:border-primary/20'}`}>{f}</button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Auto-position & Reset buttons with Magic Wand */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button
                      onClick={() => {
                        setOpponentFormation(formation);
                        autoPositionOpponent();
                        toast.success(`🪄 Système (${formation}) et titulaires adverses alignés automatiquement`);
                      }}
                      className="h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-primary text-white font-black text-[11px] uppercase tracking-wider shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      title="Appliquer le même système que mon club et aligner automatiquement les titulaires"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>🪄 Même que club</span>
                    </button>
                    <button
                      onClick={autoPositionOpponent}
                      className="h-12 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white font-black text-[11px] uppercase tracking-wider shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <span>⚡ Auto ({setup.match_format})</span>
                    </button>
                    <button
                      onClick={() => { setOpponentLineup(Array(setup.match_format).fill('')); setOpponentSubs([]); }}
                      className="h-12 rounded-2xl bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Vider</span>
                    </button>
                  </div>

                  {/* Boutons d'action pour joueurs adverses */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setShowQuickOpponentModal(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Ajouter joueur(s) adverse(s)</span>
                    </button>
                    {opponentClub && (
                      <button
                        type="button"
                        onClick={() => setShowFullOpponentSquadModal(true)}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all"
                        title="Gérer l'effectif complet du club adverse"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Effectif club</span>
                      </button>
                    )}
                  </div>

                  {/* Liste des joueurs adverses disponibles (FUS ou Club) */}
                  {effectiveOpponentSquad.length > 0 ? (
                    <Card className="rounded-[2.5rem] border-primary/20 shadow-lg overflow-hidden bg-white mb-4">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            {setup.match_type === 'internal_scrimmage' && setup.internal_opposition_type === 'intra_squad'
                              ? `Reste du Groupe ${teams.find(t => t.id === setup.team_id)?.name || setup.category} (${effectiveOpponentSquad.length})`
                              : `Effectif Disponible (${effectiveOpponentSquad.length})`
                            }
                          </h4>
                          <span className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase">
                            ☑️ Cocher pour titulariser ({opponentLineup.filter(Boolean).length}/{setup.match_format})
                          </span>
                        </div>
                        {setup.match_type === 'internal_scrimmage' && setup.internal_opposition_type === 'intra_squad' && (
                          <div className="bg-primary/5 p-2.5 rounded-xl border border-primary/10 mb-2.5">
                            <p className="text-[9px] text-slate-600 font-semibold leading-tight">
                              🎯 <strong>Même groupe ({teams.find(t => t.id === setup.team_id)?.name || setup.category})</strong> : L'adversaire est composé exclusivement des joueurs restants non affectés à l'Équipe A.
                            </p>
                          </div>
                        )}
                        <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                          {effectiveOpponentSquad.map(p => {
                            const isStarter = opponentLineup.includes(p.id) || (p.jersey_number != null && opponentLineup.includes(String(p.jersey_number)));
                            const isSub = opponentSubs.includes(p.id) || (p.jersey_number != null && opponentSubs.includes(String(p.jersey_number)));
                            const isUsed = isStarter || isSub;
                            return (
                              <div
                                key={p.id}
                                className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all select-none ${isStarter
                                  ? 'bg-primary/10 border-2 border-primary text-primary font-black shadow-sm'
                                  : isSub
                                    ? 'bg-blue-50 border-2 border-blue-300 text-blue-800 font-bold'
                                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800'
                                  }`}
                              >
                                <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 py-0.5">
                                  <input
                                    type="checkbox"
                                    checked={isStarter}
                                    onChange={() => toggleOpponentStarter(p.id)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer shrink-0 accent-primary"
                                  />
                                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center text-[9px] font-black text-slate-700 shrink-0 shadow-sm">
                                    {p.photo_url && p.photo_url !== 'null' ? (
                                      <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      p.jersey_number || '#'
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold truncate text-[11px] block">{p.full_name}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {isStarter ? '⭐ Titulaire adverse' : isSub ? '🔄 Remplaçant adverse' : 'Disponible'}
                                    </span>
                                  </div>
                                </label>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">{p.position}</span>
                                  {substitutes.includes(p.id) && !isUsed && (
                                    <span className="text-[8px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded" title="Actuellement remplaçant Équipe A">
                                      BANC A
                                    </span>
                                  )}
                                  {isStarter ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleOpponentStarter(p.id)}
                                      className="text-[8px] font-black bg-primary text-white px-2 py-0.5 rounded-full hover:bg-primary/80 transition-colors shadow-sm"
                                      title="Cliquer pour retirer des titulaires"
                                    >
                                      TITULAIRE ✓
                                    </button>
                                  ) : isSub ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpponentSubs(prev => prev.filter(val => val !== p.id && val !== String(p.jersey_number)));
                                      }}
                                      className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full hover:bg-blue-700"
                                      title="Cliquer pour retirer du banc"
                                    >
                                      SUB ✕
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => toggleOpponentStarter(p.id)}
                                        className="text-[8px] font-bold text-primary hover:bg-primary hover:text-white border border-primary/40 px-1.5 py-0.5 rounded transition-colors"
                                        title="Définir comme titulaire"
                                      >
                                        + Titulaire
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setOpponentSubs(prev => [...prev, p.id])}
                                        className="text-[8px] font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 px-1.5 py-0.5 rounded transition-colors"
                                        title="Mettre sur le banc remplaçant"
                                      >
                                        + Sub
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center mb-4 space-y-3">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Aucun joueur disponible pour cette sélection</p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowQuickOpponentModal(true)}
                          className="py-2 px-3.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm hover:bg-primary/90 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Créer joueur(s) adverse(s)</span>
                        </button>
                        {opponentClub && (
                          <button
                            type="button"
                            onClick={() => setShowFullOpponentSquadModal(true)}
                            className="py-2 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-slate-50 transition-all"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Gérer l'effectif</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <Card className="rounded-[3rem] border-secondary/50 shadow-xl flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Composition ({setup.match_format} titulaires)
                        </h4>
                        <button
                          onClick={() => setOpponentLineup(Array(setup.match_format).fill(''))}
                          className="text-[9px] text-red-500 hover:text-red-700 font-bold uppercase"
                        >
                          Vider titulaires
                        </button>
                      </div>
                      <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                        {opponentPositions.map((pos, idx) => {
                          const playerRef = opponentLineup[idx];
                          const oppP = playerRef ? (effectiveOpponentSquad.find(op => op.id === playerRef || String(op.jersey_number) === String(playerRef)) || players.find(p => p.id === playerRef)) : null;
                          const name = oppP ? oppP.full_name : (playerRef ? `Joueur #${playerRef}` : `Poste ${pos.label} — Libre`);
                          const avatar = oppP ? ((oppP.photo_url && oppP.photo_url !== 'null') ? oppP.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=020617&color=fff&size=200`) : null;

                          return (
                            <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${playerRef ? 'bg-slate-50 border-secondary/30 hover:bg-white hover:shadow-md' : 'bg-slate-50/50 border-dashed border-slate-200'}`}>
                              <div className="flex items-center gap-3 min-w-0">
                                {avatar ? (
                                  <img src={avatar} className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-sm shrink-0" alt="" />
                                ) : (
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0 ${playerRef ? 'bg-primary' : 'bg-slate-300'}`}>
                                    {pos.label}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className={`text-[10px] font-black uppercase truncate leading-tight ${playerRef ? 'text-slate-900' : 'text-slate-400 italic'}`}>{name}</p>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase">
                                    Poste {pos.label} {oppP?.jersey_number ? `• Maillot #${oppP.jersey_number}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {playerRef && (
                                  <button
                                    onClick={() => updateOpponentJersey(idx, '')}
                                    className="w-6 h-6 rounded-lg bg-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                    title="Retirer ce joueur"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${playerRef ? 'bg-primary text-white shadow' : 'bg-white border-2 border-dashed border-slate-200 text-slate-300'}`}>
                                  {oppP?.jersey_number || (playerRef ? '#' : '-')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-8 flex flex-col items-center">
                  <div className="w-full flex justify-center mb-4">
                    <Badge className="bg-slate-950 text-white font-black px-8 py-3 rounded-2xl shadow-2xl text-[10px] uppercase tracking-widest">Visualisation Tactique Scouting ({setup.match_format}v{setup.match_format})</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-4 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    Glissez-déposez les joueurs sur le terrain pour les permuter
                  </p>
                  <Pitch
                    positions={opponentPositions}
                    isOpponent
                    opponentJerseyNumbers={opponentLineup}
                    opponentSquad={effectiveOpponentSquad}
                    onDropPlayer={handleOpponentSwap}
                    onClearSlot={handleOpponentClear}
                  />

                  <div className="w-full mt-8 bg-secondary/10 p-6 rounded-[3rem] border-2 border-dashed border-secondary/50">
                    <div className="flex items-center justify-between mb-4 px-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Banc de l'Adversaire ({opponentSubs.length})
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addOpponentSub}
                        className="h-8 bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-black uppercase px-4 rounded-xl"
                      >
                        Ajouter Remplaçant
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {opponentSubs.map((subId, idx) => {
                        const oppP = effectiveOpponentSquad.find(p => p.id === subId || String(p.jersey_number) === String(subId)) || players.find(p => p.id === subId);
                        const name = oppP ? oppP.full_name : (subId ? `Joueur #${subId}` : `Remplaçant #${idx + 1}`);
                        const avatar = oppP?.photo_url && oppP.photo_url !== 'null' ? oppP.photo_url : null;
                        return (
                          <motion.div
                            key={idx}
                            layout
                            className="flex items-center gap-2.5 bg-white p-2 pr-3.5 rounded-2xl border-2 border-slate-200 shadow-sm group hover:border-primary/40 transition-all"
                          >
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-black text-[10px] overflow-hidden border border-slate-200">
                              {avatar ? (
                                <img src={avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                oppP?.jersey_number || '#'
                              )}
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-800 max-w-[120px] truncate">
                              {name}
                            </span>
                            <button
                              onClick={() => removeOpponentSub(idx)}
                              className="w-6 h-6 rounded-lg bg-red-50 text-red-500 opacity-60 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white flex items-center justify-center ml-1"
                              title="Retirer du banc"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        );
                      })}
                      {opponentSubs.length === 0 && <p className="text-[10px] italic text-muted-foreground/40 px-4">Aucun remplaçant répertorié</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'validate' && (
            <div key="validate" className="p-12 space-y-12 flex-1">
              <SectionTitle icon={<CheckCircle2 className="w-5 h-5 text-primary" />} title="Validation de la Planification" subtitle="Veuillez confirmer les détails avant la synchronisation finale" />
              <div className="flex items-center justify-between bg-primary/5 rounded-[4rem] p-16 border-2 border-primary/10 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#000 0,#000 1px,transparent 0,transparent 50%)', backgroundSize: '15px 15px' }} />

                <div className="flex flex-col items-center gap-8 relative z-10 flex-1">
                  <div className="w-40 h-40 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center p-8 border-4 border-white transition-all hover:scale-105">
                    {setup.is_home ? (
                      mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-16 h-16 text-primary opacity-20" />
                    ) : (
                      setup.match_type === 'internal_scrimmage'
                        ? (mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-16 h-16 text-primary opacity-20" />)
                        : (opponentClubs.find(c => c.id === setup.opponent_id)?.logo_url ? <img src={opponentClubs.find(c => c.id === setup.opponent_id)?.logo_url} className="w-full h-full object-contain" /> : <Target className="w-16 h-16 text-muted-foreground opacity-20" />)
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-black text-2xl uppercase tracking-tighter italic">{setup.is_home ? (mainClub?.club_name || 'My Club') : (setup.match_type === 'internal_scrimmage' ? (setup.internal_opposition_type === 'intra_squad' ? 'Opposition Interne (Intra-squad)' : `Interne (${setup.internal_target_category})`) : getOpponentName(setup.opponent_id))}</p>
                    <Badge className="mt-4 bg-primary text-white border-white/20 font-black uppercase text-[10px] px-6 py-2 rounded-xl">DOMICILE</Badge>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 px-16 relative z-10">
                  <div className="text-6xl font-black italic text-primary/10 leading-none select-none tracking-tighter">VS</div>
                </div>

                <div className="flex flex-col items-center gap-8 relative z-10 flex-1">
                  <div className="w-40 h-40 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center p-8 border-4 border-white transition-all hover:scale-105">
                    {!setup.is_home ? (
                      mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-16 h-16 text-primary opacity-20" />
                    ) : (
                      setup.match_type === 'internal_scrimmage'
                        ? (mainClub?.logo_url ? <img src={mainClub.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-16 h-16 text-primary opacity-20" />)
                        : (opponentClubs.find(c => c.id === setup.opponent_id)?.logo_url ? <img src={opponentClubs.find(c => c.id === setup.opponent_id)?.logo_url} className="w-full h-full object-contain" /> : <Target className="w-16 h-16 text-muted-foreground opacity-20" />)
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-black text-2xl uppercase tracking-tighter italic">{!setup.is_home ? (mainClub?.club_name || 'My Club') : (setup.match_type === 'internal_scrimmage' ? (setup.internal_opposition_type === 'intra_squad' ? 'Opposition Interne (Intra-squad)' : `Interne (${setup.internal_target_category})`) : getOpponentName(setup.opponent_id))}</p>
                    <Badge className="mt-4 bg-slate-900 text-white border-white/20 font-black uppercase text-[10px] px-6 py-2 rounded-xl">EXTÉRIEUR</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-secondary/20 rounded-[3rem] p-10 space-y-8 border border-secondary/50 shadow-inner">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-4"><Calendar className="w-5 h-5" /> Fiche Logistique</h4>
                  <div className="space-y-4">
                    <InfoRow
                      label="Compétition / Cadre"
                      value={
                        setup.match_type === 'internal_scrimmage'
                          ? `Opposition Interne (${setup.internal_opposition_type === 'intra_squad' ? 'Même effectif' : `Vs ${setup.internal_target_category}`})`
                          : (setup.match_type === 'amical' ? 'Match Amical' : getLeagueName(setup.league_id))
                      }
                    />
                    <InfoRow label="Terrain de Jeu" value={getStadiumName(setup.stadium_id)} />
                    {setup.is_home && setup.pitch_number && (
                      <InfoRow label="Numéro de Terrain" value={`Terrain ${setup.pitch_number}`} />
                    )}
                    <InfoRow label="Rendez-vous" value={`${setup.match_date} @ ${setup.match_time}`} />
                    <InfoRow label="Catégorie Squad" value={setup.category} />
                  </div>
                </div>
                <div className="bg-secondary/20 rounded-[3rem] p-10 space-y-8 border border-secondary/50 shadow-inner">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-4"><Users className="w-5 h-5" /> Fiche Sportive</h4>
                  <div className="space-y-4">
                    <InfoRow label="Format Effectif" value={`${setup.match_format} vs ${setup.match_format}`} />
                    <InfoRow label="Durée Mi-Temps" value={`2 × ${halfDuration}' (${halfDuration * 2} min)`} />
                    <InfoRow label="Système Tactique" value={formation} />
                    <InfoRow label="Titulaires FUS" value={`${startingXI.filter(id => id !== '').length}/${setup.match_format}`} />
                    <InfoRow label="Remplaçants FUS" value={`${substitutes.length} joueurs`} />
                    {surclassedConvoques.length > 0 && (
                      <InfoRow
                        label="Joueurs Surclassés"
                        value={`⭐ ${surclassedConvoques.length} (${surclassedConvoques.map(p => `${p.full_name.split(' ').pop()} [${surclassedTargetMap.get(p.id)?.original_category}]`).join(', ')})`}
                      />
                    )}
                    <InfoRow label="Encadrement Staff" value={`${selectedStaffIds.length} membres`} />
                    <InfoRow label="Terrain" value={setup.is_home && setup.match_type === 'amical' ? getStadiumName(setup.stadium_id) : (setup.is_home ? 'Domicile' : 'Extérieur')} />
                    <InfoRow label="Système Adverse" value={opponentFormation} />
                  </div>
                </div>
              </div>
            </div>
          )}

        <div className="px-12 py-10 border-t bg-secondary/10 flex items-center justify-between mt-auto">
          <Button variant="ghost" onClick={goPrev} className="h-16 px-10 rounded-[2rem] font-black uppercase tracking-widest text-[11px] gap-3 hover:bg-white transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" /> {stepIndex === 0 ? 'Tableau de Bord' : 'Étape Précédente'}
          </Button>
          <div className="flex items-center gap-4">
            {STEPS.map((s, idx) => (
              <div key={s.key} className={`rounded-full transition-all duration-700 ${s.key === currentStep ? 'w-12 h-3 bg-primary shadow-xl shadow-primary/20' : idx < stepIndex ? 'w-3 h-3 bg-primary/40' : 'w-3 h-3 bg-secondary'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {Boolean(initialMatch?.id) && currentStep !== 'validate' && (
              <Button onClick={handleSave} disabled={saving} variant="outline" className="h-16 px-8 rounded-[2rem] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 font-black uppercase tracking-widest text-[11px] gap-3 shadow-lg transition-all active:scale-95">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-emerald-600" />}
                Sauvegarder
              </Button>
            )}
            {currentStep === 'validate' ? (
              <Button onClick={handleSave} disabled={saving} className="h-16 px-14 rounded-[2.2rem] bg-slate-950 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] gap-5 shadow-2xl transition-all active:scale-95 group">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />}
                {saving ? 'Synchronisation...' : initialMatch?.id ? 'Valider l\'Orchestration' : 'Confirmer le Planning'}
              </Button>
            ) : (
              <Button onClick={goNext} className="h-16 px-14 rounded-[2.2rem] bg-primary hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] gap-5 shadow-2xl group transition-all hover:scale-105 active:scale-95">
                Suivant <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* QUICK OPPONENT PLAYERS MODAL */}
      <AnimatePresence>
        {showQuickOpponentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 pb-4 bg-gradient-to-r from-slate-900 to-primary text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tight">Ajouter Joueur(s) Adverse(s)</h3>
                    <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">
                      {getOpponentName(setup.opponent_id)} • Catégorie {setup.category}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickOpponentModal(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs Single vs Batch */}
              <div className="p-4 border-b flex gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setQuickOpponentTab('single')}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${quickOpponentTab === 'single'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  Joueur Unique
                </button>
                <button
                  type="button"
                  onClick={() => setQuickOpponentTab('batch')}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${quickOpponentTab === 'batch'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ajout Multiple / Lot ({quickBatchRows.filter(r => r.full_name.trim()).length || quickBatchRows.length})</span>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {quickOpponentTab === 'single' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                        Nom et Prénom du joueur adverse *
                      </label>
                      <Input
                        value={quickSinglePlayer.full_name || ''}
                        onChange={e => setQuickSinglePlayer(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Ex: Youssef En-Nesyri"
                        className="h-12 rounded-xl text-sm font-bold"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                          Numéro de maillot
                        </label>
                        <Input
                          type="number"
                          value={quickSinglePlayer.jersey_number ?? ''}
                          onChange={e => setQuickSinglePlayer(prev => ({ ...prev, jersey_number: e.target.value }))}
                          placeholder={`Ex: ${rawOpponentSquad.length + 1}`}
                          className="h-12 rounded-xl text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                          Poste
                        </label>
                        <select
                          value={quickSinglePlayer.position || 'CM'}
                          onChange={e => setQuickSinglePlayer(prev => ({ ...prev, position: e.target.value }))}
                          className="w-full h-12 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:border-primary outline-none"
                        >
                          <option value="GK">Gardien de but (GK)</option>
                          <option value="CB">Défenseur central (CB)</option>
                          <option value="LB">Latéral gauche (LB)</option>
                          <option value="RB">Latéral droit (RB)</option>
                          <option value="CDM">Milieu défensif (CDM)</option>
                          <option value="CM">Milieu central (CM)</option>
                          <option value="CAM">Milieu offensif (CAM)</option>
                          <option value="LW">Ailier gauche (LW)</option>
                          <option value="RW">Ailier droit (RW)</option>
                          <option value="SS">Second attaquant (SS)</option>
                          <option value="ST">Avant-centre (ST)</option>
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer border border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={quickSinglePlayer.is_starting}
                        onChange={e => setQuickSinglePlayer(prev => ({ ...prev, is_starting: e.target.checked }))}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-black uppercase text-slate-900 block">Titulariser immédiatement</span>
                        <span className="text-[10px] text-slate-500">Ajoute ce joueur dans le XI/8 titulaire adverse</span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Presets */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                        Préréglages rapides :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleBatchPreset(3, false)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-black uppercase border border-blue-200"
                        >
                          + 3 Remplaçants
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchPreset(5, false)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] font-black uppercase border border-indigo-200"
                        >
                          + 5 Joueurs
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchPreset(setup.match_format, true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-black uppercase border border-emerald-200"
                        >
                          + {setup.match_format} Titulaires
                        </button>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {quickBatchRows.map((row, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-black text-slate-400 w-5 text-center">
                            {index + 1}
                          </span>
                          <Input
                            placeholder="Nom du joueur"
                            value={row.full_name || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setQuickBatchRows(prev => prev.map((r, i) => i === index ? { ...r, full_name: val } : r));
                            }}
                            className="h-9 text-xs font-bold flex-1"
                          />
                          <Input
                            placeholder="#"
                            type="number"
                            value={row.jersey_number ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              setQuickBatchRows(prev => prev.map((r, i) => i === index ? { ...r, jersey_number: val } : r));
                            }}
                            className="h-9 w-16 text-xs font-bold text-center"
                          />
                          <select
                            value={row.position || 'MF'}
                            onChange={e => {
                              const val = e.target.value;
                              setQuickBatchRows(prev => prev.map((r, i) => i === index ? { ...r, position: val } : r));
                            }}
                            className="h-9 px-2 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                          >
                            <option value="GK">Gardien de but</option>
                            <option value="CB">Défenseur central</option>
                            <option value="LB">Latéral gauche</option>
                            <option value="RB">Latéral droit</option>
                            <option value="CDM">Milieu défensif</option>
                            <option value="CM">Milieu central</option>
                            <option value="CAM">Milieu offensif</option>
                            <option value="LW">Ailier gauche</option>
                            <option value="RW">Ailier droit</option>
                            <option value="SS">Second attaquant</option>
                            <option value="ST">Avant-centre</option>
                          </select>
                          <label className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-600 px-1 cursor-pointer" title="Titulaire">
                            <input
                              type="checkbox"
                              checked={row.is_starting}
                              onChange={e => {
                                const chk = e.target.checked;
                                setQuickBatchRows(prev => prev.map((r, i) => i === index ? { ...r, is_starting: chk } : r));
                              }}
                              className="w-3.5 h-3.5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                            />
                            <span>XI</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setQuickBatchRows(prev => prev.filter((_, i) => i !== index))}
                            className="p-1 hover:text-red-500 text-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuickBatchRows(prev => [...prev, { full_name: '', jersey_number: '', position: 'MF', is_starting: false }])}
                      className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-[11px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter une ligne</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowQuickOpponentModal(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Annuler
                </Button>
                {quickOpponentTab === 'single' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={isSubmittingOpponent}
                      onClick={() => handleSaveQuickSingle(true)}
                      className="rounded-xl font-black text-xs uppercase"
                    >
                      {isSubmittingOpponent ? <Loader2 className="w-4 h-4 animate-spin" /> : '+ Enregistrer & Continuer'}
                    </Button>
                    <Button
                      disabled={isSubmittingOpponent}
                      onClick={() => handleSaveQuickSingle(false)}
                      className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase"
                    >
                      {isSubmittingOpponent ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer & Fermer'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    disabled={isSubmittingOpponent}
                    onClick={handleSaveQuickBatch}
                    className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase"
                  >
                    {isSubmittingOpponent ? <Loader2 className="w-4 h-4 animate-spin" /> : `Enregistrer les ${quickBatchRows.filter(r => r.full_name.trim()).length || quickBatchRows.length} joueurs`}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL OPPONENT SQUAD MODAL */}
      {opponentClub && (
        <OpponentSquadModal
          isOpen={showFullOpponentSquadModal}
          onClose={() => setShowFullOpponentSquadModal(false)}
          club={opponentClub}
        />
      )}
    </div>
  );
};

const Pitch: React.FC<{
  positions: { top: string; left: string; label: string }[];
  startingXI?: string[];
  getPlayerById?: (id: string) => any;
  surclassedMap?: Map<string, any>;
  isOpponent?: boolean;
  opponentJerseyNumbers?: string[];
  opponentSquad?: OpponentPlayer[];
  onDropPlayer?: (playerId: string, posIndex: number) => void;
  onClearSlot?: (posIndex: number) => void;
}> = ({ positions, startingXI = [], getPlayerById, surclassedMap, isOpponent, opponentJerseyNumbers, opponentSquad = [], onDropPlayer, onClearSlot }) => {
  const {
    isDragging,
    draggedItem,
    dragPosition,
    longPressProgress,
    pitchRef,
    isTouchDevice,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useTouchDragAndDrop({
    onDrop: (draggedId, targetIndex) => {
      if (onDropPlayer) onDropPlayer(draggedId, targetIndex);
    },
    longPressDuration: 600,
  });

  return (
    <div
      ref={pitchRef}
      className="w-full max-w-[500px] bg-[#3fa375] aspect-[0.66] rounded-[4rem] shadow-2xl relative overflow-hidden ring-[16px] ring-white/5 border-[12px] border-[#52b788] group/pitch touch-none select-none"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #52b788 0, #52b788 40px, #40916c 40px, #40916c 80px)' }} />
      <div className="absolute inset-6 border-[3px] border-white/50 rounded-[3rem] pointer-events-none" />
      <div className="absolute inset-x-6 top-1/2 -translate-y-px border-t-[3px] border-white/50 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-[3px] border-white/50 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white/50 rounded-full" />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[55%] h-[18%] border-b-[3px] border-x-[3px] border-white/50 pointer-events-none" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[55%] h-[18%] border-t-[3px] border-x-[3px] border-white/50 pointer-events-none" />

      {/* Touch instruction hint */}
      {isTouchDevice && !isDragging && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase backdrop-blur-sm z-40 pointer-events-none animate-pulse">
          👆 Maintenez pour déplacer
        </div>
      )}

      {/* Drag preview following finger */}
      {isDragging && draggedItem && dragPosition && getPlayerById && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: dragPosition.x - 32,
            top: dragPosition.y - 32,
          }}
        >
          <div className={`w-16 h-16 rounded-full border-[4px] border-white shadow-2xl flex items-center justify-center ring-4 ring-white/30 ${isOpponent ? 'bg-slate-950' : 'bg-primary'}`}>
            {(() => {
              const p = getPlayerById(draggedItem.id);
              return p ? (
                <img
                  src={(p.photo_url && p.photo_url !== 'null') ? p.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=200`}
                  className="w-full h-full rounded-full object-cover p-0.5"
                />
              ) : null;
            })()}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {positions.map((pos, idx) => {
          const p = getPlayerById ? (startingXI[idx] ? getPlayerById(startingXI[idx]) : null) : null;
          const surclass = (p && !isOpponent) ? surclassedMap?.get(p.id) : null;
          const displayTop = isOpponent ? (100 - parseFloat(pos.top)) + '%' : pos.top;
          const displayLeft = isOpponent ? (100 - parseFloat(pos.left)) + '%' : pos.left;
          const oppJersey = opponentJerseyNumbers?.[idx] || '';
          const oppPlayer = (isOpponent && oppJersey)
            ? opponentSquad.find(op => String(op.jersey_number) === String(oppJersey) || op.id === oppJersey)
            : null;
          const oppName = oppPlayer ? oppPlayer.full_name : (oppJersey ? `Joueur #${oppJersey}` : pos.label);
          const oppAvatar = (isOpponent && oppJersey)
            ? ((oppPlayer?.photo_url && oppPlayer.photo_url !== 'null')
              ? oppPlayer.photo_url
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(oppName)}&background=020617&color=fff&size=200`)
            : null;

          const isBeingDragged = draggedItem?.id === (p?.id || '');

          return (
            <motion.div
              key={idx}
              data-pitch-slot={idx}
              initial={{ scale: 0, x: "-50%", y: "-50%" }}
              animate={{
                scale: isBeingDragged ? 0.3 : 1,
                x: "-50%",
                y: "-50%",
                opacity: isBeingDragged ? 0.3 : 1
              }}
              layout
              className="absolute flex flex-col items-center gap-2 z-30"
              style={{ top: displayTop, left: displayLeft }}
              onDragOver={(e) => {
                if (onDropPlayer) {
                  e.preventDefault();
                  e.currentTarget.classList.add('scale-110');
                }
              }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
              onDrop={(e) => {
                if (onDropPlayer) {
                  e.preventDefault();
                  e.currentTarget.classList.remove('scale-110');
                  const droppedId = (e as any).dataTransfer?.getData(isOpponent ? 'oppIdx' : 'playerId');
                  if (droppedId) onDropPlayer(droppedId, idx);
                }
              }}
            >
              {/* Long press progress ring */}
              {isTouchDevice && p && !isOpponent && longPressProgress > 0 && !isDragging && (
                <div className="absolute inset-0 -m-1 pointer-events-none">
                  <svg className="w-[calc(100%+8px)] h-[calc(100%+8px)] -m-1 rotate-[-90deg]">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="46%"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeDasharray={`${longPressProgress * 283} 283`}
                      className="transition-all duration-75"
                    />
                  </svg>
                </div>
              )}

              <div className="relative group">
                <motion.div
                  draggable={(!!p && !isOpponent) || (isOpponent && !!oppJersey)}
                  onDragStart={(e) => {
                    if (!isOpponent && p) (e as any).dataTransfer?.setData('playerId', p.id);
                    if (isOpponent && oppJersey) (e as any).dataTransfer?.setData('oppIdx', idx.toString());
                  }}
                  onTouchStart={(e) => {
                    if (p && !isOpponent && isTouchDevice) {
                      handleTouchStart(e, { id: p.id, type: 'player' }, idx);
                    }
                  }}
                  whileHover={(p || isOpponent) ? { scale: 1.1, rotate: 5, y: -5 } : { scale: 1.05 }}
                  className={`w-16 h-16 rounded-full border-[4px] flex items-center justify-center shadow-2xl transition-all duration-300 relative
                ${p ? `bg-gradient-to-br ${getPositionColor(p.position)} border-white ring-4 ring-white/30` : (isOpponent && oppJersey) ? 'bg-slate-950 border-white/60' : 'bg-white/10 border-white/20 hover:bg-white/30 hover:border-white/50 cursor-crosshair'}`}
                >
                  {p ? (
                    <>
                      <img
                        src={(p.photo_url && p.photo_url !== 'null') ? p.photo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=200`}
                        className="w-full h-full rounded-full object-cover p-0.5"
                      />
                      <Badge className="absolute -top-1 -right-1 bg-black text-white h-6 w-6 rounded-full flex items-center justify-center p-0 border-2 border-white text-[10px] font-black">{p.jersey_number}</Badge>
                      {surclass && (() => {
                        const isPitchSousClass = isLowerCategory(surclass.original_category, surclass.target_category);
                        return (
                          <span
                            title={isPitchSousClass ? `Sous-classé depuis ${surclass.original_category}` : `Surclassé depuis ${surclass.original_category}`}
                            className={`absolute -top-1 -left-1 h-5 w-5 rounded-full flex items-center justify-center p-0 border-2 border-white text-[9px] font-black shadow-md z-20 cursor-help ${isPitchSousClass ? 'bg-sky-500 text-white' : 'bg-amber-400 text-slate-950'
                              }`}
                          >
                            {isPitchSousClass ? '⬇️' : '⭐'}
                          </span>
                        );
                      })()}
                    </>
                  ) : (isOpponent && oppJersey) ? (
                    <>
                      <img
                        src={oppAvatar!}
                        className="w-full h-full rounded-full object-cover p-0.5 shadow-md"
                        alt=""
                      />
                      <Badge className="absolute -top-1 -right-1 bg-slate-900 text-white h-6 w-6 rounded-full flex items-center justify-center p-0 border-2 border-white text-[10px] font-black shadow-md">{oppJersey}</Badge>
                    </>
                  ) : (
                    <span className="text-[10px] font-black text-white/40">{pos.label}</span>
                  )}
                </motion.div>

                {/* Delete button for both home team and opponent */}
                {(p || (isOpponent && oppJersey)) && (
                  <button
                    onClick={() => onClearSlot?.(idx)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-600 active:scale-90"
                    title="Retirer du terrain (double clic)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {(() => {
                const isPitchSousClass = surclass ? isLowerCategory(surclass.original_category, surclass.target_category) : false;
                return (
                  <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase backdrop-blur-md border shadow-lg transition-all
                ${p ? 'bg-black/80 text-white border-white/20 scale-105 max-w-[130px]' : (isOpponent && oppJersey) ? 'bg-slate-900/90 text-white border-white/20 scale-105 max-w-[130px]' : 'bg-white/10 text-white/30 border-white/10 max-w-[90px]'}`}
                    title={p ? `${p.full_name}${surclass ? ` (${isPitchSousClass ? '⬇️ Sous-classé' : '⭐ Surclassé'} depuis ${surclass.original_category})` : ''}` : (isOpponent && oppJersey) ? oppName : pos.label}>
                    <div className="flex items-center gap-1 justify-center truncate">
                      {surclass && (
                        <span className={`text-[9px] shrink-0 ${isPitchSousClass ? 'text-sky-300' : 'text-amber-400'}`}>
                          {isPitchSousClass ? '⬇️' : '⭐'}
                        </span>
                      )}
                      <span className="truncate">{p ? (p.full_name.length > 10 ? p.full_name.substring(0, 10) + '…' : p.full_name) : (isOpponent && oppJersey) ? (oppName.length > 13 ? oppName.substring(0, 13) + '…' : oppName) : pos.label}</span>
                      {surclass && (
                        <span className={`text-[7.5px] font-bold shrink-0 ${isPitchSousClass ? 'text-sky-300' : 'text-amber-300'}`}>
                          ({surclass.original_category})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-8">
    <div className="w-18 h-18 rounded-[2rem] bg-primary/10 flex items-center justify-center shadow-inner shrink-0 border border-primary/5">{icon}</div>
    <div>
      <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-none">{title}</h3>
      <p className="text-sm text-muted-foreground mt-3 font-medium opacity-60">{subtitle}</p>
    </div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-secondary/50 pb-3">
    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</span>
    <span className="text-sm font-black truncate max-w-[200px] italic">{value}</span>
  </div>
);

export default ScheduleMatchWizard;
