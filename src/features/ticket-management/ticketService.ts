import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { SupportTicket, TicketMessage, TicketStatus } from './types';

// Client d'administration avec clé service_role en singleton pour éviter les instances multiples de GoTrueClient
let adminClientInstance: any = null;

const getAdminSupabase = () => {
  if (adminClientInstance) return adminClientInstance;
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fuhrxfhszttvpkmjydca.supabase.co';
  if (serviceRoleKey) {
    adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return adminClientInstance;
  }
  return supabase;
};

export const ticketService = {
  /**
   * Récupère l'ensemble des tickets avec jointure résiliente sur user_profiles
   */
  async getAllTickets(): Promise<SupportTicket[]> {
    const client = getAdminSupabase();

    try {
      const { data: ticketsData, error: ticketsError } = await client
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) {
        // Détection si la table n'a pas encore été créée dans la base
        if (ticketsError.message.includes('Could not find the table') || ticketsError.code === '42P01') {
          console.warn('[ticketService] Table support_tickets introuvable. Exécutez la migration 20261009_create_support_tickets_system.sql');
          return [];
        }
        throw ticketsError;
      }

      if (!ticketsData || ticketsData.length === 0) {
        return [];
      }

      // Collecte des IDs uniques des utilisateurs pour jointure avec user_profiles
      const userIds = Array.from(new Set(ticketsData.map(t => t.user_id).filter(Boolean)));

      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const [{ data: profilesData }, { data: scoutsData }] = await Promise.all([
          client
            .from('user_profiles')
            .select('id, full_name, avatar_url, system_role, phone_number, job_title')
            .in('id', userIds),
          client
            .from('scouts')
            .select('id, role_title')
            .in('id', userIds)
            .then(res => res, () => ({ data: [] })),
        ]);

        const scoutRolesMap: Record<string, string> = {};
        if (scoutsData) {
          scoutsData.forEach((s: any) => {
            if (s.id && s.role_title) scoutRolesMap[s.id] = s.role_title;
          });
        }

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = {
              ...p,
              job_title: p.job_title || scoutRolesMap[p.id] || null,
            };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Fusion résiliente des tickets avec les profils
      const enrichedTickets: SupportTicket[] = ticketsData.map(ticket => {
        const profile = profilesMap[ticket.user_id];
        return {
          ...ticket,
          profile: profile || {
            id: ticket.user_id,
            full_name: ticket.user_name || 'Utilisateur Fus-App',
            avatar_url: ticket.user_avatar || '',
          },
          // Normalisation du nom et de l'avatar au cas où user_profiles est prioritaire
          user_name: profile?.full_name || ticket.user_name || 'Utilisateur Fus-App',
          user_avatar: profile?.avatar_url || ticket.user_avatar || '',
        };
      });

      return enrichedTickets;
    } catch (err: any) {
      console.error('[ticketService] Erreur lors de la récupération des tickets:', err);
      return [];
    }
  },

  /**
   * Récupère les messages d'un fil de discussion de ticket
   */
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    const client = getAdminSupabase();

    try {
      const { data, error } = await client
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.message.includes('Could not find the table') || error.code === '42P01') {
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('[ticketService] Erreur lors du chargement des messages:', err);
      return [];
    }
  },

  /**
   * Met à jour le statut d'un ticket (open, in_progress, resolved, closed)
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
    const client = getAdminSupabase();

    try {
      const { error } = await client
        .from('support_tickets')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[ticketService] Erreur mise à jour statut:', err);
      throw err;
    }
  },

  /**
   * Envoi d'une réponse de membre du staff dans le ticket
   */
  async sendStaffReply(
    ticketId: string,
    message: string,
    staffUser: { id?: string; email?: string; full_name?: string; avatar_url?: string }
  ): Promise<TicketMessage> {
    const client = getAdminSupabase();

    try {
      const now = new Date().toISOString();
      const payload = {
        ticket_id: ticketId,
        sender_id: staffUser.id || null,
        sender_email: staffUser.email || null,
        sender_name: staffUser.full_name || 'Staff Support FUS',
        sender_avatar: staffUser.avatar_url || null,
        sender_role: 'staff',
        message: message.trim(),
        created_at: now,
      };

      const { data, error } = await client
        .from('support_ticket_messages')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Actualise last_reply_at et le statut si nécessaire
      await client
        .from('support_tickets')
        .update({
          last_reply_at: now,
          updated_at: now,
          // Si le ticket était ouvert, passer automatiquement en "in_progress"
          status: 'in_progress',
        })
        .eq('id', ticketId)
        .eq('status', 'open');

      return data;
    } catch (err) {
      console.error('[ticketService] Erreur envoi réponse staff:', err);
      throw err;
    }
  },

  /**
   * Supprime un ticket
   */
  async deleteTicket(ticketId: string): Promise<boolean> {
    const client = getAdminSupabase();

    try {
      const { error } = await client
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[ticketService] Erreur suppression ticket:', err);
      throw err;
    }
  },

  /**
   * Abonnement temps réel aux changements de tickets et messages
   */
  subscribeToChanges(onUpdate: () => void) {
    // Nom unique par souscription pour éviter la réutilisation d'un canal déjà 'subscribed'
    const channelName = `tickets_rt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_messages' }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('[ticketService] Erreur désabonnement channel:', e);
      }
    };
  },
};
