import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  Award,
  Users,
  RefreshCw,
  Sparkles,
  List as ListIcon,
  LayoutGrid,
} from 'lucide-react';
import { useArbitres } from '../../hooks/useArbitres';
import { ArbitreCard } from './components/ArbitreCard';
import { ArbitreFormModal } from './components/ArbitreFormModal';
import { ArbitreDetailModal } from './components/ArbitreDetailModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { FusLogoLoader } from '../../components/ui/FusLogoLoader';
import { useClubData } from '../../hooks/useClubData';
import { resolvePreferredViewMode } from '../../utils/viewModePreference';
import type { Arbitre, ArbitreFormData, RolePrincipalArbitre, StatutArbitre, GradeArbitre } from '../../types/arbitre';

export const ArbitresPage: React.FC = () => {
  const {
    arbitres,
    loading,
    error,
    stats,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    statutFilter,
    setStatutFilter,
    gradeFilter,
    setGradeFilter,
    refresh,
    addArbitre,
    updateArbitre,
    deleteArbitre,
  } = useArbitres();

  const { mainClub } = useClubData();
  const preferredViewMode = resolvePreferredViewMode(mainClub, 'grid');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>(preferredViewMode);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArbitre, setEditingArbitre] = useState<Arbitre | null>(null);
  const [selectedArbitreForDetail, setSelectedArbitreForDetail] = useState<Arbitre | null>(null);

  useEffect(() => {
    setDisplayMode(preferredViewMode);
  }, [preferredViewMode]);

  const handleOpenAdd = () => {
    setEditingArbitre(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (arbitre: Arbitre) => {
    setEditingArbitre(arbitre);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData: ArbitreFormData) => {
    if (editingArbitre) {
      await updateArbitre(editingArbitre.id, formData);
    } else {
      await addArbitre(formData);
    }
  };

  return (
    <div className="space-y-8 pb-20 overflow-visible">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
            Rubrique Arbitres <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            Gestion du corps d'arbitrage, fiches officielles, licences et qualifications
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* View Toggle */}
          <div className="flex bg-secondary/30 p-1 rounded-2xl border border-border">
            <Button
              variant={displayMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setDisplayMode('list')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl"
            >
              <ListIcon className="w-4 h-4" />
            </Button>
            <Button
              variant={displayMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setDisplayMode('grid')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={refresh}
            variant="outline"
            size="icon"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl shrink-0"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </Button>

          <Button
            onClick={handleOpenAdd}
            className="gap-2 shadow-lg shadow-primary/20 h-9 sm:h-11 px-3.5 sm:px-6 font-bold uppercase tracking-widest text-xs transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un Officiel</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </div>

      {/* Quick Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Total Arbitres
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.actifs}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Arbitres Actifs
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.principaux ?? stats.centraux}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Arbitres Principaux
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.assistants ?? 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Arbitres Assistants
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, prénom, licence..."
            className="pl-10 h-11 bg-secondary/30 border-transparent focus:bg-background transition-all rounded-xl font-medium"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar w-full lg:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground mr-1 shrink-0" />
          
          {/* Role Filter Tabs */}
          {[
            { value: 'all', label: 'TOUS' },
            { value: 'central', label: 'ARBITRE PRINCIPAL' },
            { value: 'assistant', label: 'ARBITRE ASSISTANT' },
            { value: 'commissaire', label: 'COMMISSAIRE DU MATCH' },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value as any)}
              className={`px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                roleFilter === r.value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}

          {/* Statut Dropdown Filter */}
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as any)}
            className="h-9 px-3 bg-secondary/50 text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest rounded-lg border-none focus:ring-2 ring-primary/20 shrink-0 outline-none"
          >
            <option value="all">STATUT: TOUS</option>
            <option value="actif">ACTIF</option>
            <option value="inactif">INACTIF</option>
            <option value="suspendu">SUSPENDU</option>
            <option value="retraite">RETRAITÉ</option>
          </select>

          {/* Grade Dropdown Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as any)}
            className="h-9 px-3 bg-secondary/50 text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest rounded-lg border-none focus:ring-2 ring-primary/20 shrink-0 outline-none"
          >
            <option value="all">GRADE: TOUS</option>
            <option value="FIFA">FIFA</option>
            <option value="National 1">NATIONAL 1</option>
            <option value="Régional">RÉGIONAL</option>
            <option value="District">DISTRICT</option>
          </select>
        </div>
      </div>

      {/* Grid or List of Arbitres */}
      {loading ? (
        <FusLogoLoader fullPage size="lg" label="Chargement des officiels..." />
      ) : arbitres.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-3xl p-8 shadow-sm">
          <UserCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-1">Aucun arbitre trouvé</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4 font-medium">
            Aucun officiel ne correspond aux filtres ou à la recherche.
          </p>
          <Button
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('all');
              setStatutFilter('all');
              setGradeFilter('all');
            }}
            variant="outline"
            className="rounded-xl text-xs font-bold"
          >
            Réinitialiser les filtres
          </Button>
        </div>
      ) : displayMode === 'list' ? (
        <div className="space-y-3">
          {arbitres.map((arbitre) => (
            <ArbitreCard
              key={arbitre.id}
              arbitre={arbitre}
              onEdit={handleOpenEdit}
              onDelete={deleteArbitre}
              onSelect={(arb) => setSelectedArbitreForDetail(arb)}
              viewMode="list"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {arbitres.map((arbitre) => (
            <ArbitreCard
              key={arbitre.id}
              arbitre={arbitre}
              onEdit={handleOpenEdit}
              onDelete={deleteArbitre}
              onSelect={(arb) => setSelectedArbitreForDetail(arb)}
              viewMode="grid"
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <ArbitreFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingArbitre}
      />

      {/* Detail Modal */}
      <ArbitreDetailModal
        arbitre={selectedArbitreForDetail}
        isOpen={!!selectedArbitreForDetail}
        onClose={() => setSelectedArbitreForDetail(null)}
        onEdit={handleOpenEdit}
      />
    </div>
  );
};

export default ArbitresPage;
