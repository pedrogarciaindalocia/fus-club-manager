import React, { useMemo, useState } from 'react';
import { useMetrics, type MetricPosition, type MetricPillar } from '../../../hooks/useMetrics';
import { useMetricSets } from '../../../hooks/useMetricSets';
import {
  METRIC_SET_SCOPE_META,
  SCOUTING_LOCKED_SET_ID,
  getMetricCategoryFrenchLabel,
  getMetricPositionFrenchName,
  sanitizeCriteriaPayload,
  slugifyMetricSetCode,
  type MetricPositionCategory,
  type MetricSet,
  type MetricSetScope,
  type MetricSetTemplateMode,
} from '../../../utils/metricSetsHelpers';
import { CreateMetricSetModal } from './CreateMetricSetModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Target,
  Brain,
  Shield,
  Zap,
  Lock,
  Compass,
  FolderPlus,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { FusLogoLoader } from '../../../components/ui/FusLogoLoader';

interface EditablePositionItem {
  id: string;
  code: string;
  name: string;
  emoji: string;
  category: MetricPositionCategory;
  criteria: {
    technique: string[];
    tactique: string[];
    physique: string[];
    mental: string[];
  };
}

export const MetricsManagement: React.FC = () => {
  // Lot 1 (verrouillé) : Panier historique Scouting / Détection V2 (metric_positions)
  const {
    positions: scoutPositions,
    isLoading: isLoadingScoutMetrics,
    createPosition: createScoutPosition,
    updatePosition: updateScoutPosition,
    deletePosition: deleteScoutPosition,
  } = useMetrics();

  // Lots dynamiques hors-Scouts : Performance Joueur & lots personnalisés (metric_sets / metric_set_positions)
  const {
    metricSets,
    getPositionsForSet,
    isLoadingSets,
    isLoadingPositions: isLoadingSetPositions,
    isScoutUser,
    needsSqlMigration,
    createMetricSet,
    updateMetricSet,
    deleteMetricSet,
    createSetPosition,
    updateSetPosition,
    deleteSetPosition,
  } = useMetricSets();

  // Sélecteur de lot actif : par défaut on préserve l'affichage sur le lot Scouting ou bascule librement (si non-scout)
  const [selectedSetId, setSelectedSetId] = useState<string>(SCOUTING_LOCKED_SET_ID);

  // Sécurité : si un compte Scout est détecté, forcer strictement l'onglet Scouting verrouillé
  const effectiveSetId = isScoutUser ? SCOUTING_LOCKED_SET_ID : selectedSetId;
  const activeCustomSet: MetricSet | null = useMemo(() => {
    if (effectiveSetId === SCOUTING_LOCKED_SET_ID || isScoutUser) return null;
    return metricSets.find(s => s.id === effectiveSetId) || null;
  }, [effectiveSetId, isScoutUser, metricSets]);

  const isScoutingActive = !activeCustomSet;

  // États UI communs (zéro duplication pour cartes & modale d'édition)
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EditablePositionItem>>({});
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [newCriterionInputs, setNewCriterionInputs] = useState<Record<string, string>>({});

  // États pour gestion des lots dynamiques
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [editingSetMeta, setEditingSetMeta] = useState<MetricSet | null>(null);
  const [confirmDeleteSetId, setConfirmDeleteSetId] = useState<string | null>(null);

  const pillars: { key: MetricPillar; icon: any; label: string; color: string }[] = [
    { key: 'technique', icon: Target, label: 'Technique', color: 'bg-emerald-100 text-emerald-800' },
    { key: 'tactique', icon: Shield, label: 'Tactique', color: 'bg-indigo-100 text-indigo-800' },
    { key: 'physique', icon: Zap, label: 'Physique', color: 'bg-rose-100 text-rose-800' },
    { key: 'mental', icon: Brain, label: 'Mental', color: 'bg-amber-100 text-amber-800' },
  ];

  // Liste paramétrée des postes selon le lot actif
  const activePositions: EditablePositionItem[] = useMemo(() => {
    if (isScoutingActive) {
      return scoutPositions;
    }
    return getPositionsForSet(activeCustomSet!.id);
  }, [isScoutingActive, scoutPositions, getPositionsForSet, activeCustomSet]);

  const isLoadingActive = isScoutingActive
    ? isLoadingScoutMetrics
    : isLoadingSets || isLoadingSetPositions;

  const handleSelectSet = (setId: string) => {
    if (isScoutUser && setId !== SCOUTING_LOCKED_SET_ID) return;
    setSelectedSetId(setId);
    setFilterCat('ALL');
    setIsEditing(null);
    setIsDeletingId(null);
    setConfirmDeleteSetId(null);
  };

  const handleEditClick = (pos: EditablePositionItem) => {
    setEditForm(JSON.parse(JSON.stringify(pos)));
    setIsEditing(pos.id);
    setNewCriterionInputs({});
  };

  const handleAddNewPosition = () => {
    const newId = 'NEW_POS_' + Date.now();
    setEditForm({
      code: '',
      name: '',
      emoji: '👤',
      category: 'MF',
      criteria: { technique: [], tactique: [], physique: [], mental: [] },
    });
    setIsEditing(newId);
    setNewCriterionInputs({});
  };

  const handleSavePosition = async (id: string) => {
    const trimmedName = (editForm.name || '').trim();
    if (!trimmedName) return;
    const resolvedCode =
      (editForm.code || '').trim() ||
      slugifyMetricSetCode(
        trimmedName,
        activePositions.map(p => p.code)
      );
    try {
      const mergedCriteria = {
        technique: [...(editForm.criteria?.technique || [])],
        tactique: [...(editForm.criteria?.tactique || [])],
        physique: [...(editForm.criteria?.physique || [])],
        mental: [...(editForm.criteria?.mental || [])],
      };

      pillars.forEach(p => {
        const pending = (newCriterionInputs[p.key] || '').trim();
        if (pending) {
          mergedCriteria[p.key].push(pending);
        }
      });

      const cleanCriteria = sanitizeCriteriaPayload(mergedCriteria);

      if (isScoutingActive) {
        // Lot 1 (Scouting) : écriture stricte sur metric_positions uniquement
        const scoutPayload: Partial<MetricPosition> = {
          code: resolvedCode,
          name: trimmedName,
          emoji: editForm.emoji || '👤',
          category: (editForm.category || 'MF') as MetricPositionCategory,
          criteria: cleanCriteria,
        };
        if (id.startsWith('NEW_POS_')) {
          await createScoutPosition(scoutPayload as Omit<MetricPosition, 'id'>);
        } else {
          await updateScoutPosition({ id, data: scoutPayload });
        }
      } else if (activeCustomSet) {
        // Lots dynamiques hors-scouts : écriture isolée sur metric_set_positions
        if (id.startsWith('NEW_POS_')) {
          await createSetPosition({
            metric_set_id: activeCustomSet.id,
            code: resolvedCode,
            name: trimmedName,
            emoji: editForm.emoji || '👤',
            category: (editForm.category || 'MF') as MetricPositionCategory,
            criteria: cleanCriteria,
          });
        } else {
          await updateSetPosition({
            id,
            data: {
              code: resolvedCode,
              name: trimmedName,
              emoji: editForm.emoji || '👤',
              category: (editForm.category || 'MF') as MetricPositionCategory,
              criteria: cleanCriteria,
            },
          });
        }
      }

      setIsEditing(null);
      setEditForm({});
      setNewCriterionInputs({});
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelPosition = () => {
    setIsEditing(null);
    setEditForm({});
    setNewCriterionInputs({});
  };

  const handleDeletePosition = async (id: string) => {
    try {
      if (isScoutingActive) {
        await deleteScoutPosition(id);
      } else {
        await deleteSetPosition(id);
      }
      setIsDeletingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSetModal = async (payload: {
    name: string;
    description: string;
    emoji: string;
    scope: MetricSetScope;
    templateMode: MetricSetTemplateMode;
  }) => {
    if (editingSetMeta) {
      await updateMetricSet({
        id: editingSetMeta.id,
        data: {
          name: payload.name,
          description: payload.description,
          emoji: payload.emoji,
          scope: payload.scope,
        },
      });
      setEditingSetMeta(null);
    } else {
      const created = await createMetricSet(payload);
      setSelectedSetId(created.id);
    }
  };

  const handleConfirmDeleteSet = async (setId: string) => {
    await deleteMetricSet(setId);
    setConfirmDeleteSetId(null);
    setSelectedSetId(SCOUTING_LOCKED_SET_ID);
  };

  const addCriterion = (pillar: MetricPillar, value: string) => {
    if (!value.trim()) return;
    setEditForm(prev => ({
      ...prev,
      criteria: {
        ...(prev.criteria as any),
        [pillar]: [...(prev.criteria?.[pillar] || []), value.trim()],
      },
    }));
  };

  const removeCriterion = (pillar: MetricPillar, idx: number) => {
    setEditForm(prev => {
      const arr = [...(prev.criteria?.[pillar] || [])];
      arr.splice(idx, 1);
      return {
        ...prev,
        criteria: {
          ...(prev.criteria as any),
          [pillar]: arr,
        },
      };
    });
  };

  if (isLoadingActive) {
    return <FusLogoLoader fullPage size="md" label="Chargement des métriques..." />;
  }

  const filtered =
    filterCat === 'ALL'
      ? activePositions
      : activePositions.filter(p => p.category === filterCat);

  const activeScopeMeta = activeCustomSet
    ? METRIC_SET_SCOPE_META[activeCustomSet.scope] || METRIC_SET_SCOPE_META.player_performance
    : null;

  return (
    <div className="space-y-6">
      {/* BANDEAU MULTI-LOTS : LOT SCOUTING VERROUILLÉ + LOTS DYNAMIQUES HORS-SCOUTS */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              Lots de Métriques Dynamiques
              <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-600">
                Séparation stricte Scouting / Club
              </Badge>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Le lot actuel reste dédié aux Scouts &amp; Détection V2. Créez des lots séparés (ex : Performance Joueur) sans jamais affecter les scouts.
            </p>
          </div>

          {!isScoutUser && (
            <Button
              type="button"
              onClick={() => {
                setEditingSetMeta(null);
                setIsSetModalOpen(true);
              }}
              size="sm"
              className="rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800 text-white shrink-0"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Créer un nouveau lot
            </Button>
          )}
        </div>

        {/* Sélecteur d'onglets par lot */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Onglet 1 : Lot Scouting Historique (Intact) */}
          <button
            type="button"
            onClick={() => handleSelectSet(SCOUTING_LOCKED_SET_ID)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
              isScoutingActive
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Compass className={`w-4 h-4 ${isScoutingActive ? 'text-amber-400' : 'text-amber-600'}`} />
            <span>Scouting / Détection V2 (Actuel)</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                isScoutingActive
                  ? 'bg-amber-400/20 text-amber-200'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Scouts uniquement
            </span>
          </button>

          {/* Onglets 2..N : Lots dynamiques isolés (Totalement masqués aux Scouts) */}
          {!isScoutUser &&
            metricSets.map(set => {
              const isSelected = activeCustomSet?.id === set.id;
              return (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => handleSelectSet(set.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-sky-700 text-white border-sky-700 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/40'
                  }`}
                >
                  <span className="text-sm">{set.emoji || '📈'}</span>
                  <span>{set.name}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <Lock className="w-2.5 h-2.5" />
                    Hors-Scout
                  </span>
                </button>
              );
            })}
        </div>

        {/* Statut d'isolation du lot actif */}
        {isScoutingActive ? (
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Référentiel Scout actif :</strong> utilisé par{' '}
                <em>Détection &amp; Recrutement V2</em> et l&apos;app mobile <em>fus-scout</em>.
                Les autres lots n&apos;affectent jamais cette panoplie.
              </span>
            </div>
          </div>
        ) : (
          activeCustomSet && (
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs text-sky-950 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base">{activeCustomSet.emoji || '📈'}</span>
                  <span className="font-black text-sm text-slate-900">{activeCustomSet.name}</span>
                  {activeScopeMeta && (
                    <Badge variant="outline" className={`text-[10px] font-bold ${activeScopeMeta.badgeClass}`}>
                      {activeScopeMeta.label}
                    </Badge>
                  )}
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Inaccessible aux Scouts
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600">
                  {activeCustomSet.description ||
                    'Lot dynamique réservé au staff pour mesurer la performance des joueurs à part des scouts.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSetMeta(activeCustomSet);
                    setIsSetModalOpen(true);
                  }}
                  className="h-8 rounded-xl text-xs border-slate-300 bg-white"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                  Modifier le lot
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDeleteSetId(activeCustomSet.id)}
                  className="h-8 rounded-xl text-xs border-rose-200 text-rose-700 hover:bg-rose-50 bg-white"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Supprimer le lot
                </Button>
              </div>
            </div>
          )
        )}

        {/* Confirmation suppression d'un lot */}
        {activeCustomSet && confirmDeleteSetId === activeCustomSet.id && (
          <div className="p-3 bg-rose-50 text-rose-900 rounded-2xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-rose-200">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Supprimer définitivement le lot <strong>« {activeCustomSet.name} »</strong> et ses{' '}
                {activePositions.length} poste(s) ? (Le lot Scouting reste intact.)
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteSetId(null)}
                className="h-7 text-xs"
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleConfirmDeleteSet(activeCustomSet.id)}
                className="h-7 text-xs rounded-lg shadow-sm"
              >
                Confirmer la suppression
              </Button>
            </div>
          </div>
        )}

        {/* Alerte non-bloquante si tables SQL metric_sets non encore créées dans Supabase */}
        {!isScoutingActive && needsSqlMigration && (
          <div className="p-3 rounded-2xl bg-slate-900 text-slate-100 text-xs flex items-start gap-2.5">
            <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Mode cache local actif : exécutez la migration Supabase pour synchroniser ce lot multi-utilisateurs
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Exécutez{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                  fus-dashboard/supabase/migrations/20261110_create_dynamic_metric_sets.sql
                </code>{' '}
                dans le SQL Editor Supabase.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* EN-TÊTE POSTES & FILTRES DU LOT ACTIF */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Postes &amp; Métriques —{' '}
            <span className="text-primary">
              {isScoutingActive ? 'Scouting / Détection V2' : activeCustomSet?.name}
            </span>
          </h3>
          <p className="text-sm text-slate-500">
            {isScoutingActive
              ? 'Gérez les grilles d’évaluation Scouting pour chaque profil de joueur.'
              : `Configurez librement les postes et 4 piliers du lot « ${activeCustomSet?.name} » (sans impact sur les scouts).`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['ALL', 'GK', 'DF', 'MF', 'FW'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  filterCat === cat
                    ? 'bg-white shadow text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {getMetricCategoryFrenchLabel(cat)}
              </button>
            ))}
          </div>
          <Button type="button" onClick={handleAddNewPosition} size="sm" className="rounded-xl shadow">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Poste
          </Button>
        </div>
      </div>

      {/* ÉTAT VIDE POUR UN LOT VIERGE */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="text-3xl">{activeCustomSet?.emoji || '📊'}</div>
          <h4 className="text-base font-bold text-slate-900">
            Aucun poste configuré dans {filterCat === 'ALL' ? 'ce lot' : `la catégorie ${getMetricCategoryFrenchLabel(filterCat)}`}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ajoutez votre premier poste et définissez vos critères sur les 4 piliers (Technique, Tactique, Physique, Mental).
          </p>
          <Button type="button" onClick={handleAddNewPosition} size="sm" className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un poste
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filtered.map(pos => (
              <div key={pos.id}>
                <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-2xl shrink-0">
                          {pos.emoji}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {getMetricPositionFrenchName(pos)}
                          </CardTitle>
                          <CardDescription className="font-medium text-primary/80 mt-0.5">
                            Catégorie : {getMetricCategoryFrenchLabel(pos.category)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-primary rounded-lg"
                          onClick={() => handleEditClick(pos)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg"
                          onClick={() => setIsDeletingId(pos.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 grow flex flex-col gap-4">
                    {isDeletingId === pos.id && (
                      <div className="p-3 bg-rose-50 text-rose-800 rounded-2xl text-xs flex justify-between items-center border border-rose-200">
                        <div className="flex items-center gap-2 font-medium">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          Confirmer suppression ?
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDeletingId(null)}
                            className="h-7 text-xs"
                          >
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePosition(pos.id)}
                            className="h-7 text-xs rounded-lg shadow-sm"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pillars.map(pillar => (
                        <div key={pillar.key} className="space-y-2">
                          <h4
                            className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 p-1.5 rounded-lg ${pillar.color}`}
                          >
                            <pillar.icon className="w-3.5 h-3.5" />
                            {pillar.label} ({(pos.criteria[pillar.key] || []).length})
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {(pos.criteria[pillar.key] || []).map((crit, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px] bg-slate-50 border-slate-200 text-slate-600 py-0 font-medium"
                              >
                                {crit}
                              </Badge>
                            ))}
                            {(pos.criteria[pillar.key] || []).length === 0 && (
                              <span className="text-[10px] text-slate-400 italic px-1">
                                Aucun critère
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 mt-auto border-t border-slate-100 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(pos)}
                        className="text-xs font-bold text-primary hover:bg-primary/10 rounded-xl gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Modifier les critères
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
        </div>
      )}

      {/* MODALE D'ÉDITION / AJOUT D'UN POSTE & CRITÈRES (COMMUNE AU LOT ACTIF) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8"
          >
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {isEditing.startsWith('NEW') ? 'Nouveau Poste' : 'Modifier le Poste'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Lot actif :{' '}
                    <strong className="text-slate-800">
                      {isScoutingActive ? 'Scouting / Détection V2' : activeCustomSet?.name}
                    </strong>{' '}
                    — Configurez les informations du poste et ses critères d&apos;évaluation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPosition}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nom du poste (en français)</label>
                  <Input
                    placeholder="ex: Milieu central"
                    value={editForm.name || ''}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Catégorie</label>
                  <select
                    value={editForm.category || 'MF'}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="GK">Gardien</option>
                    <option value="DF">Défenseur</option>
                    <option value="MF">Milieu</option>
                    <option value="FW">Attaquant</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Icône / Emoji</label>
                  <Input
                    placeholder="ex: 🎯"
                    value={editForm.emoji || ''}
                    onChange={e => setEditForm({ ...editForm, emoji: e.target.value })}
                    className="rounded-xl border-slate-200 text-center"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900">Grille d&apos;évaluation</h3>
                  <span className="text-xs text-slate-400 font-medium">
                    💡 Modifiez directement le texte de chaque critère ci-dessous
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pillars.map(pillar => (
                    <div
                      key={pillar.key}
                      className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <h4
                          className={`text-xs font-bold uppercase tracking-wider flex items-center justify-between p-2 rounded-xl mb-3 ${pillar.color}`}
                        >
                          <span className="flex items-center gap-2">
                            <pillar.icon className="w-4 h-4" />
                            {pillar.label}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/70">
                            {(editForm.criteria?.[pillar.key] || []).length}
                          </span>
                        </h4>

                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                          {(editForm.criteria?.[pillar.key] || []).map((crit, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all"
                            >
                              <input
                                type="text"
                                value={crit}
                                onChange={e => {
                                  const val = e.target.value;
                                  setEditForm(prev => {
                                    const arr = [...(prev.criteria?.[pillar.key] || [])];
                                    arr[idx] = val;
                                    return {
                                      ...prev,
                                      criteria: {
                                        ...(prev.criteria as any),
                                        [pillar.key]: arr,
                                      },
                                    };
                                  });
                                }}
                                className="flex-1 text-xs font-semibold text-slate-800 bg-transparent border-none outline-none focus:outline-none"
                                placeholder="Nom du critère..."
                              />
                              <button
                                type="button"
                                onClick={() => removeCriterion(pillar.key, idx)}
                                className="p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                title="Supprimer ce critère"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {(editForm.criteria?.[pillar.key] || []).length === 0 && (
                            <div className="text-[11px] text-slate-400 italic py-3 text-center">
                              Aucun critère défini pour ce pilier
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <Input
                          placeholder="Ajouter un critère..."
                          className="rounded-xl text-xs border-slate-200 h-9 bg-white"
                          value={newCriterionInputs[pillar.key] || ''}
                          onChange={e =>
                            setNewCriterionInputs({
                              ...newCriterionInputs,
                              [pillar.key]: e.target.value,
                            })
                          }
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = (newCriterionInputs[pillar.key] || '').trim();
                              if (val) {
                                addCriterion(pillar.key, val);
                                setNewCriterionInputs({ ...newCriterionInputs, [pillar.key]: '' });
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 px-3 rounded-xl shadow-xs shrink-0 cursor-pointer"
                          onClick={() => {
                            const val = (newCriterionInputs[pillar.key] || '').trim();
                            if (val) {
                              addCriterion(pillar.key, val);
                              setNewCriterionInputs({ ...newCriterionInputs, [pillar.key]: '' });
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelPosition}
                  className="rounded-xl font-semibold"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSavePosition(isEditing)}
                  className="rounded-xl shadow-md font-bold px-6"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODALE CRÉATION / ÉDITION D'UN LOT DYNAMIQUE */}
      <CreateMetricSetModal
        isOpen={isSetModalOpen}
        editingSet={editingSetMeta}
        onClose={() => {
          setIsSetModalOpen(false);
          setEditingSetMeta(null);
        }}
        onSubmit={handleSaveSetModal}
      />
    </div>
  );
};
