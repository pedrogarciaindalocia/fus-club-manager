import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
}

interface PushPayload {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: Record<string, any>;
  channelId?: string;
  priority?: string;
  badge?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase admin keys not set')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Sécurisation : Exiger une authentification valide (Jeton JWT utilisateur ou clé interne service_role)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing or unauthorized auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    let isAuthorized = false

    if (token === supabaseServiceKey) {
      isAuthorized = true
    } else {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token)
        if (!error && data?.user) {
          isAuthorized = true
        }
      } catch (authErr) {
        // Token invalide
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    // Supports either Webhook format (body.record) or direct invocation
    const record = body.record || body.event || body

    const eventType = record.type || body.type
    const matchId = record.match_id || body.matchId || body.match_id

    if (!matchId) {
      return new Response(JSON.stringify({ message: 'No matchId provided, skipping' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 1. Fetch match info
    const { data: match, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('id, category, competition, home_team, away_team, score_home, score_away, status, opponent:clubs!opponent_id(name)')
      .eq('id', matchId)
      .single()

    if (matchErr || !match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    const opponentName = match.opponent?.name || match.away_team || 'Adversaire'
    const category = match.category || ''

    // 2. Fetch player if applicable
    let playerName = ''
    if (record.player_id) {
      const { data: player } = await supabaseAdmin
        .from('players')
        .select('first_name, last_name, jersey_number, number')
        .eq('id', record.player_id)
        .single()
      if (player) {
        playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim()
      }
    }

    const minute = record.minute ? `${record.minute}'` : ''
    const isOpponent = record.is_opponent === true || record.team === 'away'

    // 3. Format Notification Title & Body
    let title = 'FUS Match'
    let bodyText = ''
    let prefKey: 'goals' | 'cards' | 'halfTime' | 'subs' | null = null

    switch (eventType) {
      case 'goal':
      case 'penalty':
        prefKey = 'goals'
        if (isOpponent) {
          title = `⚽ But adverse (${minute})`
          bodyText = `But pour ${opponentName}. Score : FUS ${match.score_home ?? 0} - ${match.score_away ?? 0} ${opponentName}`
        } else {
          title = `⚽ GOAL ! FUS Rabat (${minute})`
          bodyText = playerName 
            ? `${playerName} marque pour le FUS ! Score : ${match.score_home ?? 0} - ${match.score_away ?? 0}`
            : `But pour le FUS Rabat ! Score : ${match.score_home ?? 0} - ${match.score_away ?? 0}`
        }
        break

      case 'own_goal':
        prefKey = 'goals'
        title = `⚽ But contre son camp (${minute})`
        bodyText = `CSC dans le match FUS vs ${opponentName}. Score : ${match.score_home ?? 0} - ${match.score_away ?? 0}`
        break

      case 'red_card':
        prefKey = 'cards'
        title = `🔴 Carton Rouge (${minute})`
        bodyText = playerName ? `Expulsion de ${playerName}` : `Carton rouge dans le match FUS vs ${opponentName}`
        break

      case 'yellow_card':
        prefKey = 'cards'
        title = `🟨 Carton Jaune (${minute})`
        bodyText = playerName ? `Avertissement pour ${playerName}` : `Carton jaune dans le match FUS vs ${opponentName}`
        break

      case 'substitution':
        prefKey = 'subs'
        title = `🔄 Remplacement FUS (${minute})`
        bodyText = playerName ? `Changement impliquant ${playerName}` : `Remplacement effectué`
        break

      case 'half_time':
        prefKey = 'halfTime'
        title = `⏱️ Mi-temps`
        bodyText = `Score à la pause : FUS ${match.score_home ?? 0} - ${match.score_away ?? 0} ${opponentName}`
        break

      case 'match_end':
        prefKey = 'halfTime'
        title = `🏁 Fin du match`
        bodyText = `Score final : FUS ${match.score_home ?? 0} - ${match.score_away ?? 0} ${opponentName}`
        break

      case 'lineup_official':
        title = `👥 Composition Officielle`
        bodyText = `La composition d'équipe FUS vs ${opponentName} est disponible !`
        break

      default:
        // Titre personnalisé fourni dans le body
        if (body.title && body.body) {
          title = body.title
          bodyText = body.body
        } else {
          return new Response(JSON.stringify({ message: 'Event type not eligible for push notification' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          })
        }
        break
    }

    // 4. Query Push Tokens
    const { data: allTokens, error: tokensErr } = await supabaseAdmin
      .from('push_tokens')
      .select('token, followed_categories, preferences')

    if (tokensErr || !allTokens || allTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No registered push tokens found', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 5. Filter tokens according to user preferences and followed categories
    const eligibleTokens: string[] = []

    for (const entry of allTokens) {
      const token = entry.token?.trim()
      if (!token || !token.startsWith('ExponentPushToken[')) continue

      // Preference check
      if (prefKey && entry.preferences) {
        const prefVal = entry.preferences[prefKey]
        if (prefVal === false) continue
      }

      // Category check
      if (category && entry.followed_categories && Array.isArray(entry.followed_categories) && entry.followed_categories.length > 0) {
        if (!entry.followed_categories.includes(category)) {
          continue
        }
      }

      eligibleTokens.push(token)
    }

    if (eligibleTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No eligible tokens matched filters', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 6. Build Expo Push Payloads (Chunked by 100)
    const chunkSize = 100
    const invalidTokens: string[] = []
    let totalSent = 0

    for (let i = 0; i < eligibleTokens.length; i += chunkSize) {
      const chunk = eligibleTokens.slice(i, i + chunkSize)
      const messages: PushPayload[] = chunk.map(token => ({
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
          isOpponent,
          minute: record.minute || undefined,
          title,
          body: bodyText,
        },
        channelId: 'fus-match',
        priority: 'high',
        badge: 1
      }))

      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages)
      })

      if (expoRes.ok) {
        const resData = await expoRes.json()
        totalSent += chunk.length

        // Inspect tickets for invalid / unregistered tokens to clean up
        if (Array.isArray(resData.data)) {
          resData.data.forEach((ticket: any, idx: number) => {
            if (ticket.status === 'error') {
              if (ticket.details?.error === 'DeviceNotRegistered') {
                invalidTokens.push(chunk[idx])
              }
            }
          })
        }
      }
    }

    // 7. Cleanup inactive / unregistered tokens
    if (invalidTokens.length > 0) {
      await supabaseAdmin
        .from('push_tokens')
        .delete()
        .in('token', invalidTokens)
    }

    return new Response(JSON.stringify({
      success: true,
      sentCount: totalSent,
      invalidRemoved: invalidTokens.length,
      title,
      body: bodyText
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
