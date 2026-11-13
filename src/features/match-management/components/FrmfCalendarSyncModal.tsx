import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  ShieldCheck,
  Tag,
  Trophy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { FusLogoLoader } from '../../../components/ui/FusLogoLoader';
import {
  frmfCalendarSyncService,
  type FrmfCalendarDatabaseAuditResponse,
} from '../../../services/frmfCalendarSyncService';
import type { Club, League, Match, MyClubSettings, Team } from '../../../types';
import type {
  FrmfCalendarMissingMatchItem,
  FrmfCalendarRoundUpdateItem,
} from '../../../utils/frmfCalendarSyncEngine';

interface FrmfCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainClub: MyClubSettings | null;
  opponentClubs: Club[];
  calendarMatches: Match[];
  leagues: League[];
  teams?: Team[];
  canManageCategory?: (category: string | null | undefined) => boolean;
  onSynced?: (result: {
    createdCount: number;
    updatedRoundsCount: number;
    skippedCount: number;
  }) => Promise<void> | void;
}

export const FrmfCalendarSyncModal: React.FC<FrmfCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  mainClub,
  opponentClubs,
  calendarMatches,
  leagues,
  teams,
  canManageCategory,
  onSynced,
}) => {
  const queryClient = useQueryClient();
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [audit, setAudit] = useState<FrmfCalendarDatabaseAuditResponse | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showExistingList, setShowExistingList] = useState(false);

  const runAudit = useCallback(async () => {
    setIsAuditing(true);
    try {
      const res = await frmfCalendarSyncService.auditFromDatabase({
        mainClub,
        opponentClubs,
        calendarMatches,
        leagues,
        teams,
        canManageCategory,
        forceFreshCalendar: true,
      });
      setAudit(res);
      setSelectedKeys(
        new Set([
          ...res.missingMatches.map((m) => m.syncKey),
          ...res.roundUpdates.map((r) => r.syncKey),
        ])
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Impossible d'analyser Classement & Résultats : ${message}`);
    } finally {
      setIsAuditing(false);
    }
  }, [mainClub, opponentClubs, calendarMatches, leagues, teams, canManageCategory]);

  useEffect(() => {
    if (isOpen) {
      setShowExistingList(false);
      void runAudit();
    }
  }, [isOpen, runAudit]);

  const missingMatches = useMemo(() => audit?.missingMatches || [], [audit]);
  const roundUpdates = useMemo(() => audit?.roundUpdates || [], [audit]);
  const selectedMissingItems = useMemo(
    () => missingMatches.filter((m) => selectedKeys.has(m.syncKey)),
    [missingMatches, selectedKeys]
  );
  const selectedRoundItems = useMemo(
    () => roundUpdates.filter((r) => selectedKeys.has(r.syncKey)),
    [roundUpdates, selectedKeys]
  );

  const totalSyncableCount = missingMatches.length + roundUpdates.length;
  const totalSelectedCount = selectedMissingItems.length + selectedRoundItems.length;
  const allSelected = totalSyncableCount > 0 && totalSelectedCount === totalSyncableCount;

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(
        new Set([
          ...missingMatches.map((m) => m.syncKey),
          ...roundUpdates.map((r) => r.syncKey),
        ])
      );
    }
  };

  const handleConfirmSync = async () => {
    if (totalSelectedCount === 0 || isSyncing) return;
    setIsSyncing(true);
    try {
      const createRes = await frmfCalendarSyncService.syncMissingMatchesToCalendar(
        selectedMissingItems,
        { mainClub }
      );
      const roundRes = await frmfCalendarSyncService.syncRoundNamesToCalendar(
        selectedRoundItems
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['matches'] }),
        queryClient.invalidateQueries({ queryKey: ['opponents'] }),
        queryClient.invalidateQueries({ queryKey: ['teams'] }),
      ]);

      await onSynced?.({
        createdCount: createRes.createdCount,
        updatedRoundsCount: roundRes.updatedCount,
        skippedCount: createRes.skippedCount + roundRes.skippedCount,
      });

      const allErrors = [...createRes.errors, ...roundRes.errors];
      const summaryParts: string[] = [];
      if (createRes.createdCount > 0) {
        summaryParts.push(`${createRes.createdCount} match(s) ajouté(s)`);
      }
      if (roundRes.updatedCount > 0) {
        summaryParts.push(`${roundRes.updatedCount} journée(s) synchronisée(s)`);
      }

      if (allErrors.length > 0) {
        toast.warning(
          `${summaryParts.length ? `${summaryParts.join(', ')}, ` : ''}${allErrors.length} erreur(s) : ${allErrors[0]}`
        );
        await runAudit();
      } else if (summaryParts.length > 0) {
        toast.success(
          `Calendrier synchronisé : ${summaryParts.join(' et ')}. Les scores et événements existants ont été préservés.`
        );
        onClose();
      } else {
        toast.info('Tous les matchs et journées sélectionnés sont déjà à jour dans le Calendrier.');
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Échec de la synchronisation : ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  const renderMissingCard = (item: FrmfCalendarMissingMatchItem) => {
    const isChecked = selectedKeys.has(item.syncKey);
    const homeName = item.isHome ? item.myClubAbbreviation : item.opponentAbbreviation || item.opponentRawName;
    const awayName = item.isHome ? item.opponentAbbreviation || item.opponentRawName : item.myClubAbbreviation;
    const homeLogo = item.isHome ? item.myClubLogo : item.opponentLogo;
    const awayLogo = item.isHome ? item.opponentLogo : item.myClubLogo;

    return (
      <button
        key={item.syncKey}
        type="button"
        onClick={() => toggleKey(item.syncKey)}
        className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${isChecked
            ? 'border-[#FF3737] bg-red-50/40 dark:bg-red-950/20 shadow-sm'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
      >
        <div
          className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isChecked
              ? 'bg-[#FF3737] border-[#FF3737] text-white'
              : 'border-slate-300 bg-white dark:bg-slate-800 text-transparent'
            }`}
        >
          <Check className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FF3737] text-white">
                {item.category}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-900 text-white dark:bg-slate-700">
                {item.roundName}
              </span>
              <span className="text-[10px] font-bold text-slate-500">{item.group}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.isHome
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
                }`}
            >
              {item.isHome ? 'Domicile' : 'Extérieur'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
              <span
                className={`text-xs sm:text-sm font-black truncate ${item.isHome ? 'text-[#FF3737]' : 'text-slate-900 dark:text-white'
                  }`}
              >
                {homeName}
              </span>
              <img
                src={homeLogo}
                alt={homeName}
                className="w-6 h-6 rounded-full object-contain bg-white border border-slate-200 p-0.5 shrink-0"
              />
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs sm:text-sm font-black tabular-nums shrink-0">
              {item.scoreHome} - {item.scoreAway}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src={awayLogo}
                alt={awayName}
                className="w-6 h-6 rounded-full object-contain bg-white border border-slate-200 p-0.5 shrink-0"
              />
              <span
                className={`text-xs sm:text-sm font-black truncate ${!item.isHome ? 'text-[#FF3737]' : 'text-slate-900 dark:text-white'
                  }`}
              >
                {awayName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {item.matchDate} • {item.matchTime.slice(0, 5)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              {item.resolvedLeagueName} ({item.season})
            </span>
            {item.willCreateOpponentClub && (
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                + Club « {item.opponentAbbreviation || item.opponentRawName} » à créer
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderRoundUpdateCard = (item: FrmfCalendarRoundUpdateItem) => {
    const isChecked = selectedKeys.has(item.syncKey);
    const homeName = item.isHome ? item.myClubAbbreviation : item.opponentAbbreviation || item.opponentRawName;
    const awayName = item.isHome ? item.opponentAbbreviation || item.opponentRawName : item.myClubAbbreviation;
    const homeLogo = item.isHome ? item.myClubLogo : item.opponentLogo;
    const awayLogo = item.isHome ? item.opponentLogo : item.myClubLogo;

    return (
      <button
        key={item.syncKey}
        type="button"
        onClick={() => toggleKey(item.syncKey)}
        className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${isChecked
            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
      >
        <div
          className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isChecked
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-slate-300 bg-white dark:bg-slate-800 text-transparent'
            }`}
        >
          <Check className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FF3737] text-white">
                {item.category}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Tag className="w-2.5 h-2.5" />
                {item.currentRoundName || 'Sans journée'}
                <ArrowRight className="w-2.5 h-2.5 text-blue-600" />
                <span className="font-black text-blue-700 dark:text-blue-300">{item.targetRoundName}</span>
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.isHome
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
                }`}
            >
              {item.isHome ? 'Domicile' : 'Extérieur'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
              <span
                className={`text-xs sm:text-sm font-black truncate ${item.isHome ? 'text-[#FF3737]' : 'text-slate-900 dark:text-white'
                  }`}
              >
                {homeName}
              </span>
              <img
                src={homeLogo}
                alt={homeName}
                className="w-6 h-6 rounded-full object-contain bg-white border border-slate-200 p-0.5 shrink-0"
              />
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs sm:text-sm font-black tabular-nums shrink-0">
              {item.hasPlayedScore ? `${item.scoreHome} - ${item.scoreAway}` : 'VS'}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src={awayLogo}
                alt={awayName}
                className="w-6 h-6 rounded-full object-contain bg-white border border-slate-200 p-0.5 shrink-0"
              />
              <span
                className={`text-xs sm:text-sm font-black truncate ${!item.isHome ? 'text-[#FF3737]' : 'text-slate-900 dark:text-white'
                  }`}
              >
                {awayName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {item.needsDateRectification ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold inline-flex items-center gap-1">
                  Date rectifiée : {item.currentDate || item.existingCalendarMatch.match_date}
                  <ArrowRight className="w-2.5 h-2.5" />
                  {item.targetDate}
                </span>
              ) : (
                <>Calendrier : {item.existingCalendarMatch.match_date}</>
              )}
            </span>
            {item.isBlankMatch ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                Match vierge (0 événement) : date, heure &amp; score rectifiés
              </span>
            ) : (
              <span className="text-blue-700 dark:text-blue-300 font-bold">
                Scores, compos &amp; événements conservés
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-8">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-[#FF3737] dark:bg-red-950/40 mb-1.5">
              <CalendarCheck className="w-3 h-3" />
              Synchronisation My Club
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Synchroniser matchs joués et journées depuis Classement &amp; Résultats
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ajoute les matchs terminés manquants et complète les journées manquantes des matchs existants sans écraser leurs scores ni leurs événements.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu principal */}
        {isAuditing ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3">
            <FusLogoLoader size="md" label="Vérification des matchs et journées My Club dans Classement & Résultats…" />
          </div>
        ) : audit ? (
          <>
            {(audit.dbStatus === 'migration_required' || audit.dbStatus === 'error') && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Source FRMF partiellement accessible</p>
                  <p className="text-[11px] opacity-90">
                    {audit.errorMessage || 'Vérifiez que la table public.frmf_matches est disponible dans Supabase.'}
                  </p>
                </div>
              </div>
            )}

            {/* 4 indicateurs de synthèse */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums">
                  {audit.totalPlayedFrmfMyClubMatches}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Joués FRMF
                </p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50/70 dark:bg-red-950/20 p-3 text-center">
                <p className="text-lg sm:text-xl font-black text-[#FF3737] tabular-nums">
                  {missingMatches.length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                  Manquants
                </p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/20 p-3 text-center">
                <p className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-300 tabular-nums">
                  {roundUpdates.length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Journées à maj
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-center">
                <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {audit.alreadyInCalendar.length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  À jour
                </p>
              </div>
            </div>

            {/* Listes synchronisables ou état à jour */}
            {totalSyncableCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Éléments à synchroniser ({totalSyncableCount})
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] font-black uppercase tracking-wider text-[#FF3737] hover:underline"
                  >
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'} ({totalSelectedCount}/{totalSyncableCount})
                  </button>
                </div>

                <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
                  {missingMatches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-[#FF3737]">
                        Nouveaux matchs joués à enregistrer ({missingMatches.length})
                      </p>
                      <div className="space-y-2">{missingMatches.map(renderMissingCard)}</div>
                    </div>
                  )}

                  {roundUpdates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Journées à associer aux matchs existants ({roundUpdates.length})
                      </p>
                      <div className="space-y-2">{roundUpdates.map(renderRoundUpdateCard)}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 text-center space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                  Calendrier &amp; journées My Club déjà synchronisés
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Tous les matchs joués et leurs journées FRMF sont déjà enregistrés dans votre calendrier.
                </p>
              </div>
            )}

            {/* Détail repliable des matchs déjà à jour et protégés */}
            {audit.alreadyInCalendar.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowExistingList((prev) => !prev)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    {audit.alreadyInCalendar.length} match(s) déjà à jour — événements et journées préservés
                  </span>
                  {showExistingList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showExistingList && (
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {audit.alreadyInCalendar.map((item) => (
                      <div
                        key={item.syncKey}
                        className="px-3.5 py-2 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-black text-[9px]">
                            {item.category}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold text-[9px]">
                            {item.roundName}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.frmfMatch.home_team} {item.scoreHome} - {item.scoreAway} {item.frmfMatch.away_team}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {item.existingCalendarMatch.match_date} • À jour
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}

        {/* Barre d'actions bas */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void runAudit()}
            disabled={isAuditing || isSyncing}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>Revérifier</span>
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSyncing}
              className="text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              Fermer
            </Button>

            {totalSyncableCount > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSync}
                disabled={totalSelectedCount === 0 || isAuditing || isSyncing}
                className="bg-[#FF3737] hover:bg-[#e02e2e] text-white font-black uppercase tracking-wider text-xs px-4 py-2 rounded-xl shadow-md shadow-red-500/20 gap-2 disabled:opacity-50"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>
                  {isSyncing
                    ? 'Synchronisation...'
                    : `Synchroniser (${totalSelectedCount})`}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
