import { supabase } from '../lib/supabase';

export interface PushNotificationRecord {
  match_id?: string;
  matchId?: string;
  type?: string;
  minute?: number | string;
  player_id?: string;
  is_opponent?: boolean;
  team?: string;
  title?: string;
  body?: string;
  [key: string]: any;
}

/**
 * Service résilient d'expédition des notifications push distantes.
 * Tente d'abord l'Edge Function Supabase 'send-match-push'.
 * Si indisponible ou en erreur (404), bascule instantanément sur l'envoi direct via l'API Expo Push
 * afin de garantir que tous les téléphones (application fermée ou verrouillée) reçoivent l'alerte.
 */
export async function dispatchMatchPushNotification(record: PushNotificationRecord): Promise<void> {
  const matchId = record.match_id || record.matchId;
  const eventType = record.type;

  if (!matchId || !eventType) return;

  // 1. Tenter via Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('send-match-push', {
      body: { record },
    });
    if (!error && data?.success) {
      console.log('✅ [PushNotificationSender] Push expédié avec succès via Edge Function Supabase:', data);
      return;
    }
  } catch (_edgeErr) {
    // Edge Function non déployée ou indisponible, passage au fallback direct
  }

  // 2. Fallback autonome direct vers l'API Expo Push
  try {
    // 2.1 Récupérer les détails du match
    const { data: match } = await supabase
      .from('matches')
      .select('id, category, competition, home_team, away_team, score_home, score_away, status, opponent:clubs!opponent_id(name)')
      .eq('id', matchId)
      .single();

    if (!match) return;

    const opponentName = (match as any).opponent?.name || match.away_team || 'Adversaire';
    const category = match.category || '';

    // 2.2 Récupérer le nom du joueur si applicable
    let playerName = '';
    if (record.player_id) {
      const { data: player } = await supabase
        .from('players')
        .select('first_name, last_name')
        .eq('id', record.player_id)
        .single();
      if (player) {
        playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim();
      }
    }

    const minute = record.minute ? `${record.minute}'` : '';
    const isOpponent = record.is_opponent === true || record.team === 'away';

    let title = 'FUS Match';
    let bodyText = '';
    let prefKey: 'goals' | 'cards' | 'halfTime' | 'subs' | null = null;

    switch (eventType) {
      case 'goal':
      case 'penalty':
        prefKey = 'goals';
        if (isOpponent) {
          title = `⚽ But adverse (${minute})`;
          bodyText = `But pour ${opponentName}. Score : FUS ${match.score_home ?? 0} - ${match.score_away ?? 0} ${opponentName}`;
        } else {
          title = `⚽ GOAL ! FUS Rabat (${minute})`;
          bodyText = playerName
            ? `${playerName} marque pour le FUS ! Score : ${match.score_home ?? 0} - ${match.score_away ?? 0}`
            : `But pour le FUS Rabat ! Score : ${match.score_home ?? 0} - ${match.score_away ?? 0}`;
        }
        break;

      case 'own_goal':
        prefKey = 'goals';
        title = `⚽ But contre son camp (${minute})`;
        bodyText = `CSC dans le match FUS vs ${opponentName}. Score : ${match.score_home ?? 0} - ${match.score_away ?? 0}`;
        break;

      case 'red_card':
        prefKey = 'cards';
        title = `🔴 Carton Rouge (${minute})`;
        bodyText = playerName ? `Expulsion de ${playerName}` : `Carton rouge dans le match FUS vs ${opponentName}`;
        break;

      case 'yellow_card':
        prefKey = 'cards';
        title = `🟨 Carton Jaune (${minute})`;
        bodyText = playerName ? `Avertissement pour ${playerName}` : `Carton jaune dans le match FUS vs ${opponentName}`;
        break;

      case 'substitution':
        prefKey = 'subs';
        title = `🔄 Remplacement FUS (${minute})`;
        bodyText = playerName ? `Changement impliquant ${playerName}` : `Remplacement effectué`;
        break;

      case 'half_time':
        prefKey = 'halfTime';
        title = `⏱️ Mi-temps`;
        bodyText = `Score à la pause : FUS ${match.score_home ?? 0} - ${match.score_away ?? 0} ${opponentName}`;
        break;

      case 'match_end':
        prefKey = 'halfTime';
        title = `🏁 Fin du match`;
        bodyText = `Score final : FUS ${match.score_home ?? 0} - ${match.score_away ?? 0} ${opponentName}`;
        break;

      case 'lineup_official':
        title = `👥 Composition Officielle`;
        bodyText = `La composition d'équipe FUS vs ${opponentName} est disponible !`;
        break;

      case 'operator_assigned': {
        const catStr = category ? `[${category}] ` : '';
        title = record.title || `${catStr}🎙️ Opérateur Match Assigné`;
        bodyText = record.body || `${record.operator_name || 'Un opérateur'} a été assigné pour le match FUS vs ${opponentName}.`;
        break;
      }

      default:
        if (record.title && record.body) {
          title = record.title;
          bodyText = record.body;
        } else {
          return;
        }
        break;
    }

    // 2.3 Récupérer les tokens enregistrés
    const { data: allTokens, error: tokensErr } = await supabase
      .from('push_tokens')
      .select('token, followed_categories, preferences');

    if (tokensErr || !allTokens || allTokens.length === 0) return;

    const eligibleTokens: string[] = [];
    for (const entry of allTokens) {
      const token = entry.token?.trim();
      if (!token || !token.startsWith('ExponentPushToken[')) continue;

      if (prefKey && entry.preferences) {
        const prefVal = (entry.preferences as any)[prefKey];
        if (prefVal === false) continue;
      }

      if (category && entry.followed_categories && Array.isArray(entry.followed_categories) && entry.followed_categories.length > 0) {
        if (!entry.followed_categories.includes(category)) continue;
      }

      eligibleTokens.push(token);
    }

    if (eligibleTokens.length === 0) return;

    // 2.4 Expédier vers Expo Push API par lots de 100
    const chunkSize = 100;
    for (let i = 0; i < eligibleTokens.length; i += chunkSize) {
      const chunk = eligibleTokens.slice(i, i + chunkSize);
      const messages = chunk.map(token => ({
        to: token,
        sound: 'default',
        title,
        body: bodyText,
        data: {
          matchId,
          type: eventType,
          category,
          tab: eventType === 'lineup_official' ? 'lineup' : 'live',
          playerName: playerName || undefined,
          operator_id: record.operator_id || undefined,
          operator_name: record.operator_name || undefined,
          operator_avatar_url: record.operator_avatar_url || undefined,
          operator_role: record.operator_role || undefined,
          isOpponent,
          minute: record.minute || undefined,
          title,
          body: bodyText,
        },
        channelId: 'fus-match',
        priority: 'high',
        badge: 1,
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    }

    console.log(`✅ [PushNotificationSender] ${eligibleTokens.length} push(s) expédié(s) directement avec succès via Expo`);
  } catch (directErr) {
    console.warn('[PushNotificationSender] Erreur expédition directe push:', directErr);
  }
}
