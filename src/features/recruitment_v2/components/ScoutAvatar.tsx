import React, { useState, useMemo } from 'react';
import type { Scout } from '../types/recruitment';
import { cn } from '../../../lib/utils';
import { User } from 'lucide-react';

export interface ScoutAvatarProps {
  scout?: Scout | null;
  scoutId?: string | null;
  scoutName?: string | null;
  scouts?: Scout[] | null;
  photoUrl?: string | null;
  role?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  badgePrefix?: string;
  showRole?: boolean;
  className?: string;
  avatarClassName?: string;
  title?: string;
  onClick?: () => void;
}

export const ScoutAvatar: React.FC<ScoutAvatarProps> = ({
  scout,
  scoutId,
  scoutName,
  scouts = [],
  photoUrl,
  role,
  size = 'sm',
  showBadge = false,
  badgePrefix,
  showRole = false,
  className,
  avatarClassName,
  title,
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  // Recherche automatique du scout par ID ou nom si l'objet n'est pas fourni directement
  const resolvedScout = useMemo(() => {
    if (scout) return scout;
    if (!scouts || scouts.length === 0) return null;

    const trimmedId = scoutId?.trim();
    if (trimmedId) {
      const match = scouts.find(s => s.id === trimmedId);
      if (match) return match;
    }

    const trimmedName = scoutName?.trim().toLowerCase();
    if (trimmedName) {
      const match = scouts.find(s => s.full_name?.trim().toLowerCase() === trimmedName);
      if (match) return match;
    }

    return null;
  }, [scout, scoutId, scoutName, scouts]);

  const effectivePhoto = photoUrl || resolvedScout?.photo_url || null;
  const effectiveName = scoutName || resolvedScout?.full_name || 'Scout FUS';
  const effectiveRole = role || resolvedScout?.role_title || 'Scout';

  // Calcul des initiales (2 caractères max)
  const initials = useMemo(() => {
    if (!effectiveName || effectiveName === 'Scout FUS') return 'SC';
    const parts = effectiveName.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [effectiveName]);

  // Dimensions
  const sizeMap = {
    xs: {
      box: 'w-4 h-4 min-w-4 text-[8px]',
      icon: 'w-2.5 h-2.5',
    },
    sm: {
      box: 'w-6 h-6 min-w-6 text-[10px]',
      icon: 'w-3 h-3',
    },
    md: {
      box: 'w-8 h-8 min-w-8 text-xs',
      icon: 'w-4 h-4',
    },
    lg: {
      box: 'w-10 h-10 min-w-10 text-sm',
      icon: 'w-5 h-5',
    },
    xl: {
      box: 'w-14 h-14 min-w-14 text-base',
      icon: 'w-7 h-7',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.sm;

  const tooltipText = title || `${effectiveName}${effectiveRole ? ` (${effectiveRole})` : ''}`;

  const avatarElement = (
    <div
      className={cn(
        'rounded-full overflow-hidden shrink-0 flex items-center justify-center font-black select-none border border-slate-200/90 shadow-2xs',
        currentSize.box,
        effectivePhoto && !imgError
          ? 'bg-slate-100'
          : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white',
        avatarClassName
      )}
      title={tooltipText}
    >
      {effectivePhoto && !imgError ? (
        <img
          src={effectivePhoto}
          alt={effectiveName}
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User className={currentSize.icon} />
      )}
    </div>
  );

  if (!showBadge) {
    return avatarElement;
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors',
        onClick ? 'cursor-pointer hover:opacity-90' : '',
        className || 'bg-blue-50 text-blue-800 border border-blue-100'
      )}
      title={tooltipText}
    >
      {avatarElement}
      <span className="truncate max-w-[140px] sm:max-w-[180px]">
        {badgePrefix && <span className="text-slate-500 mr-1 font-normal">{badgePrefix}</span>}
        <strong className="font-bold">{effectiveName}</strong>
      </span>
      {showRole && effectiveRole && (
        <span className="text-[10px] opacity-75 font-semibold">
          ({effectiveRole})
        </span>
      )}
    </div>
  );
};

export default ScoutAvatar;
