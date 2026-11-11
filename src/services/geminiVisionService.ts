/**
 * Service d'analyse multimodale de Feuilles de Match FRMF via Google Gemini AI
 * Supporte Gemini 2.0 Flash et Gemini 1.5 Flash (Vision & PDF Document Parsing)
 */

import type { ParsedMatchSheet, FRMFGoal, FRMFCard, FRMFSubstitution, FRMFInjury, FRMFOfficial, FRMFMatchContext } from '../features/match-management/types/matchSheetTypes';
import { buildMyClubContext, finalizeParsedMatchSheet } from '../features/match-management/utils/frmfMatchSheetParser';

export const GEMINI_API_KEY_STORAGE_KEY = 'fuso_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'fuso_gemini_selected_model';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Recommandé - Modèle Phare 2026, Ultra Rapide)' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Performant & Léger)' },
  { id: 'gemini-3.8-pro', label: 'Gemini 3.8 Pro (Haute Précision & Raisonnement)' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (Haute Vélocité)' },
];

export interface GeminiConnectionTestResult {
  success: boolean;
  model: string;
  latencyMs: number;
  message: string;
}

function buildGeminiSystemPrompt(myClubContext?: FRMFMatchContext): string {
  const ctx = myClubContext || buildMyClubContext(null);
  const aliasesStr = ctx.myClubAliases.join(', ');

  return `Tu es un expert d'arbitrage et de numérisation des Feuilles de Match officielles de la Fédération Royale Marocaine de Football (FRMF).
Analyse l'intégralité du document PDF/Image joint (Feuille de match officielle FRMF) et extrait avec une exactitude absolue toutes les données au format JSON structuré strict.

IDENTITÉ DÉFINITIVE DE NOTRE CLUB ("My Club") vs ADVERSAIRE :
- NOTRE CLUB ("My Club") s'appelle : "${ctx.myClubName}" — abréviation : "${ctx.myClubAbbreviation}" (alias possibles : ${aliasesStr}).
- L'autre équipe présente sur la feuille de match est obligatoirement le "Club Adversaire".
- Extrais impérativement l'ABRÉVIATION (sigle court ex: "FUS", "OCK", "WAC", "RCA", "FAR", "RSB", "MAS", "IRT", "CODM", "DHJ", "AAMF", "CFBG", etc.) pour les deux équipes dans "homeTeamAbbreviation" et "awayTeamAbbreviation".
- ATTENTION DOMICILE / EXTÉRIEUR :
  * L'équipe receveuse (Home, première colonne / colonne gauche) va dans "homeTeamName", "homeTeamAbbreviation", "scoreHome" et "homePlayers".
  * L'équipe visiteuse (Away, seconde colonne / colonne droite) va dans "awayTeamName", "awayTeamAbbreviation", "scoreAway" et "awayPlayers".
  * Si l'équipe receveuse est le Club Adversaire et que "${ctx.myClubName}" est visiteuse, alors mets "myClubSide": "away" (My Club joue à l'extérieur !).
  * Sinon (si "${ctx.myClubName}" est l'équipe receveuse), mets "myClubSide": "home" (My Club joue à domicile).

RÈGLES CRITIQUES :
1. MÉTADONNÉES & SAISON :
   - Format de saison OBLIGATOIRE : "YYYY/YY" (ex: "2026/27", "2025/26"). Convertis "2026-2027" en "2026/27".
   - Extrait le score exact validé par l'arbitre (ex: Home 2, Away 1 -> scoreHome: 2, scoreAway: 1).
   - NE JAMAIS confondre les chiffres de catégorie d'âge (ex: U16, U17, U18) avec le score.
   - Vérifie la cohérence avec le tableau des "Buts".

2. LES JOUEURS, LICENCES & GARDIEN UNIQUE :
   - Extrait l'équipe recevante (homePlayers) et l'équipe visiteuse (awayPlayers).
   - Pour chaque joueur : numéro de maillot (jerseyNumber: number), nom et prénom complet (name: string), numéro de licence exact (license: string ex: 148877M11, 152923M12), statut (type: "T" pour titulaire, "R" pour remplaçant sur le banc de touche).
   - isGoalkeeper: true UNIQUEMENT si le joueur est explicitement annoté "(G)" ou "Gardien". Ne mets JAMAIS isGoalkeeper: true pour un joueur de champ. Un seul gardien titulaire (type: "T") doit être isGoalkeeper: true ; un éventuel second (G) est remplaçant (type: "R").
   - isCaptain: true si "(C)" ou Capitaine.

3. LES ÉVÉNEMENTS DU MATCH :
   - Buts (goals) : équipe sur la feuille ("home" ou "away"), numéro de maillot (jerseyNumber), nom du buteur (playerName), minute (minute), type ("Régulier", "Penalty", "CSC").
   - Cartons (cards) :
     * Joueurs ou officiels avertis -> cardType: "yellow"
     * Joueurs ou officiels expulsés -> cardType: "red"
     * équipe ("home" ou "away"), numéro de maillot (jerseyNumber), nom (playerName), rôle ("Joueur" ou officiel), minute (minute).
   - Changements (substitutions) : extrais TOUS les remplacements des deux équipes : équipe ("home" ou "away"), numéro sortant (jerseyOut: number), nom sortant (playerOutName: string), numéro entrant (jerseyIn: number), nom entrant (playerInName: string), minute (minute).
     * RÈGLE BANC DE TOUCHE : tout joueur entrant (jerseyIn) était obligatoirement sur le banc de touche, donc son statut dans homePlayers/awayPlayers DOIT être type: "R".
   - Blessures (injuries) : extrais TOUS les joueurs figurant dans la case "Joueurs blessés" : équipe ("home" ou "away"), numéro (jerseyNumber), nom (playerName), minute (minute).
   - Officiels (officials) : nom complet, rôle ("Arbitre", "Arbitre Assistant 1", "Arbitre Assistant 2", "Délégué", "Commissaire du Match"), licence si présente.

4. FORMAT STRICT DE SORTIE :
   - Réponds UNIQUEMENT en JSON valide conforme au schéma.
   - Ne mets AUCUN texte avant ou après le JSON.`;
}

const JSON_SCHEMA_DESCRIPTION = `{
  "competition": string,
  "round": string,
  "category": string,
  "season": string (format YYYY/YY ex: "2026/27"),
  "date": string (format YYYY-MM-DD),
  "time": string (format HH:mm),
  "stadium": string,
  "homeTeamName": string,
  "awayTeamName": string,
  "homeTeamAbbreviation": string (ex: "FUS", "OCK", "WAC"),
  "awayTeamAbbreviation": string (ex: "OCK", "FUS", "RCA"),
  "myClubSide": "home" | "away",
  "scoreHome": number,
  "scoreAway": number,
  "homePlayers": [
    {
      "jerseyNumber": number,
      "name": string,
      "license": string,
      "type": "T" | "R",
      "isGoalkeeper": boolean,
      "isCaptain": boolean
    }
  ],
  "awayPlayers": [
    {
      "jerseyNumber": number,
      "name": string,
      "license": string,
      "type": "T" | "R",
      "isGoalkeeper": boolean,
      "isCaptain": boolean
    }
  ],
  "goals": [
    {
      "team": "home" | "away",
      "jerseyNumber": number,
      "playerName": string,
      "minute": number,
      "type": "Régulier" | "Penalty" | "CSC"
    }
  ],
  "cards": [
    {
      "team": "home" | "away",
      "cardType": "yellow" | "red",
      "jerseyNumber": number,
      "playerName": string,
      "role": string,
      "minute": number
    }
  ],
  "substitutions": [
    {
      "team": "home" | "away",
      "jerseyOut": number,
      "playerOutName": string,
      "jerseyIn": number,
      "playerInName": string,
      "minute": number
    }
  ],
  "injuries": [
    {
      "team": "home" | "away",
      "jerseyNumber": number,
      "playerName": string,
      "minute": number
    }
  ],
  "officials": [
    {
      "name": string,
      "role": string,
      "license": string,
      "team": "referee" | "home" | "away"
    }
  ]
}`;

class GeminiVisionService {
  /**
   * Récupère la clé API Gemini configurée
   */
  getApiKey(): string {
    const stored = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
    // Fallback variable d'environnement Vite si présente
    return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  }

  /**
   * Sauvegarde la clé API dans le localStorage
   */
  saveApiKey(key: string): void {
    const cleanKey = key.trim();
    if (!cleanKey) {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    } else {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, cleanKey);
    }
    window.dispatchEvent(new CustomEvent('gemini-api-key-updated', { detail: { hasKey: Boolean(cleanKey) } }));
  }

  /**
   * Récupère le modèle sélectionné
   */
  getSelectedModel(): string {
    const saved = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
    // Auto-migration immédiate si l'utilisateur avait une version dépréciée (2.0, 1.5, 2.5)
    if (!saved || saved.includes('2.0') || saved.includes('1.5') || saved.includes('2.5')) {
      localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, DEFAULT_GEMINI_MODEL);
      return DEFAULT_GEMINI_MODEL;
    }
    return saved;
  }

  /**
   * Sauvegarde le modèle sélectionné
   */
  saveSelectedModel(model: string): void {
    localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
  }

  /**
   * Teste la connectivité avec l'API Gemini
   */
  async testConnection(apiKeyOverride?: string, modelOverride?: string): Promise<GeminiConnectionTestResult> {
    const key = (apiKeyOverride || this.getApiKey()).trim();
    if (!key) {
      return {
        success: false,
        model: 'none',
        latencyMs: 0,
        message: 'Clé API Gemini manquante. Veuillez saisir votre clé d\'API Google AI Studio.',
      };
    }

    let preferredModel = modelOverride || this.getSelectedModel();
    if (preferredModel.includes('2.0') || preferredModel.includes('1.5') || preferredModel.includes('2.5')) {
      preferredModel = DEFAULT_GEMINI_MODEL;
      this.saveSelectedModel(DEFAULT_GEMINI_MODEL);
    }

    const modelsToTry = [
      preferredModel,
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-pro',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    const startTime = performance.now();
    let lastError = '';

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: 'Ping de test de connectivité. Réponds par un seul mot: "CONNECTÉ".' }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 10,
              temperature: 0.1,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const latencyMs = Math.round(performance.now() - startTime);
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'CONNECTÉ';

          // Sauvegarde automatique du modèle validé
          this.saveSelectedModel(model);

          return {
            success: true,
            model,
            latencyMs,
            message: `Connexion réussie avec ${model} (${latencyMs}ms) ! Réponse IA : "${reply}"`,
          };
        } else {
          const errData = await response.json().catch(() => ({}));
          lastError = errData.error?.message || `Erreur HTTP ${response.status} (${response.statusText})`;
        }
      } catch (err: any) {
        lastError = err?.message || 'Erreur réseau lors de l\'appel à Gemini';
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      model: preferredModel,
      latencyMs,
      message: `Échec du test de connexion : ${lastError}`,
    };
  }

  /**
   * Convertit un fichier (PDF ou Image) en Base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Analyse multimodale de la feuille de match via Gemini API
   */
  async analyzeMatchSheetWithGemini(
    file: File,
    apiKeyOverride?: string,
    modelOverride?: string,
    myClubContext?: FRMFMatchContext
  ): Promise<ParsedMatchSheet> {
    const key = (apiKeyOverride || this.getApiKey()).trim();
    if (!key) {
      throw new Error('Clé API Gemini non configurée. Veuillez renseigner votre clé dans les paramètres.');
    }

    const base64Data = await this.fileToBase64(file);
    const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    let preferredModel = modelOverride || this.getSelectedModel();
    if (preferredModel.includes('2.0') || preferredModel.includes('1.5') || preferredModel.includes('2.5')) {
      preferredModel = DEFAULT_GEMINI_MODEL;
      this.saveSelectedModel(DEFAULT_GEMINI_MODEL);
    }

    const modelsToTry = [
      preferredModel,
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-pro',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    const systemPrompt = buildGeminiSystemPrompt(myClubContext);
    let lastError: Error | null = null;
    let jsonTextResponse = '';

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
        const payload = {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: `${systemPrompt}\n\nSchéma JSON obligatoire:\n${JSON_SCHEMA_DESCRIPTION}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Erreur HTTP ${response.status} avec le modèle ${model}`);
        }

        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error(`Aucune réponse générée par le modèle ${model}`);
        }

        jsonTextResponse = candidateText;
        break; // Succès, sortir de la boucle
      } catch (err: any) {
        console.warn(`[GeminiVisionService] Échec avec ${model}:`, err);
        lastError = err;
      }
    }

    if (!jsonTextResponse) {
      throw lastError || new Error('Impossible d\'obtenir une analyse de Gemini.');
    }

    // Nettoyage Markdown éventuel
    let cleanJson = jsonTextResponse.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedRaw: any;
    try {
      parsedRaw = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[GeminiVisionService] JSON invalide retourné par Gemini:', cleanJson);
      throw new Error('Le modèle IA n\'a pas retourné un JSON valide.');
    }

    // Post-traitement et typage strict
    return this.postProcessGeminiResult(parsedRaw, myClubContext);
  }

  /**
   * Post-traite et enrichit les données extraites par Gemini via le pipeline unifié
   */
  private postProcessGeminiResult(raw: any, myClubContext?: FRMFMatchContext): ParsedMatchSheet {
    const goals: FRMFGoal[] = (raw.goals || []).map((g: any) => ({
      team: (g.team === 'away' ? 'away' : 'home') as 'home' | 'away',
      jerseyNumber: Number(g.jerseyNumber) || 0,
      playerName: String(g.playerName || '').trim(),
      minute: Number(g.minute) || 0,
      type: String(g.type || 'Régulier'),
    }));

    const cards: FRMFCard[] = (raw.cards || []).map((c: any) => ({
      team: (c.team === 'away' ? 'away' : 'home') as 'home' | 'away',
      cardType: (c.cardType === 'red' ? 'red' : 'yellow') as 'yellow' | 'red',
      jerseyNumber: Number(c.jerseyNumber) || 0,
      playerName: String(c.playerName || '').trim(),
      role: String(c.role || 'Joueur'),
      minute: Number(c.minute) || 0,
    }));

    const substitutions: FRMFSubstitution[] = (raw.substitutions || []).map((s: any) => ({
      team: (s.team === 'away' ? 'away' : 'home') as 'home' | 'away',
      jerseyOut: Number(s.jerseyOut) || 0,
      jerseyIn: Number(s.jerseyIn) || 0,
      playerOutName: s.playerOutName ? String(s.playerOutName).trim() : undefined,
      playerInName: s.playerInName ? String(s.playerInName).trim() : undefined,
      minute: Number(s.minute) || 0,
    }));

    const injuries: FRMFInjury[] = (raw.injuries || []).map((i: any) => ({
      team: (i.team === 'away' ? 'away' : 'home') as 'home' | 'away',
      jerseyNumber: Number(i.jerseyNumber) || 0,
      playerName: String(i.playerName || '').trim(),
      minute: Number(i.minute) || 0,
    }));

    const officials: FRMFOfficial[] = (raw.officials || []).map((o: any) => ({
      name: String(o.name || '').trim(),
      role: String(o.role || 'Arbitre'),
      license: o.license ? String(o.license).trim() : undefined,
      team: o.team || 'referee',
    }));

    return finalizeParsedMatchSheet(
      {
        competition: raw.competition || 'Championnat Élite',
        round: raw.round || 'Journée 1',
        category: raw.category || 'U16',
        season: raw.season || '2026/27',
        date: raw.date || new Date().toISOString().split('T')[0],
        time: raw.time || '13:00',
        stadium: raw.stadium || '',
        homeTeamName: raw.homeTeamName || myClubContext?.myClubName || 'Fath Union Sport',
        awayTeamName: raw.awayTeamName || 'Adversaire',
        homeTeamAbbreviation: raw.homeTeamAbbreviation ? String(raw.homeTeamAbbreviation).trim().toUpperCase() : undefined,
        awayTeamAbbreviation: raw.awayTeamAbbreviation ? String(raw.awayTeamAbbreviation).trim().toUpperCase() : undefined,
        myClubSideHint: raw.myClubSide === 'away' ? 'away' : raw.myClubSide === 'home' ? 'home' : undefined,
        scoreHome: Number(raw.scoreHome ?? 0),
        scoreAway: Number(raw.scoreAway ?? 0),
        homePlayersRaw: raw.homePlayers || [],
        awayPlayersRaw: raw.awayPlayers || [],
        goals,
        cards,
        substitutions,
        injuries,
        officials,
        rawText: `[Scanné via Google Gemini AI (${this.getSelectedModel()})]`,
      },
      myClubContext
    );
  }
}

export const geminiVisionService = new GeminiVisionService();

