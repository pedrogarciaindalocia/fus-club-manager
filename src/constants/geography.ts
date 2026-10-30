export const GEOGRAPHY_DATA: Record<string, Record<string, string[]>> = {
  "Afrique": {
    "Maroc": [
      "Rabat", "Salé", "Kénitra", "Casablanca", "Marrakech", "Fès", "Tanger", "Agadir",
      "Meknès", "Oujda", "Tétouan", "Safi", "Mohammédia", "El Jadida", "Béni Mellal",
      "Nador", "Khouribga", "Settat", "Berkane", "Laâyoune", "Dakhla", "Errachidia",
      "Taza", "Guelmim", "Al Hoceïma", "Khémisset", "Ouarzazate", "Larache", "Khénifra",
      "Berrechid", "Taourirt", "Taroudant", "Sidi Kacem", "Sidi Slimane", "Témara", "Skhirat"
    ],
    "Sénégal": ["Dakar", "Saint-Louis", "Thiès", "Ziguinchor", "Kaolack", "Touba", "Mbour"],
    "Côte d'Ivoire": ["Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro", "Korhogo", "Daloa"],
    "Cameroun": ["Douala", "Yaoundé", "Garoua", "Bafoussam", "Bamenda", "Maroua"],
    "Tunisie": ["Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès", "Monastir"],
    "Algérie": ["Alger", "Oran", "Constantine", "Annaba", "Sétif", "Blida", "Tlemcen"],
    "Égypte": ["Le Caire", "Alexandrie", "Gizeh", "Port-Saïd", "Suez", "Assouan"],
    "Mali": ["Bamako", "Sikasso", "Mopti", "Ségou", "Kayes"],
    "Guinée": ["Conakry", "Kindia", "Kankan", "Labé", "Nzérékoré"],
    "Burkina Faso": ["Ouagadougou", "Bobo-Dioulasso", "Koudougou"],
    "Ghana": ["Accra", "Kumasi", "Tamale", "Sekondi-Takoradi"],
    "Nigéria": ["Lagos", "Abuja", "Ibadan", "Kano", "Port Harcourt", "Benin City"],
    "RDC": ["Kinshasa", "Lubumbashi", "Goma", "Mbuji-Mayi", "Kisangani"],
    "Mauritanie": ["Nouakchott", "Nouadhibou", "Rosso"],
    "Gabon": ["Libreville", "Port-Gentil", "Franceville"]
  },
  "Europe": {
    "France": ["Paris", "Marseille", "Lyon", "Lille", "Bordeaux", "Nantes", "Toulouse", "Nice", "Rennes", "Strasbourg", "Montpellier"],
    "Espagne": ["Madrid", "Barcelone", "Séville", "Valence", "Bilbao", "Malaga", "Villarreal", "Saint-Sébastien"],
    "Belgique": ["Bruxelles", "Anvers", "Gand", "Liège", "Namur", "Bruges", "Charleroi"],
    "Pays-Bas": ["Amsterdam", "Rotterdam", "Eindhoven", "Utrecht", "La Haye"],
    "Italie": ["Rome", "Milan", "Naples", "Turin", "Florence", "Bologne", "Gênes"],
    "Portugal": ["Lisbonne", "Porto", "Braga", "Coimbra", "Funchal"],
    "Allemagne": ["Berlin", "Munich", "Francfort", "Hambourg", "Dortmund", "Cologne", "Leipzig"],
    "Angleterre": ["Londres", "Manchester", "Liverpool", "Birmingham", "Newcastle", "Leeds"],
    "Suisse": ["Zurich", "Genève", "Bâle", "Lausanne", "Berne"]
  },
  "Amérique": {
    "Brésil": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Belo Horizonte", "Porto Alegre", "Santos"],
    "Argentine": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata"],
    "Colombie": ["Bogotá", "Medellín", "Cali", "Barranquilla"],
    "Uruguay": ["Montevideo", "Salto", "Maldonado"],
    "USA": ["New York", "Los Angeles", "Chicago", "Miami", "Boston", "Atlanta", "Dallas"],
    "Canada": ["Montréal", "Québec", "Toronto", "Vancouver", "Ottawa"]
  },
  "Asie/Océanie": {
    "Qatar": ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor", "Lusail"],
    "Arabie Saoudite": ["Riyad", "Djeddah", "La Mecque", "Médine", "Dammam"],
    "Émirats Arabes Unis": ["Dubaï", "Abou Dabi", "Charjah", "Al-Aïn"],
    "Japon": ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya"],
    "Australie": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adélaïde"]
  }
};

export const CONTINENTS = Object.keys(GEOGRAPHY_DATA);

export const getContinentForCountry = (countryName?: string): string => {
  if (!countryName) return 'Afrique';
  for (const [continent, countries] of Object.entries(GEOGRAPHY_DATA)) {
    if (Object.keys(countries).some(c => c.toLowerCase() === countryName.toLowerCase() || countryName.toLowerCase().includes(c.toLowerCase()))) {
      return continent;
    }
  }
  return 'Afrique';
};

export const COUNTRY_METAS: Record<string, { flag: string; nationality: string }> = {
  // Afrique
  "Maroc": { flag: "🇲🇦", nationality: "Marocaine" },
  "Sénégal": { flag: "🇸🇳", nationality: "Sénégalaise" },
  "Côte d'Ivoire": { flag: "🇨🇮", nationality: "Ivoirienne" },
  "Cameroun": { flag: "🇨🇲", nationality: "Camerounaise" },
  "Tunisie": { flag: "🇹🇳", nationality: "Tunisienne" },
  "Algérie": { flag: "🇩🇿", nationality: "Algérienne" },
  "Égypte": { flag: "🇪🇬", nationality: "Égyptienne" },
  "Mali": { flag: "🇲🇱", nationality: "Malienne" },
  "Guinée": { flag: "🇬🇳", nationality: "Guinéenne" },
  "Burkina Faso": { flag: "🇧🇫", nationality: "Burkinabé" },
  "Ghana": { flag: "🇬🇭", nationality: "Ghanéenne" },
  "Nigéria": { flag: "🇳🇬", nationality: "Nigériane" },
  "RDC": { flag: "🇨🇩", nationality: "Congolaise (RDC)" },
  "Mauritanie": { flag: "🇲🇷", nationality: "Mauritanienne" },
  "Gabon": { flag: "🇬🇦", nationality: "Gabonaise" },

  // Europe
  "France": { flag: "🇫🇷", nationality: "Française" },
  "Espagne": { flag: "🇪🇸", nationality: "Espagnole" },
  "Belgique": { flag: "🇧🇪", nationality: "Belge" },
  "Pays-Bas": { flag: "🇳🇱", nationality: "Néerlandaise" },
  "Italie": { flag: "🇮🇹", nationality: "Italienne" },
  "Portugal": { flag: "🇵🇹", nationality: "Portugaise" },
  "Allemagne": { flag: "🇩🇪", nationality: "Allemande" },
  "Angleterre": { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", nationality: "Anglaise" },
  "Suisse": { flag: "🇨🇭", nationality: "Suisse" },

  // Amérique
  "Brésil": { flag: "🇧🇷", nationality: "Brésilienne" },
  "Argentine": { flag: "🇦🇷", nationality: "Argentine" },
  "Colombie": { flag: "🇨🇴", nationality: "Colombienne" },
  "Uruguay": { flag: "🇺🇾", nationality: "Uruguayenne" },
  "USA": { flag: "🇺🇸", nationality: "Américaine" },
  "Canada": { flag: "🇨🇦", nationality: "Canadienne" },

  // Asie/Océanie
  "Qatar": { flag: "🇶🇦", nationality: "Qatarienne" },
  "Arabie Saoudite": { flag: "🇸🇦", nationality: "Saoudienne" },
  "Émirats Arabes Unis": { flag: "🇦🇪", nationality: "Émiratie" },
  "Japon": { flag: "🇯🇵", nationality: "Japonaise" },
  "Australie": { flag: "🇦🇺", nationality: "Australienne" },
};

/** Renvoie le drapeau emoji d'un pays ou d'une nationalité (ex: Maroc ou Marocaine -> 🇲🇦) */
export const getCountryFlag = (countryOrNationality?: string): string => {
  if (!countryOrNationality) return '🇲🇦';
  const raw = countryOrNationality.trim().toLowerCase();

  // Maroc en priorité
  if (raw.includes('maroc') || raw.includes('moroc')) return '🇲🇦';

  // Recherche directe dans COUNTRY_METAS
  for (const [country, meta] of Object.entries(COUNTRY_METAS)) {
    if (country.toLowerCase() === raw || meta.nationality.toLowerCase() === raw || raw.includes(country.toLowerCase()) || raw.includes(meta.nationality.toLowerCase())) {
      return meta.flag;
    }
  }

  // Mots-clés alternatifs fréquents
  if (raw.includes('senegal') || raw.includes('sénégal')) return '🇸🇳';
  if (raw.includes('ivoir') || raw.includes('ivory')) return '🇨🇮';
  if (raw.includes('cameroun') || raw.includes('cameroon')) return '🇨🇲';
  if (raw.includes('tunis')) return '🇹🇳';
  if (raw.includes('alger') || raw.includes('algér')) return '🇩🇿';
  if (raw.includes('egypt') || raw.includes('égypt')) return '🇪🇬';
  if (raw.includes('mali')) return '🇲🇱';
  if (raw.includes('guin')) return '🇬🇳';
  if (raw.includes('burkina')) return '🇧🇫';
  if (raw.includes('ghana')) return '🇬🇭';
  if (raw.includes('nigeria') || raw.includes('nigéria')) return '🇳🇬';
  if (raw.includes('congo') || raw.includes('rdc')) return '🇨🇩';
  if (raw.includes('franc') || raw.includes('french')) return '🇫🇷';
  if (raw.includes('espag') || raw.includes('spain')) return '🇪🇸';
  if (raw.includes('belg')) return '🇧🇪';
  if (raw.includes('holland') || raw.includes('pays-bas') || raw.includes('netherland')) return '🇳🇱';
  if (raw.includes('ital')) return '🇮🇹';
  if (raw.includes('portug')) return '🇵🇹';
  if (raw.includes('allemag') || raw.includes('german')) return '🇩🇪';
  if (raw.includes('angl') || raw.includes('england') || raw.includes('britann')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (raw.includes('bresil') || raw.includes('brésil') || raw.includes('brazil')) return '🇧🇷';
  if (raw.includes('argentin')) return '🇦🇷';

  return '🌐';
};

/** Renvoie la nationalité officielle associée à un pays */
export const getCountryNationality = (countryName?: string): string => {
  if (!countryName) return 'Marocaine';
  for (const [country, meta] of Object.entries(COUNTRY_METAS)) {
    if (country.toLowerCase() === countryName.toLowerCase()) {
      return meta.nationality;
    }
  }
  return countryName.trim() ? `${countryName.trim()}e` : 'Marocaine';
};

/** Déduit le nom de pays à partir d'une nationalité */
export const getCountryForNationality = (nationality?: string): string => {
  if (!nationality) return 'Maroc';
  const nat = nationality.toLowerCase().trim();
  if (nat.includes('maroc') || nat.includes('moroc')) return 'Maroc';
  for (const [country, meta] of Object.entries(COUNTRY_METAS)) {
    if (meta.nationality.toLowerCase() === nat || nat.includes(meta.nationality.toLowerCase())) {
      return country;
    }
  }
  return 'Maroc';
};

/** Renvoie la liste de tous les pays avec Maroc en tout premier */
export const getAllCountriesOrdered = (continentFilter?: string): { name: string; flag: string; nationality: string; continent: string }[] => {
  const result: { name: string; flag: string; nationality: string; continent: string }[] = [];
  
  for (const [continent, countries] of Object.entries(GEOGRAPHY_DATA)) {
    if (continentFilter && continentFilter !== 'ALL' && continent !== continentFilter) continue;
    for (const country of Object.keys(countries)) {
      const meta = COUNTRY_METAS[country] || { flag: '🌐', nationality: country };
      result.push({
        name: country,
        flag: meta.flag,
        nationality: meta.nationality,
        continent,
      });
    }
  }

  // Tri : Maroc TOUJOURS en premier, puis ordre alphabétique
  return result.sort((a, b) => {
    if (a.name === 'Maroc') return -1;
    if (b.name === 'Maroc') return 1;
    return a.name.localeCompare(b.name, 'fr');
  });
};
