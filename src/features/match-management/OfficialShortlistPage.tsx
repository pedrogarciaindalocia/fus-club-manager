import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Users,
  X,
  ShieldCheck,
  Search,
  Save,
  FolderOpen,
  Plus,
  Trash2,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePlayers } from '../../hooks/usePlayers';
import { normalizeAgeCategory } from '../../constants';
import { getPositionDetails } from '../../constants/positions';
import ScoutasticDenseSlotCard from '../../components/ScoutasticDenseSlotCard';
import PlayerMentionModal from './components/PlayerMentionModal';
import { usePlayerMentions } from '../../hooks/usePlayerMentions';
import { playerMentionService } from '../../services/playerMentionService';
import {
  filterOfficialShortlistsByCategory,
  getEligibleSourceCategories,
  getMentionMeta,
  isPlayerEligibleForRightList,
  isShortlistSurclassement,
  ORDERED_CLUB_CATEGORIES,
  type OfficialSavedShortlistConfig,
} from '../../utils/playerMentionsHelper';

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
  const { players: squadPlayers = [] } = usePlayers();
  const {
    mentionsByPlayerId,
    latestMentionByPlayerId,
    upsertMention,
    isSavingMention,
    deleteMention,
  } = usePlayerMentions();

  const [selectedFormationKey, setSelectedFormationKey] = useState<string>('4-3-3');
  const [pitchHeight, setPitchHeight] = useState<'standard' | 'tall' | 'extra'>('tall');
  // Filtre horizontal = catégorie cible à constituer (ex: U16)
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  // Liste déroulante droite = catégorie native des joueurs à piocher (ex: U16, U15, U14, U13...)
  const [rightNativeCategoryFilter, setRightNativeCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Joueur cliqué pour le popup Mentions datées + Courbe d'évolution
  const [selectedPlayerForMention, setSelectedPlayerForMention] = useState<any | null>(null);
  const [shortlistedPlayerIds, setShortlistedPlayerIds] = useState<string[]>([]);

  // Drag and drop custom slot assignments (playerId -> slotIdx)
  const [customSlotAssignments, setCustomSlotAssignments] = useState<Record<string, number>>({});
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  // Saved official shortlists management
  const [savedShortlists, setSavedShortlists] = useState<OfficialSavedShortlistConfig[]>([]);
  const [selectedShortlistId, setSelectedShortlistId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [saveCategory, setSaveCategory] = useState<string>('U16');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch saved official shortlists on mount
  useEffect(() => {
    playerMentionService.getOfficialShortlists().then(res => {
      if (Array.isArray(res)) setSavedShortlists(res);
    });
  }, []);

  const availableShortlists = useMemo(
    () => filterOfficialShortlistsByCategory(savedShortlists, categoryFilter),
    [savedShortlists, categoryFilter]
  );

  // Catégories proposées dans la liste déroulante à droite selon la catégorie cible horizontale
  const eligibleSourceCategories = useMemo(
    () => getEligibleSourceCategories(categoryFilter, ORDERED_CLUB_CATEGORIES),
    [categoryFilter]
  );

  const handleSelectTargetCategory = (nextCat: string) => {
    setCategoryFilter(nextCat);
    setRightNativeCategoryFilter(nextCat === 'ALL' ? 'ALL' : nextCat);
    if (selectedShortlistId) {
      const currentSl = savedShortlists.find(s => s.id === selectedShortlistId);
      if (
        nextCat !== 'ALL' &&
        currentSl &&
        normalizeAgeCategory(currentSl.category_filter || '') !== normalizeAgeCategory(nextCat)
      ) {
        setSelectedShortlistId('');
      }
    }
  };

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
    if (sl.category_filter && sl.category_filter !== 'ALL') {
      const normCat = normalizeAgeCategory(sl.category_filter);
      setCategoryFilter(normCat);
      setRightNativeCategoryFilter(normCat);
    }
    if (sl.custom_slot_order && typeof sl.custom_slot_order === 'object') {
      setCustomSlotAssignments(sl.custom_slot_order as Record<string, number>);
    }
  };

  const handleOpenSaveModal = () => {
    const defaultCat = categoryFilter !== 'ALL' ? normalizeAgeCategory(categoryFilter) : 'U16';
    setSaveCategory(defaultCat);
    if (!saveTitle.trim()) {
      setSaveTitle(`Shortlist ${defaultCat} ${selectedFormationKey}`);
    }
    setShowSaveModal(true);
  };

  const handleSaveShortlist = async () => {
    if (!saveTitle.trim() || !saveCategory) return;
    setIsSaving(true);
    try {
      const targetCat = normalizeAgeCategory(saveCategory);
      const newConfig = await playerMentionService.saveOfficialShortlist({
        title: saveTitle.trim(),
        category_filter: targetCat,
        formation_key: selectedFormationKey,
        candidate_ids: shortlistedPlayerIds,
        custom_slot_order: customSlotAssignments,
        manager_notes: `Shortlist officielle ${targetCat} (${selectedFormationKey}) enregistrée le ${new Date().toLocaleDateString('fr-FR')}`,
      });
      const updated = await playerMentionService.getOfficialShortlists();
      setSavedShortlists(updated);
      setSelectedShortlistId(newConfig.id);
      setCategoryFilter(targetCat);
      setRightNativeCategoryFilter(targetCat);
      setShowSaveModal(false);
      setSaveTitle('');
      toast.success(`Shortlist « ${newConfig.title} » enregistrée pour la catégorie ${targetCat}`);
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      toast.error(`Erreur lors de la sauvegarde : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedShortlist = async () => {
    if (!selectedShortlistId) return;
    const sl = savedShortlists.find(s => s.id === selectedShortlistId);
    if (!sl) return;
    if (!confirm(`Supprimer définitivement la shortlist « ${sl.title} » ?`)) return;
    await playerMentionService.deleteOfficialShortlist(selectedShortlistId);
    const updated = await playerMentionService.getOfficialShortlists();
    setSavedShortlists(updated);
    setSelectedShortlistId('');
    setShortlistedPlayerIds([]);
    setCustomSlotAssignments({});
    toast.success(`Shortlist « ${sl.title} » supprimée`);
  };

  const handleDropPlayerToSlot = (playerId: string, targetSlotIdx: number) => {
    setShortlistedPlayerIds(prev => (prev.includes(playerId) ? prev : [...prev, playerId]));
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
    setShortlistedPlayerIds(prev => (prev.includes(playerId) ? prev : [...prev, playerId]));
    const player = unifiedPlayers.find(item => item.id === playerId);
    if (!player) return;
    const details = getPositionDetails(player.position || player.roleCode);
    const code = details.code;
    const desiredLabels: Record<string, string[]> = {
      GK: ['GB'], LB: ['DG'], RB: ['DD'], CB: ['DCG', 'DCD'], CDM: ['MDC'],
      CM: ['MCG', 'MCD', 'MC'], CAM: ['MOC', 'MCO', 'MCG', 'MCD'],
      LW: ['AG', 'MG'], RW: ['AD', 'MD'], ST: ['BU', 'BUG', 'BUD'], SS: ['BU', 'BUG', 'BUD'],
    };
    const labels = desiredLabels[code] || [];
    const targetSlotIdx = activeFormation.slots.findIndex(
      slot => slot.roleCode === code || labels.includes(slot.label)
    );
    if (targetSlotIdx >= 0) {
      setCustomSlotAssignments(prev => ({ ...prev, [playerId]: targetSlotIdx }));
    }
  };

  const handleSelectPlayer = (player: any) => {
    setSelectedPlayerForMention(player);
  };

  const pitchHeightClass = {
    standard: 'min-h-[1050px] lg:min-h-[1180px]',
    tall: 'min-h-[1280px] lg:min-h-[1420px]',
    extra: 'min-h-[1500px] lg:min-h-[1680px]',
  }[pitchHeight];

  const activeFormation = FORMATIONS[selectedFormationKey] || FORMATIONS['4-3-3'];

  // Joueurs inscrits dans l'effectif officiel du club enrichis de leur dernière mention datée
  const unifiedPlayers = useMemo(() => {
    return squadPlayers.map(p => {
      const latestMention = latestMentionByPlayerId.get(p.id) || null;
      const mentionMeta = latestMention ? getMentionMeta(latestMention.mention) : null;
      const nativeCat = normalizeAgeCategory(p.category || 'PRO') || 'PRO';

      return {
        id: p.id,
        full_name: p.full_name,
        short_name: p.full_name
          .split(' ')
          .map((n: string, i: number) => (i === 0 ? n[0] + '.' : n))
          .join(' '),
        initials: p.full_name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        position: p.position || 'CM',
        roleCode: normalizeRole(p.position),
        age_category: nativeCat,
        jersey_number: p.jersey_number,
        photo_url: p.photo_url,
        team_name: 'FUS Rabat Officiel',
        latest_mention: latestMention,
        mention_meta: mentionMeta,
        mention_score: mentionMeta ? mentionMeta.score : null,
      };
    });
  }, [squadPlayers, latestMentionByPlayerId]);

  const matchesSearchQuery = (p: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.position || '').toLowerCase().includes(q)
    );
  };

  // Joueurs actuellement placés sur le terrain (inclut les surclassés de catégories inférieures ajoutés à la shortlist)
  const shortlistedPlayers = useMemo(() => {
    return unifiedPlayers
      .filter(player => shortlistedPlayerIds.includes(player.id) && matchesSearchQuery(player))
      .sort((a, b) => (b.mention_score ?? -1) - (a.mention_score ?? -1));
  }, [unifiedPlayers, shortlistedPlayerIds, searchQuery]);

  // Liste à droite : joueurs disponibles filtrés selon la catégorie cible (>=) et la catégorie native choisie dans le dropdown
  const availablePlayers = useMemo(() => {
    return unifiedPlayers
      .filter(player => {
        if (shortlistedPlayerIds.includes(player.id)) return false;
        if (!isPlayerEligibleForRightList(player.age_category, categoryFilter, rightNativeCategoryFilter)) {
          return false;
        }
        return matchesSearchQuery(player);
      })
      .sort((a, b) => {
        const scoreDiff = (b.mention_score ?? -1) - (a.mention_score ?? -1);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
  }, [unifiedPlayers, shortlistedPlayerIds, categoryFilter, rightNativeCategoryFilter, searchQuery]);

  // Compteurs par catégorie native pour la liste déroulante de droite
  const nativeCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    unifiedPlayers.forEach(p => {
      if (shortlistedPlayerIds.includes(p.id)) return;
      const cat = normalizeAgeCategory(p.age_category);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    return counts;
  }, [unifiedPlayers, shortlistedPlayerIds]);

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
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-emerald-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Trophy className="w-4 h-4" />
            <span>SHORTLIST OFFICIELLE — PLACEMENT TACTIQUE & MENTIONS</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-slate-100">
              {categoryFilter === 'ALL'
                ? 'Terrain Tactique'
                : `Shortlist Cible ${categoryFilter}`}
            </h1>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-3 py-0.5 rounded-full text-xs border border-emerald-500/30">
              {shortlistedPlayerIds.length} joueur{shortlistedPlayerIds.length > 1 ? 's' : ''} sur la shortlist
            </span>
          </div>
          <p className="text-slate-300 text-xs max-w-2xl">
            Choisissez une catégorie cible, piochez des joueurs natifs ou de catégories inférieures à droite, puis cliquez sur un joueur pour enregistrer sa mention par date.
          </p>
        </div>

        {/* Height, System & Shortlist Controls */}
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
                className={`px-2.5 py-1 rounded-lg font-bold transition ${selectedFormationKey === fmt ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
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
                className="bg-transparent text-white font-bold text-xs focus:outline-hidden cursor-pointer max-w-[230px]"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  {availableShortlists.length > 0
                    ? `📂 Shortlists ${categoryFilter === 'ALL' ? '' : categoryFilter} (${availableShortlists.length})...`
                    : `Aucune shortlist${categoryFilter === 'ALL' ? '' : ` (${categoryFilter})`}`}
                </option>
                {availableShortlists.map(sl => (
                  <option key={sl.id} value={sl.id} className="bg-slate-900 text-white">
                    {sl.title} [{sl.category_filter || 'ALL'} · {sl.formation_key || '4-3-3'}]
                  </option>
                ))}
              </select>
            </div>

            {selectedShortlistId && (
              <button
                type="button"
                onClick={handleDeleteSavedShortlist}
                title="Supprimer cette shortlist enregistrée"
                className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:border-red-500 hover:bg-red-600/20 hover:text-red-300 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenSaveModal}
              className="px-3.5 py-1.5 rounded-xl font-black text-xs bg-red-600 hover:bg-red-700 text-white shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer sous...</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Row : Filtre Catégorie horizontal + Recherche */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          <span className="font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Catégorie à former :
          </span>
          {AGE_CATEGORIES.map(cat => {
            const isSelected = categoryFilter === cat.id;
            const count =
              cat.id === 'ALL'
                ? unifiedPlayers.length
                : unifiedPlayers.filter(p => normalizeAgeCategory(p.age_category) === cat.id).length;
            const mentionCount =
              cat.id === 'ALL'
                ? unifiedPlayers.filter(p => Boolean(p.latest_mention)).length
                : unifiedPlayers.filter(
                  p => normalizeAgeCategory(p.age_category) === cat.id && Boolean(p.latest_mention)
                ).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectTargetCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${isSelected
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  {count}
                </span>
                {mentionCount > 0 && (
                  <span
                    className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-emerald-500 text-white flex items-center gap-0.5 shadow-xs"
                    title={`${mentionCount} joueur(s) avec mention`}
                  >
                    {mentionCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher joueur / poste..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs w-52 focus:w-64 transition-all outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULL WIDTH TACTICAL FOOTBALL PITCH                                         */}
      {/* ========================================================================= */}
      <div className="w-full -mx-2 px-2 sm:mx-0 sm:px-0">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row gap-3">
          <div className="min-w-0 flex-1 overflow-auto no-scrollbar">
            <div
              className={`w-full min-w-[620px] ${pitchHeightClass} rounded-2xl sm:rounded-3xl border border-emerald-800/40 relative overflow-hidden shadow-2xl transition-all duration-300`}
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
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/40 -translate-y-1/2"></div>
                <div className="absolute left-1/2 top-1/2 w-48 h-48 border-2 border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-36 border-2 border-t-0 border-white/40"></div>
                <div className="absolute top-36 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-t-0 border-white/40 rounded-b-full"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-36 border-2 border-b-0 border-white/40"></div>
                <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-b-0 border-white/40 rounded-t-full"></div>
              </div>

              {/* Position Slots with Placed Players */}
              {activeFormation.slots.map((slot, slotIdx) => {
                const slotPlayers = playersBySlotIndex.get(slotIdx) || [];

                return (
                  <div
                    key={slot.roleCode + slot.label}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={e => {
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
                        onDragOver={e => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={e => {
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
                          badgeLabel: p.mention_meta ? p.mention_meta.shortLabel : null,
                          badgeClassName: p.mention_meta ? p.mention_meta.badgeClass : undefined,
                          clubOrTeam: isShortlistSurclassement(p.age_category, categoryFilter)
                            ? `${p.age_category} → ${categoryFilter}`
                            : p.age_category,
                        }))}
                        onSelectPlayer={handleSelectPlayer}
                        onDragStartPlayer={p => setDraggedPlayerId(p.id)}
                        onDragEndPlayer={() => setDraggedPlayerId(null)}
                        onRemovePlayer={handleRemovePlayerFromShortlist}
                      />
                    ) : (
                      /* File de joueurs l'un après l'autre en ligne si <= 3 joueurs */
                      <div className="flex items-center gap-2.5 bg-black/45 backdrop-blur-md p-2 rounded-2xl border border-white/25 shadow-2xl">
                        {slotPlayers.map(player => {
                          const isSurclasse = isShortlistSurclassement(player.age_category, categoryFilter);

                          return (
                            <div
                              key={player.id}
                              draggable={true}
                              onDragStart={e => {
                                e.dataTransfer.setData('text/plain', player.id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedPlayerId(player.id);
                              }}
                              onDragEnd={() => setDraggedPlayerId(null)}
                              onClick={() => handleSelectPlayer(player)}
                              className={`group relative cursor-pointer flex flex-col items-center transition-all hover:scale-105 active:scale-95 ${draggedPlayerId === player.id ? 'opacity-50 scale-95' : ''
                                }`}
                            >
                              {/* Player Circle Avatar + Mention Badge wrapper */}
                              <div className="relative">
                                <button
                                  type="button"
                                  aria-label={`Retirer ${player.full_name} du terrain`}
                                  onClick={event => {
                                    event.stopPropagation();
                                    handleRemovePlayerFromShortlist(player.id);
                                  }}
                                  className="absolute -right-2 -top-2 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-slate-800 text-white shadow-lg transition hover:scale-110 hover:bg-red-600"
                                  title="Retirer du terrain"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>

                                {isSurclasse && (
                                  <span
                                    title={`Surclassement shortlist : natif ${player.age_category} dans ${categoryFilter}`}
                                    className="absolute -top-1.5 -left-1.5 z-30 rounded-full border border-white bg-amber-400 px-1.5 py-0.5 text-[8px] font-black text-slate-950 shadow-md"
                                  >
                                    {player.age_category}
                                  </span>
                                )}

                                <div
                                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-black text-xs text-white shadow-xl border-2 transition-all overflow-hidden ${player.mention_meta
                                      ? 'bg-slate-950 border-emerald-400 ring-2 ring-white/30'
                                      : 'bg-slate-950 border-white/40'
                                    }`}
                                >
                                  {player.photo_url ? (
                                    <img
                                      src={player.photo_url}
                                      alt={player.full_name}
                                      className="w-full h-full object-cover"
                                      onError={event => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = '/assets/avatar.svg';
                                      }}
                                    />
                                  ) : (
                                    <span className="text-sm font-black">{player.initials}</span>
                                  )}
                                </div>

                                {/* Mention badge */}
                                <div
                                  className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9.5px] font-black shadow-lg ${player.mention_meta
                                      ? player.mention_meta.badgeClass
                                      : 'bg-slate-800 text-slate-300 border-slate-500'
                                    }`}
                                >
                                  {player.mention_meta ? player.mention_meta.shortLabel : 'Mention ?'}
                                </div>
                              </div>

                              {/* Name badge */}
                              <div className="mt-2.5 text-center">
                                <span className="text-[10px] font-bold text-white bg-black/75 px-2 py-0.5 rounded-md truncate max-w-[96px] block shadow-xs">
                                  {player.short_name}
                                </span>
                                {isSurclasse && (
                                  <span className="text-[7.5px] font-black text-amber-300 bg-amber-950/90 px-1.5 rounded-sm mt-0.5 inline-block border border-amber-500/40">
                                    {player.age_category} → {categoryFilter}
                                  </span>
                                )}
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

          {/* Liste à droite : choix de catégorie native (<= catégorie cible) + joueurs disponibles */}
          <aside className="flex sticky top-3 h-[min(78dvh,1040px)] min-h-[540px] w-full xl:w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-white shadow-xl">
            <div className="border-b border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-black">Joueurs à ajouter</h2>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black text-emerald-300">
                  {availablePlayers.length}
                </span>
              </div>

              {/* Liste déroulante catégorie native des joueurs */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {categoryFilter === 'ALL'
                    ? 'Catégorie native des joueurs'
                    : `Catégorie native (éligibles pour ${categoryFilter})`}
                </label>
                <select
                  value={rightNativeCategoryFilter}
                  onChange={e => setRightNativeCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white outline-none transition focus:border-emerald-500 cursor-pointer"
                >
                  {categoryFilter === 'ALL' ? (
                    <option value="ALL">Toutes les catégories</option>
                  ) : (
                    <option value="ALL_ELIGIBLE">
                      Toutes éligibles ({categoryFilter} et inférieures)
                    </option>
                  )}
                  {eligibleSourceCategories.map(srcCat => {
                    const isLower =
                      categoryFilter !== 'ALL' &&
                      isShortlistSurclassement(srcCat, categoryFilter);
                    const count = nativeCategoryCounts.get(srcCat) || 0;
                    return (
                      <option key={srcCat} value={srcCat}>
                        {srcCat}
                        {isLower ? ` — Surclassement → ${categoryFilter}` : ' (Natifs)'} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
              {availablePlayers.map(player => {
                const isSurclasse = isShortlistSurclassement(player.age_category, categoryFilter);
                return (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={event => {
                      event.dataTransfer.setData('text/plain', player.id);
                      event.dataTransfer.effectAllowed = 'move';
                      setDraggedPlayerId(player.id);
                    }}
                    onDragEnd={() => setDraggedPlayerId(null)}
                    className={`flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/80 p-2.5 transition-all duration-200 ${draggedPlayerId === player.id ? 'opacity-50' : 'hover:border-emerald-500/50'
                      }`}
                  >
                    <img
                      src={player.photo_url || '/assets/avatar.svg'}
                      alt={player.full_name}
                      className="h-11 w-11 shrink-0 rounded-full border border-white/15 object-cover"
                      onError={event => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/assets/avatar.svg';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSelectPlayer(player)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span className="block truncate text-xs font-black">{player.full_name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-slate-400">
                        <span>{player.position} · {player.age_category}</span>
                        {isSurclasse && (
                          <span className="rounded-sm bg-amber-500/20 px-1 py-0.2 text-[9px] font-black text-amber-300">
                            → {categoryFilter}
                          </span>
                        )}
                      </span>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${player.mention_meta
                            ? player.mention_meta.badgeClass
                            : 'border-slate-600 bg-slate-700 text-slate-300'
                          }`}
                      >
                        <Award className="h-2.5 w-2.5" />
                        {player.mention_meta ? player.mention_meta.label : 'Sans mention'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPlayerToShortlist(player.id)}
                      className="shrink-0 rounded-lg bg-red-600 px-2.5 py-2 text-[10px] font-black text-white transition hover:bg-red-500 cursor-pointer"
                    >
                      <Plus className="mr-1 inline h-3 w-3" />Shortlister
                    </button>
                  </div>
                );
              })}
              {availablePlayers.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-xs text-slate-400">
                  Aucun joueur disponible dans cette sélection.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP MENTIONS DATÉES + COURBE D'ÉVOLUTION                                */}
      {/* ========================================================================= */}
      {selectedPlayerForMention && (
        <PlayerMentionModal
          player={selectedPlayerForMention}
          targetCategory={categoryFilter}
          mentions={mentionsByPlayerId.get(selectedPlayerForMention.id) || []}
          isSaving={isSavingMention}
          onSave={upsertMention}
          onDelete={deleteMention}
          onClose={() => setSelectedPlayerForMention(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL ENREGISTRER SOUS... (SHORTLIST LIÉE À LA CATÉGORIE)                 */}
      {/* ========================================================================= */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-500 font-black text-sm uppercase tracking-wide">
                <Save className="w-4 h-4" />
                <span>Enregistrer la Shortlist</span>
              </div>
              <button
                type="button"
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
                  placeholder="Ex: Shortlist U16 avec surclassés U15"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Catégorie liée à cette shortlist
                </label>
                <select
                  value={saveCategory}
                  onChange={e => setSaveCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden cursor-pointer"
                >
                  {ORDERED_CLUB_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Système tactique :</span>
                  <span className="font-bold text-slate-800 dark:text-white">{selectedFormationKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Catégorie cible :</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{saveCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Joueurs positionnés :</span>
                  <span className="font-bold text-red-500">{shortlistedPlayerIds.length} joueurs</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveShortlist}
                disabled={!saveTitle.trim() || !saveCategory || isSaving}
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
