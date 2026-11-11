/**
 * Types pour le parsing, l'audit et l'ingestion des Feuilles de Match FRMF (PDF)
 */

export interface FRMFMatchContext {
  myClubName: string;
  myClubAbbreviation: string;
  myClubAliases: string[];
}

export interface FRMFPlayer {
  jerseyNumber: number;
  name: string;
  license: string;
  type: 'T' | 'R'; // Titulaire ou Remplaçant (banc de touche)
  isGoalkeeper: boolean;
  isCaptain: boolean;
  birthYear?: number;
  gender?: 'M' | 'F';
  isSurclasse: boolean;
  expectedCategory?: string; // ex: "U15"
  surclasseDiffYears?: number; // ex: 1 pour U15 jouant en U16
  // Réconciliation My Club
  matchedPlayerId?: string | null;
  matchedPlayerName?: string | null;
  matchedPlayerCategory?: string | null;
  matchedPlayerTeamId?: string | null;
  matchedPlayerJersey?: number | null;
  matchResolution?: 'matched' | 'create_new' | 'linked_existing' | 'ignored';
  // Réconciliation Adversaire
  matchedOpponentPlayerId?: string | null;
  isNewOpponent?: boolean;
}

export interface FRMFGoal {
  team: 'home' | 'away'; // Camp sur la feuille FRMF ('home' = Receveuse, 'away' = Visiteuse)
  jerseyNumber: number;
  playerName: string;
  minute: number;
  type: 'Régulier' | 'Penalty' | 'CSC' | string;
}

export interface FRMFCard {
  team: 'home' | 'away';
  cardType: 'yellow' | 'red';
  jerseyNumber: number;
  playerName: string;
  role: string; // 'Joueur' ou officiel
  minute: number;
}

export interface FRMFSubstitution {
  team: 'home' | 'away';
  jerseyOut: number;
  jerseyIn: number;
  playerOutName?: string;
  playerInName?: string;
  minute: number;
}

export interface FRMFInjury {
  team: 'home' | 'away';
  jerseyNumber: number;
  playerName: string;
  minute: number;
}

export interface FRMFOfficial {
  name: string;
  role: string;
  license?: string;
  team?: 'home' | 'away' | 'referee';
}

export interface ParsedMatchSheet {
  competition: string;
  round: string;
  category: string; // ex: "U16"
  season: string; // Format validé YYYY/YY, ex: "2026/27"
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  stadium: string;
  homeTeamName: string; // Équipe receveuse sur la feuille FRMF
  awayTeamName: string; // Équipe visiteuse sur la feuille FRMF
  homeTeamAbbreviation: string; // Abréviation équipe receveuse (ex: "FUS" ou "OCK")
  awayTeamAbbreviation: string; // Abréviation équipe visiteuse (ex: "OCK" ou "FUS")
  myClubSide: 'home' | 'away'; // Côté de My Club sur la feuille FRMF
  isHomeMatch: boolean; // true si My Club est l'équipe receveuse, false si Adversaire est recevant
  myClubName: string;
  myClubAbbreviation: string;
  opponentName: string;
  opponentAbbreviation: string;
  scoreHome: number;
  scoreAway: number;
  homePlayers: FRMFPlayer[]; // Joueurs de l'équipe receveuse
  awayPlayers: FRMFPlayer[]; // Joueurs de l'équipe visiteuse
  goals: FRMFGoal[];
  cards: FRMFCard[];
  substitutions: FRMFSubstitution[];
  injuries: FRMFInjury[];
  officials: FRMFOfficial[];
  surclassementsDetected: {
    myClub: FRMFPlayer[];
    opponent: FRMFPlayer[];
  };
  rawText?: string;
}
