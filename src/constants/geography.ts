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
