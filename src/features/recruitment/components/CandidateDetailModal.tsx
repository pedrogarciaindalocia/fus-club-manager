import React, { useState } from 'react';
import type {
  TrialCandidate,
  CandidateEvaluation,
  ScoutObservation,
  PlayerTest,
  RecruitmentTimelineEvent
} from '../types/recruitment';
import PlayerRadarChart from './PlayerRadarChart';
import {
  X, User, Shield, Calendar, Award, Sparkles, Phone, Mail,
  HeartHandshake, Clock, MapPin, CheckCircle2, AlertCircle, FileText, Briefcase, Building2,
  ShieldCheck, ShieldAlert, UserCheck, Zap, Star, XCircle, RotateCcw, TrendingUp, TrendingDown, Edit3,
  Video, Play, ExternalLink, Lock, Compass, Target, Brain, Footprints, Activity, Plus
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { recruitmentService } from '../services/recruitmentService';
import { toast } from 'sonner';
import { useClubData } from '../../../hooks/useClubData';
import { useMetrics } from '../../../hooks/useMetrics';
import type { Club } from '../../../types';
import { OpponentClubFormModal } from '../../club-management/components/OpponentClubFormModal';
import DOMPurify from 'dompurify';

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: TrialCandidate;
  evaluations: CandidateEvaluation[];
  observations: ScoutObservation[];
  tests: PlayerTest[];
  timeline: RecruitmentTimelineEvent[];
  onUpdateStatus: (id: string, status: TrialCandidate['status']) => void;
  onOpenEvaluation: (options?: { mode?: 'create' | 'reevaluate' | 'edit'; testId?: string }) => void;
  onOpenObservation: () => void;
  onScheduleTest?: (candidate: TrialCandidate) => void;
  onRefresh?: () => void;
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  isOpen,
  onClose,
  candidate,
  evaluations,
  observations,
  tests,
  timeline,
  onUpdateStatus,
  onOpenEvaluation,
  onOpenObservation,
  onScheduleTest,
  onRefresh,
}) => {
  const { opponentClubs = [] } = useClubData();
  const { positions, getPositionByCode } = useMetrics();
  const [activeTab, setActiveTab] = useState<'scout' | 'personal' | 'sport' | 'qualities' | 'reports'>('scout');
  const [activeQualityPillar, setActiveQualityPillar] = useState<'tech' | 'tact' | 'phys' | 'ment'>('tech');
  const [isOpponentModalOpen, setIsOpponentModalOpen] = useState(false);
  const [selectedOpponentClub, setSelectedOpponentClub] = useState<Club | null>(null);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const candidateEvals = evaluations.filter(e => e.candidate_id === candidate.id);
  const latestEval = candidateEvals[0];

  const positionConfig = React.useMemo(() => {
    const config = getPositionByCode(candidate.primary_position);
    if (config) return config;
    return { name: candidate.primary_position, code: candidate.primary_position, emoji: '👤', category: 'MF', criteria: { technique: [], tactique: [], physique: [], mental: [] } };
  }, [candidate.primary_position, positions, getPositionByCode]);
  const candidateObs = observations.filter(o => o.candidate_id === candidate.id);
  const candidateTests = tests.filter(t => t.candidate_id === candidate.id);
  const candidateTimeline = timeline.filter(t => t.candidate_id === candidate.id);

  // Filtrage des tests selon la date pour verrouillage d'évaluation
  const eligibleTests = candidateTests.filter(t => t.test_date <= todayStr);
  const futureTests = candidateTests.filter(t => t.test_date > todayStr);
  const firstEligibleTest = eligibleTests[0];
  const nextFutureTest = futureTests[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center font-bold text-xl shrink-0">
              {candidate.photo_url ? (
                <img
                  src={candidate.photo_url}
                  alt={`${candidate.first_name} ${candidate.last_name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <User className="w-8 h-8 text-white/50" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{candidate.first_name} {candidate.last_name}</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary text-white">
                  {candidate.primary_position}
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                  {candidate.age_category || 'U19'}
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-white/20 text-white">
                  {candidate.pipeline_stage.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Club : {candidate.current_club || 'Sans club'} • Nationalité : {candidate.nationality} • Catégorie : {candidate.age_category || 'U19'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation : Exactement les 5 onglets demandés */}
        <div className="flex border-b bg-white px-6 overflow-x-auto gap-2 py-2.5">
          {[
            { id: 'scout', label: '1. Scout', icon: Compass },
            { id: 'personal', label: '2. État Civil & Contact', icon: User },
            { id: 'sport', label: '3. Rapport du Joueur', icon: Shield },
            { id: 'qualities', label: '4. Qualités', icon: Star },
            { id: 'reports', label: '5. Rapport de Scout', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* TAB 1 : SCOUT & DÉCOUVERTE */}
          {activeTab === 'scout' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-200">
              {/* Carte Référents & Découverte */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" /> Cellule Découverte & Recruteur Référent
                  </h4>
                  {candidate.initial_scout_score && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-xs border border-amber-300 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Score Initial : {candidate.initial_scout_score}/10
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-white rounded-xl border">
                    <span className="text-muted-foreground block text-[11px]">Scout Découvreur</span>
                    <span className="font-bold text-slate-900 text-sm">{candidate.discovering_scout_name || 'Cellule FUS'}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border">
                    <span className="text-muted-foreground block text-[11px]">Recruteur Référent</span>
                    <span className="font-bold text-amber-800 text-sm">{candidate.recruiter_name || 'Direction Recrutement'}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border">
                    <span className="text-muted-foreground block text-[11px]">Priorité de Recommandation</span>
                    <span className={cn(
                      "font-black uppercase text-xs inline-block mt-0.5 px-2 py-0.5 rounded",
                      candidate.recommendation_priority === 'very_high' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                      candidate.recommendation_priority === 'high' ? "bg-amber-100 text-amber-800 border border-amber-200" :
                      candidate.recommendation_priority === 'medium' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                      "bg-slate-100 text-slate-800"
                    )}>
                      {candidate.recommendation_priority || 'Normale'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <span className="text-muted-foreground block">Date de Découverte</span>
                    <span className="font-bold">{candidate.discovery_date || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Lieu / Ville de Découverte</span>
                    <span className="font-bold flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {candidate.discovery_location || 'Non renseigné'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Match de Découverte</span>
                    <span className="font-bold">{candidate.discovery_match || 'Match libre / Détection'}</span>
                  </div>
                </div>

                {/* Zones Préférées */}
                {((candidate as any).preferred_locations?.length > 0 || (candidate as any).preferred_zones?.length > 0) && (
                  <div className="pt-3 border-t">
                    <span className="text-muted-foreground block mb-1.5 font-medium">Zones & Territoires Préférés</span>
                    <div className="flex flex-wrap gap-1.5">
                      {((candidate as any).preferred_locations || (candidate as any).preferred_zones || []).map((zone: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-800 font-bold text-[11px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {zone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Note / Recommandation Scout */}
              {candidate.scout_recommendation_notes && (
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 space-y-2">
                  <h5 className="font-bold text-blue-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Notes et Recommandation du Scout
                  </h5>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-white/80 p-3 rounded-xl border border-blue-100">
                    {candidate.scout_recommendation_notes}
                  </p>
                </div>
              )}

              {/* Vidéo Highlights dans l'onglet Scout */}
              {candidate.video_url && (() => {
                const isYouTube = candidate.video_type === 'youtube' || candidate.video_url.includes('youtu');
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                const match = candidate.video_url.match(regExp);
                const ytId = (match && match[2].length === 11) ? match[2] : null;

                return (
                  <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md",
                          isYouTube ? "bg-red-600" : "bg-emerald-600"
                        )}>
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider">
                            Vidéo Highlights & Détection
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {isYouTube ? 'Lecteur Vidéo YouTube' : 'Document Google Drive'}
                          </span>
                        </div>
                      </div>

                      <a
                        href={candidate.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ouvrir le lien
                      </a>
                    </div>

                    {(candidate as any).video_source && (
                      <p className="text-[11px] text-slate-400">Source : {(candidate as any).video_source}</p>
                    )}

                    {isYouTube && ytId ? (
                      <div className="rounded-2xl overflow-hidden aspect-video w-full bg-black border border-white/10 shadow-2xl">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title="Vidéo Highlights du Joueur"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-200">Fichier Vidéo sur Google Drive</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-md font-mono">{candidate.video_url}</p>
                        </div>
                        <a
                          href={candidate.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Visionner sur Google Drive
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2 : ÉTAT CIVIL & TUTEUR */}
          {activeTab === 'personal' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" /> État Civil & Contact Joueur
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-muted-foreground block">Nom & Prénom</span>
                    <span className="font-bold">{candidate.first_name} {candidate.last_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Date & Lieu de Naissance</span>
                    <span className="font-bold">{candidate.birth_date || '-'} {candidate.birth_place ? `(${candidate.birth_place})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Nationalité</span>
                    <span className="font-bold">{candidate.nationality}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Téléphone</span>
                    <span className="font-bold">{candidate.phone || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Email</span>
                    <span className="font-bold">{candidate.email || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Ville & Pays</span>
                    <span className="font-bold">{candidate.city || '-'} {candidate.country ? `(${candidate.country})` : ''}</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-muted-foreground block">Adresse de Résidence</span>
                    <span className="font-bold">{candidate.address || 'Non renseignée'}</span>
                  </div>
                </div>
              </div>

              {/* Section Tuteur */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                <h4 className="font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-amber-700" /> Tuteur / Représentant Légal (Mineurs)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-amber-800/80 block">Nom du Tuteur</span>
                    <span className="font-bold text-amber-950">{candidate.guardian_name || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 block">Lien de Parenté</span>
                    <span className="font-bold text-amber-950">{candidate.guardian_relationship || 'Père'}</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 block text-[11px] mb-1">Statut Consentement</span>
                    {candidate.guardian_consent_status === 'granted' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Accord Accordé
                      </span>
                    ) : candidate.guardian_consent_status === 'refused' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-black text-xs border border-rose-300">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Refusé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-xs border border-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> En attente
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-amber-800/80 block">Téléphone Principal</span>
                    <span className="font-bold text-amber-950">{candidate.guardian_phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 block">Téléphone Alternatif</span>
                    <span className="font-bold text-amber-950">{candidate.guardian_phone_alt || '-'}</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 block">Email Tuteur</span>
                    <span className="font-bold text-amber-950">{candidate.guardian_email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-amber-800/80 block">Contact Urgence</span>
                    <span className="font-bold text-amber-950">{candidate.emergency_contact || '-'}</span>
                  </div>
                  {candidate.guardian_address && (
                    <div className="sm:col-span-2">
                      <span className="text-amber-800/80 block">Adresse du Tuteur</span>
                      <span className="font-bold text-amber-950">{candidate.guardian_address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 : SPORTIF */}
          {activeTab === 'sport' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" /> Caractéristiques Sportives & Stats en Club
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-muted-foreground block">Poste Principal</span>
                    <span className="font-bold text-slate-900">{candidate.primary_position}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Poste Secondaire</span>
                    <span className="font-bold text-slate-900">{candidate.secondary_position || 'Aucun'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Pied Fort</span>
                    <span className="font-bold text-slate-900">{candidate.preferred_foot}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Surclassement</span>
                    <span className="font-bold text-primary">{candidate.surclassement || '0C'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Club Actuel</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold">{candidate.current_club || '-'}</span>
                      {candidate.current_club && (
                        <button
                          type="button"
                          onClick={() => {
                            const found = opponentClubs.find(c => c.name.toLowerCase() === candidate.current_club?.toLowerCase().trim());
                            setSelectedOpponentClub(found || null);
                            setIsOpponentModalOpen(true);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all flex items-center gap-1 shadow-xs"
                          title="Afficher la fiche du club adversaire"
                        >
                          <Building2 className="w-3 h-3" /> Fiche Club
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Clubs Précédents</span>
                    <span className="font-bold">{candidate.previous_clubs || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Matchs / Minutes</span>
                    <span className="font-bold">{candidate.matches_played || 0} matchs ({candidate.minutes_played || 0} min)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Buts & Passes</span>
                    <span className="font-bold">{candidate.goals || 0} buts / {candidate.assists || 0} passes</span>
                  </div>
                </div>

                {candidate.national_selections && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground block">Sélections Nationales</span>
                    <span className="font-bold text-slate-900">{candidate.national_selections}</span>
                  </div>
                )}

                {candidate.injury_history && (
                  <div className="pt-2 border-t">
                    <span className="text-rose-700 font-bold block flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Historique des Blessures
                    </span>
                    <p className="text-slate-800 mt-1 bg-white p-2.5 rounded-xl border border-rose-100">
                      {candidate.injury_history}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4 : QUALITÉS (4 PILIERS & RADAR) */}
          {activeTab === 'qualities' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-200">
              {/* En-tête Métriques selon le Poste */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                    {positionConfig.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Métriques de Poste : {positionConfig.name} ({positionConfig.code})
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                        {positionConfig.category || 'Poste'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Grille de critères spécifiques configurés pour ce profil tactique
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {latestEval ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center gap-1.5 shadow-sm">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        Score Global : {latestEval.overall_score}/10
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenEvaluation({ mode: 'edit' })}
                        className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenEvaluation({ mode: 'create' })}
                      className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Créer l'Évaluation
                    </button>
                  )}
                </div>
              </div>

              {/* Les 4 Piliers Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    key: 'tech',
                    name: 'Technique',
                    weight: '30%',
                    score: latestEval?.technical_score,
                    count: (positionConfig.criteria?.technique || []).length,
                    icon: Zap,
                    bgColor: 'bg-blue-50/60',
                    borderColor: 'border-blue-200',
                    textColor: 'text-blue-900',
                    badgeColor: 'bg-blue-100 text-blue-800',
                    barColor: 'bg-blue-600',
                  },
                  {
                    key: 'tact',
                    name: 'Tactique',
                    weight: '25%',
                    score: latestEval?.tactical_score,
                    count: (positionConfig.criteria?.tactique || []).length,
                    icon: Compass,
                    bgColor: 'bg-emerald-50/60',
                    borderColor: 'border-emerald-200',
                    textColor: 'text-emerald-900',
                    badgeColor: 'bg-emerald-100 text-emerald-800',
                    barColor: 'bg-emerald-600',
                  },
                  {
                    key: 'phys',
                    name: 'Physique',
                    weight: '25%',
                    score: latestEval?.physical_score,
                    count: (positionConfig.criteria?.physique || []).length,
                    icon: Activity,
                    bgColor: 'bg-amber-50/60',
                    borderColor: 'border-amber-200',
                    textColor: 'text-amber-900',
                    badgeColor: 'bg-amber-100 text-amber-800',
                    barColor: 'bg-amber-600',
                  },
                  {
                    key: 'ment',
                    name: 'Mental',
                    weight: '20%',
                    score: latestEval?.mental_score,
                    count: (positionConfig.criteria?.mental || []).length,
                    icon: Brain,
                    bgColor: 'bg-purple-50/60',
                    borderColor: 'border-purple-200',
                    textColor: 'text-purple-900',
                    badgeColor: 'bg-purple-100 text-purple-800',
                    barColor: 'bg-purple-600',
                  },
                ].map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.key}
                      onClick={() => setActiveQualityPillar(pillar.key as any)}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all cursor-pointer",
                        pillar.bgColor,
                        pillar.borderColor,
                        activeQualityPillar === pillar.key ? "ring-2 ring-primary shadow-sm" : "hover:opacity-90"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn("font-black text-xs flex items-center gap-1.5", pillar.textColor)}>
                          <Icon className="w-3.5 h-3.5" /> {pillar.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{pillar.weight}</span>
                      </div>
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-xl font-black text-slate-900">
                          {pillar.score !== undefined && pillar.score !== null ? `${pillar.score}` : '-'}
                          <span className="text-xs font-medium text-slate-400">/10</span>
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">
                          {pillar.count} critères
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", pillar.barColor)}
                          style={{ width: `${((pillar.score ?? 0) / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Radar Chart & Détail des Critères par Pilier */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Visual Radar Chart */}
                {latestEval && (
                  <div className="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-primary" /> Radar des Piliers
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Moyennes 1-10
                      </span>
                    </div>
                    <div className="w-full">
                      <PlayerRadarChart
                        evaluations={[{
                          name: `${candidate.first_name} ${candidate.last_name}`,
                          color: '#2563eb',
                          eval: latestEval,
                        }]}
                        height={260}
                        detailed={true}
                      />
                    </div>
                  </div>
                )}

                {/* Critères Détaillés du Pilier Actif */}
                <div className={cn(latestEval ? "lg:col-span-7" : "lg:col-span-12", "space-y-3")}>
                  {/* Onglets sélecteur de pilier */}
                  <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border">
                    {[
                      { id: 'tech', label: 'Technique', icon: Zap, score: latestEval?.technical_score },
                      { id: 'tact', label: 'Tactique', icon: Compass, score: latestEval?.tactical_score },
                      { id: 'phys', label: 'Physique', icon: Activity, score: latestEval?.physical_score },
                      { id: 'ment', label: 'Mental', icon: Brain, score: latestEval?.mental_score },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeQualityPillar === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveQualityPillar(tab.id as any)}
                          className={cn(
                            "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                            isActive ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{tab.label}</span>
                          {tab.score !== undefined && tab.score !== null && (
                            <span className={cn(
                              "px-1.5 py-0.2 rounded text-[10px] font-black",
                              isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                            )}>
                              {tab.score}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Liste des critères du pilier actif */}
                  {(() => {
                    const pillarKey = activeQualityPillar === 'tech' ? 'technique' :
                                     activeQualityPillar === 'tact' ? 'tactique' :
                                     activeQualityPillar === 'phys' ? 'physique' : 'mental';
                    const list: any[] = positionConfig.criteria[pillarKey] || [];
                    const pillarScore = activeQualityPillar === 'tech' ? latestEval?.technical_score :
                                       activeQualityPillar === 'tact' ? latestEval?.tactical_score :
                                       activeQualityPillar === 'phys' ? latestEval?.physical_score : latestEval?.mental_score;
                    const pillarReport = activeQualityPillar === 'tech' ? latestEval?.tech_report :
                                        activeQualityPillar === 'tact' ? latestEval?.tact_report :
                                        activeQualityPillar === 'phys' ? latestEval?.phys_report : latestEval?.ment_report;

                    return (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="font-bold text-slate-800 text-xs capitalize">
                            Critères {pillarKey} ({list.length})
                          </span>
                          <span className="text-[11px] font-bold text-slate-600">
                            Note Moyenne : <strong className="text-primary">{pillarScore ?? '-'}/10</strong>
                          </span>
                        </div>

                        {list.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4 text-xs italic">
                            Aucun critère spécifique configuré pour ce pilier.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {list.map((c, idx) => {
                              const label = typeof c === 'string' ? c : c?.label || String(c);
                              const scoreVal = latestEval?.criteria_scores?.[label] ?? pillarScore ?? null;

                              return (
                                <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200/80 space-y-1.5 shadow-2xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-slate-800 text-[11px] truncate" title={label}>
                                      {label}
                                    </span>
                                    <span className={cn(
                                      "font-black text-xs px-1.5 py-0.5 rounded",
                                      scoreVal !== null && scoreVal >= 8 ? "bg-emerald-100 text-emerald-800" :
                                      scoreVal !== null && scoreVal >= 6 ? "bg-blue-100 text-blue-800" :
                                      scoreVal !== null && scoreVal >= 4 ? "bg-amber-100 text-amber-800" :
                                      scoreVal !== null ? "bg-rose-100 text-rose-800" :
                                      "bg-slate-100 text-slate-500"
                                    )}>
                                      {scoreVal !== null ? `${scoreVal}/10` : '-'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-300",
                                        scoreVal !== null && scoreVal >= 8 ? "bg-emerald-500" :
                                        scoreVal !== null && scoreVal >= 6 ? "bg-blue-500" :
                                        scoreVal !== null && scoreVal >= 4 ? "bg-amber-500" :
                                        scoreVal !== null ? "bg-rose-500" :
                                        "bg-slate-300"
                                      )}
                                      style={{ width: `${scoreVal !== null ? (scoreVal / 10) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Rapport & Remarques du Scout pour ce domaine */}
                        {pillarReport && (
                          <div className="mt-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1">
                            <span className="font-bold text-blue-900 block text-[11px] flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-600" /> Remarques du Scout ({pillarKey})
                            </span>
                            <p className="text-slate-700 text-xs whitespace-pre-line leading-relaxed">
                              {pillarReport}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5 : RAPPORT DE SCOUT */}
          {activeTab === 'reports' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-200">
              {latestEval ? (
                <div className="space-y-4">
                  {/* Synthèse du dernier rapport scout */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-black text-slate-800 text-sm">Rapport & Synthèse Scout</h4>
                          <p className="text-[11px] text-slate-500">Évaluation par {latestEval.evaluator_name} le {latestEval.evaluation_date}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-xs">
                        Score Global : {latestEval.overall_score}/10
                      </span>
                    </div>

                    <div className="space-y-3">
                      {latestEval.strengths && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                            <Zap className="w-4 h-4 text-emerald-600" /> Points Forts
                          </span>
                          <div
                            className="text-slate-700 text-xs leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(latestEval.strengths) }}
                          />
                        </div>
                      )}

                      {latestEval.weaknesses && (
                        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-1">
                          <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                            <AlertCircle className="w-4 h-4 text-rose-600" /> Points à Développer / Axes d'Amélioration
                          </span>
                          <div
                            className="text-slate-700 text-xs leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(latestEval.weaknesses) }}
                          />
                        </div>
                      )}

                      {latestEval.projection && (
                        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                          <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                            <Star className="w-4 h-4 text-amber-600" /> Projection & Évolution au Club
                          </span>
                          <div
                            className="text-slate-700 text-xs leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(latestEval.projection) }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rapports Détaillés par Pilier (si disponibles) */}
                  {(latestEval.tech_report || latestEval.tact_report || latestEval.phys_report || latestEval.ment_report) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {latestEval.tech_report && (
                        <div className="p-3.5 bg-white rounded-2xl border space-y-1">
                          <span className="font-bold text-slate-800 block text-xs">⚽ Rapport Technique</span>
                          <p className="text-slate-600 text-[11px] whitespace-pre-line">{latestEval.tech_report}</p>
                        </div>
                      )}
                      {latestEval.tact_report && (
                        <div className="p-3.5 bg-white rounded-2xl border space-y-1">
                          <span className="font-bold text-slate-800 block text-xs">🧭 Rapport Tactique</span>
                          <p className="text-slate-600 text-[11px] whitespace-pre-line">{latestEval.tact_report}</p>
                        </div>
                      )}
                      {latestEval.phys_report && (
                        <div className="p-3.5 bg-white rounded-2xl border space-y-1">
                          <span className="font-bold text-slate-800 block text-xs">🏃 Rapport Physique</span>
                          <p className="text-slate-600 text-[11px] whitespace-pre-line">{latestEval.phys_report}</p>
                        </div>
                      )}
                      {latestEval.ment_report && (
                        <div className="p-3.5 bg-white rounded-2xl border space-y-1">
                          <span className="font-bold text-slate-800 block text-xs">🧠 Rapport Mental</span>
                          <p className="text-slate-600 text-[11px] whitespace-pre-line">{latestEval.ment_report}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : candidate.scout_recommendation_notes ? (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Notes de Recommandation Scout
                  </h4>
                  <p className="text-slate-700 text-xs whitespace-pre-line bg-white p-4 rounded-xl border">
                    {candidate.scout_recommendation_notes}
                  </p>
                </div>
              ) : (
                <div className="py-12 px-6 text-center bg-slate-50 rounded-2xl border border-dashed space-y-2">
                  <Target className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-muted-foreground">Aucun rapport de synthèse ou note scout rédigé pour ce joueur.</p>
                  <button
                    type="button"
                    onClick={() => onOpenEvaluation({ mode: 'create' })}
                    className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all inline-flex items-center gap-2 mt-2"
                  >
                    <Award className="w-4 h-4" />
                    Créer le 1er Rapport Scout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Squad Integration Action */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Statut Pipeline :
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              {candidate.pipeline_stage}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const res = await recruitmentService.integrateCandidateToSquad(candidate.id);
                if (res.success) {
                  toast.success(res.message);
                } else {
                  toast.error(res.message);
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>🎓 Intégrer à l'Effectif Officiel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>

      {/* Modal Officiel de Consultation / Modification de Club Adversaire */}
      {isOpponentModalOpen && (
        <OpponentClubFormModal
          isOpen={isOpponentModalOpen}
          onClose={() => {
            setIsOpponentModalOpen(false);
            setSelectedOpponentClub(null);
          }}
          club={selectedOpponentClub}
          initialName={candidate.current_club || ''}
        />
      )}
    </div>
  );
};
export default CandidateDetailModal;
