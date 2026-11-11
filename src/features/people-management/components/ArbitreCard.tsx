import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Shield, Mail, Phone, Calendar, Edit2, Trash2, Hash, Award, Eye, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import type { Arbitre } from '../../../types/arbitre';
import { calculateAge } from '../../../types/arbitre';

interface ArbitreCardProps {
  arbitre: Arbitre;
  onEdit: (arbitre: Arbitre) => void;
  onDelete: (id: number | string) => void;
  onSelect?: (arbitre: Arbitre) => void;
  viewMode?: 'grid' | 'list';
}

export const ArbitreCard: React.FC<ArbitreCardProps> = ({
  arbitre,
  onEdit,
  onDelete,
  onSelect,
  viewMode = 'grid',
}) => {
  const age = calculateAge(arbitre.date_naissance);

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'central': return 'Arbitre Principal';
      case 'assistant': return 'Arbitre Assistant';
      case 'commissaire': return 'Commissaire du Match';
      case 'var': return 'Arbitre VAR';
      case 'quatrieme': return '4ème Officiel';
      default: return `Arbitre ${role}`;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'central':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'assistant':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'commissaire':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'var':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'quatrieme':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  const getStatutBadgeClass = (statut: string) => {
    switch (statut) {
      case 'actif':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'inactif':
        return 'bg-secondary text-muted-foreground border-border';
      case 'suspendu':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'retraite':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect && onSelect(arbitre)}
        className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer group"
      >
        <div className="flex items-center space-x-4 min-w-0">
          {arbitre.photo_url ? (
            <img
              src={arbitre.photo_url}
              alt={`${arbitre.prenom} ${arbitre.nom}`}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-primary/20 shrink-0 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-lg shrink-0 group-hover:scale-105 transition-transform">
              {arbitre.prenom[0]}
              {arbitre.nom[0]}
            </div>
          )}

          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {arbitre.prenom} <span className="uppercase text-primary">{arbitre.nom}</span>
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(arbitre.role_principal)}`}>
                {formatRoleLabel(arbitre.role_principal)}
              </span>
              <span className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-border">
                {arbitre.grade}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatutBadgeClass(arbitre.statut)}`}>
                {arbitre.statut}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center space-x-1 font-mono">
            <Hash className="w-3.5 h-3.5 text-primary" />
            <span>{arbitre.numero_licence}</span>
          </div>

          {age !== null && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{age} ans</span>
            </div>
          )}

          {arbitre.telephone && (
            <div className="hidden sm:flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5" />
              <span>{arbitre.telephone}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 ml-auto" onClick={(e) => e.stopPropagation()}>
            {onSelect && (
              <button
                onClick={() => onSelect(arbitre)}
                className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1 text-[11px]"
                title="Voir la fiche détaillée"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Détails</span>
              </button>
            )}
            <button
              onClick={() => onEdit(arbitre)}
              className="p-2 rounded-xl bg-secondary text-secondary-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Voulez-vous supprimer l'arbitre ${arbitre.prenom} ${arbitre.nom} ?`)) {
                  onDelete(arbitre.id);
                }
              }}
              className="p-2 rounded-xl bg-secondary text-secondary-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={() => onSelect && onSelect(arbitre)}
      className="cursor-pointer"
    >
      <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all overflow-hidden group">
        <CardContent className="p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatutBadgeClass(arbitre.statut)}`}>
              {arbitre.statut}
            </span>

            <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(arbitre)}
                className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Voulez-vous supprimer l'arbitre ${arbitre.prenom} ${arbitre.nom} ?`)) {
                    onDelete(arbitre.id);
                  }
                }}
                className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Profile identity */}
          <div className="flex items-start space-x-4">
            {arbitre.photo_url ? (
              <img
                src={arbitre.photo_url}
                alt={`${arbitre.prenom} ${arbitre.nom}`}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20 shadow-sm shrink-0 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xl shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                {arbitre.prenom[0]}
                {arbitre.nom[0]}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-foreground truncate group-hover:text-primary transition-colors">
                {arbitre.prenom} <span className="uppercase text-primary">{arbitre.nom}</span>
              </h3>

              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(arbitre.role_principal)}`}>
                  {formatRoleLabel(arbitre.role_principal)}
                </span>
                <span className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-border">
                  {arbitre.grade}
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-2">
                <span className="flex items-center space-x-1 font-mono font-medium">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  <span>{arbitre.numero_licence}</span>
                </span>
                {age !== null && (
                  <span className="flex items-center space-x-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{age} ans</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="pt-3 border-t border-border flex flex-col space-y-1.5 text-xs text-muted-foreground">
            {arbitre.email && (
              <div className="flex items-center space-x-2 truncate">
                <Mail className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <span className="truncate">{arbitre.email}</span>
              </div>
            )}
            {arbitre.telephone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <span>{arbitre.telephone}</span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-dashed border-border/70 text-xs">
            <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 group-hover:text-primary transition-colors">
              <Eye className="w-3.5 h-3.5" /> Fiche complète
            </span>
            <span className="text-primary font-bold text-[11px] flex items-center group-hover:translate-x-1 transition-transform">
              Consulter <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
