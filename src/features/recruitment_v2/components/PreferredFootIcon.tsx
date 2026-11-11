import React from 'react';
import { cn } from '../../../lib/utils';

interface PreferredFootIconProps {
  foot?: string | null;
  className?: string;
}

/**
 * Icône pro type semelle de crampon / empreinte de chaussure (Gauche / Droit) :
 * - Droitier : pied droit rempli, pied gauche contouré
 * - Gaucher : pied gauche rempli, pied droit contouré
 * - Ambidextre : les deux pieds remplis
 */
export const PreferredFootIcon: React.FC<PreferredFootIconProps> = ({
  foot,
  className,
}) => {
  const normalized = (foot || '').toLowerCase().trim();
  const isAmbidextre = normalized.includes('ambi') || normalized.includes('both') || normalized.includes('deux');
  const isLeftFilled = isAmbidextre || normalized.includes('gauch') || normalized.includes('left');
  const isRightFilled = isAmbidextre || normalized.includes('droit') || normalized.includes('right');

  const getFootStyle = (filled: boolean): React.SVGProps<SVGGElement> =>
    filled
      ? {
          fill: 'currentColor',
          stroke: 'currentColor',
          strokeWidth: 0.75,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }
      : {
          fill: '#e2e8f0',
          fillOpacity: 0.3,
          stroke: '#94a3b8',
          strokeWidth: 1.25,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        };

  return (
    <svg
      viewBox="0 0 28 24"
      className={cn('w-[22px] h-[22px] text-slate-900 shrink-0', className)}
      aria-hidden="true"
    >
      {/* Pied / Crampon Gauche (semelle avant + talon) */}
      <g {...getFootStyle(isLeftFilled)}>
        <path d="M 9.6 3.3 C 11.0 3.5 11.4 5.8 11.0 8.8 C 10.6 10.6 10.2 12.2 10.3 13.5 C 8.5 14.1 6.2 14.0 5.2 13.2 C 4.5 11.0 4.2 8.2 5.1 6.0 C 5.9 4.2 7.8 3.1 9.6 3.3 Z" />
        <path d="M 5.5 15.4 C 7.0 15.9 8.8 15.9 10.1 15.4 C 10.3 17.8 9.7 20.8 7.8 20.8 C 5.8 20.8 5.2 18.2 5.5 15.4 Z" />
      </g>

      {/* Pied / Crampon Droit (semelle avant + talon) */}
      <g {...getFootStyle(isRightFilled)}>
        <path d="M 18.4 3.3 C 17.0 3.5 16.6 5.8 17.0 8.8 C 17.4 10.6 17.8 12.2 17.7 13.5 C 19.5 14.1 21.8 14.0 22.8 13.2 C 23.5 11.0 23.8 8.2 22.9 6.0 C 22.1 4.2 20.2 3.1 18.4 3.3 Z" />
        <path d="M 22.5 15.4 C 21.0 15.9 19.2 15.9 17.9 15.4 C 17.7 17.8 18.3 20.8 20.2 20.8 C 22.2 20.8 22.8 18.2 22.5 15.4 Z" />
      </g>
    </svg>
  );
};
