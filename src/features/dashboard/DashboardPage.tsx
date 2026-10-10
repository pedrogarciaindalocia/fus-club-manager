import React, { useState } from 'react';
import { useMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { Skeleton } from '../../components/ui/skeleton';

import MiniStatRow from '../../components/MiniStatRow';
import PlayerTickerCarousel from '../../components/PlayerTickerCarousel';
import TopScorers from '../../components/TopScorers';
import MatchTeamPerformanceCharts from '../../components/MatchTeamPerformanceCharts';
import MatchCalendarWidget from '../../components/MatchCalendarWidget';
import MatchesPerMonthChart from '../../components/MatchesPerMonthChart';
import PlayerPersonalSportDetailModal from '../../components/PlayerPersonalSportDetailModal';
import ErrorEmptyState from '../../components/ErrorEmptyState';
import { usePermissions } from '../../context/PermissionsContext';
import ScoutDashboardView from './ScoutDashboardView';
import { isScoutBranch } from '../../constants/roles';
import type { Player } from '../../types';

const DashboardPage: React.FC = () => {
  const { authState } = usePermissions();
  const currentRole = authState.user?.system_role?.toLowerCase() || (authState.roles?.[0]?.toLowerCase() ?? '');
  const isScout = isScoutBranch(currentRole, authState.user?.job_title);

  if (isScout) {
    return <ScoutDashboardView />;
  }

  const { isLoading: matchesLoading, isError: matchesError, matches } = useMatches();
  const { isLoading: playersLoading, isError: playersError, players } = usePlayers();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const isLoading = matchesLoading || playersLoading;
  const isError = matchesError || playersError;

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-[380px] rounded-3xl" />
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <ErrorEmptyState 
          title="Erreur de chargement" 
          message="Une erreur est survenue lors du chargement des données de votre club. Veuillez vérifier votre connexion ou vos permissions Supabase."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const hasNoData = matches.length === 0 && players.length === 0;
  if (hasNoData) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <ErrorEmptyState 
          type="empty"
          title="Club sans données" 
          message="Bienvenue dans votre tableau de bord ! Commencez par ajouter des joueurs ou planifier des matchs pour voir vos statistiques complètes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Row 1: Key Performance Indicators Summary */}
      <MiniStatRow />

      {/* Row 2: Player Showcase Ticker Ribbon (Photos, Jersey Numbers, Names) */}
      <PlayerTickerCarousel
        players={players}
        onSelectPlayer={(p) => setSelectedPlayer(p)}
      />

      {/* Row 3: Top Scorers Showcase (Hero Golden Boot Card + Leaderboard) */}
      <TopScorers
        onSelectPlayer={(p) => setSelectedPlayer(p)}
      />

      {/* Row 4: Team & Match Performance Dynamics (Goals curves, points trajectory & breakdown) */}
      <MatchTeamPerformanceCharts />

      {/* Row 5: Match Volume per Month & Match Calendar */}
      <div className="grid grid-cols-1 gap-6">
        <MatchesPerMonthChart />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <MatchCalendarWidget />
      </div>

      {/* Modal: Full Personal & Sporting Details Aligned with Recruitment Module */}
      <PlayerPersonalSportDetailModal
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
};

export default DashboardPage;
