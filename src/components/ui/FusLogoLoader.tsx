import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../lib/utils';
import { clubService } from '../../services/clubService';
import type { MyClubSettings } from '../../types';
import defaultClubLogo from '../../assets/fus-logo.png';

export interface FusLogoLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  sublabel?: string;
  logoUrl?: string | null;
  fullScreen?: boolean;
  fullPage?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { box: 48, inner: 34, stroke: 3 },
  md: { box: 64, inner: 46, stroke: 3.5 },
  lg: { box: 84, inner: 60, stroke: 4 },
  xl: { box: 100, inner: 72, stroke: 4 },
} as const;

export const FusLogoLoader: React.FC<FusLogoLoaderProps> = ({
  size = 'lg',
  label,
  sublabel,
  logoUrl,
  fullScreen = false,
  fullPage = false,
  className,
}) => {
  const [imgError, setImgError] = useState(false);

  const { data: mainClub } = useQuery<MyClubSettings | null>({
    queryKey: ['mainClub'],
    queryFn: clubService.getMyClub,
    enabled: false,
  });

  const rawLogo = logoUrl ?? mainClub?.logo_url;
  const resolvedLogo =
    !imgError && rawLogo && rawLogo !== 'null' && rawLogo.trim() !== ''
      ? rawLogo
      : defaultClubLogo;

  const { box, inner, stroke } = SIZE_MAP[size];
  const radius = (box - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3.5 select-none', className)}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: box, height: box }}
        role="status"
        aria-label={label || 'Chargement en cours'}
      >
        {/* Anneau de piste subtil */}
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          className="absolute inset-0 text-primary/15"
        >
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
          />
        </svg>

        {/* Anneau rotatif qui tourne autour du logo */}
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          className="absolute inset-0 text-primary animate-spin"
          style={{ animationDuration: '0.85s' }}
        >
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.34} ${circumference * 0.66}`}
          />
        </svg>

        {/* Médaillon central avec le logo du club */}
        <div
          className="rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden p-1.5"
          style={{ width: inner, height: inner }}
        >
          <img
            src={resolvedLogo}
            alt="Logo FUS"
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      </div>

      {label && (
        <p className="text-sm font-semibold text-muted-foreground tracking-wide text-center">
          {label}
        </p>
      )}
      {sublabel && (
        <p className="text-xs text-muted-foreground/75 text-center max-w-xs -mt-2">
          {sublabel}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        {content}
      </div>
    );
  }

  if (fullPage) {
    return (
      <div className="min-h-[420px] w-full flex items-center justify-center py-20 px-4">
        {content}
      </div>
    );
  }

  return content;
};

export default FusLogoLoader;
