import React from 'react';
import { DashboardLeagueStandingsWidget } from '../dashboard/components/DashboardLeagueStandingsWidget';

export const ChampionshipPerformancesPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* Module exclusif : Classement Officiel & Attaque vs Défense */}
      <DashboardLeagueStandingsWidget />
    </div>
  );
};

export default ChampionshipPerformancesPage;

