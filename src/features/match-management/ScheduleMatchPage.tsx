import React, { useMemo } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useMatches } from '../../hooks/useMatches';
import ScheduleMatchWizard from './ScheduleMatchWizard';
import { Trophy, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';

/**
 * ScheduleMatchPage - Page dédiée de création et d'orchestration de match (Stepper)
 * Permet d'ouvrir le stepper complet dans sa propre page indépendante (URL /matches/new ou /matches/edit/:id)
 * accessible depuis le calendrier et les différentes vues.
 */
export const ScheduleMatchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const { matches, isLoading } = useMatches();

  const dateParam = searchParams.get('date');
  const categoryParam = searchParams.get('category');

  // Match en cours d'édition (si id fourni)
  const existingMatch = useMemo(() => {
    if (!id) return null;
    return (location.state as any)?.match || matches.find(m => m.id === id) || null;
  }, [id, location.state, matches]);

  const isEditing = Boolean(id);

  // Construction du match initial
  const initialMatch = useMemo(() => {
    if (existingMatch) return existingMatch;
    if (id) return { id };
    if (dateParam || categoryParam) {
      return {
        match_date: dateParam || new Date().toISOString().split('T')[0],
        category: categoryParam || 'SENIOR',
      };
    }
    return (location.state as any)?.match || undefined;
  }, [existingMatch, id, dateParam, categoryParam, location.state]);

  const handleBack = () => {
    navigate('/matches');
  };

  const handleSuccess = () => {
    toast.success(isEditing ? 'Match mis à jour avec succès !' : 'Nouveau match planifié avec succès !');
    navigate('/matches');
  };

  if (id && isLoading && !existingMatch) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        <Skeleton className="h-44 rounded-3xl w-full" />
        <Skeleton className="h-[480px] rounded-3xl w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Fil d'Ariane & Navigation Contrôle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span>FUS Rabat</span>
          </button>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <button
            onClick={() => navigate('/matches')}
            className="text-slate-500 hover:text-primary transition-colors font-semibold cursor-pointer"
          >
            Centre de Matchs
          </button>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
            {isEditing ? 'Édition & Composition' : 'Planifier un Match (Stepper)'}
          </span>
        </nav>

        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="rounded-xl font-bold text-xs gap-2 border-slate-200 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au calendrier
        </Button>
      </div>

      {/* Stepper Complet de Planification / Édition */}
      <ScheduleMatchWizard
        initialMatch={initialMatch}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default ScheduleMatchPage;
