import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Save, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { frmfDataService, type FRMFMatch } from '../../../services/frmfDataService';

interface FrmfMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  group: string;
  categories?: string[];
  totalDays: number;
  defaultDay: number;
  initialMatch?: FRMFMatch | null;
  clubSuggestions: string[];
  resolveLogo: (teamName: string, directUrl?: string) => string;
  onSave: (match: FRMFMatch, targetCategory: string, targetGroup: string) => void;
}

export const FrmfMatchModal: React.FC<FrmfMatchModalProps> = ({
  isOpen,
  onClose,
  category,
  group,
  categories,
  totalDays,
  defaultDay,
  initialMatch,
  clubSuggestions,
  resolveLogo,
  onSave,
}) => {
  const [targetCategory, setTargetCategory] = useState<string>(category);
  const [targetGroup, setTargetGroup] = useState<string>(group);
  const [matchDay, setMatchDay] = useState<number>(defaultDay);
  const [matchDate, setMatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState<string>('15:00');
  const [status, setStatus] = useState<FRMFMatch['status']>('finished');
  const [homeTeam, setHomeTeam] = useState<string>('');
  const [awayTeam, setAwayTeam] = useState<string>('');
  const [scoreHome, setScoreHome] = useState<string>('0');
  const [scoreAway, setScoreAway] = useState<string>('0');

  const availableCategories = useMemo(
    () => (categories && categories.length > 0 ? categories : frmfDataService.getCategories()),
    [categories]
  );

  const availableGroups = useMemo(
    () => frmfDataService.getGroups(targetCategory),
    [targetCategory]
  );

  const effectiveTotalDays = useMemo(
    () => Math.max(totalDays, frmfDataService.getTotalDays(targetCategory, targetGroup)),
    [totalDays, targetCategory, targetGroup]
  );

  useEffect(() => {
    if (!isOpen) return;
    setTargetCategory(initialMatch?.category || category);
    setTargetGroup(initialMatch?.group || group);
    if (initialMatch) {
      setMatchDay(initialMatch.match_day);
      setMatchDate(initialMatch.match_date || new Date().toISOString().split('T')[0]);
      setMatchTime(initialMatch.match_time || '15:00');
      setStatus(initialMatch.status || 'scheduled');
      setHomeTeam(initialMatch.home_team || '');
      setAwayTeam(initialMatch.away_team || '');
      setScoreHome(initialMatch.score_home !== null && initialMatch.score_home !== undefined ? String(initialMatch.score_home) : '');
      setScoreAway(initialMatch.score_away !== null && initialMatch.score_away !== undefined ? String(initialMatch.score_away) : '');
    } else {
      setMatchDay(defaultDay > 0 ? defaultDay : 1);
      setMatchDate(new Date().toISOString().split('T')[0]);
      setMatchTime('15:00');
      setStatus('finished');
      setHomeTeam('');
      setAwayTeam('');
      setScoreHome('0');
      setScoreAway('0');
    }
  }, [isOpen, initialMatch, defaultDay, category, group]);

  if (!isOpen) return null;

  const homeLogo = homeTeam.trim() ? resolveLogo(homeTeam.trim(), initialMatch?.home_team_logo) : '';
  const awayLogo = awayTeam.trim() ? resolveLogo(awayTeam.trim(), initialMatch?.away_team_logo) : '';

  const handleCategorySwitch = (nextCat: string) => {
    setTargetCategory(nextCat);
    const groups = frmfDataService.getGroups(nextCat);
    if (!groups.includes(targetGroup)) {
      setTargetGroup(groups[0] || 'Poule Unique');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = homeTeam.trim();
    const a = awayTeam.trim();
    if (!h || !a) return;

    const parsedHome = scoreHome.trim() !== '' && !isNaN(Number(scoreHome)) ? Number(scoreHome) : null;
    const parsedAway = scoreAway.trim() !== '' && !isNaN(Number(scoreAway)) ? Number(scoreAway) : null;

    onSave(
      {
        category: targetCategory,
        group: targetGroup,
        match_day: Number(matchDay) || 1,
        home_team: h,
        away_team: a,
        score_home: status === 'finished' ? (parsedHome ?? 0) : null,
        score_away: status === 'finished' ? (parsedAway ?? 0) : null,
        status,
        match_date: matchDate || new Date().toISOString().split('T')[0],
        match_time: matchTime || '15:00',
        home_team_logo: resolveLogo(h, initialMatch?.home_team_logo),
        away_team_logo: resolveLogo(a, initialMatch?.away_team_logo),
      },
      targetCategory,
      targetGroup
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-[#FF3737] mb-1">
              <Calendar className="w-3 h-3" />
              {targetCategory} • {targetGroup}
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {initialMatch ? 'Modifier le match' : 'Ajouter un match / résultat'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Choix Catégorie & Poule directement accessible */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Catégorie</label>
              <select
                aria-label="Catégorie du match"
                value={targetCategory}
                onChange={(e) => handleCategorySwitch(e.target.value)}
                disabled={Boolean(initialMatch)}
                className="w-full h-9 px-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Groupe / Poule</label>
              <select
                aria-label="Poule du match"
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                disabled={Boolean(initialMatch)}
                className="w-full h-9 px-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
              >
                {availableGroups.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Journée</label>
              <select
                value={matchDay}
                onChange={(e) => setMatchDay(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {Array.from({ length: effectiveTotalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    J{d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FRMFMatch['status'])}
                className="w-full h-9 px-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="finished">Terminé</option>
                <option value="scheduled">Programmé</option>
                <option value="postponed">Reporté</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Date</label>
              <Input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="h-9 text-xs font-bold rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Heure</label>
              <Input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="h-9 text-xs font-bold rounded-xl"
              />
            </div>
          </div>

          <datalist id="frmf-match-club-suggestions">
            {clubSuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Équipe Domicile *
              </label>
              <div className="flex items-center gap-2">
                {homeLogo && (
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={homeLogo} alt={homeTeam} className="w-full h-full object-contain" />
                  </div>
                )}
                <Input
                  required
                  list="frmf-match-club-suggestions"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="ex: FUS"
                  className="text-xs font-bold rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Équipe Extérieur *
              </label>
              <div className="flex items-center gap-2">
                {awayLogo && (
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={awayLogo} alt={awayTeam} className="w-full h-full object-contain" />
                  </div>
                )}
                <Input
                  required
                  list="frmf-match-club-suggestions"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="ex: FAR"
                  className="text-xs font-bold rounded-xl"
                />
              </div>
            </div>
          </div>

          {status === 'finished' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 text-center">
                  Score Domicile
                </label>
                <Input
                  type="number"
                  min={0}
                  value={scoreHome}
                  onChange={(e) => setScoreHome(e.target.value)}
                  className="font-black text-center text-base rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 text-center">
                  Score Extérieur
                </label>
                <Input
                  type="number"
                  min={0}
                  value={scoreAway}
                  onChange={(e) => setScoreAway(e.target.value)}
                  className="font-black text-center text-base rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-[#FF3737] hover:bg-[#e02e2e] text-white font-bold rounded-xl gap-1.5 px-4"
          >
            <Save className="w-3.5 h-3.5" />
            Enregistrer &amp; Recalculer
          </Button>
        </div>
      </form>
    </div>
  );
};
