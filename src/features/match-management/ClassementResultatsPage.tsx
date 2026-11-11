import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  AlertTriangle,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Edit2,
  FileCode,
  Filter,
  Info,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FRMF_MATCHES_MIGRATION_SQL,
  frmfDataService,
  type FRMFDatabaseStatus,
  type FRMFDataset,
  type FRMFMatch,
  type FRMFStandingTeam,
} from '../../services/frmfDataService';
import { useClubData } from '../../hooks/useClubData';
import { getClubLogoUrl } from '../../utils/clubLogos';
import { FrmfHtmlImportModal } from './components/FrmfHtmlImportModal';
import { FrmfMatchModal } from './components/FrmfCrudModals';
import { MatchdayTimelineControl } from './components/MatchdayTimelineControl';
import type { TieBreakerRuleApplied } from '../../utils/standingsRankingEngine';

interface IndexedMatch extends FRMFMatch {
  _rawIndex: number;
}

const FEATURED_PILL_CATEGORIES = ['U21', 'U18', 'U17', 'U16', 'U15', 'U14', 'U13'];

function getTieRuleBadgeLabel(rule?: TieBreakerRuleApplied): string | null {
  switch (rule) {
    case 'h2h':
      return 'Conf. directes';
    case 'h2h_subtie':
      return 'Conf. directes (phase retour)';
    case 'general_after_h2h':
      return 'Diff. gén. après H2H';
    case 'provisional_gd':
      return 'Diff. générale (prov.)';
    case 'provisional_gf':
      return 'Meilleure attaque (prov.)';
    default:
      return null;
  }
}

export const ClassementResultatsPage: React.FC = () => {
  const { opponentClubs, mainClub } = useClubData();
  const [dataset, setDataset] = useState<FRMFDataset>(() => frmfDataService.getDataset());
  const categories = useMemo(() => frmfDataService.getCategories(), [dataset]);

  const [selectedCategory, setSelectedCategory] = useState<string>('U21');
  const availableGroups = useMemo(
    () => frmfDataService.getGroups(selectedCategory),
    [selectedCategory, dataset]
  );
  const [selectedGroup, setSelectedGroup] = useState<string>(
    () => availableGroups[0] || 'Poule Unique'
  );

  React.useEffect(() => {
    if (!availableGroups.includes(selectedGroup)) {
      setSelectedGroup(availableGroups[0] || 'Poule Unique');
    }
  }, [availableGroups, selectedGroup]);

  const [activeTab, setActiveTab] = useState<'standings' | 'results'>('standings');
  const [standingsDayFilter, setStandingsDayFilter] = useState<string>('all');
  const [isStandingsPlaying, setIsStandingsPlaying] = useState<boolean>(false);
  const standingsPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalDays = useMemo(
    () => frmfDataService.getTotalDays(selectedCategory, selectedGroup),
    [selectedCategory, selectedGroup, dataset]
  );
  const finishedStandingsDays = useMemo(
    () => frmfDataService.getFinishedMatchDays(selectedCategory, selectedGroup, dataset),
    [selectedCategory, selectedGroup, dataset]
  );
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');

  const [clubSearch, setClubSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'finished' | 'scheduled'>('all');

  // Modale HTML Résultats par journée uniquement
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);

  // État synchronisation Supabase PostgreSQL (public.frmf_matches)
  const [dbStatus, setDbStatus] = useState<FRMFDatabaseStatus>('idle');
  const [isSyncingDb, setIsSyncingDb] = useState<boolean>(true);
  const [dbErrorMessage, setDbErrorMessage] = useState<string>('');

  const syncWithDatabase = async (showSuccessToast = false) => {
    setIsSyncingDb(true);
    try {
      const res = await frmfDataService.loadFromDatabase();
      setDataset(res.dataset);
      setDbStatus(res.dbStatus);
      setDbErrorMessage(res.errorMessage || '');
      if (showSuccessToast && res.savedToDb) {
        toast.success(`Base de données synchronisée (${res.totalDbRows ?? 0} match(s) FRMF).`);
      } else if (showSuccessToast && res.dbStatus === 'migration_required') {
        toast.warning('Table public.frmf_matches non détectée dans Supabase.');
      }
    } finally {
      setIsSyncingDb(false);
    }
  };

  React.useEffect(() => {
    syncWithDatabase(false);
  }, []);

  // États CRUD Matchs / Résultats
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<IndexedMatch | null>(null);
  const [confirmDeleteMatchKey, setConfirmDeleteMatchKey] = useState<string | null>(null);
  const [confirmClearGroup, setConfirmClearGroup] = useState<boolean>(false);
  const [confirmClearDay, setConfirmClearDay] = useState<number | null>(null);

  const quickPillCategories = useMemo(() => {
    const list = FEATURED_PILL_CATEGORIES.filter((c) => categories.includes(c));
    if (selectedCategory && !list.includes(selectedCategory)) {
      list.unshift(selectedCategory);
    }
    return list;
  }, [categories, selectedCategory]);

  const resolveLogo = (teamName: string, directUrl?: string) => {
    const dbLogo = getClubLogoUrl(teamName, opponentClubs, mainClub);
    if (dbLogo && !dbLogo.includes('ui-avatars.com')) return dbLogo;
    if (directUrl && directUrl.startsWith('http')) return directUrl;
    return dbLogo;
  };

  // Classement calculé automatiquement depuis les résultats du groupe sélectionné (général ou à l'issue d'une journée)
  const standingsMaxDays = Math.max(
    totalDays,
    finishedStandingsDays.length > 0 ? Math.max(...finishedStandingsDays) : 0,
    1
  );
  const firstStandingsDay = finishedStandingsDays.length > 0 ? finishedStandingsDays[0] : 1;
  const latestStandingsDay =
    finishedStandingsDays.length > 0 ? finishedStandingsDays[finishedStandingsDays.length - 1] : 1;
  const activeStandingsDay =
    standingsDayFilter === 'all' ? latestStandingsDay : Number(standingsDayFilter) || 1;
  const activeStandingsDayRef = useRef(activeStandingsDay);
  activeStandingsDayRef.current = activeStandingsDay;

  useEffect(() => {
    if (isStandingsPlaying) {
      const playCap = Math.max(latestStandingsDay, 1);
      standingsPlayTimerRef.current = setInterval(() => {
        setStandingsDayFilter((prev) => {
          const cur = prev === 'all' ? firstStandingsDay : Number(prev) || firstStandingsDay;
          if (cur >= playCap) {
            setIsStandingsPlaying(false);
            return String(playCap);
          }
          return String(cur + 1);
        });
      }, 950);
    } else if (standingsPlayTimerRef.current) {
      clearInterval(standingsPlayTimerRef.current);
    }
    return () => {
      if (standingsPlayTimerRef.current) clearInterval(standingsPlayTimerRef.current);
    };
  }, [isStandingsPlaying, latestStandingsDay, firstStandingsDay]);

  const handleToggleStandingsPlay = () => {
    if (isStandingsPlaying) {
      setIsStandingsPlaying(false);
      return;
    }
    const playCap = Math.max(latestStandingsDay, 1);
    if (standingsDayFilter === 'all' || activeStandingsDayRef.current >= playCap) {
      setStandingsDayFilter(String(firstStandingsDay));
    }
    setIsStandingsPlaying(true);
  };

  const upToStandingsDay = standingsDayFilter === 'all' ? undefined : Number(standingsDayFilter);
  const calculatedStandingsResult = useMemo(
    () => frmfDataService.getCalculatedStandings(selectedCategory, selectedGroup, dataset, upToStandingsDay),
    [selectedCategory, selectedGroup, dataset, upToStandingsDay]
  );

  const currentStandings: FRMFStandingTeam[] = useMemo(() => {
    const list = calculatedStandingsResult.standings;
    if (!clubSearch.trim()) return list;
    const term = clubSearch.toLowerCase().trim();
    return list.filter((r) => r.team_name.toLowerCase().includes(term));
  }, [calculatedStandingsResult, clubSearch]);

  // Suggestions de clubs pour la modale d'ajout de match
  const clubSuggestions = useMemo(() => {
    const names = new Set<string>();
    if ((mainClub as any)?.short_name) names.add((mainClub as any).short_name);
    if (mainClub?.club_name) names.add(mainClub.club_name);
    calculatedStandingsResult.standings.forEach((s) => names.add(s.team_name));
    opponentClubs.forEach((c) => {
      if ((c as any).abbreviation) names.add((c as any).abbreviation);
      else if (c.name) names.add(c.name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [mainClub, opponentClubs, calculatedStandingsResult]);

  // Données des résultats indexées par journée
  const filteredMatches: { day: number; matches: IndexedMatch[] }[] = useMemo(() => {
    const daysToLoad: number[] =
      selectedDayFilter === 'all'
        ? Array.from({ length: totalDays }, (_, i) => i + 1)
        : [parseInt(selectedDayFilter, 10)];

    const searchNorm = clubSearch.toLowerCase().trim();
    const grouped: { day: number; matches: IndexedMatch[] }[] = [];

    daysToLoad.forEach((d) => {
      let dayMatches: IndexedMatch[] = frmfDataService
        .getResults(selectedCategory, selectedGroup, d)
        .map((m, idx) => ({ ...m, _rawIndex: idx }));

      if (statusFilter !== 'all') {
        dayMatches = dayMatches.filter((m) => m.status === statusFilter);
      }
      if (searchNorm) {
        dayMatches = dayMatches.filter(
          (m) =>
            m.home_team.toLowerCase().includes(searchNorm) ||
            m.away_team.toLowerCase().includes(searchNorm)
        );
      }

      if (dayMatches.length > 0 || selectedDayFilter !== 'all') {
        grouped.push({ day: d, matches: dayMatches });
      }
    });

    return grouped;
  }, [selectedCategory, selectedGroup, selectedDayFilter, totalDays, dataset, statusFilter, clubSearch]);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const nextGroups = frmfDataService.getGroups(cat);
    setSelectedGroup(nextGroups[0] || 'Poule Unique');
    setIsStandingsPlaying(false);
    setStandingsDayFilter('all');
    setSelectedDayFilter('all');
    setConfirmDeleteMatchKey(null);
    setConfirmClearGroup(false);
    setConfirmClearDay(null);
  };

  const handleSaveMatch = async (match: FRMFMatch, targetCat: string, targetGrp: string) => {
    setIsSyncingDb(true);
    try {
      const dbRes = await frmfDataService.upsertMatchAsync(
        targetCat,
        targetGrp,
        match,
        editingMatch
          ? {
              originalDay: editingMatch.match_day,
              originalIndex: editingMatch._rawIndex,
              existingId: editingMatch.id,
            }
          : undefined
      );
      setDataset(dbRes.dataset);
      setDbStatus(dbRes.dbStatus);
      setDbErrorMessage(dbRes.errorMessage || '');
      setSelectedCategory(targetCat);
      setSelectedGroup(targetGrp);
      if (selectedDayFilter !== 'all' && Number(selectedDayFilter) !== match.match_day) {
        setSelectedDayFilter(String(match.match_day));
      }
      if (dbRes.savedToDb) {
        toast.success(
          editingMatch
            ? `Match ${match.home_team} vs ${match.away_team} mis à jour en base de données (J${match.match_day}).`
            : `Match ${match.home_team} vs ${match.away_team} enregistré en base de données (J${match.match_day}).`
        );
      } else {
        toast.warning(
          `Match enregistré localement, non sauvegardé en base (${dbRes.errorMessage || 'migration requise'}).`
        );
      }
      setEditingMatch(null);
    } finally {
      setIsSyncingDb(false);
    }
  };

  const handleDeleteMatch = async (day: number, rawIndex: number, matchSnapshot: IndexedMatch) => {
    setIsSyncingDb(true);
    try {
      const dbRes = await frmfDataService.deleteMatchAsync(
        selectedCategory,
        selectedGroup,
        day,
        rawIndex,
        matchSnapshot
      );
      setDataset(dbRes.dataset);
      setDbStatus(dbRes.dbStatus);
      setDbErrorMessage(dbRes.errorMessage || '');
      setConfirmDeleteMatchKey(null);
      if (dbRes.savedToDb) {
        toast.success(`Match ${matchSnapshot.home_team} vs ${matchSnapshot.away_team} supprimé de la base de données.`);
      } else {
        toast.warning(
          `Supprimé localement uniquement (${dbRes.errorMessage || 'migration requise'}).`
        );
      }
    } finally {
      setIsSyncingDb(false);
    }
  };

  const handleClearGroup = async () => {
    setIsSyncingDb(true);
    try {
      const dbRes = await frmfDataService.clearCategoryGroupAsync(selectedCategory, selectedGroup);
      setDataset(dbRes.dataset);
      setDbStatus(dbRes.dbStatus);
      setDbErrorMessage(dbRes.errorMessage || '');
      setConfirmClearGroup(false);
      toast.success(
        dbRes.savedToDb
          ? `Tous les matchs de ${selectedCategory} (${selectedGroup}) ont été supprimés de la base.`
          : `Poule vidée localement (${dbRes.errorMessage || 'cache local'}).`
      );
    } finally {
      setIsSyncingDb(false);
    }
  };

  const handleClearDay = async (day: number) => {
    setIsSyncingDb(true);
    try {
      const dbRes = await frmfDataService.clearMatchDayAsync(selectedCategory, selectedGroup, day);
      setDataset(dbRes.dataset);
      setDbStatus(dbRes.dbStatus);
      setDbErrorMessage(dbRes.errorMessage || '');
      setConfirmClearDay(null);
      toast.success(
        dbRes.savedToDb
          ? `Journée ${day} (${selectedCategory} • ${selectedGroup}) vidée en base.`
          : `Journée ${day} vidée localement.`
      );
    } finally {
      setIsSyncingDb(false);
    }
  };

  const defaultDayForCreation =
    selectedDayFilter !== 'all' && !isNaN(Number(selectedDayFilter))
      ? Number(selectedDayFilter)
      : 1;

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER PRINCIPAL — IMPORT HTML RÉSULTATS UNIQUEMENT & CLASSEMENT CALCULÉ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase bg-red-100 text-[#FF3737] dark:bg-red-950/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              Classement Calculé par Résultats
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Saison {dataset.metadata?.season || '2026/2027'}
            </span>
            {isSyncingDb ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Synchronisation BDD...
              </span>
            ) : dbStatus === 'synced' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Base Supabase synchronisée
              </span>
            ) : dbStatus === 'migration_required' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3 h-3" />
                Table SQL requise
              </span>
            ) : dbStatus === 'error' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3 h-3" />
                Erreur BDD
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Classement &amp; Résultats FRMF
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Introduisez uniquement le HTML des résultats par journée (ou ajoutez des matchs) : le classement se calcule automatiquement selon les règles officielles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingMatch(null);
              setIsMatchModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold rounded-xl px-3.5 py-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un match</span>
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsHtmlModalOpen(true)}
            className="flex items-center gap-2 text-xs font-bold bg-[#FF3737] hover:bg-[#e02e2e] text-white px-4 py-2 rounded-xl shadow-sm shadow-red-500/20 cursor-pointer"
            title="Coller le HTML des résultats FRMF par journée"
          >
            <FileCode className="w-4 h-4" />
            <span>Coller HTML Résultats FRMF</span>
          </Button>
        </div>
      </div>

      {/* ALERTE NON-BLOQUANTE SI LA TABLE SUPABASE `frmf_matches` N'EST PAS ENCORE CRÉÉE */}
      {(dbStatus === 'migration_required' || dbStatus === 'error') && (
        <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                {dbStatus === 'migration_required'
                  ? 'Persistance base de données : créez la table public.frmf_matches dans Supabase'
                  : `Synchronisation Supabase interrompue : ${dbErrorMessage}`}
              </p>
              <p className="text-[11px] text-slate-300">
                Exécutez le fichier{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                  fus-dashboard/supabase/migrations/20261110_create_frmf_matches_table.sql
                </code>{' '}
                dans Supabase Dashboard → SQL Editor, puis cliquez sur Synchroniser.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(FRMF_MATCHES_MIGRATION_SQL);
                toast.success('Script SQL copié dans le presse-papiers !');
              }}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copier SQL</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => syncWithDatabase(true)}
              disabled={isSyncingDb}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-[#FF3737] hover:bg-[#e02e2e] text-white cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDb ? 'animate-spin' : ''}`} />
              <span>Synchroniser</span>
            </Button>
          </div>
        </div>
      )}

      {/* BARRE DE SÉLECTION CATÉGORIE (TOUTES CATÉGORIES) & POULE */}
      <div className="bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur explicite de TOUTES les catégories */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-[#FF3737] shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Catégorie
            </span>
            <select
              aria-label="Choisir la catégorie"
              value={selectedCategory}
              onChange={(e) => handleSelectCategory(e.target.value)}
              className="h-7 bg-transparent text-xs font-black text-slate-900 dark:text-white pr-1 focus:outline-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Boutons rapides des catégories principales */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {quickPillCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#FF3737] text-white shadow-md shadow-red-500/20'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sélecteur Poule / Groupe */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {availableGroups.map((grp) => {
            const isActive = selectedGroup === grp;
            const clubCountInGroup = frmfDataService.getStandings(selectedCategory, grp).length;
            return (
              <button
                key={grp}
                type="button"
                onClick={() => {
                  setSelectedGroup(grp);
                  setIsStandingsPlaying(false);
                  setStandingsDayFilter('all');
                  setSelectedDayFilter('all');
                  setConfirmDeleteMatchKey(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white'
                }`}
              >
                <span>{grp}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive
                      ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {clubCountInGroup > 0 ? clubCountInGroup : '-'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ONGLET METIER : CLASSEMENT CALCULÉ vs RÉSULTATS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-2 pb-2 px-1 font-black text-sm uppercase tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'standings'
                ? 'border-[#FF3737] text-[#FF3737]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Classement Calculé ({selectedCategory})</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
              {currentStandings.length > 0 ? currentStandings.length : '-'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-2 pb-2 px-1 font-black text-sm uppercase tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'border-[#FF3737] text-[#FF3737]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Programme &amp; Résultats</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
              {totalDays}J
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={clubSearch}
              onChange={(e) => setClubSearch(e.target.value)}
              placeholder="Filtrer par club..."
              className="h-8 pl-8 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
          </div>

          {(calculatedStandingsResult.standings.length > 0 || filteredMatches.some((d) => d.matches.length > 0)) && (
            confirmClearGroup ? (
              <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleClearGroup}
                  disabled={isSyncingDb}
                  className="h-6 px-2 text-[10px] font-bold rounded-lg cursor-pointer"
                >
                  Confirmer vider
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmClearGroup(false)}
                  className="h-6 px-2 text-[10px] font-bold rounded-lg cursor-pointer"
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirmClearGroup(true)}
                className="h-8 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold gap-1 shrink-0 cursor-pointer"
                title="Supprimer tous les matchs de cette catégorie / poule"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vider</span>
              </Button>
            )
          )}

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingMatch(null);
              setIsMatchModalOpen(true);
            }}
            className="h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un match</span>
          </Button>
        </div>
      </div>

      {/* VUE 1 : CLASSEMENT CALCULÉ DEPUIS LES RÉSULTATS */}
      {activeTab === 'standings' && (
        <div className="space-y-3">
          {/* Lecteur chronologique par journée + liste déroulante synchronisée */}
          <MatchdayTimelineControl
            activeJournee={activeStandingsDay}
            maxJournee={standingsMaxDays}
            latestPlayedJournee={latestStandingsDay}
            finishedDays={finishedStandingsDays}
            isPlaying={isStandingsPlaying}
            onTogglePlay={handleToggleStandingsPlay}
            onSelectJournee={(day) => {
              setIsStandingsPlaying(false);
              setStandingsDayFilter(String(day));
            }}
            onJumpToday={() => {
              setIsStandingsPlaying(false);
              setStandingsDayFilter('all');
            }}
            isTodaySelected={standingsDayFilter === 'all'}
            dropdownMode={{
              value: standingsDayFilter,
              onChange: (val) => {
                setIsStandingsPlaying(false);
                setStandingsDayFilter(val);
              },
              allLabel: 'Classement général',
            }}
          />

          {/* Bannière informative des critères officiels actifs */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-start sm:items-center gap-2 text-slate-700 dark:text-slate-300">
              <Calculator className="w-4 h-4 text-[#FF3737] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                {calculatedStandingsResult.meta.isChampionshipCompleted ? (
                  <>
                    <strong>
                      {upToStandingsDay !== undefined
                        ? `Classement à l'issue de la Journée ${upToStandingsDay} (dernière journée) :`
                        : 'Classement final (dernière journée clôturée) :'}
                    </strong>{' '}
                    Confrontations directes activées pour départager toute égalité de points.
                  </>
                ) : (
                  <>
                    <strong>
                      {upToStandingsDay !== undefined
                        ? `Classement après Journée ${upToStandingsDay} (${calculatedStandingsResult.meta.finishedMatchesCount} match(s) joués) :`
                        : `Classement provisoire (${calculatedStandingsResult.meta.finishedMatchesCount} match(s) joués) :`}
                    </strong>{' '}
                    En cas d&apos;égalité,{' '}
                    <span className="font-bold">différence de buts générale</span> prioritaire puis{' '}
                    <span className="font-bold">meilleure attaque (BP)</span>. Confrontations directes activées uniquement après la phase retour entre ex æquo ou en fin de championnat.
                  </>
                )}
              </span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-black uppercase shrink-0 ${
                calculatedStandingsResult.meta.isChampionshipCompleted
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {calculatedStandingsResult.meta.isChampionshipCompleted ? 'Phase Finale' : 'Provisoire'}
            </Badge>
          </div>

          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[780px] w-full text-left">
                  <div className="grid grid-cols-[56px_58px_minmax(220px,1fr)_56px_46px_42px_42px_42px_46px_46px_54px_110px] items-center bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <div className="py-3 px-2 text-center">Rang</div>
                    <div className="py-3 px-1 text-center" title="Évolution depuis la journée précédente">Évol.</div>
                    <div className="py-3 px-4">Club</div>
                    <div className="py-3 px-2 text-center font-black text-slate-900 dark:text-white">PTS</div>
                    <div className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-200" title="Matchs Joués">MJ</div>
                    <div className="py-3 px-2 text-center font-bold text-emerald-600" title="Matchs Gagnés">G</div>
                    <div className="py-3 px-2 text-center font-bold text-slate-500" title="Matchs Nuls">N</div>
                    <div className="py-3 px-2 text-center font-bold text-rose-500" title="Matchs Perdus">P</div>
                    <div className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-200" title="Buts Pour (Meilleure attaque)">BP</div>
                    <div className="py-3 px-2 text-center font-bold text-slate-500" title="Buts Contre">BC</div>
                    <div className="py-3 px-2 text-center font-black text-slate-900 dark:text-white" title="Différence de buts générale">DIFF</div>
                    <div className="py-3 px-3 text-center">5 Derniers</div>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold relative">
                    {currentStandings.length === 0 ? (
                      <div className="py-10 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <Info className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {upToStandingsDay !== undefined
                              ? `Aucun résultat enregistré jusqu'à la Journée ${upToStandingsDay} pour ${selectedCategory} (${selectedGroup})`
                              : `Aucun résultat enregistré pour ${selectedCategory} (${selectedGroup})`}
                          </p>
                          <p className="text-xs text-slate-500">
                            Collez le code HTML des résultats d&apos;une journée ou ajoutez un match pour calculer automatiquement le classement.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingMatch(null);
                                setIsMatchModalOpen(true);
                              }}
                              className="text-xs font-bold rounded-xl gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter un match
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setIsHtmlModalOpen(true)}
                              className="text-xs font-bold rounded-xl gap-1.5 bg-[#FF3737] hover:bg-[#e02e2e] text-white"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              Coller HTML Résultats
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      currentStandings.map((row) => {
                        const hasPlayed = row.played > 0;
                        const isFus = row.is_fus || row.team_name.toLowerCase().includes('fus');
                        const logoUrl = resolveLogo(row.team_name, row.club_logo);
                        const formattedPos = hasPlayed ? String(row.position).padStart(2, '0') : '-';
                        const tieBadge = hasPlayed ? getTieRuleBadgeLabel(row.tie_breaker_rule) : null;

                        return (
                          <motion.div
                            key={row.team_key || row.team_name}
                            layout
                            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
                            className={`relative grid grid-cols-[56px_58px_minmax(220px,1fr)_56px_46px_42px_42px_42px_46px_46px_54px_110px] items-center transition-colors ${
                              isFus
                                ? 'bg-red-50/70 dark:bg-red-950/20 font-bold border-l-4 border-l-[#FF3737]'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {hasPlayed &&
                              row.position_delta !== null &&
                              row.position_delta !== undefined &&
                              row.position_delta !== 0 && (
                                <motion.div
                                  key={`flash-${row.team_key || row.team_name}-${activeStandingsDay}-${row.position_delta}`}
                                  initial={{ opacity: 0.45 }}
                                  animate={{ opacity: 0 }}
                                  transition={{ duration: 0.65 }}
                                  className={`absolute inset-0 pointer-events-none ${
                                    row.position_delta > 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                                  }`}
                                />
                              )}
                            <div className="py-2.5 px-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-black shadow-xs ${
                                  !hasPlayed
                                    ? 'bg-slate-200 text-slate-500'
                                    : isFus
                                    ? 'bg-[#FF3737] text-white ring-2 ring-red-400/40'
                                    : 'bg-red-600/90 text-white'
                                }`}
                              >
                                {formattedPos}
                              </span>
                            </div>
                            <div className="py-2.5 px-1 text-center font-black text-[11px]">
                              {!hasPlayed || row.position_delta === null || row.position_delta === undefined ? (
                                <span className="text-slate-400">-</span>
                              ) : row.position_delta > 0 ? (
                                <motion.span
                                  key={`delta-${row.team_key}-${activeStandingsDay}`}
                                  initial={{ scale: 1.3 }}
                                  animate={{ scale: 1 }}
                                  className="inline-block text-emerald-600"
                                  title={`+${row.position_delta} place(s) vs journée précédente`}
                                >
                                  ▲ +{row.position_delta}
                                </motion.span>
                              ) : row.position_delta < 0 ? (
                                <motion.span
                                  key={`delta-${row.team_key}-${activeStandingsDay}`}
                                  initial={{ scale: 1.3 }}
                                  animate={{ scale: 1 }}
                                  className="inline-block text-rose-600"
                                  title={`${row.position_delta} place(s) vs journée précédente`}
                                >
                                  ▼ {row.position_delta}
                                </motion.span>
                              ) : (
                                <span className="text-slate-400" title="Position inchangée">=</span>
                              )}
                            </div>
                            <div className="py-2.5 px-4 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap min-w-0">
                                <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                  <img
                                    src={logoUrl}
                                    alt={row.team_name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                  {row.team_name}
                                </span>
                                {isFus && (
                                  <Badge className="bg-[#FF3737] text-white hover:bg-[#e03030] text-[9px] uppercase tracking-widest px-2 py-0.5">
                                    Notre Club
                                  </Badge>
                                )}
                                {tieBadge && (
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                      row.h2h_activated
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                    title="Critère appliqué en cas d'égalité de points"
                                  >
                                    {tieBadge}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="py-2.5 px-2 text-center text-sm font-black text-slate-900 dark:text-white">
                              {hasPlayed ? row.points : '-'}
                            </div>
                            <div className="py-2.5 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                              {hasPlayed ? row.played : '-'}
                            </div>
                            <div className="py-2.5 px-2 text-center font-black text-emerald-600">
                              {hasPlayed ? row.won : '-'}
                            </div>
                            <div className="py-2.5 px-2 text-center font-bold text-slate-500">
                              {hasPlayed ? row.drawn : '-'}
                            </div>
                            <div className="py-2.5 px-2 text-center font-bold text-rose-500">
                              {hasPlayed ? row.lost : '-'}
                            </div>
                            <div className="py-2.5 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                              {hasPlayed ? row.goals_for : '-'}
                            </div>
                            <div className="py-2.5 px-2 text-center font-bold text-slate-500">
                              {hasPlayed ? row.goals_against : '-'}
                            </div>
                            <div className="py-2.5 px-2 text-center font-black">
                              {!hasPlayed ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                <span
                                  className={`font-black ${
                                    row.goal_difference > 0
                                      ? 'text-emerald-600'
                                      : row.goal_difference < 0
                                      ? 'text-rose-500'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                </span>
                              )}
                            </div>
                            <div className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {!hasPlayed || !row.form || row.form.length === 0 ? (
                                  <span className="text-[10px] text-slate-400">-</span>
                                ) : (
                                  row.form.map((res, i) => (
                                    <span
                                      key={i}
                                      className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center text-white ${
                                        res === 'W'
                                          ? 'bg-emerald-500'
                                          : res === 'D'
                                          ? 'bg-slate-400'
                                          : 'bg-rose-500'
                                      }`}
                                    >
                                      {res === 'W' ? 'G' : res === 'D' ? 'N' : 'P'}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VUE 2 : PROGRAMME & RÉSULTATS PAR JOURNÉE */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#FF3737]" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Filtre par Journée :
                </span>
                <select
                  value={selectedDayFilter}
                  onChange={(e) => setSelectedDayFilter(e.target.value)}
                  className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="all">Toutes les journées (1 à {totalDays})</option>
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>
                      Journée {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('finished')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'finished'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Terminés
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('scheduled')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'scheduled'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  À venir
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
                  selectedDayFilter === 'all'
                    ? 'bg-[#FF3737] text-white shadow-md shadow-red-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Toutes ({totalDays}J)
              </button>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                const isActive = selectedDayFilter === String(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDayFilter(String(d))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#FF3737] text-white shadow-md shadow-red-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    J{d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {filteredMatches.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                Aucun match ne correspond aux filtres appliqués pour {selectedCategory} ({selectedGroup}).
              </div>
            ) : (
              filteredMatches.map(({ day, matches }) => (
                <div key={day} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg text-xs font-black bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                        Journée {day}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        • {matches.length} match{matches.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {matches.length > 0 && (
                      confirmClearDay === day ? (
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleClearDay(day)}
                            disabled={isSyncingDb}
                            className="h-6 px-2 text-[10px] font-bold rounded-md cursor-pointer"
                          >
                            Vider J{day}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmClearDay(null)}
                            className="h-6 px-2 text-[10px] font-bold rounded-md cursor-pointer"
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClearDay(day)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Vider J{day}</span>
                        </button>
                      )
                    )}
                  </div>

                  {matches.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      Aucun match enregistré pour la Journée {day}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {matches.map((match) => {
                        const isHomeFus = match.home_team.toLowerCase().includes('fus');
                        const isAwayFus = match.away_team.toLowerCase().includes('fus');
                        const hasScore = match.score_home !== null && match.score_away !== null;
                        const homeLogo = resolveLogo(match.home_team, match.home_team_logo);
                        const awayLogo = resolveLogo(match.away_team, match.away_team_logo);
                        const cardKey = `${day}-${match._rawIndex}`;
                        const isConfirmingDelete = confirmDeleteMatchKey === cardKey;

                        return (
                          <Card
                            key={cardKey}
                            className={`border transition-all shadow-sm ${
                              isHomeFus || isAwayFus
                                ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                            }`}
                          >
                            <CardContent className="p-4">
                              {/* Date & Heure & Statut + Actions CRUD */}
                              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    {match.match_date} à {match.match_time}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant={match.status === 'finished' ? 'secondary' : 'outline'}
                                    className={`text-[9px] uppercase tracking-wider font-black ${
                                      match.status === 'finished'
                                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        : match.status === 'postponed'
                                        ? 'border-amber-400 text-amber-600 bg-amber-50/50'
                                        : match.status === 'cancelled'
                                        ? 'border-rose-400 text-rose-600 bg-rose-50/50'
                                        : 'border-amber-400 text-amber-600 bg-amber-50/50'
                                    }`}
                                  >
                                    {match.status === 'finished'
                                      ? 'Terminé'
                                      : match.status === 'postponed'
                                      ? 'Reporté'
                                      : match.status === 'cancelled'
                                      ? 'Annulé'
                                      : 'Programmé'}
                                  </Badge>

                                  {isConfirmingDelete ? (
                                    <div className="inline-flex items-center gap-1 ml-1">
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                          handleDeleteMatch(
                                            day,
                                            match._rawIndex,
                                            match
                                          )
                                        }
                                        className="h-6 px-2 text-[10px] font-bold rounded-md cursor-pointer"
                                      >
                                        Supprimer
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setConfirmDeleteMatchKey(null)}
                                        className="h-6 px-1.5 text-[10px] font-bold rounded-md cursor-pointer"
                                      >
                                        Non
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-0.5 ml-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingMatch(match);
                                          setIsMatchModalOpen(true);
                                        }}
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                        title="Modifier ce match"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteMatchKey(cardKey)}
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Supprimer ce match"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Oppositions avec logos */}
                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                <div className="flex items-center justify-end gap-2.5 text-right min-w-0">
                                  <div className="truncate">
                                    <p
                                      className={`text-xs sm:text-sm font-extrabold truncate ${
                                        isHomeFus ? 'text-[#FF3737]' : 'text-slate-900 dark:text-white'
                                      }`}
                                    >
                                      {match.home_team}
                                    </p>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                      Dom.
                                    </span>
                                  </div>
                                  <div className="w-9 h-9 rounded-full bg-white shadow-xs border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                    <img
                                      src={homeLogo}
                                      alt={match.home_team}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-center min-w-[76px]">
                                  {hasScore ? (
                                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wider">
                                      {match.score_home} - {match.score_away}
                                    </span>
                                  ) : (
                                    <span className="text-sm font-black text-slate-400 tracking-wider">
                                      - : -
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-start gap-2.5 text-left min-w-0">
                                  <div className="w-9 h-9 rounded-full bg-white shadow-xs border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                    <img
                                      src={awayLogo}
                                      alt={match.away_team}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div className="truncate">
                                    <p
                                      className={`text-xs sm:text-sm font-extrabold truncate ${
                                        isAwayFus ? 'text-[#FF3737]' : 'text-slate-900 dark:text-white'
                                      }`}
                                    >
                                      {match.away_team}
                                    </p>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                      Ext.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALE : COLLER HTML RÉSULTATS FRMF PAR JOURNÉE UNIQUEMENT */}
      <FrmfHtmlImportModal
        isOpen={isHtmlModalOpen}
        onClose={() => setIsHtmlModalOpen(false)}
        initialCategory={selectedCategory}
        initialGroup={selectedGroup}
        initialDay={defaultDayForCreation}
        categories={categories}
        onImported={(nextDataset, cat, grp, importedDay, dbRes) => {
          setDataset(nextDataset);
          setDbStatus(dbRes.dbStatus);
          setDbErrorMessage(dbRes.errorMessage || '');
          setSelectedCategory(cat);
          setSelectedGroup(grp);
          setSelectedDayFilter(String(importedDay));
          setActiveTab('standings');
        }}
      />

      {/* MODALE CRUD MATCH / RÉSULTATS */}
      <FrmfMatchModal
        isOpen={isMatchModalOpen}
        onClose={() => {
          setIsMatchModalOpen(false);
          setEditingMatch(null);
        }}
        category={selectedCategory}
        group={selectedGroup}
        categories={categories}
        totalDays={totalDays}
        defaultDay={defaultDayForCreation}
        initialMatch={editingMatch}
        clubSuggestions={clubSuggestions}
        resolveLogo={resolveLogo}
        onSave={handleSaveMatch}
      />
    </div>
  );
};

export default ClassementResultatsPage;
