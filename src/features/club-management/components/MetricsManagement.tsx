import React, { useState } from 'react';
import { useMetrics, type MetricPosition, type MetricPillar } from '../../../hooks/useMetrics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Plus, Edit2, Trash2, Save, X, Check, AlertTriangle, Filter, Target, Brain, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MetricsManagement: React.FC = () => {
  const { positions, isLoading, createPosition, updatePosition, deletePosition } = useMetrics();
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricPosition>>({});
  const [filterCat, setFilterCat] = useState<string>('ALL');

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [newCriterionInputs, setNewCriterionInputs] = useState<Record<string, string>>({});

  const pillars: { key: MetricPillar; icon: any; label: string; color: string }[] = [
    { key: 'technique', icon: Target, label: 'Technique', color: 'bg-emerald-100 text-emerald-800' },
    { key: 'tactique', icon: Shield, label: 'Tactique', color: 'bg-indigo-100 text-indigo-800' },
    { key: 'physique', icon: Zap, label: 'Physique', color: 'bg-rose-100 text-rose-800' },
    { key: 'mental', icon: Brain, label: 'Mental', color: 'bg-amber-100 text-amber-800' }
  ];

  const handleEditClick = (pos: MetricPosition) => {
    setEditForm(JSON.parse(JSON.stringify(pos)));
    setIsEditing(pos.id);
    setNewCriterionInputs({});
  };

  const handleAddNew = () => {
    const newId = 'NEW_POS_' + Date.now();
    setEditForm({
      code: '',
      name: '',
      emoji: '👤',
      category: 'MF',
      criteria: { technique: [], tactique: [], physique: [], mental: [] }
    });
    setIsEditing(newId);
    setNewCriterionInputs({});
  };

  const handleSave = async (id: string) => {
    if (!editForm.name || !editForm.code) return;
    try {
      const finalForm: Partial<MetricPosition> = {
        ...editForm,
        criteria: {
          technique: [...(editForm.criteria?.technique || [])],
          tactique: [...(editForm.criteria?.tactique || [])],
          physique: [...(editForm.criteria?.physique || [])],
          mental: [...(editForm.criteria?.mental || [])]
        }
      };

      // Inclure les critères en cours de frappe dans les champs d'ajout
      pillars.forEach(p => {
        const pending = (newCriterionInputs[p.key] || '').trim();
        if (pending && finalForm.criteria) {
          finalForm.criteria[p.key].push(pending);
        }
      });

      // Filtrer les valeurs vides
      pillars.forEach(p => {
        if (finalForm.criteria?.[p.key]) {
          finalForm.criteria[p.key] = finalForm.criteria[p.key].map(s => s.trim()).filter(Boolean);
        }
      });

      if (id.startsWith('NEW_POS_')) {
        await createPosition(finalForm as Omit<MetricPosition, 'id'>);
      } else {
        await updatePosition({ id, data: finalForm });
      }
      setIsEditing(null);
      setEditForm({});
      setNewCriterionInputs({});
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancel = () => {
    setIsEditing(null);
    setEditForm({});
    setNewCriterionInputs({});
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePosition(id);
      setIsDeletingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const addCriterion = (pillar: MetricPillar, value: string) => {
    if (!value.trim()) return;
    setEditForm(prev => ({
      ...prev,
      criteria: {
        ...(prev.criteria as any),
        [pillar]: [...(prev.criteria?.[pillar] || []), value.trim()]
      }
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
          [pillar]: arr
        }
      };
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Chargement des métriques...</div>;
  }

  const filtered = filterCat === 'ALL' ? positions : positions.filter(p => p.category === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Postes & Métriques</h3>
          <p className="text-sm text-slate-500">Gérez les grilles d'évaluation pour chaque profil de joueur.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['ALL', 'GK', 'DF', 'MF', 'FW'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterCat === cat ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {cat === 'ALL' ? 'Tous' : cat}
              </button>
            ))}
          </div>
          <Button onClick={handleAddNew} size="sm" className="rounded-xl shadow">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Poste
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnimatePresence>
          {filtered.map(pos => (
            <motion.div
              key={pos.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4 sm:p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-2xl">
                        {pos.emoji}
                      </div>
                      <div>
                        <CardTitle className="text-base">{pos.name}</CardTitle>
                        <CardDescription className="font-medium text-primary/80 mt-0.5">
                          Code: {pos.code} • Cat: {pos.category}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary rounded-lg" onClick={() => handleEditClick(pos)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg" onClick={() => setIsDeletingId(pos.id)}>
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
                        <Button variant="ghost" size="sm" onClick={() => setIsDeletingId(null)} className="h-7 text-xs">Annuler</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(pos.id)} className="h-7 text-xs rounded-lg shadow-sm">Supprimer</Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pillars.map(pillar => (
                      <div key={pillar.key} className="space-y-2">
                        <h4 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 p-1.5 rounded-lg ${pillar.color}`}>
                          <pillar.icon className="w-3.5 h-3.5" />
                          {pillar.label} ({(pos.criteria[pillar.key] || []).length})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(pos.criteria[pillar.key] || []).map((crit, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-600 py-0 font-medium">
                              {crit}
                            </Badge>
                          ))}
                          {(pos.criteria[pillar.key] || []).length === 0 && (
                            <span className="text-[10px] text-slate-400 italic px-1">Aucun critère</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 mt-auto border-t border-slate-100 flex justify-end">
                    <Button 
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
                  <p className="text-sm text-slate-500 mt-1">Configurez les informations du poste et ses critères d'évaluation.</p>
                </div>
                <button onClick={handleCancel} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nom du poste</label>
                  <Input 
                    placeholder="ex: Milieu Central" 
                    value={editForm.name || ''} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Code abrégé</label>
                  <Input 
                    placeholder="ex: CM / 8" 
                    value={editForm.code || ''} 
                    onChange={e => setEditForm({...editForm, code: e.target.value})}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Catégorie</label>
                  <select 
                    value={editForm.category || 'MF'}
                    onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="GK">Gardien (GK)</option>
                    <option value="DF">Défenseur (DF)</option>
                    <option value="MF">Milieu (MF)</option>
                    <option value="FW">Attaquant (FW)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Emoji</label>
                  <Input 
                    placeholder="ex: 🎯" 
                    value={editForm.emoji || ''} 
                    onChange={e => setEditForm({...editForm, emoji: e.target.value})}
                    className="rounded-xl border-slate-200 text-center"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900">Grille d'évaluation</h3>
                  <span className="text-xs text-slate-400 font-medium">💡 Modifiez directement le texte de chaque critère ci-dessous</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pillars.map(pillar => (
                    <div key={pillar.key} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                      <div>
                        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center justify-between p-2 rounded-xl mb-3 ${pillar.color}`}>
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
                            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                              <input
                                type="text"
                                value={crit}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm(prev => {
                                    const arr = [...(prev.criteria?.[pillar.key] || [])];
                                    arr[idx] = val;
                                    return {
                                      ...prev,
                                      criteria: {
                                        ...(prev.criteria as any),
                                        [pillar.key]: arr
                                      }
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
                          onChange={(e) => setNewCriterionInputs({ ...newCriterionInputs, [pillar.key]: e.target.value })}
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
                <Button variant="ghost" onClick={handleCancel} className="rounded-xl font-semibold">Annuler</Button>
                <Button onClick={() => handleSave(isEditing)} className="rounded-xl shadow-md font-bold px-6">
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
