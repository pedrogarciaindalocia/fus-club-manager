-- ==============================================================================
-- Migration : Rétention automatique et tâches pg_cron (Optimisation quotas Supabase)
-- Date : 2026-11-25
-- Description :
--   1. Purge périodique des logs d'audit (> 90 jours), notifications (> 30 jours)
--      et sessions terminées (> 60 jours) pour contenir la taille de la base (< 500 Mo).
--   2. Planification côté serveur de auto_terminate_expired_matches() toutes les 5 min.
-- ==============================================================================

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron extension non disponible sur cet environnement: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Purger les logs d'audit de plus de 90 jours (dimanche 03h00 UTC)
    PERFORM cron.schedule(
      'purge-old-audit-logs',
      '0 3 * * 0',
      'DELETE FROM public.audit_logs WHERE created_at < now() - interval ''90 days'';'
    );

    -- Purger les notifications dashboard de plus de 30 jours (tous les jours à 03h15 UTC)
    PERFORM cron.schedule(
      'purge-old-dashboard-notifications',
      '15 3 * * *',
      'DELETE FROM public.dashboard_notifications WHERE created_at < now() - interval ''30 days'';'
    );

    -- Purger les sessions terminées de plus de 60 jours (dimanche 03h30 UTC)
    PERFORM cron.schedule(
      'purge-old-user-sessions',
      '30 3 * * 0',
      'DELETE FROM public.user_sessions WHERE status <> ''ACTIVE'' AND login_at < now() - interval ''60 days'';'
    );

    -- Auto-clôturer les matchs expirés côté serveur (toutes les 5 minutes)
    PERFORM cron.schedule(
      'auto-terminate-expired-matches',
      '*/5 * * * *',
      'SELECT public.auto_terminate_expired_matches();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Planification pg_cron ignorée: %', SQLERRM;
END $$;
