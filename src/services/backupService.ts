import { supabase } from '../lib/supabase';
import type { Backup, BackupStats, BackupType, BackupDestination } from '../types';

// Liste complète des 25 tables basée sur le schéma SQL du club
const DB_TABLES = [
  'settings', 'stadiums', 'leagues', 'clubs', 'roles', 'permissions',
  'role_permissions', 'staff', 'teams', 'players', 'matches', 
  'match_events', 'event_types', 'match_players', 'match_staff', 'match_stats', 
  'player_match_stats', 'user_profiles', 'user_roles', 
  'user_category_assignments', 'user_match_assignments', 
  'user_team_assignments', 'user_permissions_overrides', 'table_name',
  'blog_categories', 'blog_posts',
  'backups'
];

// -------------------------------------------------------
// Strategy Pattern: Backup Destinations
// -------------------------------------------------------

export interface BackupExecutionContext {
  type: BackupType;
  destination: BackupDestination;
  backup: Backup | null;
  insertError: any;
}

export interface BackupStrategy {
  execute(ctx: BackupExecutionContext): Promise<Backup>;
}

class DesktopBackupStrategy implements BackupStrategy {
  async execute(ctx: BackupExecutionContext): Promise<Backup> {
    const { backup, type } = ctx;
    try {
      const logs: string[] = [];
      const addLog = async (msg: string) => {
        const time = new Date().toLocaleTimeString();
        logs.push(`[${time}] ${msg}`);
        if (backup?.id) {
          await supabase.from('backups').update({ logs }).eq('id', backup.id);
        }
      };

      if (backup?.id) {
        await supabase.from('backups').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', backup.id);
      }
      await addLog("Initialisation du backup complet (25 tables)...");

      const archive: Record<string, any> = {
        metadata: {
          version: "1.0",
          timestamp: new Date().toISOString(),
          type,
          source: "Client-side Full Export"
        },
        tables: {} as Record<string, any[]>
      };

      for (const table of DB_TABLES) {
        await addLog(`Extraction : ${table}...`);
        try {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
            await addLog(`⚠ Table ${table}: ${error.message}`);
          } else {
            archive.tables[table] = data || [];
            await addLog(`✓ ${table}: ${data?.length || 0} lignes.`);
          }
        } catch (e) {
          await addLog(`⚠ Table ${table} inaccessible.`);
        }
      }

      const jsonString = JSON.stringify(archive, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const fileUrl = URL.createObjectURL(blob);
      const fileSize = blob.size;

      await addLog("Backup terminé avec succès ✓");
      
      if (backup?.id) {
        await supabase
          .from('backups')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            file_url: fileUrl,
            file_size_bytes: fileSize,
            logs
          })
          .eq('id', backup.id);
      }

      return (backup || {
        id: 'temp-' + Date.now(),
        status: 'completed',
        destination: 'desktop',
        file_url: fileUrl,
        logs,
        created_at: new Date().toISOString(),
        type
      }) as Backup;

    } catch (err: any) {
      if (backup?.id) {
        await supabase.from('backups').update({
          status: 'failed',
          error_message: `Erreur: ${err.message}`,
          completed_at: new Date().toISOString()
        }).eq('id', backup.id);
      }
      throw err;
    }
  }
}

class EdgeWorkerBackupStrategy implements BackupStrategy {
  async execute(ctx: BackupExecutionContext): Promise<Backup> {
    const { backup, insertError, type, destination } = ctx;
    if (insertError) throw new Error("Base de données non configurée. Lancez le script SQL d'abord.");
    if (!backup?.id) throw new Error("ID de sauvegarde introuvable.");

    const { error: fnError } = await supabase.functions.invoke('backup-worker', {
      body: { backupId: backup.id, type, destination },
    });

    if (fnError) {
      await supabase.from('backups').update({
        status: 'failed',
        error_message: "Edge Function non déployée.",
        completed_at: new Date().toISOString(),
      }).eq('id', backup.id);
      throw fnError;
    }

    return backup;
  }
}

const backupStrategies: Record<BackupDestination, BackupStrategy> = {
  desktop: new DesktopBackupStrategy(),
  cloud_storage: new EdgeWorkerBackupStrategy(),
  google_drive: new EdgeWorkerBackupStrategy(),
  s3: new EdgeWorkerBackupStrategy(),
};

export const backupService = {
  async getBackups(): Promise<Backup[]> {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return data || [];
  },

  async getBackup(id: string): Promise<Backup | null> {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createBackup(opts: {
    type: BackupType;
    destination: BackupDestination;
  }): Promise<Backup> {
    let backup: any = null;
    let insertError: any = null;

    try {
      const { data, error } = await supabase
        .from('backups')
        .insert([{
          status: 'pending',
          type: opts.type,
          destination: opts.destination,
        }])
        .select()
        .single();
      
      backup = data;
      insertError = error;
    } catch (e) {
      insertError = e;
    }

    const strategy = backupStrategies[opts.destination] || backupStrategies.desktop;
    return strategy.execute({
      type: opts.type,
      destination: opts.destination,
      backup,
      insertError,
    });
  },

  async restoreBackup(
    archive: { tables: Record<string, any[]> },
    onProgress?: (msg: string) => void
  ): Promise<void> {
    const log = (msg: string) => {
      console.log(`[Restore] ${msg}`);
      if (onProgress) onProgress(msg);
    };

    if (!archive.tables) throw new Error("Format de fichier invalide.");

    // ORDRE DE NETTOYAGE (Enfants d'abord pour éviter les erreurs de FK)
    const cleanupOrder = [
      'match_events', 'event_types', 'match_players', 'match_staff', 'match_stats', 'player_match_stats',
      'user_roles', 'user_category_assignments', 'user_match_assignments', 
      'user_team_assignments', 'user_permissions_overrides', 'role_permissions',
      'blog_posts',
      'matches', 'players', 'teams', 'staff', 'clubs', 'leagues', 'stadiums', 
      'blog_categories',
      'settings', 'roles', 'permissions', 'user_profiles', 'table_name'
    ];

    // ORDRE D'INSERTION (Parents d'abord pour créer les ID requis)
    const insertOrder = [
      'settings', 'stadiums', 'leagues', 'clubs', 'roles', 'permissions',
      'user_profiles', 'staff', 'teams', 'players', 'matches',
      'event_types', 'match_events', 'match_players', 'match_staff', 'match_stats', 'player_match_stats',
      'blog_categories', 'blog_posts',
      'user_roles', 'role_permissions', 'user_team_assignments', 
      'user_match_assignments', 'user_category_assignments', 'user_permissions_overrides',
      'table_name'
    ];

    try {
      log("Vérification de la base de données...");
      const { error: probeError } = await supabase.from('settings').select('count', { count: 'exact', head: true });
      
      if (probeError && (probeError.code === 'PGRST204' || probeError.code === 'PGRST205')) {
        const missingError = new Error("SCHEMA_MISSING");
        log("❌ Erreur : La structure de la base de données n'existe pas encore.");
        throw missingError;
      }

      log("Lancement de la restauration totale...");

      // 1. Suppression
      for (const table of cleanupOrder) {
        log(`Nettoyage : ${table}...`);
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // 2. Importation
      for (const table of insertOrder) {
        const rows = archive.tables[table];
        if (!rows || rows.length === 0) continue;

        log(`Restauration : ${table} (${rows.length} lignes)...`);
        const { error } = await supabase.from(table).upsert(rows);
        
        if (error) {
          log(`⚠ Erreur ${table}: ${error.message}`);
          if (['settings', 'staff', 'teams', 'players', 'matches'].includes(table)) throw error;
        } else {
          log(`✓ ${table} OK.`);
        }
      }

      log("Restauration finie avec succès ✓");

    } catch (err: any) {
      log(`❌ ERREUR : ${err.message}`);
      throw err;
    }
  },

  async deleteBackup(id: string): Promise<void> {
    const { error } = await supabase.from('backups').delete().eq('id', id);
    if (error) throw error;
  },

  async getStats(): Promise<BackupStats> {
    const { data, error } = await supabase.from('backups').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') {
        return { totalBackups: 0, lastBackupDate: null, totalSizeMB: 0, successRate: 0 };
      }
      throw error;
    }

    const backups = data || [];
    const completed = backups.filter(b => b.status === 'completed');
    const totalSize = completed.reduce((acc, b) => acc + (b.file_size_bytes || 0), 0);
    const successRate = backups.length > 0 ? Math.round((completed.length / backups.length) * 100) : 0;

    return {
      totalBackups: backups.length,
      lastBackupDate: backups.length > 0 ? backups[0].created_at : null,
      totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
      successRate,
    };
  },
};
