export type TicketCategory = 'technique' | 'compte' | 'matchs' | 'suggestion' | 'autre';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketAttachment {
  url: string;
  name?: string;
  size?: number;
  type?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_email?: string | null;
  sender_name?: string | null;
  sender_avatar?: string | null;
  sender_role: 'staff' | 'user' | 'admin';
  message: string;
  attachments?: TicketAttachment[] | string[];
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_email?: string | null;
  user_name?: string | null;
  user_avatar?: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  attachments?: (TicketAttachment | string)[];
  created_at: string;
  updated_at: string;
  last_reply_at?: string;
  
  // Données enrichies via jointure user_profiles
  profile?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    system_role?: string;
    phone_number?: string;
    job_title?: string;
  };
  messages?: TicketMessage[];
}

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  technique: 'Problème technique / Bug',
  compte: 'Compte & Accès',
  matchs: 'Matchs & Compétitions',
  suggestion: 'Suggestion d\'amélioration',
  autre: 'Autre demande',
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bg: string; border: string }> = {
  low: {
    label: 'Basse',
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
  },
  medium: {
    label: 'Moyenne',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
  },
  high: {
    label: 'Haute',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
  },
  urgent: {
    label: 'Urgente',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
  },
};

export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; dot: string }> = {
  open: {
    label: 'Ouvert',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  in_progress: {
    label: 'En cours',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  resolved: {
    label: 'Résolu',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  closed: {
    label: 'Fermé',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};
