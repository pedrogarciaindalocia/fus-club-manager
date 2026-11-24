import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "x-api-key, authorization, x-client-info, apikey, content-type",
  ...(allowedOrigin !== "*" ? { "Access-Control-Allow-Credentials": "true" } : {}),
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PlayerRow {
  id: string;
  club_id: string;
  team_id: string | null;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  category_number?: number | null;
  birth_date?: string | null;
  birth_year?: number | null;
  nationality?: string | null;
  height?: number | null;
  weight?: number | null;
  preferred_foot?: string | null;
  position?: string | null;
  secondary_position?: string | null;
  jersey_number?: number | null;
  photo_url?: string | null;
  celebration_photo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_active: boolean;
  club_joined_date?: string | null;
  experience_years?: number | null;
  drive_url?: string | null;
  video_url?: string | null;
  created_at: string;
  updated_at: string;
  teams?: { name: string | null; category: string | null } | { name: string | null; category: string | null }[] | null;
}

interface MatchStatRow {
  player_id: string;
  minutes_played: number | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
  penalties_scored: number | null;
  penalties_missed: number | null;
  own_goals: number | null;
  clean_sheet: boolean | null;
  goals_conceded: number | null;
  saves: number | null;
  penalties_saved: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
}

interface AggregatedStats {
  matches_played: number;
  minutes_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  penalties_scored: number;
  penalties_missed: number;
  own_goals: number;
  clean_sheets: number;
  saves: number;
  goals_conceded: number;
  penalties_saved: number;
  average_rating: number | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - parsed.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < parsed.getUTCDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function extractTeamInfo(teams: PlayerRow["teams"]): { team_name: string | null; category: string | null } {
  if (!teams) return { team_name: null, category: null };
  const team = Array.isArray(teams) ? teams[0] : teams;
  return {
    team_name: team?.name ?? null,
    category: team?.category ?? null,
  };
}

function emptyStats(): AggregatedStats {
  return {
    matches_played: 0,
    minutes_played: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    penalties_scored: 0,
    penalties_missed: 0,
    own_goals: 0,
    clean_sheets: 0,
    saves: 0,
    goals_conceded: 0,
    penalties_saved: 0,
    average_rating: null,
  };
}

function aggregateStatsByPlayer(rows: MatchStatRow[]): Map<string, AggregatedStats> {
  const map = new Map<string, AggregatedStats & { _ratingSum: number; _ratingCount: number }>();

  for (const row of rows) {
    let entry = map.get(row.player_id);
    if (!entry) {
      entry = { ...emptyStats(), _ratingSum: 0, _ratingCount: 0 };
      map.set(row.player_id, entry);
    }

    entry.matches_played += 1;
    entry.minutes_played += row.minutes_played ?? 0;
    entry.goals += row.goals ?? 0;
    entry.assists += row.assists ?? 0;
    entry.yellow_cards += row.yellow_cards ?? 0;
    entry.red_cards += row.red_cards ?? 0;
    entry.penalties_scored += row.penalties_scored ?? 0;
    entry.penalties_missed += row.penalties_missed ?? 0;
    entry.own_goals += row.own_goals ?? 0;
    entry.clean_sheets += row.clean_sheet ? 1 : 0;
    entry.saves += row.saves ?? 0;
    entry.goals_conceded += row.goals_conceded ?? 0;
    entry.penalties_saved += row.penalties_saved ?? 0;

    if (typeof row.rating === "number" && !Number.isNaN(row.rating)) {
      entry._ratingSum += row.rating;
      entry._ratingCount += 1;
    }
  }

  const result = new Map<string, AggregatedStats>();
  for (const [playerId, entry] of map.entries()) {
    const { _ratingSum, _ratingCount, ...stats } = entry;
    stats.average_rating = _ratingCount > 0 ? Number((_ratingSum / _ratingCount).toFixed(2)) : null;
    result.set(playerId, stats);
  }
  return result;
}

function formatPlayerResponse(player: PlayerRow, statsMap: Map<string, AggregatedStats>) {
  const { team_name, category } = extractTeamInfo(player.teams);
  return {
    id: player.id,
    updated_at: player.updated_at,
    identity: {
      first_name: player.first_name ?? null,
      last_name: player.last_name ?? null,
      full_name: player.full_name,
      birth_date: player.birth_date ?? null,
      birth_year: player.birth_year ?? null,
      age: calculateAge(player.birth_date ?? null),
      nationality: player.nationality ?? null,
      category,
      team_name,
      category_number: player.category_number ?? null,
      is_active: player.is_active,
      phone: player.phone ?? null,
      email: player.email ?? null,
      address: player.address ?? null,
      photo_url: player.photo_url ?? null,
      celebration_photo_url: player.celebration_photo_url ?? null,
    },
    sport_profile: {
      position: player.position ?? null,
      secondary_position: player.secondary_position ?? null,
      preferred_foot: player.preferred_foot ?? null,
      height: player.height ?? null,
      weight: player.weight ?? null,
      jersey_number: player.jersey_number ?? null,
      club_joined_date: player.club_joined_date ?? null,
      experience_years: player.experience_years ?? null,
      drive_url: player.drive_url ?? null,
      video_url: player.video_url ?? null,
    },
    stats: statsMap.get(player.id) ?? emptyStats(),
  };
}

function parseRoute(pathname: string): { route: "list" } | { route: "detail"; id: string } | null {
  const cleaned = pathname.replace(/\/+$/, "");
  const segments = cleaned.split("/").filter(Boolean);
  const playersIdx = segments.lastIndexOf("players");
  if (playersIdx === -1) return null;

  const rest = segments.slice(playersIdx + 1);
  if (rest.length === 0) return { route: "list" };
  if (rest.length === 1) return { route: "detail", id: rest[0] };
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed. Only GET requests are supported." }, 405);
  }

  try {
    const externalApiKey = Deno.env.get("EXTERNAL_API_KEY");
    if (!externalApiKey) {
      return jsonResponse({ error: "EXTERNAL_API_KEY secret not configured on server" }, 500);
    }

    const providedKey = req.headers.get("x-api-key") || "";
    if (!providedKey || !timingSafeEqual(providedKey, externalApiKey)) {
      return jsonResponse({ error: "Invalid or missing API key" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase configuration missing" }, 500);
    }

    const url = new URL(req.url);
    const parsedRoute = parseRoute(url.pathname);
    if (!parsedRoute) {
      return jsonResponse({ error: "Route not found. Use GET /players or GET /players/:id" }, 404);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (parsedRoute.route === "detail") {
      if (!UUID_REGEX.test(parsedRoute.id)) {
        return jsonResponse({ error: "Invalid player UUID format" }, 400);
      }

      const { data: player, error: playerErr } = await supabase
        .from("players")
        .select("*, teams(name, category)")
        .eq("id", parsedRoute.id)
        .maybeSingle();

      if (playerErr) {
        return jsonResponse({ error: playerErr.message }, 500);
      }
      if (!player) {
        return jsonResponse({ error: "Player not found" }, 404);
      }

      const { data: statRows, error: statsErr } = await supabase
        .from("player_match_stats")
        .select(
          "player_id, minutes_played, goals, assists, rating, penalties_scored, penalties_missed, own_goals, clean_sheet, goals_conceded, saves, penalties_saved, yellow_cards, red_cards"
        )
        .eq("player_id", parsedRoute.id);

      if (statsErr) {
        return jsonResponse({ error: statsErr.message }, 500);
      }

      const statsMap = aggregateStatsByPlayer((statRows || []) as MatchStatRow[]);
      return jsonResponse({ data: formatPlayerResponse(player as unknown as PlayerRow, statsMap) }, 200);
    }

    // Route: GET /players
    const pageParam = Number.parseInt(url.searchParams.get("page") || "1", 10);
    const limitParam = Number.parseInt(url.searchParams.get("limit") || "50", 10);
    const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
    const offset = (page - 1) * limit;

    const category = url.searchParams.get("category")?.trim() || null;
    const isActiveParam = url.searchParams.get("is_active") || "true";
    const updatedSince = url.searchParams.get("updated_since")?.trim() || null;

    if (updatedSince && Number.isNaN(Date.parse(updatedSince))) {
      return jsonResponse({ error: "Invalid updated_since ISO 8601 timestamp" }, 400);
    }

    const teamRelation = category ? "teams!inner(name, category)" : "teams(name, category)";
    let query = supabase
      .from("players")
      .select(`*, ${teamRelation}`, { count: "exact" })
      .order("full_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (isActiveParam === "true") {
      query = query.eq("is_active", true);
    } else if (isActiveParam === "false") {
      query = query.eq("is_active", false);
    }

    if (category) {
      query = query.eq("teams.category", category);
    }

    if (updatedSince) {
      query = query.gte("updated_at", updatedSince);
    }

    const { data: players, count, error: listErr } = await query;
    if (listErr) {
      return jsonResponse({ error: listErr.message }, 500);
    }

    const playerRows = (players || []) as unknown as PlayerRow[];
    const playerIds = playerRows.map((p) => p.id);

    let statsMap = new Map<string, AggregatedStats>();
    if (playerIds.length > 0) {
      const { data: statRows, error: statsErr } = await supabase
        .from("player_match_stats")
        .select(
          "player_id, minutes_played, goals, assists, rating, penalties_scored, penalties_missed, own_goals, clean_sheet, goals_conceded, saves, penalties_saved, yellow_cards, red_cards"
        )
        .in("player_id", playerIds);

      if (statsErr) {
        return jsonResponse({ error: statsErr.message }, 500);
      }
      statsMap = aggregateStatsByPlayer((statRows || []) as MatchStatRow[]);
    }

    return jsonResponse(
      {
        data: playerRows.map((p) => formatPlayerResponse(p, statsMap)),
        pagination: {
          page,
          limit,
          total: count ?? playerRows.length,
        },
      },
      200
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500);
  }
});
