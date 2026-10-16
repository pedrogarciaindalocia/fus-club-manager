import { useState, useEffect, useMemo } from 'react';
import { arbitreService } from '../services/arbitreService';
import type { Arbitre, ArbitreFormData, RolePrincipalArbitre, StatutArbitre, GradeArbitre } from '../types/arbitre';
import { toast } from 'sonner';
import { AuditLogger } from '../services/auditLogger';

export function useArbitres() {
  const [arbitres, setArbitres] = useState<Arbitre[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres UI
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<RolePrincipalArbitre | 'all'>('all');
  const [statutFilter, setStatutFilter] = useState<StatutArbitre | 'all'>('all');
  const [gradeFilter, setGradeFilter] = useState<GradeArbitre | 'all'>('all');

  const fetchArbitres = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await arbitreService.getArbitres();
      setArbitres(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des arbitres');
      toast.error('Erreur lors du chargement des arbitres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArbitres();
  }, []);

  const filteredArbitres = useMemo(() => {
    return arbitres.filter((item) => {
      // Recherche textuelle sur Nom, Prénom, Licence, Email
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.nom.toLowerCase().includes(query) ||
        item.prenom.toLowerCase().includes(query) ||
        item.numero_licence.toLowerCase().includes(query) ||
        (item.email && item.email.toLowerCase().includes(query));

      // Filtre Rôle
      const matchesRole = roleFilter === 'all' || item.role_principal === roleFilter;

      // Filtre Statut
      const matchesStatut = statutFilter === 'all' || item.statut === statutFilter;

      // Filtre Grade
      const matchesGrade = gradeFilter === 'all' || item.grade === gradeFilter;

      return matchesSearch && matchesRole && matchesStatut && matchesGrade;
    });
  }, [arbitres, searchQuery, roleFilter, statutFilter, gradeFilter]);

  const addArbitre = async (formData: ArbitreFormData) => {
    try {
      const created = await arbitreService.createArbitre(formData);
      setArbitres((prev) => [created, ...prev]);
      toast.success(`Arbitre ${created.prenom} ${created.nom} ajouté avec succès`);
      
      AuditLogger.logCreate(
        'ARBITRES',
        'ARBITRE',
        String(created.id),
        created,
        `Création de la fiche d'arbitre ${created.prenom} ${created.nom} (${created.role_principal})`
      );
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Impossible d\'ajouter l\'arbitre');
      throw err;
    }
  };

  const updateArbitre = async (id: number | string, formData: Partial<ArbitreFormData>) => {
    const oldArbitre = arbitres.find(a => String(a.id) === String(id));
    try {
      const updated = await arbitreService.updateArbitre(id, formData);
      setArbitres((prev) => prev.map((a) => (String(a.id) === String(id) ? updated : a)));
      toast.success('Fiche arbitre mise à jour');

      AuditLogger.logUpdate(
        'ARBITRES',
        'ARBITRE',
        String(id),
        oldArbitre || null,
        updated,
        `Mise à jour de la fiche arbitre ${updated.prenom} ${updated.nom}`
      );
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Impossible de mettre à jour l\'arbitre');
      throw err;
    }
  };

  const deleteArbitre = async (id: number | string) => {
    const oldArbitre = arbitres.find(a => String(a.id) === String(id));
    try {
      await arbitreService.deleteArbitre(id);
      setArbitres((prev) => prev.filter((a) => String(a.id) !== String(id)));
      toast.success('Arbitre supprimé');

      AuditLogger.logDelete(
        'ARBITRES',
        'ARBITRE',
        String(id),
        oldArbitre || null,
        `Suppression de l'arbitre ${oldArbitre ? `${oldArbitre.prenom} ${oldArbitre.nom}` : `#${id}`}`
      );
    } catch (err: any) {
      toast.error(err.message || 'Impossible de supprimer l\'arbitre');
      throw err;
    }
  };

  // Statistiques calculées
  const stats = useMemo(() => {
    return {
      total: arbitres.length,
      actifs: arbitres.filter((a) => a.statut === 'actif').length,
      centraux: arbitres.filter((a) => a.role_principal === 'central').length,
      principaux: arbitres.filter((a) => a.role_principal === 'central').length,
      assistants: arbitres.filter((a) => a.role_principal === 'assistant').length,
      commissaires: arbitres.filter((a) => a.role_principal === 'commissaire').length,
      fifa: arbitres.filter((a) => a.grade === 'FIFA').length,
    };
  }, [arbitres]);

  return {
    arbitres: filteredArbitres,
    allArbitres: arbitres,
    loading,
    error,
    stats,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    statutFilter,
    setStatutFilter,
    gradeFilter,
    setGradeFilter,
    refresh: fetchArbitres,
    addArbitre,
    updateArbitre,
    deleteArbitre,
  };
}
