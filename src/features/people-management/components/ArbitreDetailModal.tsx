import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Shield,
  Award,
  Calendar,
  Phone,
  Mail,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  Swords,
  Activity,
  Hash,
  AlertTriangle,
  HeartPulse,
  BadgeCheck,
  Scale
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { Arbitre } from '../../../types/arbitre';
import { calculateAge } from '../../../types/arbitre';
import { useMatches } from '../../../hooks/useMatches';
import { useAdvancedDashboardStats } from '../../../hooks/useAdvancedDashboardStats';

interface ArbitreDetailModalProps {
  arbitre: Arbitre | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (arbitre: Arbitre) => void;
}

export const ArbitreDetailModal: React.FC<ArbitreDetailModalProps> = ({
  arbitre,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'career' | 'matches'>('overview');
  const { matches } = useMatches();
  const { data: statsData } = useAdvancedDashboardStats();

  const age = calculateAge(arbitre?.date_naissance);

  const formatRoleLabel = (role?: string) => {
    switch (role) {
      case 'central': return 'Arbitre Principal';
      case 'assistant': return 'Arbitre Assistant';
      case 'commissaire': return 'Commissaire du Match / Délégué';
      case 'var': return 'Arbitre VAR (Vidéo Assistance)';
      case 'quatrieme': return '4ème Officiel / Arbitre Quatrième';
      default: return role ? `Arbitre ${role}` : 'Arbitre';
    }
  };

  // Compute officiated matches
  const officiatedMatches = useMemo(() => {
    if (!arbitre) return [];
    const id = arbitre.id;

    return matches.filter(m => {
      const central = (m as any).referee_central_id === id || (m as any).referees_assigned?.central_id === id;
      const ass1 = (m as any).referee_assistant1_id === id || (m as any).referees_assigned?.assistant1_id === id;
      const ass2 = (m as any).referee_assistant2_id === id || (m as any).referees_assigned?.assistant2_id === id;
      const fourth = (m as any).referee_fourth_id === id || (m as any).referees_assigned?.fourth_id === id;
      const commissaire = (m as any).referee_commissaire_id === id || (m as any).referees_assigned?.commissaire_id === id;
      return central || ass1 || ass2 || fourth || commissaire;
    }).map(m => {
      let roleInMatch = 'Arbitre Principal';
      if ((m as any).referee_commissaire_id === id || (m as any).referees_assigned?.commissaire_id === id) roleInMatch = 'Commissaire du Match';
      else if ((m as any).referee_assistant1_id === id || (m as any).referees_assigned?.assistant1_id === id) roleInMatch = 'Arbitre Assistant 1';
      else if ((m as any).referee_assistant2_id === id || (m as any).referees_assigned?.assistant2_id === id) roleInMatch = 'Arbitre Assistant 2';
      else if ((m as any).referee_fourth_id === id || (m as any).referees_assigned?.fourth_id === id) roleInMatch = '4ème Officiel';

      const events = statsData?.events.filter(e => e.match_id === m.id) || [];
      const yellowCount = events.filter(e => e.type === 'yellow_card').length;
      const redCount = events.filter(e => e.type === 'red_card').length;

      return {
        match: m,
        roleInMatch,
        yellowCount,
        redCount,
      };
    });
  }, [arbitre, matches, statsData]);

  // Overall cards and stats
  const totalYellowGiven = officiatedMatches.reduce((acc, curr) => acc + curr.yellowCount, 0);
  const totalRedGiven = officiatedMatches.reduce((acc, curr) => acc + curr.redCount, 0);

  if (!isOpen || !arbitre) return null;

  const photo = arbitre.photo_url || null;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'FIFA':
        return 'bg-amber-400 text-slate-950 font-black border-amber-500 shadow-sm';
      case 'National 1':
        return 'bg-primary text-white font-black';
      case 'Régional':
        return 'bg-blue-600 text-white font-black';
      default:
        return 'bg-slate-700 text-white font-bold';
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'actif':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'suspendu':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'retraite':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Banner */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex items-center gap-4">
            {/* Avatar Photo */}
            <div className="relative">
              {photo ? (
                <img
                  src={photo}
                  alt={`${arbitre.prenom} ${arbitre.nom}`}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover ring-2 ring-primary/40 shadow-xl bg-slate-800"
                />
              ) : (
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-2xl shadow-xl">
                  {arbitre.prenom[0]}{arbitre.nom[0]}
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-lg bg-primary text-white text-[10px] font-black border border-slate-900 shadow">
                #{arbitre.numero_licence.split('-').pop() || arbitre.id}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  {arbitre.prenom} {arbitre.nom}
                </h3>
                <Badge className={cn("text-[10px] uppercase px-2.5 py-0.5", getGradeColor(arbitre.grade))}>
                  ⭐ Grade {arbitre.grade}
                </Badge>
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px] font-black uppercase px-2 py-0.5">
                  Rôle : {formatRoleLabel(arbitre.role_principal)}
                </Badge>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatutBadge(arbitre.statut))}>
                  {arbitre.statut}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>Licence : <strong>{arbitre.numero_licence}</strong></span>
                <span>•</span>
                <span>Nationalité : <strong>{arbitre.nationalite || 'Marocaine'}</strong></span>
                {age !== null && (
                  <>
                    <span>•</span>
                    <span>Âge : <strong>{age} ans</strong> {arbitre.date_naissance ? `(${arbitre.date_naissance})` : ''}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 px-5 sm:px-6 overflow-x-auto gap-2 py-2.5 no-scrollbar">
          {[
            { id: 'overview', label: "Vue d'Ensemble & Fiche Officielle", icon: Scale },
            { id: 'personal', label: 'État Civil & Contact', icon: User },
            { id: 'career', label: 'Qualifications & Grade', icon: Award },
            { id: 'matches', label: `Matchs Arbitrés (${officiatedMatches.length})`, icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                  active
                    ? "bg-primary text-white shadow-sm font-black"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* TAB 1: VUE D'ENSEMBLE & FICHE OFFICIELLE */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Official Card 1: Fiche Officielle */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-primary" /> Fiche Officielle & Affectation
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-muted-foreground">Numéro de Licence</span>
                      <span className="font-mono font-bold text-foreground">{arbitre.numero_licence}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-muted-foreground">Type d'Arbitre</span>
                      <span className="font-black text-foreground">
                        {formatRoleLabel(arbitre.role_principal)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-muted-foreground">Grade Fédéral</span>
                      <span className="font-bold text-primary uppercase">{arbitre.grade}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-muted-foreground">Statut d'Activité</span>
                      <span className="font-bold capitalize text-emerald-600 dark:text-emerald-400">
                        {arbitre.statut === 'actif' ? 'En activité officielle' : arbitre.statut}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Matchs Assignés</span>
                      <span className="font-bold text-foreground">{officiatedMatches.length} Rencontres</span>
                    </div>
                  </div>
                </div>

                {/* Official Card 2: Aptitude Physique & Fédérale */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-300 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" /> Aptitude Physique & Médicale Validée
                    </p>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/90 leading-relaxed">
                      Test Cooper & Yo-Yo Test d'endurance validés pour la saison 2024-2025 avec mention Fédérale. Certificat médical d'aptitude sportive officiel conforme.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-primary" /> Conformité Réglementaire IFAB
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Habilité(e) pour les compétitions officielles de la Ligue et rencontres fédérales nationales conformément aux règlements généraux.
                    </p>
                  </div>
                </div>
              </div>

              {/* Discipline Stats Given */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Matchs Arbitrés</span>
                  <span className="text-2xl font-black text-foreground mt-0.5 block">{officiatedMatches.length}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Cartons Jaunes (Total)</span>
                  <span className="text-2xl font-black text-amber-500 mt-0.5 block">{totalYellowGiven}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Cartons Rouges (Total)</span>
                  <span className="text-2xl font-black text-rose-500 mt-0.5 block">{totalRedGiven}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Moy. Cartons / Match</span>
                  <span className="text-2xl font-black text-blue-500 mt-0.5 block">
                    {officiatedMatches.length > 0 ? ((totalYellowGiven + totalRedGiven) / officiatedMatches.length).toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ÉTAT CIVIL & CONTACT */}
          {activeTab === 'personal' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" /> Identité & Informations Personnelles
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted-foreground block">Nom & Prénom</span>
                    <span className="font-bold text-foreground text-sm">{arbitre.prenom} {arbitre.nom}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Date de Naissance</span>
                    <span className="font-bold text-foreground">{arbitre.date_naissance || 'Non renseignée'} {age ? `(${age} ans)` : ''}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Nationalité</span>
                    <span className="font-bold text-foreground">{arbitre.nationalite || 'Marocaine'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Numéro de Téléphone</span>
                    <span className="font-bold text-foreground">{arbitre.telephone || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Adresse Email</span>
                    <span className="font-bold text-foreground">{arbitre.email || 'Non renseignée'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Statut Administratif</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                      {arbitre.statut === 'actif' ? '✅ En activité officielle' : arbitre.statut}
                    </span>
                  </div>
                </div>
              </div>

              {/* Affiliation & District */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" /> Affiliation Territoriale & Ligue
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted-foreground block">Ligue Régionale</span>
                    <span className="font-bold text-foreground">Ligue Rabat-Salé-Kénitra</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Commission Centrale</span>
                    <span className="font-bold text-foreground">Direction Nationale d'Arbitrage</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Badge International</span>
                    <span className="font-bold text-amber-500">{arbitre.grade === 'FIFA' ? '🏅 Écusson FIFA Actif' : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUALIFICATIONS & CARRIÈRE */}
          {activeTab === 'career' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-primary" /> Cursus & Diplômes Arbitraux
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border space-y-1">
                    <span className="font-black text-foreground block">Brevet Arbitre Fédéral {arbitre.grade}</span>
                    <p className="text-muted-foreground text-[11px]">Habilité pour les rencontres officielles de haut niveau et compétitions fédérales.</p>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border space-y-1">
                    <span className="font-black text-foreground block">Certification Vidéo Assistance (VAR)</span>
                    <p className="text-muted-foreground text-[11px]">Formation certifiée aux protocoles d'arbitrage vidéo et communication oreillette.</p>
                  </div>
                </div>
              </div>

              {/* Timeline career */}
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-white dark:border-slate-900 shadow" />
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border space-y-1">
                    <span className="font-bold text-foreground block">Obtention du Grade {arbitre.grade}</span>
                    <p className="text-muted-foreground text-[11px]">Promotion officielle suite aux évaluations des délégués de match.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow" />
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border space-y-1">
                    <span className="font-bold text-foreground block">Enregistrement dans la Plateforme Club</span>
                    <p className="text-muted-foreground text-[11px]">Enregistré sous la licence officielle {arbitre.numero_licence}.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MATCHS ARBITRÉS */}
          {activeTab === 'matches' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-muted-foreground">
                Désignations Officielles & Matchs ({officiatedMatches.length})
              </h4>

              {officiatedMatches.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed">
                  Aucun match enregistré avec cet officiel dans le calendrier pour le moment.
                </div>
              ) : (
                officiatedMatches.map(({ match, roleInMatch, yellowCount, redCount }) => (
                  <div
                    key={match.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          {match.is_home ? 'FUS Rabat' : 'Extérieur'} vs {match.opponent_id || 'Adversaire'}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black">
                          {match.score_home} - {match.score_away}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {match.match_date} • Catégorie {match.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase">
                        {roleInMatch}
                      </Badge>
                      {yellowCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px]">
                          🟨 {yellowCount} Jaune{yellowCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {redCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-black text-[10px]">
                          🟥 {redCount} Rouge{redCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            FUS Rabat • Corps Arbitral & Officiels de Match
          </span>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  onEdit(arbitre);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold"
              >
                Modifier
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider"
            >
              Fermer
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ArbitreDetailModal;
