import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatches } from '../../hooks/useMatches';
import { useClubData } from '../../hooks/useClubData';
import { useCompetitions } from '../../hooks/useCompetitions';
import { usePermissions } from '../../context/PermissionsContext';
import { useAutoMatchActivation } from '../../hooks/useAutoMatchActivation';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
   Trophy,
   LayoutPanelLeft,
   Calendar,
   MapPin,
   ChevronRight,
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
   UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import MatchPreparation from './MatchPreparation';
import LiveTracking from './LiveTracking';
import ScheduleMatchWizard from './ScheduleMatchWizard';
import MatchStatsView from './MatchStatsView';
import MatchOverviewPanel from './MatchOverviewPanel';
import { DeleteMatchModal } from './components/DeleteMatchModal';
import { motion, AnimatePresence } from 'framer-motion';
import { PLAYER_CATEGORIES, normalizeAgeCategory } from '../../constants';
import type { Match } from '../../types';

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
      switch (variant) {
         case 'live':
            return isSelected 
               ? 'bg-red-50/50 border-red-400 shadow-lg shadow-red-500/10' 
               : 'bg-white border-red-200 hover:border-red-300';
         case 'upcoming':
            return isSelected 
               ? 'bg-emerald-50/50 border-emerald-400 shadow-lg shadow-emerald-500/10' 
               : 'bg-white border-emerald-200 hover:border-emerald-300';
         case 'past':
            return isSelected 
               ? 'bg-slate-50 border-slate-400 shadow-lg' 
               : 'bg-white border-slate-200 hover:border-slate-300';
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
            <div className={`flex items-center gap-1.5 text-base font-black tabular-nums ${isLive ? 'text-red-600 scale-105' : 'text-slate-900'}`}>
               <span>{leftScore}</span>
               <span className={isLive ? 'text-red-400 font-bold' : 'text-muted-foreground'}>-</span>
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
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isMultiSelected ? 'bg-primary border-primary text-white shadow-sm scale-110' : 'bg-white/80 border-slate-300 text-transparent group-hover:border-primary'}`}>
               <Check className="w-3.5 h-3.5" />
            </div>
         </div>

         {/* Type de match (Amical vs Interne vs Nom de Ligue) badge en haut à droite */}
         <div className="absolute top-3 right-3 z-10 pointer-events-none">
            {isInternal ? (
               <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[8px] font-black uppercase px-2 py-0.5 shadow-sm">
                  ⚔️ Interne
               </Badge>
            ) : isFriendly ? (
               <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[8px] font-black uppercase px-2 py-0.5 shadow-sm">
                  🤝 Amical
               </Badge>
            ) : (
               <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[8px] font-black uppercase px-2 py-0.5 shadow-sm flex items-center gap-1.5 truncate max-w-[150px]" title={leagueName}>
                  {league?.logo_url ? (
                     <img src={league.logo_url} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                  ) : (
                     <Trophy className="w-3 h-3 text-emerald-600 shrink-0" />
                  )}
                  <span className="truncate">{leagueName}</span>
               </Badge>
            )}
         </div>

         <div className="flex items-center justify-between w-full pt-4">
            {/* Club Domicile (Gauche) */}
            <div className="flex flex-col items-center gap-1 w-1/3">
               <div className="relative">
                  <div className={`w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center p-1.5 shadow-sm transition-all overflow-hidden ${isSelected ? 'ring-2 ring-primary/20' : ''}`}>
                     {leftClubLogo ? (
                        <img src={leftClubLogo} alt="" className="w-full h-full object-contain rounded-full" />
                     ) : (
                        <div className="bg-yellow-500 w-full h-full text-white font-black text-[12px] flex items-center justify-center rounded-full">
                           {leftIsFus ? 'FUS' : leftClubName.substring(0, 3).toUpperCase()}
                        </div>
                     )}
                  </div>
                  {leftIsFus && match.category && (
                     <span className="absolute -bottom-1 -right-1 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm leading-none">
                        {match.category}
                     </span>
                  )}
                  {!leftIsFus && league?.logo_url && (
                     <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white p-0.5 border-2 border-slate-200 shadow-sm flex items-center justify-center overflow-hidden" title={league.name}>
                        <img src={league.logo_url} alt="" className="w-full h-full object-contain" />
                     </div>
                  )}
               </div>
               <span className="text-[10px] font-black uppercase tracking-tight text-foreground truncate max-w-full text-center">
                  {leftClubName}
               </span>
               <span className="text-[8px] font-bold text-slate-400 uppercase -mt-0.5">
                  DOM
               </span>
            </div>

            <div className="flex flex-col items-center justify-center w-1/3 text-center">
               {hasScore ? getScoreBadge() : (
                  <span className="text-xl font-black text-slate-300">-</span>
               )}
               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2 opacity-80 whitespace-nowrap">
                  {match.match_date}
               </p>
               <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                     {match.category || 'Équipe'}
                  </span>
                  <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider text-muted-foreground">
                     {league?.logo_url && (
                        <img src={league.logo_url} alt="" className="w-3 h-3 object-contain shrink-0 inline" />
                     )}
                     <span className={isInternal ? 'text-purple-700 font-bold' : (isFriendly ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold')}>
                        {isInternal ? '⚔️ Opp. Interne' : (isFriendly ? '🤝 Amical' : leagueName)}
                     </span>
                  </div>
               </div>
               {isLive && (
                  <Badge className="mt-1 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-red-500/20">
                     LIVE
                  </Badge>
               )}
            </div>

            {/* Club Extérieur (Droite) */}
            <div className="flex flex-col items-center gap-1 w-1/3">
               <div className="relative">
                  <div className={`w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center p-1.5 shadow-sm transition-all overflow-hidden ${isSelected ? 'ring-2 ring-primary/20' : ''}`}>
                     {rightClubLogo ? (
                        <img src={rightClubLogo} alt="" className="w-full h-full object-contain rounded-full" />
                     ) : (
                        <div className="bg-yellow-500 w-full h-full text-white font-black text-[12px] flex items-center justify-center rounded-full">
                           {rightIsFus ? 'FUS' : rightClubName.substring(0, 3).toUpperCase()}
                        </div>
                     )}
                  </div>
                  {rightIsFus && match.category && (
                     <span className="absolute -bottom-1 -right-1 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm leading-none">
                        {match.category}
                     </span>
                  )}
                  {!rightIsFus && league?.logo_url && (
                     <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white p-0.5 border-2 border-slate-200 shadow-sm flex items-center justify-center overflow-hidden" title={league.name}>
                        <img src={league.logo_url} alt="" className="w-full h-full object-contain" />
                     </div>
                  )}
               </div>
               <span className="text-[10px] font-black uppercase tracking-tight text-foreground truncate max-w-full text-center">
                  {rightClubName}
               </span>
               <span className="text-[8px] font-bold text-slate-400 uppercase -mt-0.5">
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
   const { matches, deleteMatch, updateMatch, isLoading: matchesLoading, refetch } = useMatches();
   const { mainClub, opponentClubs, isLoading: clubLoading } = useClubData();
   const { leagues } = useCompetitions();
   const { can, canManageCategory, authState } = usePermissions();
   
   const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
   const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
   const [editingMatch, setEditingMatch] = useState<Match | null>(null);
   const [activeTab, setActiveTab] = useState<'details' | 'preparation' | 'live' | 'wizard' | 'stats' | 'overview'>('details');
   const [listFilter, setListFilter] = useState<'all' | 'scheduled' | 'finished' | 'today'>('all');
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

   const availableCategoryFilters = useMemo(() => {
      const allowed = PLAYER_CATEGORIES.filter(cat => canManageCategory(cat));
      if (allowed.length < PLAYER_CATEGORIES.length && allowed.length > 0) {
         return allowed.length === 1 ? allowed : ['All', ...allowed];
      }
      return ['All', ...PLAYER_CATEGORIES];
   }, [canManageCategory, authState.userCategories]);

   useEffect(() => {
      if (authState.userCategories && authState.userCategories.length === 1) {
         setCategoryFilter(normalizeAgeCategory(authState.userCategories[0]));
      }
   }, [authState.userCategories]);
   const [leagueFilter, setLeagueFilter] = useState<string>('All');
   const [dateFilter, setDateFilter] = useState<string>('');
   const [editingVideoUrl, setEditingVideoUrl] = useState<string>('');
   const [showVideoInput, setShowVideoInput] = useState(false);
   const [viewMode, setViewMode] = useState<'grid' | 'table' | 'planning'>('grid');
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
         const first = matches.find(m => m.status === (listFilter === 'today' ? 'live' : listFilter))?.id || matches[0].id;
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

   const filteredMatches = useMemo(() => {
      return matches.filter(m => {
         const normCat = normalizeAgeCategory(m.category);
         if (!canManageCategory(normCat)) return false;

         const matchCategory = categoryFilter === 'All' || normCat === categoryFilter;
         if (!matchCategory) return false;

         const matchLeague = matchBelongsToLeague(m, leagueFilter);
         if (!matchLeague) return false;

         // Date filter takes priority over listFilter if set
         if (dateFilter) {
            return m.match_date === dateFilter;
         }

         if (listFilter === 'all') return true;

         const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
         if (listFilter === 'today') {
            return m.match_date === todayStr;
         }
         return m.status === listFilter;
      });
   }, [matches, categoryFilter, listFilter, leagueFilter, dateFilter, mainClub, canManageCategory]);

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
      return (
         <div className="space-y-8 pb-10">
            <Skeleton className="h-48 w-full rounded-[3rem]" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-8">
                  <Skeleton className="h-[500px] w-full rounded-[3rem]" />
               </div>
               <div className="lg:col-span-4 space-y-4">
                  <Skeleton className="h-14 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-8 pb-10">
         <AnimatePresence mode="wait">
            {activeTab === 'details' && (
               <motion.div 
                 key="list-view" 
                 initial={{ opacity: 0, scale: 0.98 }} 
                 animate={{ opacity: 1, scale: 1 }} 
                 exit={{ opacity: 0, scale: 0.98 }}
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
                        {viewMode === 'planning' ? '📅 Planning Mensuel' : viewMode === 'grid' ? '▦ Grille Cartes' : '📋 Liste Tableau'}
                     </span>
                  </nav>

                  {/* Premium Dashboard Header */}
                  <div className="relative bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl sm:rounded-[3rem] px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-12 text-white overflow-hidden shadow-2xl border-b-4 sm:border-b-[8px] border-blue-500/20">
                     <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />
                     <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 lg:gap-8">
                        <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
                           <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] bg-white/10 flex items-center justify-center text-blue-400 shadow-2xl border border-white/20 ring-4 sm:ring-6 lg:ring-8 ring-white/5 shrink-0">
                              <Activity className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
                           </div>
                           <div className="min-w-0">
                              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tighter uppercase italic leading-none">Centre de Matchs</h1>
                              <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-2 sm:mt-3">Gestion des rencontres & analyses</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="flex items-center bg-white/10 p-1 rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl shrink-0">
                               <button
                                  onClick={() => setViewMode('planning')}
                                  className={`h-9 sm:h-12 px-3 sm:px-5 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2 transition-all ${
                                     viewMode === 'planning' 
                                        ? 'bg-white text-blue-950 shadow-lg' 
                                        : 'text-white/70 hover:text-white hover:bg-white/5'
                                  }`}
                                  title="Vue calendrier mensuelle interactive"
                               >
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span>Calendrier</span>
                               </button>
                               <button
                                  onClick={() => setViewMode('grid')}
                                  className={`h-9 sm:h-12 px-3 sm:px-5 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2 transition-all ${
                                     viewMode === 'grid' 
                                        ? 'bg-white text-blue-950 shadow-lg' 
                                        : 'text-white/70 hover:text-white hover:bg-white/5'
                                  }`}
                                  title="Vue en cartes de match"
                               >
                                  <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                                  <span>Grille</span>
                               </button>
                               <button
                                  onClick={() => setViewMode('table')}
                                  className={`h-9 sm:h-12 px-3 sm:px-5 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2 transition-all ${
                                     viewMode === 'table' 
                                        ? 'bg-white text-blue-950 shadow-lg' 
                                        : 'text-white/70 hover:text-white hover:bg-white/5'
                                  }`}
                                  title="Vue en tableau condensé"
                               >
                                  <Table className="w-3.5 h-3.5 shrink-0" />
                                  <span>Tableau</span>
                               </button>
                            </div>
                           {can('create_match') && (
                             <Button onClick={() => navigate('/matches/new' + (categoryFilter !== 'All' ? `?category=${encodeURIComponent(categoryFilter)}` : ''))} className="bg-white hover:bg-white/90 text-blue-900 h-11 sm:h-14 lg:h-16 px-4 sm:px-6 lg:px-10 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] gap-2 sm:gap-4 shadow-2xl transition-all hover:scale-105 active:scale-95 group shrink-0">
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-500" /> 
                                <span className="hidden sm:inline">Planifier un Match</span>
                                <span className="sm:hidden">Planifier</span>
                             </Button>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-col gap-3 sm:gap-4">
                     {/* 1. Competition Logo Filters Bar */}
                     <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between px-1">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                              Compétition
                           </span>
                           {leagueFilter !== 'All' && (
                              <button
                                 onClick={() => setLeagueFilter('All')}
                                 className="text-[9px] font-black text-primary hover:underline uppercase flex items-center gap-1 transition-all"
                              >
                                 <X className="w-3 h-3" /> Réinitialiser le filtre
                              </button>
                           )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                           {/* "Toutes les Compétitions" pill */}
                           <button
                              onClick={() => setLeagueFilter('All')}
                              className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all shrink-0 ${
                                 leagueFilter === 'All'
                                    ? 'bg-gradient-to-r from-blue-900 to-indigo-950 text-white border-blue-900 shadow-md shadow-blue-900/20 scale-[1.02]'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 hover:border-slate-300 shadow-sm'
                              }`}
                           >
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                 leagueFilter === 'All' ? 'bg-white/20 text-amber-300' : 'bg-amber-50 text-amber-600 border border-amber-200/60'
                              }`}>
                                 <Trophy className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col text-left">
                                 <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider leading-none">
                                    Toutes
                                 </span>
                                 <span className={`text-[8px] font-semibold mt-0.5 leading-none ${leagueFilter === 'All' ? 'text-white/70' : 'text-slate-400'}`}>
                                    {matches.length} matchs
                                 </span>
                              </div>
                           </button>

                           {/* Individual Competitions with Logos */}
                           {leagues.map(l => {
                              const count = competitionStats.counts[l.id] || 0;
                              const isSelected = leagueFilter === l.id;
                              return (
                                 <button
                                    key={l.id}
                                    onClick={() => setLeagueFilter(isSelected ? 'All' : l.id)}
                                    className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all shrink-0 group ${
                                       isSelected
                                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-[1.02]'
                                          : count === 0
                                             ? 'bg-white/60 text-slate-400 border-slate-200/60 opacity-60 hover:opacity-100 hover:bg-white hover:text-slate-700'
                                             : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 hover:border-slate-300 shadow-sm'
                                    }`}
                                    title={l.name}
                                 >
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg p-1 flex items-center justify-center overflow-hidden shrink-0 ${
                                       isSelected ? 'bg-white shadow-sm' : 'bg-slate-50 border border-slate-200/80 group-hover:bg-white'
                                    }`}>
                                       {l.logo_url ? (
                                          <img src={l.logo_url} alt={l.name} className="w-full h-full object-contain" />
                                       ) : (
                                          <Trophy className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-amber-500'}`} />
                                       )}
                                    </div>
                                    <div className="flex flex-col text-left">
                                       <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight leading-none truncate max-w-[130px] sm:max-w-[180px]">
                                          {l.name}
                                       </span>
                                       <span className={`text-[8px] font-semibold mt-0.5 leading-none ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                          {count} match{count > 1 ? 's' : ''}
                                       </span>
                                    </div>
                                 </button>
                              );
                           })}

                           {/* Matchs Amicaux */}
                           {competitionStats.friendlyCount > 0 && (
                              <button
                                 onClick={() => setLeagueFilter(leagueFilter === 'friendly' ? 'All' : 'friendly')}
                                 className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all shrink-0 ${
                                    leagueFilter === 'friendly'
                                       ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/25 scale-[1.02]'
                                       : 'bg-white hover:bg-amber-50/50 text-slate-700 border-slate-200/80 shadow-sm'
                                 }`}
                              >
                                 <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                                    leagueFilter === 'friendly' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                 }`}>
                                    🤝
                                 </div>
                                 <div className="flex flex-col text-left">
                                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight leading-none">
                                       Amicaux
                                    </span>
                                    <span className={`text-[8px] font-semibold mt-0.5 leading-none ${leagueFilter === 'friendly' ? 'text-white/80' : 'text-slate-400'}`}>
                                       {competitionStats.friendlyCount} match{competitionStats.friendlyCount > 1 ? 's' : ''}
                                    </span>
                                 </div>
                              </button>
                           )}

                           {/* Oppositions Internes */}
                           {competitionStats.internalCount > 0 && (
                              <button
                                 onClick={() => setLeagueFilter(leagueFilter === 'internal' ? 'All' : 'internal')}
                                 className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all shrink-0 ${
                                    leagueFilter === 'internal'
                                       ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-600/25 scale-[1.02]'
                                       : 'bg-white hover:bg-purple-50/50 text-slate-700 border-slate-200/80 shadow-sm'
                                 }`}
                              >
                                 <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                                    leagueFilter === 'internal' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200'
                                 }`}>
                                    ⚔️
                                 </div>
                                 <div className="flex flex-col text-left">
                                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight leading-none">
                                       Internes
                                    </span>
                                    <span className={`text-[8px] font-semibold mt-0.5 leading-none ${leagueFilter === 'internal' ? 'text-white/80' : 'text-slate-400'}`}>
                                       {competitionStats.internalCount} match{competitionStats.internalCount > 1 ? 's' : ''}
                                    </span>
                                 </div>
                              </button>
                           )}
                        </div>
                     </div>

                     {/* 2. Category filters directly below competitions - scrollable on mobile */}
                     <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                           Catégorie d'âge
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                           {availableCategoryFilters.map(cat => {
                              const count = cat === 'All' ? filteredMatches.length : (categoryCounts[cat] || 0);
                              return (
                              <Button
                                 key={cat}
                                 variant={categoryFilter === cat ? 'default' : 'ghost'}
                                 onClick={() => setCategoryFilter(cat)}
                                 className={`rounded-xl sm:rounded-[1.2rem] px-3 sm:px-4 lg:px-6 font-black uppercase tracking-widest text-[9px] sm:text-[10px] h-10 sm:h-11 transition-all gap-1.5 sm:gap-2 shrink-0 ${categoryFilter === cat ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' : count === 0 ? 'opacity-30 text-muted-foreground hover:bg-secondary' : 'text-muted-foreground hover:bg-secondary'}`}
                              >
                                 {cat}
                                 <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md ${categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {count}
                                 </span>
                              </Button>
                              );
                           })}
                        </div>
                     </div>
                     
                     {/* 3. Secondary filters (Tout, Aujourd'hui, Passé - sans "Calendrier") + Date + Tout Sélectionner */}
                     <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-1">
                        <div className="bg-secondary/40 p-1 sm:p-1.5 rounded-xl sm:rounded-[1.5rem] flex border shadow-inner overflow-x-auto">
                           {[
                              { id: 'all', label: 'Tout', icon: LayoutGrid, shortLabel: 'All' },
                              { id: 'today', label: 'Aujourd\'hui', icon: Timer, shortLabel: 'Auj' },
                              { id: 'finished', label: 'Passé', icon: History, shortLabel: 'Passé' }
                           ].map(f => (
                              <button
                                 key={f.id}
                                 onClick={() => {
                                    const nextFilter = f.id as 'all' | 'finished' | 'today';
                                    setListFilter(nextFilter);
                                    if (viewMode === 'planning') {
                                       setViewMode('grid');
                                    }
                                 }}
                                 className={`flex-1 sm:flex-none px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 sm:gap-2 flex items-center justify-center shrink-0 ${listFilter === f.id ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-white/50'}`}
                              >
                                 <f.icon className="w-3.5 h-3.5 shrink-0" /> 
                                 <span className="hidden sm:inline">{f.label}</span>
                                 <span className="sm:hidden">{f.shortLabel}</span>
                              </button>
                           ))}
                        </div>

                        {/* Date Filter */}
                        <div className="flex items-center gap-2 shrink-0">
                           <div className="flex items-center gap-2 sm:gap-3 bg-white p-1 sm:p-1.5 px-2 sm:px-4 rounded-xl sm:rounded-[1.5rem] border shadow-sm">
                              <Calendar className="w-4 h-4 text-primary shrink-0" />
                              <input
                                 type="date"
                                 value={dateFilter}
                                 onChange={(e) => setDateFilter(e.target.value)}
                                 className="bg-transparent border-none text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-0 cursor-pointer"
                                 placeholder="Choisir une date"
                              />
                           </div>
                           {dateFilter && (
                              <button 
                                 onClick={() => setDateFilter('')}
                                 className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-all border border-slate-200 shrink-0"
                              >
                                 <X className="w-4 h-4" />
                              </button>
                           )}
                        </div>

                        {/* Tout Sélectionner Button */}
                        <div className="shrink-0 ml-auto">
                           <button
                              type="button"
                              onClick={toggleSelectAll}
                              className={`h-10 sm:h-12 px-4 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                 isAllSelected 
                                    ? 'bg-primary text-white border-primary shadow-md' 
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                           >
                              {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              <span>{isAllSelected ? 'Tout Décocher' : 'Tout Sélectionner'}</span>
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black ml-1">
                                 {selectedMatchIds.size}/{filteredMatches.length}
                              </span>
                           </button>
                        </div>
                     </div>
                  </div>

                  {viewMode === 'planning' ? (
                      <motion.div 
                         initial={{ opacity: 0, y: 15 }} 
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -15 }}
                         className="space-y-4 sm:space-y-5"
                      >
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
                               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span>Live</span></div>
                               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span>Prévu</span></div>
                               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /><span>Terminé</span></div>
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
                                     className={`relative min-h-[72px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border-2 transition-all flex flex-col group ${
                                        !isCurrentMonth ? 'opacity-30 border-transparent bg-slate-50/20' :
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
                                           <span className={`text-[10px] sm:text-xs font-black ${
                                              isToday ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center shadow-sm' :
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
                                                 className={`flex items-center gap-1 w-full px-1.5 py-1 rounded-lg border text-[8px] font-black transition-all ${
                                                    isDraggable ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : 'cursor-pointer'
                                                 } ${
                                                    match.status === 'live' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' :
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
                        </div>

                        {/* Selected Date Match Panel — like the mobile app */}
                        <AnimatePresence>
                        {calendarSelectedDate && (() => {
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
                                 <motion.div
                                    key={calendarSelectedDate}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 15 }}
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
                                 </motion.div>
                              );
                           }

                           return (
                              <motion.div
                                 key={calendarSelectedDate}
                                 initial={{ opacity: 0, y: 20 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: 20 }}
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
                                          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-700/50 bg-slate-800/40">
                                             <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5">
                                                <MapPin className="w-3 h-3" />
                                                {match.match_date}
                                             </span>
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
                              </motion.div>
                           );
                        })()}
                        </AnimatePresence>

                        {/* Empty state when no date selected */}
                        {!calendarSelectedDate && (
                           <div className="flex items-center justify-center gap-2 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                              <Calendar className="w-4 h-4" />
                              Cliquez sur un jour avec des matches pour voir les détails
                           </div>
                        )}
                      </motion.div>
                  ) : viewMode === 'table' ? (
                     <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="bg-white border rounded-[2rem] p-4 sm:p-6 shadow-xl overflow-hidden"
                     >
                        <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                              <thead>
                                 <tr className="border-b-2 border-slate-100">
                                    <th className="py-4 px-3 text-center w-10">
                                       <input
                                          type="checkbox"
                                          checked={isAllSelected}
                                          onChange={toggleSelectAll}
                                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                          title={isAllSelected ? "Tout décocher" : "Tout sélectionner"}
                                       />
                                    </th>
                                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Heure</th>
                                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Adversaire</th>
                                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Catégorie</th>
                                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Statut</th>
                                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Score</th>
                                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {filteredMatches.map(match => (
                                    <tr key={match.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                       <td className="py-4 px-3 text-center">
                                          <input
                                             type="checkbox"
                                             checked={selectedMatchIds.has(match.id)}
                                             onChange={(e) => toggleSelectMatch(match.id)}
                                             className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                          />
                                       </td>
                                       <td className="py-4 px-4 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                             <Calendar className="w-4 h-4 text-slate-400" />
                                             <span className="text-xs font-bold text-slate-700">{match.match_date}</span>
                                             <span className="text-xs text-slate-500">{match.match_time?.substring(0, 5)}</span>
                                          </div>
                                       </td>
                                       <td className="py-4 px-4">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center p-1">
                                                <img 
                                                   src={opponentClubs.find(c => c.id === match.opponent_id)?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(getOpponentName(match.opponent_id))}&background=random`} 
                                                   alt="" 
                                                   className="w-full h-full object-contain" 
                                                />
                                             </div>
                                             <span className="text-xs font-black uppercase tracking-tight text-slate-800">{getOpponentName(match.opponent_id)}</span>
                                          </div>
                                       </td>
                                       <td className="py-4 px-4 whitespace-nowrap">
                                          <Badge className="bg-slate-100 text-slate-700 border-none text-[9px] font-bold">{match.category}</Badge>
                                       </td>
                                       <td className="py-4 px-4 text-center whitespace-nowrap">
                                          <Badge className={`border-none text-[9px] font-black uppercase ${match.status === 'finished' ? 'bg-slate-800 text-white' : match.status === 'live' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                             {match.status === 'finished' ? 'Terminé' : match.status === 'live' ? 'En cours' : 'À venir'}
                                          </Badge>
                                       </td>
                                       <td className="py-4 px-4 text-center whitespace-nowrap text-sm font-black tabular-nums">
                                          {(match.status === 'finished' || match.status === 'live') ? (
                                             <span className={match.status === 'live' ? 'text-red-600 font-black animate-pulse' : 'text-slate-900'}>
                                                {`${match.score_home ?? 0} - ${match.score_away ?? 0}`}
                                             </span>
                                          ) : '-'}
                                       </td>
                                       <td className="py-4 px-4 text-right whitespace-nowrap">
                                          <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                             {match.status === 'scheduled' && (
                                                <Button 
                                                   variant="ghost" 
                                                   size="sm" 
                                                   onClick={(e) => { e.stopPropagation(); handleOpenLiveConsole(match.id); }}
                                                   className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all flex items-center gap-1"
                                                   title="Accéder au centre de commande du match"
                                                >
                                                   <Play className="w-3.5 h-3.5" />
                                                   <span className="text-[9px] font-black uppercase">Console</span>
                                                </Button>
                                             )}
                                             <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => { setSelectedMatchId(match.id); setActiveTab('overview'); }}
                                                className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-600 font-bold text-[9px] flex items-center gap-1"
                                                title="Voir les détails"
                                             >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Détails</span>
                                             </Button>
                                             {can('manage_matches') && canManageCategory(match.category) && (
                                                <Button 
                                                   variant="ghost" 
                                                   size="sm" 
                                                   onClick={() => navigate(`/matches/edit/${match.id}`, { state: { match } })}
                                                   className="h-8 px-2 rounded-lg bg-slate-100 hover:bg-amber-50 text-amber-600 font-bold text-[9px] flex items-center gap-1"
                                                   title="Modifier"
                                                >
                                                   <Edit3 className="w-3.5 h-3.5" />
                                                   <span>Modifier</span>
                                                </Button>
                                             )}
                                             {can('manage_matches') && (
                                                <Button 
                                                   variant="ghost" 
                                                   size="sm"
                                                   onClick={(e) => handleOpenDeleteSingle(match, e)}
                                                   className="h-8 w-8 rounded-lg text-red-600 hover:bg-red-50 p-0"
                                                   title="Supprimer"
                                                >
                                                   <Trash2 className="w-4 h-4" />
                                                </Button>
                                             )}
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                                 {filteredMatches.length === 0 && (
                                    <tr>
                                       <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-medium">
                                          Aucun match trouvé pour ces filtres.
                                       </td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </motion.div>
                  ) : viewMode === 'grid' ? (
                     <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                     >
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
                     </motion.div>
                  ) : null}
               </motion.div>
            )}

            {activeTab === 'overview' && (
               <motion.div key="overview" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
                  {selectedMatch ? (
                     <MatchOverviewPanel
                        match={selectedMatch}
                        allMatches={matches}
                        onSelectMatch={(m) => setSelectedMatchId(m.id)}
                        mainClub={mainClub}
                        opponentClubs={opponentClubs}
                        getOpponentName={getOpponentName}
                        onOrchestrate={() => {
                           navigate(`/matches/edit/${selectedMatch.id}`, { state: { match: selectedMatch } });
                        }}
                        onStats={() => setActiveTab('stats')}
                        onBack={() => setActiveTab('details')}
                     />
                  ) : (
                     <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 font-bold text-sm">Chargement du match...</p>
                        <Button onClick={() => setActiveTab('details')} variant="outline" size="sm">
                           Retour aux matchs
                        </Button>
                     </div>
                  )}
               </motion.div>
            )}

            {activeTab === 'preparation' && selectedMatchId && (
               <motion.div key="prep" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}>
                  <ScheduleMatchWizard
                     initialMatch={selectedMatch || matches.find(m => m.id === selectedMatchId) || editingMatch}
                     onBack={() => setActiveTab('overview')}
                     onSuccess={() => {
                        handleWizardSuccess();
                        setActiveTab('overview');
                     }}
                  />
               </motion.div>
            )}

            {activeTab === 'live' && selectedMatchId && (
               <motion.div key="live" initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -100 }}>
                  <LiveTracking matchId={selectedMatchId} onMatchFinished={async () => { await refetch?.(); setListFilter('finished'); setActiveTab('details'); }} />
               </motion.div>
            )}

            {activeTab === 'wizard' && (
               <motion.div key="wizard" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}>
                  <ScheduleMatchWizard
                     initialMatch={editingMatch}
                     onBack={() => { setEditingMatch(null); setActiveTab('details'); }}
                     onSuccess={() => { setEditingMatch(null); handleWizardSuccess(); }}
                  />
               </motion.div>
            )}

            {activeTab === 'stats' && selectedMatchId && selectedMatch && (() => {
               const statLeague = leagues.find(l => l.id === selectedMatch.league_id);
               const isStatMatchFriendly = !selectedMatch.league_id || statLeague?.name?.toLowerCase().includes('amical') || selectedMatch.category?.toLowerCase().includes('amical') || selectedMatch.notes?.toLowerCase().includes('amical');
               return (
                  <motion.div key="stats" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="space-y-6">
                     <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                        <div className="flex items-center gap-4">
                           <Button variant="ghost" size="icon" onClick={() => setActiveTab('details')} className="w-12 h-12 rounded-2xl bg-white border shadow-sm">
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
                  </motion.div>
               );
            })()}
         </AnimatePresence>

         {/* Floating Bulk Actions Bar */}
         <AnimatePresence>
            {selectedMatchIds.size > 0 && (
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
            )}
         </AnimatePresence>
         {/* Floating Action Button (FAB) pour Planification Rapide */}
         {can('create_match') && activeTab === 'details' && (
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
         )}

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
      </div>
   );
};

export default MatchManagementPage;
