import React, { useState } from 'react';
import {
  Activity,
  Flame,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Gauge,
  Plus,
  Search,
  Filter,
  ShieldAlert,
  Zap,
  Download,
  X,
  Check
} from 'lucide-react';
import type { PlayerTrainingLoad, TrainingSession, LoadAlertStatus } from '../types/training';

interface TrainingLoadViewProps {
  loads: PlayerTrainingLoad[];
  sessions: TrainingSession[];
  onSaveLoad: (load: Omit<PlayerTrainingLoad, 'id'>) => Promise<any>;
}

export const TrainingLoadView: React.FC<TrainingLoadViewProps> = ({
  loads,
  sessions,
  onSaveLoad,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [isNewLoadModalOpen, setIsNewLoadModalOpen] = useState(false);

  // Form state
  const [formPlayerName, setFormPlayerName] = useState('Amine Zouhair');
  const [formPlayerId, setFormPlayerId] = useState('p-1');
  const [formSessionId, setFormSessionId] = useState(sessions[0]?.id || '');
  const [formDuration, setFormDuration] = useState(90);
  const [formRpe, setFormRpe] = useState(7);
  const [formDistance, setFormDistance] = useState(8.4);
  const [formHighIntensity, setFormHighIntensity] = useState(620);
  const [formSprints, setFormSprints] = useState(14);
  const [formAccels, setFormAccels] = useState(38);
  const [formDecels, setFormDecels] = useState(32);
  const [formMaxSpeed, setFormMaxSpeed] = useState(31.5);

  // Calculate training load
  const computedLoad = formDuration * formRpe;

  // Filtered loads
  const filteredLoads = loads.filter(l => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!l.player_name.toLowerCase().includes(q)) return false;
    }
    if (alertFilter !== 'all' && l.alert_status !== alertFilter) return false;
    return true;
  });

  // Group metrics
  const totalLoadsCount = loads.length;
  const avgLoadValue = totalLoadsCount > 0
    ? Math.round(loads.reduce((acc, l) => acc + l.training_load, 0) / totalLoadsCount)
    : 520;
  const spikeAlertsCount = loads.filter(l => l.alert_status === 'spike' || l.alert_status === 'high').length;
  const optimalCount = loads.filter(l => l.alert_status === 'optimal').length;

  const getAlertBadge = (status: LoadAlertStatus) => {
    switch (status) {
      case 'optimal':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3 h-3" /> Optimale
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
            <AlertTriangle className="w-3 h-3" /> Charge Élevée
          </span>
        );
      case 'spike':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-black animate-pulse">
            <ShieldAlert className="w-3 h-3" /> Pic de Charge (Spike)
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium">
            Sous-charge
          </span>
        );
    }
  };

  const handleCreateLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSession = sessions.find(s => s.id === formSessionId);
    let alertStatus: LoadAlertStatus = 'optimal';
    if (computedLoad > 700) alertStatus = 'spike';
    else if (computedLoad > 550) alertStatus = 'high';
    else if (computedLoad < 300) alertStatus = 'low';

    await onSaveLoad({
      player_id: formPlayerId,
      player_name: formPlayerName,
      session_id: formSessionId,
      session_date: targetSession?.session_date || new Date().toISOString().split('T')[0],
      duration_minutes: formDuration,
      rpe_score: formRpe,
      training_load: computedLoad,
      distance_km: formDistance,
      high_intensity_distance_m: formHighIntensity,
      sprint_count: formSprints,
      accelerations: formAccels,
      decelerations: formDecels,
      max_speed_kmh: formMaxSpeed,
      acute_chronic_ratio: 1.15,
      alert_status: alertStatus,
      notes: 'Données GPS Catapult synchronisées'
    });

    setIsNewLoadModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview Load KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Charge Moyenne Équipe
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {avgLoadValue} <span className="text-xs font-normal text-slate-400">u.a.</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Durée × RPE
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              État Optimal
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {optimalCount} <span className="text-xs font-normal text-slate-400">joueurs</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Adaptation physiologique idéale
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Alertes Pic / Surcharge
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {spikeAlertsCount} <span className="text-xs font-normal text-slate-400">alertes</span>
            </div>
            <span className="text-[11px] text-rose-500 font-semibold mt-0.5 block">
              Risque de blessure accru (A:C &gt; 1.4)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center border border-rose-200 dark:border-rose-800">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Capteurs GPS Actifs
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              100%
            </div>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 block">
              Catapult / Wimu Sync
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center border border-blue-200 dark:border-blue-800">
            <Gauge className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 7-Day Load Progression & Formula Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-3xl border border-emerald-800/40 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" /> Modèle de suivi de charge FUS
            </div>
            <h3 className="text-lg font-black text-white">
              Calcul de la Charge Interne : Charge = Durée (min) × RPE (1-10)
            </h3>
            <p className="text-slate-300 text-xs mt-1 max-w-xl">
              Complété par les métriques GPS externes (Distances DHI, Accélérations et Décélérations) pour anticiper la fatigue musculaire et individualiser la récupération.
            </p>
          </div>

          <button
            onClick={() => setIsNewLoadModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 self-start md:self-auto shrink-0 transition"
          >
            <Plus className="w-4 h-4" /> Enregistrer une charge joueur
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Filtrer par nom de joueur..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Statut alerte :</span>
          <select
            value={alertFilter}
            onChange={e => setAlertFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Tous statuts</option>
            <option value="optimal">Optimale</option>
            <option value="high">Charge Élevée</option>
            <option value="spike">Pic de Charge (Spike)</option>
            <option value="low">Sous-charge</option>
          </select>
        </div>
      </div>

      {/* Loads & GPS Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-slate-900 dark:text-white text-sm">
            Détail des Charges & Métriques GPS ({filteredLoads.length} enregistrements)
          </h3>
          <span className="text-xs text-slate-400">
            Export CSV / PDF disponible
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Joueur & Séance</th>
                <th className="p-4 text-center">Durée</th>
                <th className="p-4 text-center">RPE (1-10)</th>
                <th className="p-4 text-center">Charge (u.a.)</th>
                <th className="p-4 text-center">Dist. Totale</th>
                <th className="p-4 text-center">DHI (&gt;19.8km/h)</th>
                <th className="p-4 text-center">Sprints</th>
                <th className="p-4 text-center">Acc / Dec</th>
                <th className="p-4 text-center">Ratio A/C</th>
                <th className="p-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredLoads.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.player_name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.session_date}
                    </div>
                  </td>

                  <td className="p-4 text-center text-slate-700 dark:text-slate-300">
                    {item.duration_minutes} min
                  </td>

                  <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400">
                    {item.rpe_score}/10
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-black text-sm">
                      {item.training_load}
                    </span>
                  </td>

                  <td className="p-4 text-center text-slate-700 dark:text-slate-300 font-semibold">
                    {item.distance_km} km
                  </td>

                  <td className="p-4 text-center text-slate-700 dark:text-slate-300">
                    {item.high_intensity_distance_m} m
                  </td>

                  <td className="p-4 text-center text-slate-700 dark:text-slate-300 font-bold">
                    {item.sprint_count}
                  </td>

                  <td className="p-4 text-center text-slate-500 text-[11px]">
                    +{item.accelerations} / -{item.decelerations}
                  </td>

                  <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-200">
                    {item.acute_chronic_ratio || "1.10"}
                  </td>

                  <td className="p-4 text-center">
                    {getAlertBadge(item.alert_status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: INPUT LOAD / GPS */}
      {isNewLoadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 relative flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                  Saisie de données d'entraînement
                </span>
                <h3 className="text-xl font-black text-white">
                  Enregistrer Charge & Données GPS
                </h3>
              </div>
              <button
                onClick={() => setIsNewLoadModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoad} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Joueur *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPlayerName}
                    onChange={e => setFormPlayerName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Séance concernée
                  </label>
                  <select
                    value={formSessionId}
                    onChange={e => setFormSessionId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.session_date})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Durée de la séance (min)
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={e => setFormDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    RPE ressenti du joueur (1 à 10)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formRpe}
                      onChange={e => setFormRpe(Number(e.target.value))}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="font-bold text-base text-emerald-600 w-8">{formRpe}/10</span>
                  </div>
                </div>
              </div>

              {/* Computed Internal Load */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Charge d'entraînement calculée (Durée × RPE) :
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {computedLoad} u.a.
                </span>
              </div>

              {/* GPS Metrics */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                  Métriques GPS Externes (Capteurs)
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Distance totale (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formDistance}
                      onChange={e => setFormDistance(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">DHI (&gt;19.8 km/h en m)</label>
                    <input
                      type="number"
                      value={formHighIntensity}
                      onChange={e => setFormHighIntensity(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Nombre de sprints</label>
                    <input
                      type="number"
                      value={formSprints}
                      onChange={e => setFormSprints(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Vitesse max (km/h)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formMaxSpeed}
                      onChange={e => setFormMaxSpeed(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewLoadModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Enregistrer la charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
