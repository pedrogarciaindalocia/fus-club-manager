import { geminiVisionService } from './geminiVisionService';

export interface GeminiPerformanceSynthesis {
  summary: string;
  strengths: string[];
  improvements: string[];
  coach_recommendation: string;
  evolution_trend?: string;
  key_drills?: string[];
  model_used: string;
  generated_at: string;
}

export interface GeneratePerformanceSynthesisInput {
  player: {
    full_name: string;
    position?: string | null;
    age_category?: string | null;
    preferred_foot?: string | null;
    age?: number | null;
  };
  positionCode: string;
  positionName: string;
  evaluationDate: string;
  scores: {
    technique: number;
    tactique: number;
    physique: number;
    mental: number;
    global: number;
  };
  criteriaDetails: Array<{
    pillar: string;
    label: string;
    score: number;
  }>;
  coachNote?: string;
  history?: Array<{
    evaluation_date: string;
    position_code: string;
    technique_score: number;
    tactique_score: number;
    physique_score: number;
    mental_score: number;
    global_score: number;
  }>;
}

export const MISSING_GEMINI_API_KEY_ERROR = 'MISSING_GEMINI_API_KEY';

function sanitizeJsonText(raw: string): string {
  let clean = raw.trim();
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
  return clean.trim();
}

function unescapeJsonStringFragment(fragment: string): string {
  return fragment
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStringFieldFromPartialJson(text: string, field: string): string {
  const closedRegex = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
  const closedMatch = text.match(closedRegex);
  if (closedMatch?.[1]) {
    return unescapeJsonStringFragment(closedMatch[1]);
  }
  const truncatedRegex = new RegExp(`"${field}"\\s*:\\s*"([^"]*)`, 's');
  const truncatedMatch = text.match(truncatedRegex);
  if (truncatedMatch?.[1]) {
    const cleaned = unescapeJsonStringFragment(truncatedMatch[1]).replace(/[,{\s]+$/, '');
    return cleaned ? `${cleaned}…` : '';
  }
  return '';
}

function extractArrayFieldFromPartialJson(text: string, field: string): string[] {
  const arrMatch = text.match(new RegExp(`"${field}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`, 'i'));
  if (!arrMatch?.[1]) return [];
  const items: string[] = [];
  const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(arrMatch[1])) !== null) {
    const val = unescapeJsonStringFragment(m[1]);
    if (val) items.push(val);
  }
  return items;
}

export function parseGeminiSynthesisPayload(
  rawText: string,
  modelUsed = 'gemini'
): GeminiPerformanceSynthesis {
  const cleaned = sanitizeJsonText(rawText);
  let parsed: any = null;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const extractedSummary = extractStringFieldFromPartialJson(cleaned, 'summary');
    const extractedStrengths = extractArrayFieldFromPartialJson(cleaned, 'strengths');
    const extractedImprovements = extractArrayFieldFromPartialJson(cleaned, 'improvements');
    const extractedRec = extractStringFieldFromPartialJson(cleaned, 'coach_recommendation');
    const extractedTrend = extractStringFieldFromPartialJson(cleaned, 'evolution_trend');
    const extractedDrills = extractArrayFieldFromPartialJson(cleaned, 'key_drills');

    let fallbackSummary = extractedSummary;
    if (!fallbackSummary && !cleaned.trim().startsWith('{')) {
      fallbackSummary = cleaned.trim();
    }

    parsed = {
      summary: fallbackSummary || 'Analyse FUS COACH AI générée.',
      strengths: extractedStrengths,
      improvements: extractedImprovements,
      coach_recommendation: extractedRec,
      evolution_trend: extractedTrend,
      key_drills: extractedDrills,
    };
  }

  return {
    summary: String(parsed?.summary || '').trim() || 'Analyse FUS COACH AI générée avec succès.',
    strengths: Array.isArray(parsed?.strengths)
      ? parsed.strengths.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [],
    improvements: Array.isArray(parsed?.improvements)
      ? parsed.improvements.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [],
    coach_recommendation: String(parsed?.coach_recommendation || '').trim(),
    evolution_trend: parsed?.evolution_trend ? String(parsed.evolution_trend).trim() : undefined,
    key_drills: Array.isArray(parsed?.key_drills)
      ? parsed.key_drills.map((s: unknown) => String(s).trim()).filter(Boolean)
      : undefined,
    model_used: modelUsed,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Nettoie une synthèse IA éventuellement sauvegardée avec du JSON brut dans `summary`.
 */
export function normalizeStoredGeminiSynthesis(
  raw: GeminiPerformanceSynthesis | null | undefined
): GeminiPerformanceSynthesis | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawSummary = String(raw.summary || '').trim();
  if (rawSummary.startsWith('{') || rawSummary.startsWith('```') || rawSummary.includes('"summary"')) {
    const recovered = parseGeminiSynthesisPayload(rawSummary, raw.model_used || 'gemini');
    return {
      ...raw,
      summary: recovered.summary,
      strengths: raw.strengths?.length ? raw.strengths : recovered.strengths,
      improvements: raw.improvements?.length ? raw.improvements : recovered.improvements,
      coach_recommendation: raw.coach_recommendation || recovered.coach_recommendation,
      evolution_trend: raw.evolution_trend || recovered.evolution_trend,
      key_drills: raw.key_drills?.length ? raw.key_drills : recovered.key_drills,
    };
  }
  return raw;
}

function buildPrompt(input: GeneratePerformanceSynthesisInput): string {
  const { player, positionCode, positionName, evaluationDate, scores, criteriaDetails, coachNote, history = [] } = input;

  const groupedByPillar = ['technique', 'tactique', 'physique', 'mental'].map(pillar => {
    const rows = criteriaDetails
      .filter(c => c.pillar.toLowerCase() === pillar)
      .map(c => `- ${c.label}: ${Math.round(c.score)}/10`)
      .join('\n');
    return `${pillar.toUpperCase()}:\n${rows || '- Note directe du pilier uniquement'}`;
  }).join('\n\n');

  const recentHistory = history
    .slice(-5)
    .map(
      h =>
        `- ${h.evaluation_date} (${h.position_code}) : Global ${Math.round(h.global_score)}/10 [Tech ${Math.round(h.technique_score)}, Tact ${Math.round(h.tactique_score)}, Phys ${Math.round(h.physique_score)}, Ment ${Math.round(h.mental_score)}]`
    )
    .join('\n');

  return `Tu es le Directeur Technique / Analyste Performance du club FUS Rabat (Académie & Équipe Première).
Rédige une synthèse technique claire, concrète et actionnable en français à destination du coach principal et du staff pour le joueur suivant.

PROFIL DU JOUEUR :
- Nom : ${player.full_name}
- Poste principal habituel : ${player.position || 'Non précisé'}
- Catégorie : ${player.age_category || 'FUS Club'}
- Pied fort : ${player.preferred_foot || 'Non précisé'}

ÉVALUATION DU ${evaluationDate} (Barème entier 0 à 10) :
- Poste évalué pour cette séance : ${positionCode} (${positionName})
- Score Global : ${Math.round(scores.global)}/10
- Technique : ${Math.round(scores.technique)}/10 | Tactique : ${Math.round(scores.tactique)}/10 | Physique : ${Math.round(scores.physique)}/10 | Mental : ${Math.round(scores.mental)}/10

DÉTAIL DES CRITÈRES NOTÉS AU POSTE (${positionCode}) :
${groupedByPillar}

MOT & OBSERVATIONS DU COACH :
${coachNote && coachNote.trim() ? coachNote.trim() : '(Aucun mot du coach saisi pour le moment)'}

HISTORIQUE RÉCENT :
${recentHistory || '(Première évaluation enregistrée)'}

CONSIGNES STRICTES DE RÉPONSE :
Réponds UNIQUEMENT avec un objet JSON valide et complet respectant exactement cette structure :
{
  "summary": "Synthèse exécutive concise (2 à 3 phrases) croisant le poste évalué (${positionCode}), les scores et les observations du coach.",
  "strengths": ["Point fort précis 1", "Point fort précis 2"],
  "improvements": ["Problème / axe prioritaire 1", "Problème / axe prioritaire 2"],
  "key_drills": ["Atelier terrain ciblé 1 (séries/répétitions)", "Consigne match / exercice 2"],
  "coach_recommendation": "Plan d'action concret pour la prochaine séance et le prochain match (2 phrases).",
  "evolution_trend": "Lecture courte de la tendance par rapport à l'historique (ou constat initial si 1ère évaluation)."
}`;
}

export const geminiPerformanceService = {
  async generateSynthesis(
    input: GeneratePerformanceSynthesisInput,
    apiKeyOverride?: string
  ): Promise<GeminiPerformanceSynthesis> {
    const key = (apiKeyOverride || geminiVisionService.getApiKey()).trim();
    if (!key) {
      throw new Error(MISSING_GEMINI_API_KEY_ERROR);
    }

    const preferredModel = geminiVisionService.getSelectedModel();
    const modelsToTry = [
      preferredModel,
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    const promptText = buildPrompt(input);
    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData?.error?.message || `Erreur HTTP ${response.status} (${model})`;
          throw new Error(msg);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error(`Réponse vide du modèle ${model}`);
        }

        return parseGeminiSynthesisPayload(rawText, model);
      } catch (err: any) {
        console.warn(`[geminiPerformanceService] Échec modèle ${model}:`, err?.message || err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error('Impossible de générer la synthèse avec Google Gemini AI.');
  },
};

