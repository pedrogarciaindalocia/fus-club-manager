import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePermissions } from '../../context/PermissionsContext';
import { useRecruitment } from '../recruitment_v2/hooks/useRecruitment';
import { getRoleConfig } from '../../constants/roles';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import UserProfileModal from '../../components/UserProfileModal';
import {
  Compass,
  UserPlus,
  Calendar,
  Trophy,
  Users,
  Target,
  Sparkles,
  Phone,
  Mail,
  Edit,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  Award,
  ChevronRight,
  ClipboardList,
  History
} from 'lucide-react';

const ScoutDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { authState } = usePermissions();
  const { candidates, tests, scouts, isLoadingCandidates, isLoadingTests } = useRecruitment();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const currentUser = authState.user;
  const displayName = currentUser?.full_name || authState.email?.split('@')[0] || 'Scout FUS';
  const roleConfig = getRoleConfig(currentUser?.system_role || 'scout');
  const avatarUrl = currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=8b5cf6&color=fff&size=120`;

  const userRole = currentUser?.system_role?.toLowerCase() || '';
  const userRoles = (authState?.roles ?? []).map(r => r.toLowerCase());
  const isAdmin = Boolean(
    userRoles.includes('super_admin') ||
    userRoles.includes('scout_admin') ||
    userRole === 'super_admin' ||
    userRole === 'admin' ||
    userRole === 'scout_admin'
  );

  // Identifier le scout correspondant à l'utilisateur connecté
  const userEmail = currentUser?.email?.toLowerCase().trim();
  const userName = (currentUser?.full_name || '').toLowerCase().trim();
  const matchedScout = scouts.find(s => 
    (s.email && s.email.toLowerCase().trim() === userEmail) ||
    (s.id && s.id === currentUser?.id) ||
    (s.full_name && s.full_name.toLowerCase().trim() === userName)
  );

  // Cloisonner les candidats pour le Scout Manager / Scout (ne voir que ses propres joueurs et missions)
  const scopedCandidates = React.useMemo(() => {
    if (isAdmin) return candidates;
    const scoutId = matchedScout?.id || currentUser?.id;
    const scoutName = (matchedScout?.full_name || currentUser?.full_name || '').toLowerCase().trim();

    return candidates.filter(c => {
      // 1. Scout A : Découvreur d'origine
      if (c.discovering_scout_id && c.discovering_scout_id === scoutId) return true;
      if (c.discovering_scout_name && c.discovering_scout_name.toLowerCase().trim() === scoutName) return true;

      // 2. Scout A : Auteur de l'assignation de la mission
      if (c.assigned_by_scout_id && c.assigned_by_scout_id === scoutId) return true;
      if (c.assigned_by_scout_name && c.assigned_by_scout_name.toLowerCase().trim() === scoutName) return true;
      if (c.active_mission?.assigned_by_id === scoutId) return true;

      // 3. Scout B : Scout assigné à la mission
      if (c.assigned_scout_id && c.assigned_scout_id === scoutId) return true;
      if (c.assigned_scout_name && c.assigned_scout_name.toLowerCase().trim() === scoutName) return true;
      if (c.active_mission?.assigned_to_id === scoutId) return true;

      // 4. Utilisateur créateur du joueur
      if ((c as any).created_by && (c as any).created_by === currentUser?.id) return true;

      // 5. Historique des missions passées
      if (c.mission_history?.some(m => m.assigned_to_id === scoutId || m.assigned_by_id === scoutId)) return true;

      return false;
    });
  }, [candidates, isAdmin, matchedScout, currentUser]);

  // Missions d'observation actives
  const activeMissions = React.useMemo(() => {
    return scopedCandidates.filter(c => Boolean(c.active_mission));
  }, [scopedCandidates]);

  // Calcul des statistiques réelles de détection (sur le portefeuille cloisonné)
  const totalCandidates = scopedCandidates.length;
  
  // Candidats sous test ou observation active
  const underTrialCandidates = scopedCandidates.filter(c => 
    c.decision_status === 'trial_assigned' || 
    c.status === 'trial' || 
    c.status === 'observed' ||
    (c as any).decision_status === 'under_evaluation'
  ).length;

  // Candidats retenus ou en shortlist
  const shortlistCandidates = scopedCandidates.filter(c => 
    c.decision_status === 'retained' || 
    c.decision_status === 'signed' || 
    c.status === 'shortlist' ||
    c.recommendation_priority === 'high'
  ).length;

  // Séances de test planifiées à venir
  const upcomingTests = tests.filter(t => {
    if (!t.test_date) return false;
    const testDate = new Date(t.test_date);
    return testDate >= new Date(new Date().setHours(0, 0, 0, 0));
  });

  // 5 Derniers candidats détectés dans son portefeuille
  const recentCandidates = [...scopedCandidates]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 5);

  // Répartition par poste
  const positionCounts = scopedCandidates.reduce((acc, c) => {
    const pos = (c.primary_position || 'AUTRE').toUpperCase();
    if (pos.includes('GK') || pos.includes('GARDIEN')) acc.GK = (acc.GK || 0) + 1;
    else if (pos.includes('DC') || pos.includes('DEF') || pos.includes('LAT') || pos.includes('DG') || pos.includes('DD')) acc.DEF = (acc.DEF || 0) + 1;
    else if (pos.includes('MIL') || pos.includes('MC') || pos.includes('MDC') || pos.includes('MO')) acc.MID = (acc.MID || 0) + 1;
    else acc.ATT = (acc.ATT || 0) + 1;
    return acc;
  }, { GK: 0, DEF: 0, MID: 0, ATT: 0 });

  const getPositionPercent = (count: number) => {
    if (totalCandidates === 0) return 0;
    return Math.round((count / totalCandidates) * 100);
  };

  if (isLoadingCandidates && isLoadingTests) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* 1. Hero Banner: Bienvenue & Espace Détection */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border border-purple-500/20 p-6 sm:p-8 text-white shadow-2xl shadow-purple-950/30"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer" onClick={() => navigate('/profile')}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-purple-500/20 border-2 border-purple-400/30 overflow-hidden shadow-lg shadow-purple-900/40 shrink-0">
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-purple-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-xs">
                <Compass className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Bonjour, {displayName}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  Cellule Détection & Scouting V2
                </span>
              </div>
              <p className="text-xs sm:text-sm text-purple-200/80 font-medium max-w-xl">
                Pilotez la prospection, évaluez les talents sur le terrain et alimentez la Shadow List officielle du FUS Rabat.
              </p>
            </div>
          </div>

          {/* Raccourcis d'actions rapides */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Button
              onClick={() => navigate('/recruitment-v2?tab=candidates&action=new')}
              className="rounded-2xl h-11 px-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 gap-2 flex-1 sm:flex-initial"
            >
              <UserPlus className="w-4 h-4" />
              Nouveau Prospect
            </Button>
            <Button
              onClick={() => navigate('/recruitment-v2?tab=sessions')}
              variant="outline"
              className="rounded-2xl h-11 px-4 bg-white/10 hover:bg-white/15 border-white/20 text-white font-bold text-xs gap-2 flex-1 sm:flex-initial"
            >
              <Calendar className="w-4 h-4 text-purple-300" />
              Planifier Test
            </Button>
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              className="rounded-2xl h-11 px-4 bg-white/5 hover:bg-white/10 border-white/15 text-white font-bold text-xs gap-2 flex-1 sm:flex-initial"
              title="Gérer mon profil & mot de passe"
            >
              <Edit className="w-4 h-4 text-slate-300" />
              Mon Profil
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 2. Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Prospects */}
        <Card className="rounded-3xl border border-border/70 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Base Candidats
              </span>
              <div className="text-3xl font-black text-foreground tracking-tight">
                {totalCandidates}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                <Compass className="w-3.5 h-3.5" />
                <span>Talents prospectés</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: En Observation / Essai */}
        <Card className="rounded-3xl border border-border/70 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                À l'Essai / Tests
              </span>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {underTrialCandidates}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Évaluations actives</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Retenus Shadow List */}
        <Card className="rounded-3xl border border-border/70 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Shadow List
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {shortlistCandidates}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Profils prioritaires</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <Trophy className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Sessions de Tests Programmées */}
        <Card className="rounded-3xl border border-border/70 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Sessions à Venir
              </span>
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {upcomingTests.length}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Tests planifiés</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Target className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Section Centrale : Dernières Détections & Widgets Opérationnels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonne Gauche (2/3) : Dernières Détections */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-600" />
                Dernières Fiches Détections
              </h2>
              <p className="text-xs text-muted-foreground font-medium">Les talents les plus récents enregistrés par la cellule</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/recruitment-v2?tab=candidates')}
              className="text-xs font-black uppercase text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 gap-1 rounded-xl"
            >
              Voir la Database
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            {recentCandidates.length === 0 ? (
              <Card className="rounded-3xl border border-dashed p-8 text-center bg-white dark:bg-slate-900">
                <Compass className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">Aucun candidat enregistré pour le moment</p>
                <p className="text-xs text-muted-foreground mt-1">Commencez par ajouter une première fiche de détection terrain.</p>
                <Button 
                  onClick={() => navigate('/recruitment-v2?tab=candidates&action=new')}
                  className="mt-4 rounded-xl text-xs font-black uppercase bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Ajouter un Prospect
                </Button>
              </Card>
            ) : (
              recentCandidates.map((cand) => {
                const score = (cand as any).initial_scout_score || (cand as any).overall_rating || null;
                return (
                  <Card 
                    key={cand.id} 
                    onClick={() => navigate(`/recruitment-v2?tab=candidates&candidateId=${cand.id}`)}
                    className="rounded-2xl border border-border/80 hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-slate-900 overflow-hidden group"
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border/60 flex items-center justify-center">
                          {cand.photo_url ? (
                            <img src={cand.photo_url} alt={cand.full_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <Users className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground truncate group-hover:text-purple-600 transition-colors">
                              {cand.full_name}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-secondary text-secondary-foreground border">
                              {cand.primary_position || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                            {cand.current_club && (
                              <span className="truncate max-w-[140px] font-medium">📍 {cand.current_club}</span>
                            )}
                            {cand.birth_date && (
                              <span className="font-medium">• Né en {new Date(cand.birth_date).getFullYear()}</span>
                            )}
                            {cand.foot && (
                              <span className="font-semibold text-purple-600 dark:text-purple-400">• Pied {cand.foot}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {score && (
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Note Scout</span>
                            <span className="text-sm font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                              {score}/10
                            </span>
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne Droite (1/3) : Agenda Tests & Répartition Postes */}
        <div className="space-y-6">
          
          {/* Widget 1 : Répartition par Postes */}
          <Card className="rounded-3xl border border-border/80 bg-white dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-600" /> Répartition par Poste
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{totalCandidates} Joueurs</span>
              </div>

              <div className="space-y-3 text-xs font-bold">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-foreground">Attaquants (ATT / Ailier)</span>
                    <span className="text-purple-600">{positionCounts.ATT} ({getPositionPercent(positionCounts.ATT)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${getPositionPercent(positionCounts.ATT)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-foreground">Milieux (MID / MO / MDC)</span>
                    <span className="text-indigo-600">{positionCounts.MID} ({getPositionPercent(positionCounts.MID)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${getPositionPercent(positionCounts.MID)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-foreground">Défenseurs (DEF / DC / Latéral)</span>
                    <span className="text-emerald-600">{positionCounts.DEF} ({getPositionPercent(positionCounts.DEF)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${getPositionPercent(positionCounts.DEF)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-foreground">Gardiens (GK)</span>
                    <span className="text-amber-600">{positionCounts.GK} ({getPositionPercent(positionCounts.GK)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-amber-600 rounded-full transition-all" style={{ width: `${getPositionPercent(positionCounts.GK)}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget 2 : Prochaines Sessions de Tests */}
          <Card className="rounded-3xl border border-border/80 bg-white dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Agenda des Tests
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/recruitment-v2?tab=sessions')}
                  className="text-[10px] font-black uppercase text-indigo-600 p-0 h-auto hover:bg-transparent"
                >
                  Planning
                </Button>
              </div>

              {upcomingTests.length === 0 ? (
                <div className="text-center py-4 text-xs font-medium text-muted-foreground">
                  Aucune session de test à venir.
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/recruitment-v2?tab=sessions')}
                    className="mt-2.5 w-full rounded-xl text-[10px] font-black uppercase"
                  >
                    Programmer une Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingTests.slice(0, 3).map(t => (
                    <div key={t.id} className="p-3 rounded-2xl bg-secondary/40 border border-border/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-foreground block">{t.title || 'Séance de détection'}</span>
                        <span className="text-[11px] text-muted-foreground">
                          📅 {t.test_date} {t.location ? `• 📍 ${t.location}` : ''}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-black uppercase">
                        {t.status || 'Planifié'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget : Missions d'Observation Confiées */}
          <Card className="rounded-3xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-600" /> Missions d'Observation ({activeMissions.length})
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/recruitment-v2?tab=candidates')}
                  className="text-[10px] font-black uppercase text-purple-600 p-0 h-auto hover:bg-transparent"
                >
                  Détails
                </Button>
              </div>

              {activeMissions.length === 0 ? (
                <div className="text-center py-4 text-xs font-medium text-muted-foreground">
                  Aucune mission d'observation active assignée.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeMissions.slice(0, 3).map(cand => (
                    <div 
                      key={cand.id}
                      onClick={() => navigate(`/recruitment-v2?tab=candidates&candidateId=${cand.id}`)}
                      className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-1.5 cursor-pointer hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 dark:text-white text-xs truncate">
                          {cand.first_name} {cand.last_name}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                          {cand.active_mission?.priority || 'Mission'}
                        </Badge>
                      </div>
                      <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 truncate">
                        🎯 {cand.active_mission?.mission_title}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                        <span>Scout B : <strong>{cand.active_mission?.assigned_to_name}</strong></span>
                        {cand.active_mission?.due_date && (
                          <span>Échéance : {cand.active_mission.due_date}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget 3 : Mon Profil Scout Synthèse */}
          <Card className="rounded-3xl border border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" /> Mon Espace Scout
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/profile')}
                className="text-[10px] font-black uppercase text-purple-600 hover:text-purple-700 p-0 h-auto cursor-pointer"
              >
                Modifier
              </Button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span className="truncate">{authState.email}</span>
              </div>
              {(currentUser as any)?.phone_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>{(currentUser as any).phone_number}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span>Zone : Maroc & International</span>
              </div>
            </div>

            <Button
              onClick={() => navigate('/profile')}
              className="w-full mt-4 rounded-xl text-xs font-black uppercase bg-purple-600 hover:bg-purple-500 text-white shadow-sm cursor-pointer"
            >
              Gérer mon profil & mot de passe
            </Button>
          </Card>

        </div>
      </div>

      {/* Fin Dashboard */}
    </div>
  );
};

export default ScoutDashboardView;
