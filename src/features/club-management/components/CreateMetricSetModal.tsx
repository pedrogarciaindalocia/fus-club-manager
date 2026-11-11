import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Layers, Save, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  METRIC_SET_SCOPE_META,
  type MetricSet,
  type MetricSetScope,
  type MetricSetTemplateMode,
} from '../../../utils/metricSetsHelpers';

interface CreateMetricSetModalProps {
  isOpen: boolean;
  editingSet?: MetricSet | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    emoji: string;
    scope: MetricSetScope;
    templateMode: MetricSetTemplateMode;
  }) => Promise<void>;
}

const EMOJI_PRESETS = ['📈', '⚡', '🏆', '🔥', '🎯', '🩺', '📊', '💎'];

export const CreateMetricSetModal: React.FC<CreateMetricSetModalProps> = ({
  isOpen,
  editingSet,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('📈');
  const [scope, setScope] = useState<MetricSetScope>('player_performance');
  const [templateMode, setTemplateMode] = useState<MetricSetTemplateMode>('performance_preset');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingSet) {
      setName(editingSet.name || '');
      setDescription(editingSet.description || '');
      setEmoji(editingSet.emoji || '📈');
      setScope(editingSet.scope || 'player_performance');
    } else {
      setName('');
      setDescription('');
      setEmoji('📈');
      setScope('player_performance');
      setTemplateMode('performance_preset');
    }
  }, [isOpen, editingSet]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        emoji: emoji.trim() || '📈',
        scope,
        templateMode,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-6"
      >
        <form onSubmit={handleFormSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-xl shrink-0">
                {emoji || '📈'}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingSet ? 'Modifier le Lot de Métriques' : 'Créer un Nouveau Lot de Métriques'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Référentiel dynamique dédié au staff (Performance Joueur), 100 % isolé des scouts.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bandeau d'isolation anti-scout */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Isolation garantie vis-à-vis des Scouts & Détection V2</p>
              <p className="text-[11px] text-emerald-800/90 mt-0.5">
                Ce lot est stocké dans un espace distinct des scouts : il ne modifie jamais les
                métriques actuelles de Détection V2 / fus-scout et reste invisible pour les comptes Scouts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nom du lot *</label>
              <Input
                required
                placeholder="ex: Performance Joueur, Suivi Match Club, Forme Physique..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Icône / Emoji</label>
              <Input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={2}
                className="rounded-xl border-slate-200 text-center text-lg"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {EMOJI_PRESETS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`w-6 h-6 rounded-md text-xs flex items-center justify-center transition ${
                      emoji === em ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Périmètre d&apos;utilisation (Hors-Scout)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(METRIC_SET_SCOPE_META) as MetricSetScope[]).map(sc => {
                const meta = METRIC_SET_SCOPE_META[sc];
                const isSelected = scope === sc;
                return (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setScope(sc)}
                    className={`text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{meta.label}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {meta.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Description</label>
            <Input
              placeholder="Objectif et usage de ce lot de métriques..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="rounded-xl border-slate-200"
            />
          </div>

          {!editingSet && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Structure de départ (Postes & 4 Piliers)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTemplateMode('performance_preset')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    templateMode === 'performance_preset'
                      ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-500/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    Modèle Performance
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    10 postes + critères Performance Joueur pré-remplis et modifiables.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateMode('positions_only')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    templateMode === 'positions_only'
                      ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-500/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">10 postes (grilles vides)</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Crée les 10 postes (de Gardien de but à Avant-centre) prêts pour saisir vos propres critères.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateMode('blank')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    templateMode === 'blank'
                      ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-500/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">Lot vierge (0 poste)</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Démarre à vide pour définir uniquement vos postes sur mesure.
                  </p>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-semibold">
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim() || isSaving} className="rounded-xl shadow-md font-bold px-6">
              <Save className="w-4 h-4 mr-2" />
              {editingSet ? 'Enregistrer le lot' : 'Créer ce lot'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
