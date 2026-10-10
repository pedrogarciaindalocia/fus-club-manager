import React from 'react';
import { useMatches } from '../../hooks/useMatches';
import ScheduleMatchWizard from './ScheduleMatchWizard';

interface MatchPreparationProps {
  matchId: string;
  onBack: () => void;
}

/**
 * MatchPreparation - Orchestration du Match
 * Fait office de mode d'édition et d'orchestration aligné sur ScheduleMatchWizard (Planification du Match).
 */
const MatchPreparation: React.FC<MatchPreparationProps> = ({ matchId, onBack }) => {
  const { matches, refetch } = useMatches();
  const match = matches.find(m => String(m.id) === String(matchId));

  return (
    <ScheduleMatchWizard
      initialMatch={match}
      onBack={onBack}
      onSuccess={() => {
        refetch?.();
        onBack();
      }}
    />
  );
};

export default MatchPreparation;
