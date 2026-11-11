import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMatches } from '../../hooks/useMatches';
import { useClubData } from '../../hooks/useClubData';
import { useCompetitions } from '../../hooks/useCompetitions';
import { usePermissions } from '../../context/PermissionsContext';
import { useAutoMatchActivation } from '../../hooks/useAutoMatchActivation';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { FusLogoLoader } from '../../components/ui/FusLogoLoader';
import {
   Trophy,
   LayoutPanelLeft,
   Calendar,
   MapPin,
   ChevronRight,
   ChevronLeft,
   Play,
   Plus,
   Users,
   Timer,
   Target,
   History,
   Trash2,
   Shield,
   Search,
   Filter,
   Activity,
   BarChart3,
   Video,
   X,
   Clock,
   Radio,
   Save,
   Table,
   List,
   LayoutGrid,
   CheckSquare,
   Square,
   Edit3,
   Eye,
   Check,
   GripVertical,
   UserCheck,
   Swords,
   FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import MatchPreparation from './MatchPreparation';
import LiveTracking from './LiveTracking';
import ScheduleMatchWizard from './ScheduleMatchWizard';
import MatchStatsView from './MatchStatsView';
import MatchOverviewPanel from './MatchOverviewPanel';
import { DeleteMatchModal } from './components/DeleteMatchModal';
import { OpponentMatchesPanel } from './components/OpponentMatchesPanel';
import { MatchSheetImportModal } from './components/MatchSheetImportModal';
import { motion, AnimatePresence } from 'framer-motion';
import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../../constants';
import type { Match } from '../../types';

export const getCategoryBadgeClass = (category?: string | null): string => {
   const cat = (category || '').toUpperCase().trim();
   if (cat.includes('U21')) return 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20';
   if (cat.includes('U19')) return 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20';
   if (cat.includes('U17')) return 'bg-purple-600 text-white border-purple-500 shadow-purple-500/20';
   if (cat.includes('U16')) return 'bg-violet-600 text-white border-violet-500 shadow-violet-500/20';
   if (cat.includes('U15')) return 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20';
   if (cat.includes('U14') || cat.includes('U13')) return 'bg-teal-600 text-white border-teal-500 shadow-teal-500/20';
   if (cat.includes('SENIOR') || cat.includes('PRO')) return 'bg-[#FF3737] text-white border-red-500 shadow-red-500/20';
   return 'bg-slate-800 text-white border-slate-700 shadow-slate-900/20';
};

export const formatMatchShortDate = (dateStr?: string | null): string => {
   if (!dateStr) return '--';
   try {
      const [y, m, d] = dateStr.split('-');
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const monthIdx = parseInt(m, 10) - 1;
      return `${d} ${months[monthIdx] || m}`;
   } catch {
      return dateStr;
   }
};

// Match list item component
interface MatchListItemProps {
   match: Match;
   isSelected: boolean;
   isMultiSelected?: boolean;
   onToggleMultiSelect?: (e: React.MouseEvent) => void;
   onSelect: () => void;
   onEdit?: (e: React.MouseEvent) => void;
   onDelete: (e: React.MouseEvent) => void;
   onStartLive?: (e: React.MouseEvent) => void;
   opponentClubs: any[];
   mainClub?: any;
   getOpponentName: (clubId: string) => string;
   variant: 'live' | 'upcoming' | 'past';
   leagues?: any[];
}

const MatchListItem: React.FC<MatchListItemProps> = ({
   match, isSelected, isMultiSelected, onToggleMultiSelect, onSelect, onEdit, onDelete, onStartLive, opponentClubs, mainClub, getOpponentName, variant, leagues = []
}) => {
   const isInternal = (match as any).match_type === 'internal_scrimmage'
      || (match.lineup as any)?.internal_opposition?.is_internal_scrimmage
      || (match.notes && match.notes.includes('[Opposition Interne]'))
      || (mainClub && match.opponent_id === mainClub.id);
   const isFriendly = !isInternal && (!match.league_id || match.category?.toLowerCase().includes('amical') || match.notes?.toLowerCase().includes('amical'));
   const league = leagues.find(l => l.id === match.league_id);
   const leagueName = isInternal
      ? 'Opposition Interne'
      : (isFriendly ? 'Match Amical' : (league?.name || (match as any).league?.name || 'Compétition Officielle'));

   const getVariantStyles = () => {
      if (isLive) {
         return isSelected
            ? 'bg-gradient-to-br from-red-500/15 via-white to-red-500/10 border-red-500 shadow-2xl shadow-red-500/25 ring-2 ring-red-500'
            : 'bg-gradient-to-br from-red-50 via-white to-red-50/40 border-red-400 hover:border-red-500 shadow-lg shadow-red-500/15 ring-1 ring-red-400/60';
      }
      switch (variant) {
         case 'upcoming':
            return isSelected
               ? 'bg-emerald-50/50 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400'
               : 'bg-white border-slate-200 hover:border-emerald-300';
         case 'past':
            return isSelected
               ? 'bg-slate-50 border-slate-400 shadow-lg'
               : 'bg-white border-slate-200 hover:border-slate-300';
         default:
            return 'bg-white border-slate-200';
      }
   };

   const isHome = match.is_home ?? true;
   const isLive = match.status === 'live';
   const isFinished = match.status === 'finished';
   const hasScore = isFinished || isLive;

   const oppName = getOpponentName(match.opponent_id);
   const oppLogo = (isInternal && mainClub?.logo_url)
      ? mainClub.logo_url
      : (opponentClubs.find(c => c.id === match.opponent_id)?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(oppName)}&background=random`);

   const fusName = mainClub?.club_name || 'FUS';
   const fusLogo = mainClub?.logo_url || null;

   const leftClubName = isHome ? fusName : oppName;
   const leftClubLogo = isHome ? fusLogo : oppLogo;
   const leftIsFus = isHome;

   const rightClubName = isHome ? oppName : fusName;
   const rightClubLogo = isHome ? oppLogo : fusLogo;
   const rightIsFus = !isHome;

   const leftScore = match.score_home ?? 0;
   const rightScore = match.score_away ?? 0;

   const hasPenalties = (match.penalty_score_home ?? 0) > 0 || (match.penalty_score_away ?? 0) > 0;
   const leftPenScore = match.penalty_score_home ?? 0;
   const rightPenScore = match.penalty_score_away ?? 0;

   const getScoreBadge = () => {
      if (!hasScore) return null;

      return (
         <div className="flex flex-col items-center">
            <div className={`flex items-center gap-2 text-xl font-black tabular-nums ${isLive ? 'text-red-600 scale-110 animate-pulse' : 'text-slate-900'}`}>
               <span>{leftScore}</span>
               <span className={isLive ? 'text-red-500 font-bold' : 'text-muted-foreground'}>-</span>
               <span>{rightScore}</span>
            </div>
            {hasPenalties && (
               <div className="mt-1 bg-purple-50 text-purple-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-purple-200 shadow-sm">
                  ({leftPenScore} - {rightPenScore} TAB)
               </div>
            )}
         </div>
      );
   };

   return (
      <motion.div
         layout
         onClick={onSelect}
         whileHover={{ scale: 1.02 }}
         whileTap={{ scale: 0.98 }}
         className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col group cursor-pointer relative overflow-hidden ${getVariantStyles()}`}
      >
         {/* Checkbox multi-select button */}
         <div
            onClick={(e) => {
               e.stopPropagation();
               onToggleMultiSelect?.(e);
            }}
            className="absolute top-3 left-3 z-10 p-1 cursor-pointer"
            title={isMultiSelected ? "Désélectionner" : "Sélectionner ce match"}
         >
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isMultiSelected ? 'bg-[#FF3737] border-[#FF3737] text-white shadow-sm scale-110' : 'bg-white/80 border-slate-300 text-transparent group-hover:border-primary'}`}>
               <Check className="w-3.5 h-3.5" />
            </div>
         </div>

         {/* Catégorie FUS & Journée de Championnat (US-UX-126 & US-MATCH-134) */}
         <div className="absolute top-3 left-11 z-10 flex items-center gap-1.5">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#FF3737] text-white shadow-md border border-white/20">
               {match.category || 'Équipe'}
            </span>
            {Boolean(match.round_name || (match as any).lineup?.round_name) && (
               <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white shadow-xs border border-slate-700">
                  {match.round_name || (match as any).lineup?.round_name}
               </span>
            )}
         </div>

         {/* Statut LIVE ou Type de match badge en haut à droite */}
         <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            {isLive ? (
               <Badge className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md shadow-red-600/30 animate-pulse flex items-center gap-1 border border-red-400">
                  <Radio className="w-3 h-3 animate-spin" />
                  🔴 LIVE
               </Badge>
            ) : isInternal ? (
               <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[9px] font-black uppercase px-2.5 py-0.5 shadow-xs">
                  ⚔️ Interne
               </Badge>
            ) : isFriendly ? (
               <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-black uppercase px-2.5 py-0.5 shadow-xs">
                  🤝 Amical
               </Badge>
            ) : (
               <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[9px] font-black uppercase px-2.5 py-0.5 shadow-xs flex items-center gap-1.5 truncate max-w-[150px]" title={leagueName}>
                  {league?.logo_url ? (
                     <img src={league.logo_url} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                  ) : (
                     <Trophy className="w-3 h-3 text-emerald-600 shrink-0" />
                  )}
                  <span className="truncate">{leagueName}</span>
               </Badge>
            )}
         </div>

         <div className="flex items-center justify-between w-full pt-6">
            {/* Club Domicile (Gauche) */}
            <div className="flex flex-col items-center gap-1.5 w-1/3">
               <div className="relative">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center p-1.5 shadow-sm transition-all overflow-hidden ${isSelected ? 'ring-2 ring-primary/20' : ''}`}>
                     {leftClubLogo ? (
                        <img src={leftClubLogo} alt="" className="w-full h-full object-contain rounded-full" />
                     ) : (
                        <div className="bg-yellow-500 w-full h-full text-white font-black text-xs flex items-center justify-center rounded-full">
                           {leftIsFus ? 'FUS' : leftClubName.substring(0, 3).toUpperCase()}
                        </div>
                     )}
                  </div>
               </div>
               <span className="text-xs font-black uppercase tracking-tight text-foreground truncate max-w-full text-center">
                  {leftClubName}
               </span>
               <span className="text-[9px] font-bold text-slate-400 uppercase -mt-1">
                  DOM
               </span>
            </div>

            <div className="flex flex-col items-center justify-center w-1/3 text-center">
               {hasScore ? getScoreBadge() : (
                  <span className="text-2xl font-black text-slate-300">-</span>
               )}
               <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2 opacity-90 whitespace-nowrap">
                  {match.match_date} {match.match_time ? `• ${match.match_time.slice(0, 5)}` : ''}
               </p>
               <div className="mt-1 flex flex-col items-center gap-1">
                  <span className="bg-[#FF3737]/10 text-[#FF3737] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                     {match.category || 'Équipe'}
                  </span>
                  <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                     {league?.logo_url && (
                        <img src={league.logo_url} alt="" className="w-3 h-3 object-contain shrink-0 inline" />
                     )}
                     <span className={isInternal ? 'text-purple-700 font-bold' : (isFriendly ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold')}>
                        {isInternal ? '⚔️ Opp. Interne' : (isFriendly ? '🤝 Amical' : leagueName)}
                     </span>
                  </div>
               </div>
               {isLive && (
                  <Badge className="mt-1.5 bg-red-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full animate-pulse shadow-md shadow-red-500/30">
                     🔴 EN DIRECT
                  </Badge>
               )}
            </div>

            {/* Club Extérieur (Droite) */}
            <div className="flex flex-col items-center gap-1.5 w-1/3">
               <div className="relative">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center p-1.5 shadow-sm transition-all overflow-hidden ${isSelected ? 'ring-2 ring-primary/20' : ''}`}>
                     {rightClubLogo ? (
                        <img src={rightClubLogo} alt="" className="w-full h-full object-contain rounded-full" />
                     ) : (
                        <div className="bg-slate-700 w-full h-full text-white font-black text-xs flex items-center justify-center rounded-full">
                           {rightIsFus ? 'FUS' : rightClubName.substring(0, 3).toUpperCase()}
                        </div>
                     )}
                  </div>
               </div>
               <span className="text-xs font-black uppercase tracking-tight text-foreground truncate max-w-full text-center">
                  {rightClubName}
               </span>
               <span className="text-[9px] font-bold text-slate-400 uppercase -mt-1">
                  EXT
               </span>
            </div>
         </div>

         <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 w-full">
            <div className="flex items-center gap-1.5">
               {match.match_phase === 'won' && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700">✅ Gagné</span>
               )}
               {match.match_phase === 'lost' && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-red-100 text-red-700">❌ Perdu</span>
               )}
               {match.video_url && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm" title="Vidéo disponible">
                     <Video className="w-3.5 h-3.5" />
                  </div>
               )}
               {Boolean((match as any).live_operator_name || (match as any).lineup?.live_operator?.name) && (() => {
                  const opName = (match as any).live_operator_name || (match as any).lineup?.live_operator?.name;
                  const opPhoto = (match as any).live_operator_avatar_url || (match as any).lineup?.live_operator?.avatar_url;
                  const opRole = (match as any).live_operator_role || (match as any).lineup?.live_operator?.role || 'Opérateur Live';
                  const initials = (opName || 'OP').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                     <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-xl border border-slate-700 shadow-sm text-white" title={`Opérateur Fus-App : ${opName} (${opRole})`}>
                        <div className="relative shrink-0">
                           {opPhoto ? (
                              <img src={opPhoto} alt={opName} className="w-4 h-4 rounded-full object-cover border border-slate-600 shrink-0" />
                           ) : (
                              <div className="w-4 h-4 rounded-full bg-red-600 text-white font-black text-[7.5px] flex items-center justify-center border border-red-400 shrink-0">
                                 {initials}
                              </div>
                           )}
                           <span className="absolute -bottom-1 -right-1 text-[7px]" title="Opéré avec Fus-App">📱</span>
                        </div>
                        <div className="flex flex-col text-left min-w-0">
                           <div className="flex items-center gap-1">
                              <span className="text-[8.5px] font-black text-slate-100 truncate max-w-[95px] leading-tight">
                                 {opName}
                              </span>
                              <span className="text-[6.5px] font-black bg-red-500/20 text-red-300 border border-red-500/30 px-1 py-0.2 rounded uppercase leading-none">
                                 Fus-App
                              </span>
                           </div>
                           <span className="text-[7.5px] font-semibold text-slate-400 truncate max-w-[105px] leading-tight">
                              {opRole}
                           </span>
                        </div>
                     </div>
                  );
               })()}
               {(Boolean(match.referee_central_id || (match.referees_assigned as any)?.central_id || (match as any).referee_commissaire_id || (match.referees_assigned as any)?.commissaire_id)) && (
                  <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200" title="Officiels désignés pour ce match">
                     <UserCheck className="w-3 h-3 text-primary shrink-0" />
                     <span className="hidden sm:inline">{(match as any).referee_commissaire_id || (match.referees_assigned as any)?.commissaire_id ? 'Arbitres + Commissaire' : 'Arbitré'}</span>
                  </div>
               )}
               {/* Live button for upcoming matches */}
               {variant === 'upcoming' && onStartLive && (
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={onStartLive}
                     className="h-7 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all"
                  >
                     <Radio className="w-3 h-3 mr-1 animate-pulse" />
                     <span className="text-[8px] font-black uppercase">Live</span>
                  </Button>
               )}
            </div>

            {/* Action buttons: Voir Détails, Modifier, Supprimer */}
            <div className="flex items-center gap-1">
               {onEdit && (
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={onEdit}
                     className="h-7 px-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-[8px] font-black uppercase flex items-center gap-1"
                     title="Modifier le match"
                  >
                     <Edit3 className="w-3 h-3" />
                     <span className="hidden sm:inline">Modifier</span>
                  </Button>
               )}

               <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                  title="Supprimer le match"
               >
                  <Trash2 className="w-3.5 h-3.5" />
               </Button>
               <ChevronRight className={`w-4 h-4 transition-all ${isSelected ? 'text-primary translate-x-1' : 'text-muted-foreground opacity-30'}`} />
            </div>
         </div>
      </motion.div>
   );
};

const MatchManagementPage: React.FC = () => {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const paramMatchId = searchParams.get('matchId');
   const paramTab = searchParams.get('tab');

   const { matches, deleteMatch, updateMatch, isLoading: matchesLoading, refetch } = useMatches();
   const { mainClub, opponentClubs, isLoading: clubLoading } = useClubData();
   const { leagues } = useCompetitions();
   const { can, canManageCategory, authState } = usePermissions();

   const resolveRequestedTab = (
      tab: string | null,
      hasMatchId: boolean
   ): 'details' | 'preparation' | 'live' | 'wizard' | 'stats' | 'overview' => {
      if (
         tab === 'overview' ||
         tab === 'stats' ||
         tab === 'live' ||
         tab === 'preparation' ||
         tab === 'details'
      ) {
         return tab;
      }
      return hasMatchId ? 'overview' : 'details';
   };

   const [selectedMatchId, setSelectedMatchId] = useState<string | null>(() => paramMatchId || null);
   const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
   const [editingMatch, setEditingMatch] = useState<Match | null>(null);
   const [activeTab, setActiveTab] = useState<'details' | 'preparation' | 'live' | 'wizard' | 'stats' | 'overview'>(() =>
      resolveRequestedTab(paramTab, Boolean(paramMatchId))
   );

   useEffect(() => {
      if (paramMatchId) {
         setSelectedMatchId(paramMatchId);
         setActiveTab(resolveRequestedTab(paramTab, true));
      }
   }, [paramMatchId, paramTab]);
   const [listFilter, setListFilter] = useState<'today' | 'upcoming' | 'finished' | 'all' | 'live'>('all');
   const [deletingId, setDeletingId] = useState<string | null>(null);
   const [deleteModalState, setDeleteModalState] = useState<{
      isOpen: boolean;
      match?: Match | null;
      bulkIds?: string[];
   }>({
      isOpen: false,
      match: null,
      bulkIds: [],
   });
   const [categoryFilter, setCategoryFilter] = useState<string>('All');
   const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);

   const availableCategoryFilters = useMemo(() => {
      const allowed = PLAYER_CATEGORIES.filter(cat => (canManageCategory ? canManageCategory(cat) : true));
      if (allowed.length < PLAYER_CATEGORIES.length && allowed.length > 0) {
         return allowed.length === 1 ? allowed : ['All', ...allowed];
      }
      return ['All', ...PLAYER_CATEGORIES];
   }, [canManageCategory, authState?.userCategories]);

   useEffect(() => {
      if (authState?.userCategories && authState.userCategories.length === 1) {
         setCategoryFilter(normalizeAgeCategory(authState.userCategories[0]));
      }
   }, [authState?.userCategories]);
   const [calendarSection, setCalendarSection] = useState<'my_club' | 'opponents'>('my_club');
   const [leagueFilter, setLeagueFilter] = useState<string>('All');
   const [dateFilter, setDateFilter] = useState<string>('');
   const [searchQuery, setSearchQuery] = useState<string>('');
   const [dateStripAnchor, setDateStripAnchor] = useState<Date>(() => new Date());
   const [editingVideoUrl, setEditingVideoUrl] = useState<string>('');
   const [showVideoInput, setShowVideoInput] = useState(false);
   const [viewMode, setViewMode] = useState<'grid' | 'table' | 'planning'>('table');
   const [currentMonth, setCurrentMonth] = useState(new Date());
   const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);



   const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
   ];
   const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

   // Calendar Drag and Drop handlers using local React state with visual feedback
   const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);
   const [dragOverDate, setDragOverDate] = useState<string | null>(null);

   const handleDragStart = (e: React.DragEvent, matchId: string) => {
      const match = matches.find(m => m.id === matchId);
      if (match?.status === 'finished') {
         e.preventDefault();
         return;
      }
      setDraggedMatchId(matchId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', matchId);
   };

   const handleDragOver = (e: React.DragEvent, targetDate: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverDate !== targetDate) {
         setDragOverDate(targetDate);
      }
   };

   const handleDragLeave = (e: React.DragEvent, targetDate: string) => {
      e.preventDefault();
      if (dragOverDate === targetDate) {
         setDragOverDate(null);
      }
   };

   const handleDrop = async (e: React.DragEvent, targetDate: string) => {
      e.preventDefault();
      setDragOverDate(null);
      const matchId = draggedMatchId || e.dataTransfer.getData('text/plain');
      if (matchId && matchId !== 'drag') {
         const match = matches.find(m => m.id === matchId);
         if (match && match.match_date === targetDate) {
            setDraggedMatchId(null);
            return;
         }
         try {
            await updateMatch({ id: matchId, data: { match_date: targetDate } });
            const oppName = match ? getOpponentName(match.opponent_id) : 'Adversaire';
            const formattedFr = new Date(targetDate + 'T00:00:00').toLocaleDateString('fr-FR', {
               weekday: 'long',
               day: 'numeric',
               month: 'long'
            });
            toast.success(`Match reprogrammé !`, {
               description: `FUS vs ${oppName} déplacé au ${formattedFr}.`,
            });
            refetch?.();
         } catch (err: any) {
            toast.error(`Échec de la reprogrammation : ${err.message}`);
            console.error('Failed to reschedule match via Drag and Drop:', err);
         }
      }
      setDraggedMatchId(null);
   };

   // Month calculation logic
   const year = currentMonth.getFullYear();
   const month = currentMonth.getMonth();

   const firstDayOfMonth = new Date(year, month, 1);
   let startDayOfWeek = firstDayOfMonth.getDay();
   // Adjust so Monday is 0 and Sunday is 6
   startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

   const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

   const prevMonthYear = month === 0 ? year - 1 : year;
   const prevMonthIndex = month === 0 ? 11 : month - 1;
   const totalDaysInPrevMonth = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate();

   const calendarDays: Array<{ date: Date; isCurrentMonth: boolean; formattedDate: string }> = [];

   // Pad with previous month
   for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = totalDaysInPrevMonth - i;
      const d = new Date(prevMonthYear, prevMonthIndex, day);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      calendarDays.push({
         date: d,
         isCurrentMonth: false,
         formattedDate: `${yyyy}-${mm}-${dd}`
      });
   }

   // Current month days
   for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      calendarDays.push({
         date: d,
         isCurrentMonth: true,
         formattedDate: `${yyyy}-${mm}-${dd}`
      });
   }

   // Pad with next month days to complete 42 cells
   const nextMonthYear = month === 11 ? year + 1 : year;
   const nextMonthIndex = month === 11 ? 0 : month + 1;
   const remainingCells = 42 - calendarDays.length;
   for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(nextMonthYear, nextMonthIndex, i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      calendarDays.push({
         date: d,
         isCurrentMonth: false,
         formattedDate: `${yyyy}-${mm}-${dd}`
      });
   }

   // Auto-activate scheduled matches when their time arrives
   useAutoMatchActivation(matches, (matchId) => {
      // Refresh matches when one is auto-activated
      refetch?.();
      // If the activated match is selected, refresh the view
      if (selectedMatchId === matchId) {
         setListFilter('today');
      }
   });

   const isLoading = matchesLoading || clubLoading;

   // Auto-select first match once loaded
   React.useEffect(() => {
      if (!selectedMatchId && matches.length > 0) {
         const todayStrLocal = new Date().toLocaleDateString('en-CA');
         const first = matches.find(m => {
            if (listFilter === 'today') return m.status === 'live' || m.match_date === todayStrLocal;
            if (listFilter === 'upcoming') return m.status === 'scheduled';
            if (listFilter === 'finished') return m.status === 'finished';
            return true;
         })?.id || matches[0].id;
         setSelectedMatchId(first);
      }
   }, [matches, selectedMatchId, listFilter]);

   const selectedMatch = matches.find(m => String(m.id) === String(selectedMatchId));

   // Reset video input state when selected match changes
   React.useEffect(() => {
      setShowVideoInput(false);
      setEditingVideoUrl('');
   }, [selectedMatchId]);

   const getYouTubeEmbedUrl = (url: string): string | null => {
      if (!url) return null;
      const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const m = url.match(regExp);
      if (m && m[2].length === 11) return `https://www.youtube.com/embed/${m[2]}?rel=0`;
      return null;
   };

   const handleWizardSuccess = () => {
      setListFilter('scheduled');
      setActiveTab('details');
   };

   const handleOpenLiveConsole = (matchId: string) => {
      setSelectedMatchId(matchId);
      setListFilter('today');
      setActiveTab('live');
   };

   const getOpponentName = (clubId: string) => {
      if (mainClub && clubId === mainClub.id) {
         return `${mainClub.club_name || mainClub.name || 'FUS Rabat'} (Opposition Interne)`;
      }
      return opponentClubs.find(c => c.id === clubId)?.name || 'Adversaire Inconnu';
   };
   const getOpponentLogo = (clubId: string) => {
      if (mainClub && clubId === mainClub.id) return mainClub.logo_url;
      return opponentClubs.find(c => c.id === clubId)?.logo_url;
   };
   const isSameAsMainClub = (clubId: string) => {
      if (mainClub && clubId === mainClub.id) return false;
      const opp = opponentClubs.find(c => c.id === clubId);
      return !!opp && opp.name?.toLowerCase().trim() === mainClub?.name?.toLowerCase().trim();
   };
   const getStadiumName = (stadiumId: string) => 'Stadium Venue';

   const matchBelongsToLeague = (m: Match, filter: string) => {
      if (filter === 'All') return true;
      const isInternal = (m as any).match_type === 'internal_scrimmage'
         || (m.lineup as any)?.internal_opposition?.is_internal_scrimmage
         || (m.notes && m.notes.includes('[Opposition Interne]'))
         || (mainClub && m.opponent_id === mainClub.id);
      const isFriendly = !isInternal && (!m.league_id || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical'));
      if (filter === 'internal') return isInternal;
      if (filter === 'friendly') return isFriendly;
      return m.league_id === filter;
   };

   const competitionStats = useMemo(() => {
      const counts: Record<string, number> = {};
      let friendlyCount = 0;
      let internalCount = 0;
      matches.forEach(m => {
         const normCat = normalizeAgeCategory(m.category);
         if (!canManageCategory(normCat)) return;

         const isInternal = (m as any).match_type === 'internal_scrimmage'
            || (m.lineup as any)?.internal_opposition?.is_internal_scrimmage
            || (m.notes && m.notes.includes('[Opposition Interne]'))
            || (mainClub && m.opponent_id === mainClub.id);
         const isFriendly = !isInternal && (!m.league_id || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical'));

         if (isInternal) {
            internalCount++;
         } else if (isFriendly) {
            friendlyCount++;
         } else if (m.league_id) {
            counts[m.league_id] = (counts[m.league_id] || 0) + 1;
         }
      });
      return { counts, friendlyCount, internalCount };
   }, [matches, mainClub, canManageCategory]);

   const categoryCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      matches.forEach(m => {
         const normCat = normalizeAgeCategory(m.category);
         if (!canManageCategory(normCat)) return;
         // If a league filter is active, only count categories for that league
         if (!matchBelongsToLeague(m, leagueFilter)) return;
         counts[normCat] = (counts[normCat] || 0) + 1;
      });
      return counts;
   }, [matches, leagueFilter, mainClub, canManageCategory]);

   const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

   // Calcul des 7 jours de la semaine (style Flashscore / LiveScore - Photo 2)
   const weekDays = useMemo(() => {
      const current = new Date(dateStripAnchor);
      const day = current.getDay();
      // Lundi = premier jour de la semaine (dimanche = 0, donc diff = -6)
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(current);
      monday.setDate(current.getDate() + diffToMonday);

      const dayNames = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
      const monthNames = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'];

      const days = [];
      for (let i = 0; i < 7; i++) {
         const d = new Date(monday);
         d.setDate(monday.getDate() + i);
         const yyyy = d.getFullYear();
         const mm = String(d.getMonth() + 1).padStart(2, '0');
         const dd = String(d.getDate()).padStart(2, '0');
         const formatted = `${yyyy}-${mm}-${dd}`;
         const isToday = formatted === todayStr;

         days.push({
            date: d,
            formatted,
            dayName: dayNames[d.getDay()],
            dayNumber: dd,
            monthName: monthNames[d.getMonth()],
            isToday,
         });
      }
      return days;
   }, [dateStripAnchor, todayStr]);

   // Nombre de matchs par date
   const matchesCountByDate = useMemo(() => {
      const counts: Record<string, number> = {};
      matches.forEach(m => {
         const normCat = normalizeAgeCategory(m.category);
         if (!canManageCategory(normCat)) return;
         if (categoryFilter !== 'All' && normCat !== categoryFilter) return;
         if (!matchBelongsToLeague(m, leagueFilter)) return;
         if (m.match_date) {
            counts[m.match_date] = (counts[m.match_date] || 0) + 1;
         }
      });
      return counts;
   }, [matches, categoryFilter, leagueFilter, canManageCategory]);

   const handlePrevWeek = () => {
      setDateStripAnchor(prev => {
         const next = new Date(prev);
         next.setDate(prev.getDate() - 7);
         return next;
      });
   };

   const handleNextWeek = () => {
      setDateStripAnchor(prev => {
         const next = new Date(prev);
         next.setDate(prev.getDate() + 7);
         return next;
      });
   };

   const handleGoToToday = () => {
      const now = new Date();
      setDateStripAnchor(now);
      setDateFilter(todayStr);
      setListFilter('all');
   };

   const handleSelectDay = (formattedDate: string) => {
      if (dateFilter === formattedDate) {
         setDateFilter('');
      } else {
         setDateFilter(formattedDate);
         setListFilter('all');
      }
   };

   const chronoCounts = useMemo(() => {
      let todayCount = 0;
      let upcomingCount = 0;
      let finishedCount = 0;
      let liveCount = 0;

      matches.forEach(m => {
         const normCat = normalizeAgeCategory(m.category);
         if (!canManageCategory(normCat)) return;
         if (categoryFilter !== 'All' && normCat !== categoryFilter) return;
         if (!matchBelongsToLeague(m, leagueFilter)) return;

         if (m.status === 'live') {
            liveCount++;
            todayCount++;
         } else if (m.match_date === todayStr) {
            todayCount++;
         } else if (m.status === 'scheduled' || m.match_date > todayStr) {
            upcomingCount++;
         } else if (m.status === 'finished' || m.match_date < todayStr) {
            finishedCount++;
         }
      });

      return {
         today: todayCount,
         upcoming: upcomingCount,
         finished: finishedCount,
         live: liveCount,
         all: todayCount + upcomingCount + finishedCount,
      };
   }, [matches, categoryFilter, leagueFilter, canManageCategory, todayStr]);

   const filteredMatches = useMemo(() => {
      return matches.filter(m => {
         const normCat = normalizeAgeCategory(m.category);
         if (!canManageCategory(normCat)) return false;

         const matchCategory = categoryFilter === 'All' || normCat === categoryFilter;
         if (!matchCategory) return false;

         const matchLeague = matchBelongsToLeague(m, leagueFilter);
         if (!matchLeague) return false;

         if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const opp = getOpponentName(m.opponent_id).toLowerCase();
            const cat = (m.category || '').toLowerCase();
            const notes = (m.notes || '').toLowerCase();
            if (!opp.includes(q) && !cat.includes(q) && !notes.includes(q)) {
               return false;
            }
         }

         // Date filter takes priority over listFilter if set
         if (dateFilter) {
            if (listFilter === 'live') return m.status === 'live' && m.match_date === dateFilter;
            return m.match_date === dateFilter;
         }

         if (listFilter === 'all') return true;

         if (listFilter === 'live') {
            return m.status === 'live';
         }

         if (listFilter === 'today') {
            return m.match_date === todayStr || m.status === 'live';
         }

         if (listFilter === 'upcoming') {
            return (m.status === 'scheduled' || m.status === 'draft') && m.match_date >= todayStr && m.status !== 'live';
         }

         if (listFilter === 'finished') {
            return m.status === 'finished' || (m.status !== 'live' && m.match_date < todayStr);
         }

         return true;
      }).sort((a, b) => {
         // Les matchs en direct passent TOUJOURS en premier
         if (a.status === 'live' && b.status !== 'live') return -1;
         if (b.status === 'live' && a.status !== 'live') return 1;

         if (a.match_date !== b.match_date) {
            return listFilter === 'finished'
               ? b.match_date.localeCompare(a.match_date)
               : a.match_date.localeCompare(b.match_date);
         }
         return (a.match_time || '').localeCompare(b.match_time || '');
      });
   }, [matches, categoryFilter, listFilter, leagueFilter, dateFilter, searchQuery, canManageCategory, todayStr]);

   const isAllSelected = useMemo(() => {
      return filteredMatches.length > 0 && filteredMatches.every(m => selectedMatchIds.has(m.id));
   }, [filteredMatches, selectedMatchIds]);

   const toggleSelectAll = () => {
      if (isAllSelected) {
         setSelectedMatchIds(new Set());
      } else {
         setSelectedMatchIds(new Set(filteredMatches.map(m => m.id)));
      }
   };

   const toggleSelectMatch = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setSelectedMatchIds(prev => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
      });
   };

   const handleOpenDeleteSingle = (match: Match, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setDeleteModalState({
         isOpen: true,
         match,
         bulkIds: [],
      });
   };

   const handleOpenBulkDelete = () => {
      if (selectedMatchIds.size === 0) return;
      setDeleteModalState({
         isOpen: true,
         match: null,
         bulkIds: Array.from(selectedMatchIds),
      });
   };

   const handleConfirmDelete = async () => {
      try {
         if (deleteModalState.bulkIds && deleteModalState.bulkIds.length > 0) {
            const count = deleteModalState.bulkIds.length;
            for (const id of deleteModalState.bulkIds) {
               await deleteMatch(id);
            }
            setSelectedMatchIds(new Set());
            toast.success(`${count} match(s) supprimé(s)`);
            refetch?.();
         } else if (deleteModalState.match) {
            const targetId = deleteModalState.match.id;
            await deleteMatch(targetId);
            if (selectedMatchId === targetId) setSelectedMatchId(null);
            toast.success('Match supprimé avec succès');
            refetch?.();
         }
      } catch (err: any) {
         console.error('Erreur lors de la suppression du match:', err);
         toast.error(`Échec de la suppression : ${err?.message || 'Erreur inattendue'}`);
      } finally {
         setDeleteModalState({ isOpen: false, match: null, bulkIds: [] });
      }
   };

   if (isLoading && matches.length === 0) {
      return <FusLogoLoader fullPage size="lg" label="Chargement des matchs…" />;
   }

   return (
      <div className="space-y-8 pb-10">
            {activeTab === 'details' && (
               <div
                  key="list-view"
                  className="space-y-8"
               >
                  {/* Breadcrumb Navigation Control */}
                  <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs font-medium text-slate-500">
                     <span className="flex items-center gap-1.5 text-slate-400">
                        <Trophy className="w-3.5 h-3.5 text-primary" />
                        <span>FUS Rabat</span>
                     </span>
                     <ChevronRight className="w-3 h-3 text-slate-300" />
                     <span className="text-slate-700 font-semibold">Calendrier des Matchs</span>
                     <ChevronRight className="w-3 h-3 text-slate-300" />
                     <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                        {calendarSection === 'opponents' ? '⚔️ Matchs des Adversaires' : (viewMode === 'planning' ? '📅 Planning Mensuel' : viewMode === 'grid' ? '▦ Grille Cartes' : '📋 Liste Tableau')}
                     </span>
                  </nav>

                  {/* Sleek Modern Control Bar (replaces heavy blue header, retains view mode switchers & planning button) */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm">
                     <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-[#FF3737]/10 flex items-center justify-center text-[#FF3737] shadow-inner shrink-0 border border-[#FF3737]/20">
                           <Activity className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                           <div className="flex items-center gap-2.5 flex-wrap">
                              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 uppercase italic leading-none">
                                 Centre de Matchs
                              </h1>
                              {chronoCounts.live > 0 && calendarSection === 'my_club' && (
                                 <span className="inline-flex items-center gap-1.5 bg-red-600 text-white font-black text-[10px] sm:text-xs uppercase px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                    {chronoCounts.live} EN DIRECT
                                 </span>
                              )}
                           </div>
                           <p className="text-slate-400 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mt-1">
                              {calendarSection === 'my_club'
                                 ? 'Gestion des rencontres & analyses FUS'
                                 : 'Championnat • Matchs & scores des clubs adverses'}
                           </p>
                        </div>
                     </div>

                     <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                        {/* ── ONGLETS MAJEURS : MON CLUB vs ADVERSAIRES ── */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl sm:rounded-2xl border border-slate-200 shrink-0">
                           <button
                              type="button"
                              onClick={() => setCalendarSection('my_club')}
                              className={`h-9 sm:h-11 px-3.5 sm:px-4 rounded-lg sm:rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-[11px] flex items-center gap-2 transition-all ${calendarSection === 'my_club'
                                 ? 'bg-[#FF3737] text-white shadow-md shadow-red-500/25 scale-[1.02]'
                                 : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                 }`}
                           >
                              <Shield className="w-3.5 h-3.5 shrink-0" />
                              <span>Mon Club</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${calendarSection === 'my_club' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                 }`}>
                                 {matches.length}
                              </span>
                           </button>

                           <button
                              type="button"
                              onClick={() => setCalendarSection('opponents')}
                              className={`h-9 sm:h-11 px-3.5 sm:px-4 rounded-lg sm:rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-[11px] flex items-center gap-2 transition-all ${calendarSection === 'opponents'
                                 ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 scale-[1.02]'
                                 : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                 }`}
                           >
                              <Swords className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                              <span>Adversaires</span>
                           </button>
                        </div>

                        {calendarSection === 'my_club' && (
                           <>
                              {/* View Mode Switcher (Calendrier, Grille, Tableau) */}
                              <div className="flex items-center bg-slate-100 p-1 rounded-xl sm:rounded-2xl border border-slate-200 shrink-0">
                                 <button
                                    type="button"
                                    onClick={() => setViewMode('planning')}
                                    className={`h-9 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2 transition-all ${viewMode === 'planning'
                                       ? 'bg-white text-slate-900 shadow-md font-black'
                                       : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                       }`}
                                    title="Vue calendrier mensuelle interactive"
                                 >
                                    <Calendar className="w-3.5 h-3.5 shrink-0 text-[#FF3737]" />
                                    <span>Calendrier</span>
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`h-9 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2 transition-all ${viewMode === 'grid'
                                       ? 'bg-white text-slate-900 shadow-md font-black'
                                       : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                       }`}
                                    title="Vue en cartes de match"
                                 >
                                    <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-[#FF3737]" />
                                    <span>Grille</span>
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`h-9 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2 transition-all ${viewMode === 'table'
                                       ? 'bg-white text-slate-900 shadow-md font-black'
                                       : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                       }`}
                                    title="Vue en tableau condensé"
                                 >
                                    <Table className="w-3.5 h-3.5 shrink-0 text-[#FF3737]" />
                                    <span>Tableau</span>
                                 </button>
                              </div>

                              {/* Importer Feuille FRMF & Planifier un match Buttons */}
                              {can('create_match') && (
                                 <>
                                    <Button
                                       onClick={() => setIsPdfImportOpen(true)}
                                       variant="outline"
                                       className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 h-10 sm:h-12 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider text-[10px] sm:text-[11px] gap-2 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                                       title="Importer automatiquement une feuille de match FRMF (PDF)"
                                    >
                                       <FileText className="w-4 h-4 text-red-500" />
                                       <span className="hidden md:inline">Importer Feuille FRMF (PDF)</span>
                                       <span className="md:hidden">Feuille FRMF</span>
                                    </Button>

                                    <Button
                                       onClick={() => navigate('/matches/new' + (categoryFilter !== 'All' ? `?category=${encodeURIComponent(categoryFilter)}` : ''))}
                                       className="bg-[#FF3737] hover:bg-[#e02e2e] text-white h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-[11px] gap-2 shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-95 group shrink-0"
                                    >
                                       <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                       <span className="hidden sm:inline">Planifier un Match</span>
                                       <span className="sm:hidden">Planifier</span>
                                    </Button>
                                 </>
                              )}
                           </>
                        )}
                     </div>
                  </div>

                  {calendarSection === 'opponents' ? (
                     <OpponentMatchesPanel
                        fusMatches={matches}
                        leagues={leagues}
                        opponentClubs={opponentClubs}
                        mainClub={mainClub}
                        selectedCategory={categoryFilter === "All" ? "U17" : categoryFilter}
                        selectedLeagueId={leagueFilter}
                        onLeagueChange={setLeagueFilter}
                        onCategoryChange={setCategoryFilter}
                     />
                  ) : (
                     <>
                        {/* Filters Section */}
                        <div className="flex flex-col gap-3 sm:gap-4">
                           {/* 1. BANDEAU CHRONOLOGIQUE FLASHCORE / LIVESCORE (Photo 2) */}
                           <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                              {/* Jours de la semaine avec navigation */}
                              <div className="relative flex items-center border-b border-slate-100">
                                 {/* Bouton Semaine Précédente */}
                                 <button
                                    type="button"
                                    onClick={handlePrevWeek}
                                    className="w-8 sm:w-10 h-16 sm:h-20 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0 border-r border-slate-100"
                                    title="Semaine précédente"
                                 >
                                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                 </button>

                                 {/* Grille des 7 jours */}
                                 <div className="grid grid-cols-7 flex-1 divide-x divide-slate-100 text-center select-none">
                                    {weekDays.map(day => {
                                       const isSelected = dateFilter === day.formatted;
                                       const isCurrentToday = day.isToday;
                                       const count = matchesCountByDate[day.formatted] || 0;

                                       return (
                                          <button
                                             key={day.formatted}
                                             type="button"
                                             onClick={() => handleSelectDay(day.formatted)}
                                             className={`relative flex flex-col items-center justify-center py-2.5 sm:py-3.5 px-1 transition-all group hover:bg-slate-50/80 ${isSelected ? 'bg-emerald-50/30' : ''
                                                }`}
                                          >
                                             {/* Jour de la semaine (ex: LUN, MAR...) */}
                                             <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">
                                                {day.dayName}
                                             </span>

                                             {/* Chiffre du jour ou "AUJOURD'HUI" */}
                                             {isCurrentToday ? (
                                                <div className="flex flex-col items-center my-0.5 sm:my-1">
                                                   <span className="text-[9px] sm:text-[11px] font-black uppercase text-slate-900 tracking-tight leading-none">
                                                      AUJOURD'HUI
                                                   </span>
                                                   <span className="text-[10px] sm:text-xs font-bold text-slate-500 leading-tight mt-0.5">
                                                      {day.dayNumber} {day.monthName}
                                                   </span>
                                                </div>
                                             ) : (
                                                <span className="text-base sm:text-xl font-black text-slate-800 my-0.5 sm:my-1 leading-none group-hover:scale-105 transition-transform">
                                                   {day.dayNumber}
                                                </span>
                                             )}

                                             {/* Mois */}
                                             {!isCurrentToday && (
                                                <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 leading-none">
                                                   {day.monthName}
                                                </span>
                                             )}

                                             {/* Match count badge si présent */}
                                             {count > 0 && (
                                                <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-full mt-1 leading-tight ${isSelected
                                                   ? 'bg-emerald-600 text-white'
                                                   : 'bg-slate-100 text-slate-700'
                                                   }`}>
                                                   {count} {count > 1 ? 'matchs' : 'match'}
                                                </span>
                                             )}

                                             {/* Ligne verte de sélection (Photo 2) */}
                                             <div className={`h-1 w-10 sm:w-16 rounded-full mt-1.5 transition-all ${isSelected
                                                ? 'bg-[#16a34a] shadow-xs'
                                                : isCurrentToday && !dateFilter
                                                   ? 'bg-[#16a34a]/40'
                                                   : 'bg-transparent'
                                                }`} />
                                          </button>
                                       );
                                    })}
                                 </div>

                                 {/* Bouton Semaine Suivante */}
                                 <button
                                    type="button"
                                    onClick={handleNextWeek}
                                    className="w-8 sm:w-10 h-16 sm:h-20 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0 border-l border-slate-100"
                                    title="Semaine suivante"
                                 >
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                 </button>
                              </div>

                              {/* Sous-barre (Style Photo 2 : tous, télévisé, en direct + picker date) */}
                              <div className="px-3 sm:px-5 py-2.5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                                 {/* Boutons filtres chronologiques */}
                                 <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    {/* Tous */}
                                    <button
                                       type="button"
                                       onClick={() => {
                                          setDateFilter('');
                                          setListFilter('all');
                                       }}
                                       className={`h-7 px-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${!dateFilter && listFilter === 'all'
                                          ? 'bg-[#16a34a] text-white shadow-xs'
                                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                          }`}
                                    >
                                       <span>Tous</span>
                                       <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${!dateFilter && listFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                                          }`}>
                                          {dateFilter ? (matchesCountByDate[dateFilter] || 0) : chronoCounts.all}
                                       </span>
                                    </button>

                                    {/* En direct (LIVE) */}
                                    <button
                                       type="button"
                                       onClick={() => {
                                          setListFilter(listFilter === 'live' ? 'all' : 'live');
                                       }}
                                       className={`h-7 px-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${listFilter === 'live'
                                          ? 'bg-red-600 text-white shadow-xs'
                                          : chronoCounts.live > 0
                                             ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                                             : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                          }`}
                                    >
                                       <span className={`w-2 h-2 rounded-full ${chronoCounts.live > 0 ? 'bg-red-600 animate-ping' : 'bg-slate-400'}`} />
                                       <span>En direct</span>
                                       <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${listFilter === 'live' ? 'bg-white/25 text-white' : 'bg-red-100 text-red-700'
                                          }`}>
                                          {chronoCounts.live}
                                       </span>
                                    </button>

                                    {/* À venir */}
                                    <button
                                       type="button"
                                       onClick={() => {
                                          setDateFilter('');
                                          setListFilter(listFilter === 'upcoming' ? 'all' : 'upcoming');
                                       }}
                                       className={`h-7 px-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${!dateFilter && listFilter === 'upcoming'
                                          ? 'bg-slate-900 text-white shadow-xs'
                                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                          }`}
                                    >
                                       <span>À venir</span>
                                       <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${!dateFilter && listFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                          }`}>
                                          {chronoCounts.upcoming}
                                       </span>
                                    </button>

                                    {/* Passé / Terminés */}
                                    <button
                                       type="button"
                                       onClick={() => {
                                          setDateFilter('');
                                          setListFilter(listFilter === 'finished' ? 'all' : 'finished');
                                       }}
                                       className={`h-7 px-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${!dateFilter && listFilter === 'finished'
                                          ? 'bg-slate-900 text-white shadow-xs'
                                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                          }`}
                                    >
                                       <span>Passé</span>
                                       <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${!dateFilter && listFilter === 'finished' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                          }`}>
                                          {chronoCounts.finished}
                                       </span>
                                    </button>
                                 </div>

                                 {/* Contrôles dates supplémentaires (Aujourd'hui + Voir d'autres dates) */}
                                 <div className="flex items-center gap-2 sm:gap-3">
                                    {/* Revenir à Aujourd'hui */}
                                    <button
                                       type="button"
                                       onClick={handleGoToToday}
                                       className="text-xs font-black text-slate-600 hover:text-[#16a34a] flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white transition-all uppercase tracking-wider"
                                    >
                                       <Timer className="w-3.5 h-3.5 text-[#16a34a]" />
                                       <span>Aujourd'hui</span>
                                    </button>

                                    {/* Sélecteur de date (Photo 2 : Voir d'autres dates) */}
                                    <label className="relative flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all group">
                                       <Calendar className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary shrink-0" />
                                       <span className="hidden sm:inline">
                                          {dateFilter ? `Date: ${dateFilter}` : "Voir d'autres dates"}
                                       </span>
                                       <span className="sm:hidden">
                                          {dateFilter || "Date"}
                                       </span>
                                       <input
                                          type="date"
                                          value={dateFilter}
                                          onChange={(e) => {
                                             const val = e.target.value;
                                             if (val) {
                                                setDateFilter(val);
                                                setDateStripAnchor(new Date(val + 'T00:00:00'));
                                                setListFilter('all');
                                             }
                                          }}
                                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                       />
                                    </label>

                                    {dateFilter && (
                                       <button
                                          type="button"
                                          onClick={() => setDateFilter('')}
                                          className="w-6 h-6 flex items-center justify-center bg-slate-200 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-slate-500"
                                          title="Effacer le filtre par date"
                                       >
                                          <X className="w-3.5 h-3.5" />
                                       </button>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {/* 2. BARRE DE FILTRES EN LISTES DÉROULANTES (Dropdowns) */}
                           <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-[280px]">
                                 {/* Dropdown Catégorie d'équipe */}
                                 <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-xl sm:rounded-2xl border border-slate-200 transition-all shadow-2xs">
                                    <Users className="w-4 h-4 text-[#FF3737] shrink-0" />
                                    <div className="flex flex-col">
                                       <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 leading-none">
                                          Catégorie
                                       </span>
                                       <select
                                          value={categoryFilter}
                                          onChange={(e) => setCategoryFilter(e.target.value)}
                                          className="text-[11px] sm:text-xs font-black uppercase text-slate-800 bg-transparent border-none outline-none cursor-pointer pr-3 pt-0.5"
                                       >
                                          <option value="All">Toutes les Catégories ({matches.length})</option>
                                          {availableCategoryFilters.filter(c => c !== 'All').map(cat => (
                                             <option key={cat} value={cat}>
                                                {cat} ({categoryCounts[cat] || 0})
                                             </option>
                                          ))}
                                       </select>
                                    </div>
                                 </div>

                                 {/* Dropdown Compétition */}
                                 <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-xl sm:rounded-2xl border border-slate-200 transition-all shadow-2xs max-w-[280px]">
                                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                                    <div className="flex flex-col min-w-0">
                                       <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 leading-none">
                                          Compétition
                                       </span>
                                       <select
                                          value={leagueFilter}
                                          onChange={(e) => setLeagueFilter(e.target.value)}
                                          className="text-[11px] sm:text-xs font-black uppercase text-slate-800 bg-transparent border-none outline-none cursor-pointer pr-3 pt-0.5 truncate"
                                       >
                                          <option value="All">Toutes les Compétitions ({matches.length})</option>
                                          {leagues.map(l => (
                                             <option key={l.id} value={l.id}>
                                                {l.name} ({competitionStats.counts[l.id] || 0})
                                             </option>
                                          ))}
                                          {competitionStats.friendlyCount > 0 && (
                                             <option value="friendly">Matchs Amicaux ({competitionStats.friendlyCount})</option>
                                          )}
                                          {competitionStats.internalCount > 0 && (
                                             <option value="internal">Oppositions Internes ({competitionStats.internalCount})</option>
                                          )}
                                       </select>
                                    </div>
                                 </div>

                                 {/* Recherche rapide */}
                                 <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl sm:rounded-2xl border border-slate-200 flex-1 min-w-[200px] focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-2xs">
                                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                    <input
                                       type="text"
                                       value={searchQuery}
                                       onChange={(e) => setSearchQuery(e.target.value)}
                                       placeholder="Rechercher un club, un match..."
                                       className="w-full text-xs font-semibold text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-400"
                                    />
                                    {searchQuery && (
                                       <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                          <X className="w-3.5 h-3.5" />
                                       </button>
                                    )}
                                 </div>

                                 {/* Bouton Réinitialiser si des filtres sont actifs */}
                                 {(categoryFilter !== 'All' || leagueFilter !== 'All' || dateFilter !== '' || searchQuery !== '' || listFilter !== 'all') && (
                                    <button
                                       type="button"
                                       onClick={() => {
                                          setCategoryFilter('All');
                                          setLeagueFilter('All');
                                          setDateFilter('');
                                          setSearchQuery('');
                                          setListFilter('all');
                                       }}
                                       className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#FF3737] hover:bg-red-50 border border-red-200 flex items-center gap-1.5 transition-all shrink-0"
                                    >
                                       <X className="w-3.5 h-3.5" />
                                       <span>Réinitialiser</span>
                                    </button>
                                 )}
                              </div>

                              {/* Actions groupées / Tout sélectionner */}
                              <div className="flex items-center gap-2 shrink-0">
                                 <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${isAllSelected
                                       ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                       : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
                                       }`}
                                 >
                                    {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#FF3737]" /> : <Square className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">{isAllSelected ? 'Tout Décocher' : 'Tout Sélectionner'}</span>
                                    <span className="sm:hidden">{isAllSelected ? 'Décocher' : 'Sélectionner'}</span>
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                                       {selectedMatchIds.size}/{filteredMatches.length}
                                    </span>
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* Live Match Spotlight Banner (US-MATCH-LIVE-HIGHLIGHT) */}
                        {chronoCounts.live > 0 && (listFilter === 'today' || listFilter === 'all') && (
                           <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl shadow-red-600/25 border-2 border-red-400/40">
                              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                 <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                                       <Radio className="w-6 h-6 animate-pulse text-white" />
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-black text-xs uppercase tracking-widest bg-white text-red-600 px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1.5">
                                             <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                             MATCH EN DIRECT ({chronoCounts.live})
                                          </span>
                                          <span className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                             Aujourd'hui en temps réel
                                          </span>
                                       </div>
                                       <p className="text-white font-black text-sm sm:text-base mt-1 tracking-tight">
                                          Rencontre FUS en cours — Scores et statistiques actualisés en direct
                                       </p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2 self-end md:self-center">
                                    {filteredMatches.filter(m => m.status === 'live').slice(0, 2).map(liveM => (
                                       <button
                                          key={liveM.id}
                                          onClick={() => {
                                             setSelectedMatchId(liveM.id);
                                             setActiveTab('live');
                                          }}
                                          className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-white text-red-600 hover:bg-white/90 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0"
                                       >
                                          <Play className="w-3.5 h-3.5 fill-current" />
                                          <span>Console Live {liveM.category ? `• ${liveM.category}` : ''}</span>
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        )}

                        {viewMode === 'planning' ? (
                           <div className="space-y-4 sm:space-y-5">
                              {/* Calendar Card */}
                              <div className="bg-white border rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl overflow-x-auto">
                                 {/* Month Navigation Header */}
                                 <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 sm:pb-5 gap-4 mb-4 sm:mb-5">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                       <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-800">
                                          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                       </h2>
                                       <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border">
                                          <button
                                             onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                             className="p-1.5 hover:bg-white hover:text-primary rounded-lg transition-all text-slate-500"
                                          >
                                             <ChevronRight className="w-4 h-4 rotate-180" />
                                          </button>
                                          <button
                                             onClick={() => setCurrentMonth(new Date())}
                                             className="px-3 py-1 bg-white text-[10px] font-black uppercase tracking-wider rounded-lg text-slate-700 hover:text-primary shadow-sm transition-all"
                                          >
                                             Aujourd'hui
                                          </button>
                                          <button
                                             onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                             className="p-1.5 hover:bg-white hover:text-primary rounded-lg transition-all text-slate-500"
                                          >
                                             <ChevronRight className="w-4 h-4" />
                                          </button>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                                       <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-slate-600 font-bold">Live</span></div>
                                       <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-600 font-bold">Prévu</span></div>
                                       <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /><span className="text-slate-600 font-bold">Terminé</span></div>
                                    </div>
                                 </div>

                                 {/* Weekdays Header */}
                                 <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
                                    {daysOfWeek.map(day => (
                                       <div key={day} className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-1">{day}</div>
                                    ))}
                                 </div>

                                 {/* Calendar Grid */}
                                 <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                                    {calendarDays.map(({ date, isCurrentMonth, formattedDate }, idx) => {
                                       const dayMatches = matches.filter(m => {
                                          if (!canManageCategory(m.category)) return false;
                                          if (m.match_date !== formattedDate) return false;
                                          if (categoryFilter !== 'All' && normalizeAgeCategory(m.category) !== categoryFilter) return false;
                                          return matchBelongsToLeague(m, leagueFilter);
                                       });
                                       const isToday = new Date().toLocaleDateString('en-CA') === formattedDate;
                                       const isSelected = calendarSelectedDate === formattedDate;
                                       const hasMatches = dayMatches.length > 0;
                                       return (
                                          <div
                                             key={idx}
                                             onDragOver={(e) => handleDragOver(e, formattedDate)}
                                             onDragLeave={(e) => handleDragLeave(e, formattedDate)}
                                             onDrop={(e) => handleDrop(e, formattedDate)}
                                             onClick={() => {
                                                setCalendarSelectedDate(isSelected ? null : formattedDate);
                                             }}
                                             className={`relative min-h-[72px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border-2 transition-all flex flex-col group ${!isCurrentMonth ? 'opacity-30 border-transparent bg-slate-50/20' :
                                                dragOverDate === formattedDate ? 'border-emerald-500 bg-emerald-50/90 ring-4 ring-emerald-400/30 scale-[1.02] shadow-xl z-10' :
                                                   isSelected ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-2 ring-primary/20' :
                                                      isToday ? 'border-primary/50 bg-blue-50/50 shadow-sm' :
                                                         hasMatches ? 'border-slate-200 bg-white hover:border-primary/40 hover:shadow-md cursor-pointer' :
                                                            'border-slate-100 bg-slate-50/30 hover:border-slate-200 cursor-pointer'
                                                }`}
                                          >
                                             {/* Day number & Quick Actions */}
                                             <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1">
                                                   <span className={`text-[10px] sm:text-xs font-black ${isToday ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center shadow-sm' :
                                                      isSelected ? 'text-primary' : 'text-slate-600'
                                                      }`}>{date.getDate()}</span>
                                                   {hasMatches && (
                                                      <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1 rounded-full hidden sm:inline">
                                                         {dayMatches.length}
                                                      </span>
                                                   )}
                                                </div>
                                                {can('create_match') && (
                                                   <button
                                                      onClick={(e) => {
                                                         e.stopPropagation();
                                                         navigate(`/matches/new?date=${formattedDate}${categoryFilter !== 'All' ? `&category=${encodeURIComponent(categoryFilter)}` : ''}`);
                                                      }}
                                                      className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 hover:bg-primary hover:text-white rounded-md text-slate-400 transition-all shadow-sm"
                                                      title="Planifier un match pour ce jour"
                                                   ><Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>
                                                )}
                                             </div>

                                             {/* Drag Over Dropzone Indicator */}
                                             {dragOverDate === formattedDate && (
                                                <div className="text-[8px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded py-0.5 text-center mb-1 animate-pulse">
                                                   Déposer ici
                                                </div>
                                             )}

                                             {/* Match Cards in Day Cell */}
                                             <div className="flex flex-col gap-1 w-full mt-auto">
                                                {dayMatches.slice(0, 2).map(match => {
                                                   const oppClub = opponentClubs.find(c => c.id === match.opponent_id);
                                                   const oppName = getOpponentName(match.opponent_id);
                                                   const isDraggable = match.status !== 'finished';
                                                   const matchLeague = leagues.find(l => l.id === match.league_id);
                                                   const isInternalScrimmage = (match as any).match_type === 'internal_scrimmage'
                                                      || (match.lineup as any)?.internal_opposition?.is_internal_scrimmage
                                                      || (match.notes && match.notes.includes('[Opposition Interne]'))
                                                      || (mainClub && match.opponent_id === mainClub.id);
                                                   const isFriendlyM = !isInternalScrimmage && (!match.league_id || match.category?.toLowerCase().includes('amical') || match.notes?.toLowerCase().includes('amical'));
                                                   const oppLogoSrc = (isInternalScrimmage && mainClub?.logo_url)
                                                      ? mainClub.logo_url
                                                      : (oppClub?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(oppName)}`);

                                                   return (
                                                      <div
                                                         key={match.id}
                                                         draggable={isDraggable}
                                                         onDragStart={(e) => handleDragStart(e, match.id)}
                                                         onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedMatchId(match.id);
                                                            setActiveTab('overview');
                                                         }}
                                                         className={`flex items-center gap-1 w-full px-1.5 py-1 rounded-lg border text-[8px] font-black transition-all ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : 'cursor-pointer'
                                                            } ${match.status === 'live' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' :
                                                               match.status === 'scheduled' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100' :
                                                                  'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                                            }`}
                                                         title={`${isDraggable ? 'Glisser pour déplacer • ' : ''}${oppName} (${match.category || 'Équipe'}) - ${matchLeague?.name || (isInternalScrimmage ? 'Interne' : isFriendlyM ? 'Amical' : 'Compétition')}`}
                                                      >
                                                         {isDraggable && <GripVertical className="w-2.5 h-2.5 text-slate-400 shrink-0 hidden sm:inline" />}

                                                         {/* Opponent Logo with Category Badge */}
                                                         <div className="relative shrink-0">
                                                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden bg-white border border-slate-200">
                                                               <img src={oppLogoSrc} alt="" className="w-full h-full object-contain" />
                                                            </div>
                                                            {match.category && (
                                                               <span className="absolute -bottom-1 -right-1 bg-primary text-white text-[6px] font-black px-0.5 rounded leading-none border border-white">
                                                                  {match.category}
                                                               </span>
                                                            )}
                                                         </div>

                                                         <span className="truncate max-w-[36px] sm:max-w-[48px] font-bold text-[8px] sm:text-[9px]">{oppName}</span>

                                                         {/* Competition logo or badge */}
                                                         {matchLeague?.logo_url ? (
                                                            <img src={matchLeague.logo_url} alt="" className="w-3 h-3 sm:w-3.5 sm:h-3.5 object-contain shrink-0 ml-auto" title={matchLeague.name} />
                                                         ) : isInternalScrimmage ? (
                                                            <span className="text-[7px] shrink-0 ml-auto" title="Opposition Interne">⚔️</span>
                                                         ) : isFriendlyM ? (
                                                            <span className="text-[7px] shrink-0 ml-auto" title="Match Amical">🤝</span>
                                                         ) : (
                                                            <Trophy className="w-2.5 h-2.5 text-amber-500 shrink-0 ml-auto" title={matchLeague?.name || 'Compétition'} />
                                                         )}

                                                         {match.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping ml-0.5 shrink-0" />}
                                                      </div>
                                                   );
                                                })}
                                                {dayMatches.length > 2 && (
                                                   <span className="text-[8px] font-black text-slate-400 text-center">+{dayMatches.length - 2} autre(s)</span>
                                                )}
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div >

                              {/* Selected Date Match Panel — like the mobile app */}
                                 {
                                    calendarSelectedDate && (() => {
                                       const panelMatches = matches.filter(m => {
                                          if (!canManageCategory(m.category)) return false;
                                          if (m.match_date !== calendarSelectedDate) return false;
                                          if (categoryFilter !== 'All' && normalizeAgeCategory(m.category) !== categoryFilter) return false;
                                          return matchBelongsToLeague(m, leagueFilter);
                                       });
                                       const selDate = new Date(calendarSelectedDate + 'T00:00:00');
                                       const dayLabel = selDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

                                       if (panelMatches.length === 0) {
                                          return (
                                             <div
                                                key={calendarSelectedDate}
                                                className="p-6 bg-white rounded-2xl border border-slate-200 shadow-lg text-center space-y-3"
                                             >
                                                <div className="flex items-center justify-between">
                                                   <div className="flex items-center gap-2">
                                                      <div className="w-2 h-5 bg-slate-300 rounded-full" />
                                                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{dayLabel}</span>
                                                   </div>
                                                   <button onClick={() => setCalendarSelectedDate(null)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
                                                      <X className="w-3.5 h-3.5 text-slate-500" />
                                                   </button>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium">Aucun match du FUS n'est programmé pour cette date.</p>
                                                {can('create_match') && (
                                                   <Button
                                                      size="sm"
                                                      onClick={() => {
                                                         navigate(`/matches/new?date=${calendarSelectedDate}${categoryFilter !== 'All' ? `&category=${encodeURIComponent(categoryFilter)}` : ''}`);
                                                      }}
                                                      className="bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5"
                                                   >
                                                      <Plus className="w-3.5 h-3.5" /> Planifier un match ce jour-là
                                                   </Button>
                                                )}
                                             </div>
                                          );
                                       }

                                       return (
                                          <div
                                             key={calendarSelectedDate}
                                             className="space-y-3"
                                          >
                                             {/* Date header */}
                                             <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                   <div className="w-1.5 h-5 bg-primary rounded-full" />
                                                   <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{dayLabel}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                   <span className="bg-primary text-white text-[9px] font-black px-2.5 py-1 rounded-full">{panelMatches.length} match{panelMatches.length > 1 ? 's' : ''}</span>
                                                   <button onClick={() => setCalendarSelectedDate(null)} className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
                                                      <X className="w-3.5 h-3.5 text-slate-500" />
                                                   </button>
                                                </div>
                                             </div>

                                             {/* Match cards — dark style like the app */}
                                             {panelMatches.map(match => {
                                                const oppClub = opponentClubs.find(c => c.id === match.opponent_id);
                                                const isHome = match.is_home ?? true;
                                                const leftScore = match.score_home ?? 0;
                                                const rightScore = match.score_away ?? 0;
                                                const fusScore = isHome ? leftScore : rightScore;
                                                const oppScore = isHome ? rightScore : leftScore;
                                                const hasScore = match.status === 'finished' || match.status === 'live';
                                                const league = leagues.find(l => l.id === match.league_id);
                                                const isFriendlyMatch = !match.league_id || league?.name?.toLowerCase().includes('amical') || match.category?.toLowerCase().includes('amical') || match.notes?.toLowerCase().includes('amical');
                                                const resultLabel = hasScore ? ((fusScore ?? 0) > (oppScore ?? 0) ? 'V' : (fusScore ?? 0) < (oppScore ?? 0) ? 'D' : 'N') : null;
                                                const resultColor = resultLabel === 'V' ? 'bg-emerald-500' : resultLabel === 'D' ? 'bg-red-500' : 'bg-amber-500';
                                                const mainClubName = (mainClub as any)?.club_name || (mainClub as any)?.name || 'Mon Club';
                                                const mainClubLogo = mainClub?.logo_url && mainClub.logo_url !== 'null' ? mainClub.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(mainClubName)}&background=1a1a2e&color=fff&size=128`;
                                                const oppLogo = oppClub?.logo_url && oppClub.logo_url !== 'null' ? oppClub.logo_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(getOpponentName(match.opponent_id))}&background=random&color=fff&size=128`;

                                                const leftClubName = isHome ? mainClubName : getOpponentName(match.opponent_id);
                                                const leftClubLogo = isHome ? mainClubLogo : oppLogo;
                                                const leftIsFus = isHome;

                                                const rightClubName = isHome ? getOpponentName(match.opponent_id) : mainClubName;
                                                const rightClubLogo = isHome ? oppLogo : mainClubLogo;
                                                const rightIsFus = !isHome;

                                                return (
                                                   <motion.div
                                                      key={match.id}
                                                      whileHover={{ scale: 1.005 }}
                                                      onClick={() => { setSelectedMatchId(match.id); setActiveTab('overview'); }}
                                                      className="bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-xl border border-slate-700/50"
                                                   >
                                                      {/* Top info bar */}
                                                      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-2">
                                                         <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                                               {selDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                                                            </span>
                                                            {league?.logo_url ? (
                                                               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                  <img src={league.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                                                                  {league.name}
                                                               </span>
                                                            ) : isFriendlyMatch ? (
                                                               <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                                                  🤝 Match Amical
                                                               </span>
                                                            ) : (
                                                               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                                                  🏆 {league?.name || 'Compétition'}
                                                               </span>
                                                            )}
                                                         </div>
                                                         <div className="flex items-center gap-2">
                                                            {match.status === 'live' && (
                                                               <span className="flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full animate-pulse">
                                                                  <Radio className="w-2.5 h-2.5" /> LIVE
                                                               </span>
                                                            )}
                                                            <span className={`text-[9px] font-black text-white px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1`}>
                                                               <span>{match.is_home ? '🏠' : '✈️'}</span>
                                                               <span>{match.is_home ? 'DOMICILE' : 'EXTÉRIEUR'}</span>
                                                            </span>
                                                            {resultLabel && (
                                                               <span className={`text-[10px] font-black text-white w-7 h-7 rounded-full flex items-center justify-center ${resultColor}`}>
                                                                  {resultLabel}
                                                               </span>
                                                            )}
                                                         </div>
                                                      </div>

                                                      {/* Main match content */}
                                                      <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 gap-4">
                                                         {/* Left Club (Domicile) */}
                                                         <div className="flex flex-col items-center gap-2 flex-1">
                                                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden p-2 shadow-lg">
                                                               <img src={leftClubLogo} alt={leftClubName} className="w-full h-full object-contain drop-shadow-lg" />
                                                               {leftIsFus && match.category && (
                                                                  <span className="absolute bottom-1 right-1 text-[8px] font-black bg-primary text-white px-1.5 py-0.5 rounded shadow border border-white/20 leading-none">
                                                                     {match.category}
                                                                  </span>
                                                               )}
                                                               {!leftIsFus && league?.logo_url && (
                                                                  <div className="absolute bottom-1 right-1 w-5 h-5 rounded-lg bg-slate-900/95 p-0.5 border border-slate-700 shadow flex items-center justify-center overflow-hidden" title={league.name}>
                                                                     <img src={league.logo_url} alt="" className="w-full h-full object-contain" />
                                                                  </div>
                                                               )}
                                                            </div>
                                                            <span className="text-[10px] font-black text-white uppercase tracking-tight text-center max-w-[80px] leading-tight">{leftClubName}</span>
                                                            <span className="text-[8px] font-black bg-white/10 text-white/70 px-2 py-0.5 rounded-full uppercase">DOM</span>
                                                         </div>

                                                         {/* Score / VS */}
                                                         <div className="flex flex-col items-center gap-2 shrink-0">
                                                            {match.match_time && (
                                                               <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                                  <Clock className="w-2.5 h-2.5" /> {match.match_time.slice(0, 5)}
                                                               </span>
                                                            )}
                                                            {hasScore ? (
                                                               <div className="flex items-center gap-2">
                                                                  <div className={`${match.status === 'live' ? 'bg-red-600' : 'bg-primary'} rounded-xl px-4 py-2.5 shadow-lg min-w-[48px] flex items-center justify-center`}>
                                                                     <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">{leftScore}</span>
                                                                  </div>
                                                                  <span className="text-slate-500 font-black text-lg">-</span>
                                                                  <div className={`${match.status === 'live' ? 'bg-red-600' : 'bg-primary'} rounded-xl px-4 py-2.5 shadow-lg min-w-[48px] flex items-center justify-center`}>
                                                                     <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">{rightScore}</span>
                                                                  </div>
                                                               </div>
                                                            ) : (
                                                               <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3">
                                                                  <span className="text-lg font-black text-white/50 italic tracking-widest">VS</span>
                                                               </div>
                                                            )}
                                                            {hasScore && (
                                                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                                  {match.status === 'live' ? 'En Direct' : 'Score Final'}
                                                               </span>
                                                            )}
                                                         </div>

                                                         {/* Right Club (Extérieur) */}
                                                         <div className="flex flex-col items-center gap-2 flex-1">
                                                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden p-2 shadow-lg">
                                                               <img src={rightClubLogo} alt={rightClubName} className="w-full h-full object-contain drop-shadow-lg" />
                                                               {rightIsFus && match.category && (
                                                                  <span className="absolute bottom-1 right-1 text-[8px] font-black bg-primary text-white px-1.5 py-0.5 rounded shadow border border-white/20 leading-none">
                                                                     {match.category}
                                                                  </span>
                                                               )}
                                                               {!rightIsFus && league?.logo_url && (
                                                                  <div className="absolute bottom-1 right-1 w-5 h-5 rounded-lg bg-slate-900/95 p-0.5 border border-slate-700 shadow flex items-center justify-center overflow-hidden" title={league.name}>
                                                                     <img src={league.logo_url} alt="" className="w-full h-full object-contain" />
                                                                  </div>
                                                               )}
                                                            </div>
                                                            <span className="text-[10px] font-black text-white uppercase tracking-tight text-center max-w-[80px] leading-tight">{rightClubName}</span>
                                                            <span className="text-[8px] font-black bg-white/10 text-white/70 px-2 py-0.5 rounded-full uppercase">EXT</span>
                                                         </div>
                                                      </div>

                                                      {/* Bottom action bar */}
                                                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-slate-700/50 bg-slate-800/40">
                                                         <div className="flex items-center gap-2.5 flex-wrap">
                                                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5">
                                                               <MapPin className="w-3 h-3" />
                                                               {match.match_date}
                                                            </span>

                                                            {/* Mention Opérateur Live (US-MATCH-124) */}
                                                            {Boolean((match as any).live_operator_name || (match as any).lineup?.live_operator?.name) && (() => {
                                                               const opName = (match as any).live_operator_name || (match as any).lineup?.live_operator?.name;
                                                               const opPhoto = (match as any).live_operator_avatar_url || (match as any).lineup?.live_operator?.avatar_url;
                                                               const opRole = (match as any).live_operator_role || (match as any).lineup?.live_operator?.role || 'Opérateur Live';
                                                               const initials = (opName || 'OP').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                                               return (
                                                                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-700 shadow-xs" title={`Opérateur Live : ${opName} (${opRole})`}>
                                                                     <div className="relative shrink-0">
                                                                        {opPhoto ? (
                                                                           <img src={opPhoto} alt={opName} className="w-5 h-5 rounded-full object-cover border border-slate-600" />
                                                                        ) : (
                                                                           <div className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[8px] flex items-center justify-center border border-red-400">
                                                                              {initials}
                                                                           </div>
                                                                        )}
                                                                        <span className="absolute -bottom-1 -right-1 text-[7px]">📱</span>
                                                                     </div>
                                                                     <div className="flex flex-col text-left">
                                                                        <div className="flex items-center gap-1">
                                                                           <span className="text-[9.5px] font-black text-white leading-tight">{opName}</span>
                                                                           <span className="text-[7px] font-black bg-red-500/20 text-red-300 border border-red-500/30 px-1 py-0.2 rounded-full uppercase leading-none">Fus-App</span>
                                                                        </div>
                                                                        <span className="text-[8px] font-semibold text-slate-400 leading-tight">{opRole}</span>
                                                                     </div>
                                                                  </div>
                                                               );
                                                            })()}
                                                         </div>
                                                         <div className="flex items-center gap-2">
                                                            {match.status === 'scheduled' && (
                                                               <button
                                                                  onClick={(e) => { e.stopPropagation(); handleOpenLiveConsole(match.id); }}
                                                                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black px-3 py-1.5 rounded-xl transition-all shadow-sm"
                                                                  title="Accéder au centre de commande pour préparer et donner le coup d'envoi"
                                                               >
                                                                  <Play className="w-3 h-3" /> Console Match
                                                               </button>
                                                            )}
                                                            <button
                                                               onClick={(e) => { e.stopPropagation(); setSelectedMatchId(match.id); setActiveTab('overview'); }}
                                                               className="flex items-center gap-1 text-slate-400 hover:text-white text-[9px] font-black transition-all"
                                                            >
                                                               Détails <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>
                                                         </div>
                                                      </div>
                                                   </motion.div>
                                                );
                                             })}
                                          </div>
                                       );
                                    })()
                                 }

                              {/* Empty state when no date selected */}
                              {
                                 !calendarSelectedDate && (
                                    <div className="flex items-center justify-center gap-2 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                       <Calendar className="w-4 h-4" />
                                       Cliquez sur un jour avec des matches pour voir les détails
                                    </div>
                                 )
                              }
                           </div>
                        ) : viewMode === 'table' ? (
                           <div className="space-y-4">
                              {(() => {
                                 // Grouper les matchs par compétition
                                 const groups: { key: string; name: string; matches: Match[] }[] = [];
                                 filteredMatches.forEach(m => {
                                    const isInternal = (m as any).match_type === 'internal_scrimmage'
                                       || (m.lineup as any)?.internal_opposition?.is_internal_scrimmage
                                       || (m.notes && m.notes.includes('[Opposition Interne]'))
                                       || (mainClub && m.opponent_id === mainClub.id);
                                    const isFriendly = !isInternal && (!m.league_id || m.category?.toLowerCase().includes('amical') || m.notes?.toLowerCase().includes('amical'));
                                    const leagueObj = leagues.find(l => l.id === m.league_id);
                                    const leagueName = isInternal
                                       ? 'Opposition Interne'
                                       : (isFriendly ? 'Matchs Amicaux' : (leagueObj?.name || (m as any).league?.name || 'Compétition Officielle'));
                                    const key = isInternal ? 'internal' : (isFriendly ? 'friendly' : (m.league_id || 'other'));

                                    let g = groups.find(x => x.key === key);
                                    if (!g) {
                                       g = { key, name: leagueName, matches: [] };
                                       groups.push(g);
                                    }
                                    g.matches.push(m);
                                 });

                                 if (groups.length === 0) {
                                    return (
                                       <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center text-slate-400 font-bold text-sm shadow-sm">
                                          Aucun match trouvé pour ces filtres.
                                       </div>
                                    );
                                 }

                                 return groups.map(group => (
                                    <div
                                       key={group.key}
                                       className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100"
                                    >
                                       {/* En-tête de compétition style Flashscore (Photo 2) */}
                                       <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-50/90 border-b border-slate-200/80">
                                          <div className="flex items-center gap-2.5">
                                             <span className="w-2.5 h-2.5 rounded-full bg-[#FF3737] shrink-0 shadow-xs" />
                                             <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                                                {group.name}
                                             </h4>
                                             <Badge variant="outline" className={`text-[10px] font-black uppercase px-2 py-0.5 border ${categoryFilter !== 'All'
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'border-slate-300 text-slate-600'
                                                }`}>
                                                {categoryFilter !== 'All' ? `Catégorie ${categoryFilter}` : 'Toutes Catégories'}
                                             </Badge>
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-400">
                                             {group.matches.length} rencontre{group.matches.length > 1 ? 's' : ''}
                                          </span>
                                       </div>

                                       {/* Lignes de matchs style Photo 2 */}
                                       {group.matches.map(match => {
                                          const isHome = match.is_home ?? true;
                                          const mainClubName = mainClub?.name || mainClub?.club_name || 'FUS Rabat';
                                          const mainClubLogo = mainClub?.logo_url;
                                          const oppName = getOpponentName(match.opponent_id);
                                          const oppLogo = getOpponentLogo(match.opponent_id);

                                          const homeName = isHome ? mainClubName : oppName;
                                          const homeLogo = isHome ? mainClubLogo : oppLogo;
                                          const isHomeFus = isHome;

                                          const awayName = isHome ? oppName : mainClubName;
                                          const awayLogo = isHome ? oppLogo : mainClubLogo;
                                          const isAwayFus = !isHome;

                                          const isLive = match.status === 'live';
                                          const isFinished = match.status === 'finished' || (match.status !== 'live' && match.match_date < todayStr);

                                          return (
                                             <div
                                                key={match.id}
                                                onClick={() => {
                                                   setSelectedMatchId(match.id);
                                                   setActiveTab(isLive ? 'live' : 'overview');
                                                }}
                                                className={`flex items-center justify-between py-3.5 px-3 sm:px-6 hover:bg-slate-50/90 transition-colors cursor-pointer group ${isLive ? 'bg-red-50/40 border-l-4 border-l-[#FF3737]' : ''
                                                   }`}
                                             >
                                                {/* Sélection multi-match si activée */}
                                                {selectedMatchIds.size > 0 && (
                                                   <div className="mr-3 shrink-0" onClick={e => e.stopPropagation()}>
                                                      <input
                                                         type="checkbox"
                                                         checked={selectedMatchIds.has(match.id)}
                                                         onChange={() => toggleSelectMatch(match.id)}
                                                         className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                                      />
                                                   </div>
                                                )}

                                                {/* ── DATE, HEURE & BADGE CATÉGORIE FORTEMENT MIS EN ÉVIDENCE ── */}
                                                <div className="flex items-center gap-2 sm:gap-3 mr-2 sm:mr-4 shrink-0">
                                                   {/* Date & Heure */}
                                                   <div className="flex flex-col text-left shrink-0 min-w-[46px] sm:min-w-[54px]">
                                                      <span className="text-[10.5px] sm:text-xs font-black text-slate-800 tabular-nums">
                                                         {formatMatchShortDate(match.match_date)}
                                                      </span>
                                                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 tabular-nums">
                                                         {match.match_time ? match.match_time.slice(0, 5) : '15:00'}
                                                      </span>
                                                   </div>

                                                   {/* Badge Catégorie très visible avec sa couleur officielle */}
                                                   <button
                                                      type="button"
                                                      onClick={(e) => {
                                                         e.stopPropagation();
                                                         if (match.category) {
                                                            setCategoryFilter(normalizeAgeCategory(match.category));
                                                         }
                                                      }}
                                                      title={`Filtrer par catégorie ${match.category || 'Non défini'}`}
                                                      className={`px-2 sm:px-2.5 py-0.8 sm:py-1 rounded-lg text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-wider shadow-2xs border transition-all hover:scale-105 active:scale-95 shrink-0 ${getCategoryBadgeClass(match.category)
                                                         }`}
                                                   >
                                                      {match.category || 'U-NAT'}
                                                   </button>
                                                </div>

                                                {/* Club Domicile (Gauche - texte aligné à droite) */}
                                                <div className="flex-1 flex items-center justify-end gap-2.5 sm:gap-3 min-w-0">
                                                   <span className={`text-xs sm:text-sm truncate text-right ${isHomeFus ? 'font-black text-[#FF3737]' : 'font-bold text-slate-800'
                                                      }`}>
                                                      {homeName}
                                                   </span>
                                                   <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs">
                                                      {homeLogo ? (
                                                         <img src={homeLogo} alt="" className="w-full h-full object-contain rounded-full" />
                                                      ) : (
                                                         <span className="text-[10px] font-black text-slate-500">{homeName.slice(0, 3).toUpperCase()}</span>
                                                      )}
                                                   </div>
                                                </div>

                                                {/* Centre : Journée & Score + TF / Statut */}
                                                <div className="w-24 sm:w-32 flex flex-col items-center justify-center shrink-0 px-2 text-center">
                                                   {Boolean(match.round_name || (match as any).lineup?.round_name) && (
                                                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                                                         {match.round_name || (match as any).lineup?.round_name}
                                                      </span>
                                                   )}
                                                   {isLive ? (
                                                      <>
                                                         <span className="text-base sm:text-lg font-black text-red-600 tracking-wider tabular-nums animate-pulse">
                                                            {match.score_home ?? 0} - {match.score_away ?? 0}
                                                         </span>
                                                         <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.2 rounded-full border border-red-200">
                                                            {(match as any).current_minute ? `${(match as any).current_minute}'` : 'LIVE'}
                                                         </span>
                                                      </>
                                                   ) : isFinished ? (
                                                      <>
                                                         <span className="text-base sm:text-lg font-black text-slate-900 tracking-wider tabular-nums">
                                                            {match.score_home ?? 0} - {match.score_away ?? 0}
                                                         </span>
                                                         <span className="text-[10px] font-black uppercase text-slate-400">
                                                            TF
                                                         </span>
                                                      </>
                                                   ) : (
                                                      <>
                                                         <span className="text-xs sm:text-sm font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 tabular-nums">
                                                            {match.match_time ? match.match_time.slice(0, 5) : 'À venir'}
                                                         </span>
                                                         <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                            {match.match_date}
                                                         </span>
                                                      </>
                                                   )}
                                                </div>

                                                {/* Club Extérieur (Droite - texte aligné à gauche) */}
                                                <div className="flex-1 flex items-center justify-start gap-2.5 sm:gap-3 min-w-0">
                                                   <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs">
                                                      {awayLogo ? (
                                                         <img src={awayLogo} alt="" className="w-full h-full object-contain rounded-full" />
                                                      ) : (
                                                         <span className="text-[10px] font-black text-slate-500">{awayName.slice(0, 3).toUpperCase()}</span>
                                                      )}
                                                   </div>
                                                   <span className={`text-xs sm:text-sm truncate text-left ${isAwayFus ? 'font-black text-[#FF3737]' : 'font-bold text-slate-800'
                                                      }`}>
                                                      {awayName}
                                                   </span>
                                                </div>

                                                {/* Actions discrètes au survol */}
                                                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                                                   {match.status === 'scheduled' && (
                                                      <Button
                                                         variant="ghost"
                                                         size="sm"
                                                         onClick={() => handleOpenLiveConsole(match.id)}
                                                         className="h-8 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                         title="Console Live"
                                                      >
                                                         <Play className="w-3.5 h-3.5 mr-1" />
                                                         <span className="text-[9px] font-black uppercase">Live</span>
                                                      </Button>
                                                   )}
                                                   {can('manage_matches') && canManageCategory(match.category) && (
                                                      <Button
                                                         variant="ghost"
                                                         size="sm"
                                                         onClick={() => navigate(`/matches/edit/${match.id}`, { state: { match } })}
                                                         className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                         title="Modifier"
                                                      >
                                                         <Edit3 className="w-3.5 h-3.5" />
                                                      </Button>
                                                   )}
                                                   {can('manage_matches') && (
                                                      <Button
                                                         variant="ghost"
                                                         size="sm"
                                                         onClick={(e) => handleOpenDeleteSingle(match, e)}
                                                         className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                         title="Supprimer"
                                                      >
                                                         <Trash2 className="w-3.5 h-3.5" />
                                                      </Button>
                                                   )}
                                                </div>
                                             </div>
                                          );
                                       })}
                                    </div>
                                 ));
                              })()}
                           </div>
                        ) : viewMode === 'grid' ? (
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                              {filteredMatches.map(match => (
                                 <MatchListItem
                                    key={match.id}
                                    match={match}
                                    isSelected={false}
                                    onSelect={() => {
                                       setSelectedMatchId(match.id);
                                       setActiveTab('overview');
                                    }}
                                    onEdit={canManageCategory(match.category) ? (e) => {
                                       e.stopPropagation();
                                       navigate(`/matches/edit/${match.id}`, { state: { match } });
                                    } : undefined}
                                    onDelete={canManageCategory(match.category) ? (e) => {
                                       handleOpenDeleteSingle(match, e);
                                    } : undefined}
                                    onStartLive={canManageCategory(match.category) ? (e) => {
                                       e.stopPropagation();
                                       setSelectedMatchId(match.id);
                                       setActiveTab('live');
                                    } : undefined}
                                    opponentClubs={opponentClubs}
                                    mainClub={mainClub}
                                    getOpponentName={getOpponentName}
                                    variant={match.status === 'live' ? 'live' : match.status === 'scheduled' ? 'upcoming' : 'past'}
                                    leagues={leagues}
                                 />
                              ))}
                              {filteredMatches.length === 0 && (
                                 <div className="col-span-full py-12 text-center text-slate-400 text-sm font-medium">
                                    Aucun match trouvé pour ces filtres.
                                 </div>
                              )}
                           </div>
                        ) : null}
                     </>
                  )}
               </div>
            )}

            {
               activeTab === 'overview' && (
                  <div key="overview">
                     {selectedMatch ? (
                        <MatchOverviewPanel
                           match={selectedMatch}
                           allMatches={matches}
                           onSelectMatch={(m) => {
                              setSelectedMatchId(m.id);
                              if (paramMatchId) {
                                 setSearchParams({ matchId: m.id, tab: 'overview' }, { replace: true });
                              }
                           }}
                           mainClub={mainClub}
                           opponentClubs={opponentClubs}
                           getOpponentName={getOpponentName}
                           onOrchestrate={() => {
                              navigate(`/matches/edit/${selectedMatch.id}`, { state: { match: selectedMatch } });
                           }}
                           onStats={() => setActiveTab('stats')}
                           onBack={() => {
                              setActiveTab('details');
                              if (paramMatchId || paramTab) {
                                 setSearchParams({}, { replace: true });
                              }
                           }}
                        />
                     ) : (
                        <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
                           <p className="text-slate-500 font-bold text-sm">
                              {matchesLoading ? 'Chargement du match...' : 'Match introuvable ou inaccessible.'}
                           </p>
                           <Button
                              onClick={() => {
                                 setActiveTab('details');
                                 if (paramMatchId || paramTab) {
                                    setSearchParams({}, { replace: true });
                                 }
                              }}
                              variant="outline"
                              size="sm"
                           >
                              Retour aux matchs
                           </Button>
                        </div>
                     )}
                  </div>
               )
            }

            {
               activeTab === 'preparation' && selectedMatchId && (
                  <div key="prep">
                     <ScheduleMatchWizard
                        initialMatch={selectedMatch || matches.find(m => m.id === selectedMatchId) || editingMatch}
                        onBack={() => setActiveTab('overview')}
                        onSuccess={() => {
                           handleWizardSuccess();
                           setActiveTab('overview');
                        }}
                     />
                  </div>
               )
            }

            {
               activeTab === 'live' && selectedMatchId && (
                  <div key="live">
                     <LiveTracking matchId={selectedMatchId} onMatchFinished={async () => { await refetch?.(); setListFilter('finished'); setActiveTab('details'); }} />
                  </div>
               )
            }

            {
               activeTab === 'wizard' && (
                  <div key="wizard">
                     <ScheduleMatchWizard
                        initialMatch={editingMatch}
                        onBack={() => { setEditingMatch(null); setActiveTab('details'); }}
                        onSuccess={() => { setEditingMatch(null); handleWizardSuccess(); }}
                     />
                  </div>
               )
            }

            {
               activeTab === 'stats' && selectedMatchId && selectedMatch && (() => {
                  const statLeague = leagues.find(l => l.id === selectedMatch.league_id);
                  const isStatMatchFriendly = !selectedMatch.league_id || statLeague?.name?.toLowerCase().includes('amical') || selectedMatch.category?.toLowerCase().includes('amical') || selectedMatch.notes?.toLowerCase().includes('amical');
                  return (
                     <div key="stats" className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                           <div className="flex items-center gap-4">
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => {
                                    setActiveTab('details');
                                    if (paramMatchId || paramTab) setSearchParams({}, { replace: true });
                                 }}
                                 className="w-12 h-12 rounded-2xl bg-white border shadow-sm"
                              >
                                 <ChevronRight className="w-5 h-5 rotate-180" />
                              </Button>
                              <h2 className="text-2xl font-black uppercase italic tracking-tight m-0">
                                 Stats: {mainClub?.club_name || 'FuscClub'} vs {opponentClubs.find(c => c.id === selectedMatch.opponent_id)?.name || 'Adversaire'}
                              </h2>
                           </div>
                           {isStatMatchFriendly ? (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-black uppercase px-3 py-1.5 shadow-sm">
                                 🤝 Match Amical
                              </Badge>
                           ) : (
                              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs font-black uppercase px-3 py-1.5 shadow-sm">
                                 🏆 {statLeague?.name || 'Compétition Officielle'}
                              </Badge>
                           )}
                        </div>
                        <MatchStatsView
                           matchId={selectedMatchId}
                           match={selectedMatch}
                           mainClub={mainClub}
                           opponentClubs={opponentClubs}
                        />
                     </div>
                  );
               })()
            }

         {/* Floating Bulk Actions Bar */}
         <AnimatePresence>
            {
               selectedMatchIds.size > 0 && (
                  <motion.div
                     initial={{ opacity: 0, y: 50 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 50 }}
                     className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4 w-[92%] max-w-2xl"
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                           <CheckSquare className="w-4 h-4" />
                        </div>
                        <div>
                           <p className="text-xs font-black uppercase tracking-wider text-white">
                              {selectedMatchIds.size} match{selectedMatchIds.size > 1 ? 's' : ''} sélectionné{selectedMatchIds.size > 1 ? 's' : ''}
                           </p>
                           <p className="text-[10px] text-slate-400 font-medium">Actions groupées sur les matchs</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-2">
                        <button
                           type="button"
                           onClick={toggleSelectAll}
                           className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all border border-slate-700"
                        >
                           {isAllSelected ? 'Tout Décocher' : 'Tout Sélectionner'}
                        </button>

                        <button
                           type="button"
                           onClick={handleOpenBulkDelete}
                           className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all"
                        >
                           <Trash2 className="w-3.5 h-3.5" />
                           Supprimer la Sélection ({selectedMatchIds.size})
                        </button>
                     </div>
                  </motion.div>
               )
            }
         </AnimatePresence >
         {/* Floating Action Button (FAB) pour Planification Rapide */}
         {
            can('create_match') && activeTab === 'details' && (
               <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                     navigate('/matches/new' + (categoryFilter !== 'All' ? `?category=${encodeURIComponent(categoryFilter)}` : ''));
                  }}
                  className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-primary to-red-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 group hover:shadow-primary/40 border-2 border-white/20"
                  title="Planifier un nouveau match"
               >
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-black text-xs uppercase tracking-wider">
                     Nouveau Match
                  </span>
               </motion.button>
            )
         }

         {/* Boîte de dialogue de confirmation sécurisée avec rappel des conséquences */}
         <DeleteMatchModal
            isOpen={deleteModalState.isOpen}
            onClose={() => setDeleteModalState({ isOpen: false, match: null, bulkIds: [] })}
            onConfirm={handleConfirmDelete}
            match={deleteModalState.match}
            matchCount={deleteModalState.bulkIds && deleteModalState.bulkIds.length > 0 ? deleteModalState.bulkIds.length : 1}
            opponentName={deleteModalState.match ? getOpponentName(deleteModalState.match.opponent_id) : undefined}
            category={deleteModalState.match?.category}
         />

         {/* Modal d'import automatique de Feuille de match FRMF (PDF) */}
         <MatchSheetImportModal
            isOpen={isPdfImportOpen}
            onClose={() => setIsPdfImportOpen(false)}
            onSuccess={() => {
               refetch();
            }}
         />
      </div >
   );
};

export default MatchManagementPage;
