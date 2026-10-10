import type { Inserts } from '../types/supabase';

const FIRST_NAMES = [
  'Yassine', 'Achraf', 'Noussair', 'Sofyan', 'Nayef', 'Romain', 'Hakim', 'Azzedine',
  'Youssef', 'Bilal', 'Soufiane', 'Munir', 'Jawad', 'Selim', 'Yahia', 'Abdelhamid',
  'Abderrazak', 'Achraf', 'Amine', 'Zakaria', 'Abde', 'Walid'
];

const LAST_NAMES = [
  'Bounou', 'Hakimi', 'Mazraoui', 'Amrabat', 'Aguerd', 'Saïss', 'Ziyech', 'Ounahi',
  'En-Nesyri', 'El Khannouss', 'Boufal', 'Mohamedi', 'El Yamiq', 'Amallah', 'Attiyat Allah', 'Sabiri',
  'Hamdallah', 'Dari', 'Harit', 'Aboukhlal', 'Ezzalzouli', 'Cheddira'
];

const POSITIONS = [
  'GK', 'RB', 'LB', 'CB', 'CB', 'CDM', 'RW', 'CM', 'ST', 'CAM', 'LW', // 11 Titulaires
  'GK', 'CB', 'CM', 'LB', 'CAM', 'ST', 'CB', 'CDM', 'RW', 'LW', 'SS'  // 11 Remplaçants
];

const FEET = ['Droit', 'Gauche', 'Droit', 'Droit', 'Gauche', 'Ambidextre'];
const NATIONALITIES = ['Maroc', 'Maroc', 'Maroc', 'Sénégal', 'Côte d\'Ivoire', 'France', 'Maroc'];

/**
 * Génère 22 fiches de joueurs fictifs pour un club adversaire
 */
export function build22FakeOpponentPlayers(opponentId: string, category: string = 'SENIOR'): Inserts<'opponent_players'>[] {
  const players: Inserts<'opponent_players'>[] = [];

  for (let i = 0; i < 22; i++) {
    const jerseyNumber = i + 1;
    const position = POSITIONS[i] || 'CM';
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;

    const isGK = position === 'GK';
    const height = isGK ? Math.floor(Math.random() * 8) + 188 : Math.floor(Math.random() * 18) + 172;
    const weight = isGK ? Math.floor(Math.random() * 10) + 80 : Math.floor(Math.random() * 15) + 68;
    const preferredFoot = FEET[i % FEET.length];
    const nationality = NATIONALITIES[i % NATIONALITIES.length];
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=200`;

    players.push({
      opponent_id: opponentId,
      category,
      full_name: fullName,
      jersey_number: jerseyNumber,
      position,
      height,
      weight,
      preferred_foot: preferredFoot,
      nationality,
      photo_url: avatarUrl,
      is_active: true,
    });
  }

  return players;
}
