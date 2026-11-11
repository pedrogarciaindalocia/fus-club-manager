import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calculator, Calendar, CheckCircle2, FileCode, Sparkles, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import {
  frmfDataService,
  type FRMFDatabaseMutationResult,
  type FRMFDataset,
} from '../../../services/frmfDataService';
import { parseFRMFResultsHtml } from '../../../utils/frmfHtmlParser';

interface FrmfHtmlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: string;
  initialGroup: string;
  initialDay: number;
  categories: string[];
  onImported: (
    nextDataset: FRMFDataset,
    category: string,
    group: string,
    importedDay: number,
    dbResult: FRMFDatabaseMutationResult
  ) => void;
}

export const FrmfHtmlImportModal: React.FC<FrmfHtmlImportModalProps> = ({
  isOpen,
  onClose,
  initialCategory,
  initialGroup,
  initialDay,
  categories,
  onImported,
}) => {
  const [targetCategory, setTargetCategory] = useState(initialCategory || 'U21');
  const [targetGroup, setTargetGroup] = useState(initialGroup || 'Poule Unique');
  const [targetDay, setTargetDay] = useState<number>(initialDay > 0 ? initialDay : 1);
  const [htmlResultsInput, setHtmlResultsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cat = initialCategory || 'U21';
      setTargetCategory(cat);
      const groups = frmfDataService.getGroups(cat);
      setTargetGroup(groups.includes(initialGroup) ? initialGroup : groups[0] || 'Poule Unique');
      setTargetDay(initialDay > 0 ? initialDay : 1);
      setHtmlResultsInput('');
    }
  }, [isOpen, initialCategory, initialGroup, initialDay]);

  const availableCategories = useMemo(
    () => (categories.length > 0 ? categories : frmfDataService.getCategories()),
    [categories]
  );

  const availableGroups = useMemo(
    () => frmfDataService.getGroups(targetCategory),
    [targetCategory]
  );

  const totalDays = useMemo(
    () => frmfDataService.getTotalDays(targetCategory, targetGroup),
    [targetCategory, targetGroup]
  );

  const resultsPreview = useMemo(() => {
    if (!htmlResultsInput.trim()) return null;
    try {
      return parseFRMFResultsHtml(htmlResultsInput, targetCategory, targetGroup, targetDay);
    } catch {
      return null;
    }
  }, [htmlResultsInput, targetCategory, targetGroup, targetDay]);

  if (!isOpen) return null;

  const handleCategoryChange = (cat: string) => {
    setTargetCategory(cat);
    const nextGroups = frmfDataService.getGroups(cat);
    setTargetGroup(nextGroups[0] || 'Poule Unique');
    const maxDays = frmfDataService.getTotalDays(cat, nextGroups[0]);
    if (targetDay > maxDays) {
      setTargetDay(maxDays);
    }
  };

  const handleExtract = async () => {
    if (!htmlResultsInput.trim()) {
      toast.error('Veuillez coller le code HTML des résultats pour la journée choisie.');
      return;
    }

    try {
      setIsSaving(true);
      const parsedResults = parseFRMFResultsHtml(htmlResultsInput, targetCategory, targetGroup, targetDay);

      if (!parsedResults || parsedResults.matches.length === 0) {
        toast.error('Aucun match détecté dans le code HTML collé.');
        return;
      }

      const dbRes = await frmfDataService.applyResultsHtmlImportAsync({
        category: targetCategory,
        group: targetGroup,
        resultsDay: targetDay,
        matches: parsedResults.matches,
      });

      if (dbRes.savedToDb) {
        toast.success(
          `${targetCategory} (${targetGroup}) • Journée ${targetDay} : ${parsedResults.matches.length} match(s) enregistrés en base de données et classement recalculé.`
        );
      } else if (dbRes.dbStatus === 'migration_required') {
        toast.warning(
          `${parsedResults.matches.length} match(s) enregistrés localement, mais la table SQL frmf_matches doit être exécutée dans Supabase.`
        );
      } else {
        toast.error(
          `Enregistrés localement uniquement (erreur BDD : ${dbRes.errorMessage || 'inconnue'}).`
        );
      }

      onImported(dbRes.dataset, targetCategory, targetGroup, targetDay, dbRes);
      onClose();
    } catch (err: any) {
      toast.error(`Erreur d'extraction HTML : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-[#FF3737] dark:bg-red-950/40 mb-1.5">
              <FileCode className="w-3 h-3" />
              Import HTML des Résultats par Journée
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Coller HTML Résultats FRMF — Calcul automatique du classement
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Choisissez la catégorie, la poule et la journée puis collez le HTML des résultats. Le classement officiel est calculé automatiquement.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteurs Catégorie, Groupe & Journée */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Catégorie *
            </label>
            <select
              aria-label="Catégorie cible"
              value={targetCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF3737]"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Groupe / Poule *
            </label>
            <select
              aria-label="Groupe cible"
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
              className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF3737]"
            >
              {availableGroups.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Journée cible *
            </label>
            <select
              aria-label="Journée cible"
              value={targetDay}
              onChange={(e) => setTargetDay(Number(e.target.value))}
              className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF3737]"
            >
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Journée {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone HTML des résultats uniquement */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-[#FF3737]" />
              HTML Résultats — {targetCategory} ({targetGroup}) • Journée {targetDay}
            </span>
            <div className="flex items-center gap-2">
              {resultsPreview?.detectedDay && resultsPreview.detectedDay !== targetDay && (
                <button
                  type="button"
                  onClick={() => setTargetDay(resultsPreview.detectedDay!)}
                  className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  Journée {resultsPreview.detectedDay} détectée (appliquer)
                </button>
              )}
              {resultsPreview && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${
                    resultsPreview.matches.length > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {resultsPreview.matches.length} match(s) détecté(s)
                </span>
              )}
            </div>
          </div>

          <textarea
            rows={10}
            value={htmlResultsInput}
            onChange={(e) => setHtmlResultsInput(e.target.value)}
            placeholder="Collez ici le HTML des matchs / résultats de la journée FRMF..."
            className="w-full p-3 font-mono text-[11px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF3737] resize-none"
          />

          {/* Aperçu des matchs détectés */}
          {resultsPreview && resultsPreview.matches.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Aperçu des matchs à enregistrer (Journée {targetDay})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {resultsPreview.matches.map((m, idx) => (
                  <div
                    key={`${m.home_team}-${m.away_team}-${idx}`}
                    className="flex items-center justify-between gap-2 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                  >
                    <span className="truncate text-slate-800 dark:text-slate-200">{m.home_team}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-black shrink-0">
                      {m.score_home !== null && m.score_away !== null ? `${m.score_home} - ${m.score_away}` : 'VS'}
                    </span>
                    <span className="truncate text-right text-slate-800 dark:text-slate-200">{m.away_team}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rappel calcul automatique */}
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
          <Calculator className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Classement calculé automatiquement depuis les résultats</p>
            <p className="text-[11px] opacity-90">
              En cas d&apos;égalité : différence de buts générale puis meilleure attaque (classement provisoire). Les confrontations directes s&apos;activent uniquement une fois la phase retour entre équipes ex æquo clôturée ou en fin de championnat.
            </p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>
            <strong>Astuce Chrome :</strong> Sur la page Programme &amp; Résultats FRMF, utilisez{' '}
            <kbd className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded font-mono font-bold">Cmd + Option + U</kbd>{' '}
            puis copiez le bloc HTML des matchs de la journée.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleExtract}
            disabled={!htmlResultsInput.trim() || isSaving}
            className="flex items-center gap-2 bg-[#FF3737] hover:bg-[#e02e2e] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-red-500/20 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Enregistrement BDD...' : 'Enregistrer & Recalculer'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
