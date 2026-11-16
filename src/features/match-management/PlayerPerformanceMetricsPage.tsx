import React from 'react';
import { Lock, Sliders, Trophy } from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { useMetricSets } from '../../hooks/useMetricSets';
import { MetricsManagement } from '../club-management/components/MetricsManagement';

export const PlayerPerformanceMetricsPage: React.FC = () => {
  const { hasSubModuleAccess } = usePermissions();
  const { isScoutUser } = useMetricSets();

  const canCreate = hasSubModuleAccess('player_performance_metrics', 'create');
  const canUpdate = hasSubModuleAccess('player_performance_metrics', 'update');
  const canDelete = hasSubModuleAccess('player_performance_metrics', 'delete');

  if (isScoutUser) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center max-w-2xl mx-auto my-8 space-y-3">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-900">
          Accès restreint — Gestion des Métriques (Performance Joueur)
        </h2>
        <p className="text-sm text-slate-600">
          Le référentiel Performance Joueur est réservé au staff technique et isolé des comptes Scouts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-14">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 text-white p-6 sm:p-7 shadow-lg border border-slate-800">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-[10px] font-black uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              Compétition &amp; Matchs
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-[10px] font-bold">
              <Sliders className="w-3 h-3 text-amber-400" />
              Métriques Performance Joueur
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Gestion des Métriques — Performance Joueur
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
            Ajoutez, modifiez ou supprimez les postes et les critères des 4 piliers (Technique, Tactique, Physique, Mental) utilisés dans la rubrique Performance Joueur et dans l&apos;application mobile.
          </p>
        </div>
      </div>

      <MetricsManagement
        onlyPlayerPerformance
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
};

export default PlayerPerformanceMetricsPage;

