/**
 * Coordonnées GPS des villes référencées dans GEOGRAPHY_DATA.
 * Utilisé par LocationPicker pour placer les marqueurs Mapbox.
 */
export const CITY_COORDINATES: Record<string, { lat: number; lng: number; country: string; continent: string }> = {
  // ─── AFRIQUE ─ Maroc ─────────────────────────────────────────────────────
  "Rabat":         { lat: 34.020,  lng: -6.841,  country: "Maroc",  continent: "Afrique" },
  "Salé":          { lat: 34.038,  lng: -6.800,  country: "Maroc",  continent: "Afrique" },
  "Kénitra":       { lat: 34.261,  lng: -6.578,  country: "Maroc",  continent: "Afrique" },
  "Casablanca":    { lat: 33.589,  lng: -7.603,  country: "Maroc",  continent: "Afrique" },
  "Marrakech":     { lat: 31.630,  lng: -7.990,  country: "Maroc",  continent: "Afrique" },
  "Fès":           { lat: 34.037,  lng: -5.000,  country: "Maroc",  continent: "Afrique" },
  "Tanger":        { lat: 35.770,  lng: -5.800,  country: "Maroc",  continent: "Afrique" },
  "Agadir":        { lat: 30.427,  lng: -9.598,  country: "Maroc",  continent: "Afrique" },
  "Meknès":        { lat: 33.900,  lng: -5.547,  country: "Maroc",  continent: "Afrique" },
  "Oujda":         { lat: 34.690,  lng: -1.912,  country: "Maroc",  continent: "Afrique" },
  "Tétouan":       { lat: 35.570,  lng: -5.370,  country: "Maroc",  continent: "Afrique" },
  "Safi":          { lat: 32.299,  lng: -9.237,  country: "Maroc",  continent: "Afrique" },
  "Mohammédia":    { lat: 33.686,  lng: -7.383,  country: "Maroc",  continent: "Afrique" },
  "El Jadida":     { lat: 33.254,  lng: -8.508,  country: "Maroc",  continent: "Afrique" },
  "Béni Mellal":   { lat: 32.340,  lng: -6.360,  country: "Maroc",  continent: "Afrique" },
  "Nador":         { lat: 35.174,  lng: -2.929,  country: "Maroc",  continent: "Afrique" },
  "Khouribga":     { lat: 32.880,  lng: -6.906,  country: "Maroc",  continent: "Afrique" },
  "Settat":        { lat: 33.001,  lng: -7.620,  country: "Maroc",  continent: "Afrique" },
  "Berkane":       { lat: 34.920,  lng: -2.316,  country: "Maroc",  continent: "Afrique" },
  "Laâyoune":      { lat: 27.159,  lng: -13.203, country: "Maroc",  continent: "Afrique" },
  "Dakhla":        { lat: 23.718,  lng: -15.935, country: "Maroc",  continent: "Afrique" },
  "Errachidia":    { lat: 31.930,  lng: -4.424,  country: "Maroc",  continent: "Afrique" },
  "Taza":          { lat: 34.210,  lng: -4.011,  country: "Maroc",  continent: "Afrique" },
  "Guelmim":       { lat: 28.988,  lng: -10.057, country: "Maroc",  continent: "Afrique" },
  "Al Hoceïma":    { lat: 35.247,  lng: -3.930,  country: "Maroc",  continent: "Afrique" },
  "Khémisset":     { lat: 33.824,  lng: -6.067,  country: "Maroc",  continent: "Afrique" },
  "Ouarzazate":    { lat: 30.919,  lng: -6.893,  country: "Maroc",  continent: "Afrique" },
  "Larache":       { lat: 35.193,  lng: -6.157,  country: "Maroc",  continent: "Afrique" },
  "Khénifra":      { lat: 32.934,  lng: -5.670,  country: "Maroc",  continent: "Afrique" },
  "Berrechid":     { lat: 33.265,  lng: -7.588,  country: "Maroc",  continent: "Afrique" },
  "Taourirt":      { lat: 34.407,  lng: -2.897,  country: "Maroc",  continent: "Afrique" },
  "Taroudant":     { lat: 30.474,  lng: -8.877,  country: "Maroc",  continent: "Afrique" },
  "Sidi Kacem":    { lat: 34.224,  lng: -5.713,  country: "Maroc",  continent: "Afrique" },
  "Sidi Slimane":  { lat: 34.270,  lng: -5.929,  country: "Maroc",  continent: "Afrique" },
  "Témara":        { lat: 33.926,  lng: -6.908,  country: "Maroc",  continent: "Afrique" },
  "Skhirat":       { lat: 33.849,  lng: -7.028,  country: "Maroc",  continent: "Afrique" },

  // ─── AFRIQUE ─ Sénégal ────────────────────────────────────────────────────
  "Dakar":         { lat: 14.692,  lng: -17.446, country: "Sénégal", continent: "Afrique" },
  "Saint-Louis":   { lat: 16.018,  lng: -16.495, country: "Sénégal", continent: "Afrique" },
  "Thiès":         { lat: 14.789,  lng: -16.926, country: "Sénégal", continent: "Afrique" },
  "Ziguinchor":    { lat: 12.565,  lng: -16.274, country: "Sénégal", continent: "Afrique" },
  "Kaolack":       { lat: 14.152,  lng: -16.073, country: "Sénégal", continent: "Afrique" },
  "Touba":         { lat: 14.864,  lng: -15.883, country: "Sénégal", continent: "Afrique" },
  "Mbour":         { lat: 14.410,  lng: -16.965, country: "Sénégal", continent: "Afrique" },

  // ─── AFRIQUE ─ Côte d'Ivoire ──────────────────────────────────────────────
  "Abidjan":       { lat: 5.359,   lng: -4.008,  country: "Côte d'Ivoire", continent: "Afrique" },
  "Yamoussoukro":  { lat: 6.827,   lng: -5.289,  country: "Côte d'Ivoire", continent: "Afrique" },
  "Bouaké":        { lat: 7.691,   lng: -5.037,  country: "Côte d'Ivoire", continent: "Afrique" },
  "San-Pédro":     { lat: 4.748,   lng: -6.636,  country: "Côte d'Ivoire", continent: "Afrique" },
  "Korhogo":       { lat: 9.458,   lng: -5.629,  country: "Côte d'Ivoire", continent: "Afrique" },
  "Daloa":         { lat: 6.877,   lng: -6.450,  country: "Côte d'Ivoire", continent: "Afrique" },

  // ─── AFRIQUE ─ Cameroun ────────────────────────────────────────────────────
  "Douala":        { lat: 4.051,   lng: 9.704,   country: "Cameroun", continent: "Afrique" },
  "Yaoundé":       { lat: 3.848,   lng: 11.502,  country: "Cameroun", continent: "Afrique" },
  "Garoua":        { lat: 9.301,   lng: 13.397,  country: "Cameroun", continent: "Afrique" },
  "Bafoussam":     { lat: 5.478,   lng: 10.417,  country: "Cameroun", continent: "Afrique" },
  "Bamenda":       { lat: 5.959,   lng: 10.146,  country: "Cameroun", continent: "Afrique" },
  "Maroua":        { lat: 10.591,  lng: 14.316,  country: "Cameroun", continent: "Afrique" },

  // ─── AFRIQUE ─ Tunisie ────────────────────────────────────────────────────
  "Tunis":         { lat: 36.818,  lng: 10.165,  country: "Tunisie", continent: "Afrique" },
  "Sfax":          { lat: 34.740,  lng: 10.760,  country: "Tunisie", continent: "Afrique" },
  "Sousse":        { lat: 35.825,  lng: 10.634,  country: "Tunisie", continent: "Afrique" },
  "Kairouan":      { lat: 35.678,  lng: 10.097,  country: "Tunisie", continent: "Afrique" },
  "Bizerte":       { lat: 37.274,  lng: 9.874,   country: "Tunisie", continent: "Afrique" },
  "Gabès":         { lat: 33.881,  lng: 10.097,  country: "Tunisie", continent: "Afrique" },
  "Monastir":      { lat: 35.778,  lng: 10.826,  country: "Tunisie", continent: "Afrique" },

  // ─── AFRIQUE ─ Algérie ────────────────────────────────────────────────────
  "Alger":         { lat: 36.737,  lng: 3.086,   country: "Algérie", continent: "Afrique" },
  "Oran":          { lat: 35.697,  lng: -0.634,  country: "Algérie", continent: "Afrique" },
  "Constantine":   { lat: 36.365,  lng: 6.615,   country: "Algérie", continent: "Afrique" },
  "Annaba":        { lat: 36.897,  lng: 7.766,   country: "Algérie", continent: "Afrique" },
  "Sétif":         { lat: 36.191,  lng: 5.408,   country: "Algérie", continent: "Afrique" },
  "Blida":         { lat: 36.471,  lng: 2.829,   country: "Algérie", continent: "Afrique" },
  "Tlemcen":       { lat: 34.878,  lng: -1.315,  country: "Algérie", continent: "Afrique" },

  // ─── AFRIQUE ─ Égypte ────────────────────────────────────────────────────
  "Le Caire":      { lat: 30.044,  lng: 31.235,  country: "Égypte", continent: "Afrique" },
  "Alexandrie":    { lat: 31.200,  lng: 29.918,  country: "Égypte", continent: "Afrique" },
  "Gizeh":         { lat: 30.013,  lng: 31.214,  country: "Égypte", continent: "Afrique" },
  "Port-Saïd":     { lat: 31.259,  lng: 32.284,  country: "Égypte", continent: "Afrique" },
  "Suez":          { lat: 29.967,  lng: 32.549,  country: "Égypte", continent: "Afrique" },
  "Assouan":       { lat: 24.088,  lng: 32.900,  country: "Égypte", continent: "Afrique" },

  // ─── AFRIQUE ─ Mali ───────────────────────────────────────────────────────
  "Bamako":        { lat: 12.650,  lng: -8.000,  country: "Mali", continent: "Afrique" },
  "Sikasso":       { lat: 11.318,  lng: -5.666,  country: "Mali", continent: "Afrique" },
  "Mopti":         { lat: 14.490,  lng: -4.196,  country: "Mali", continent: "Afrique" },
  "Ségou":         { lat: 13.450,  lng: -6.267,  country: "Mali", continent: "Afrique" },
  "Kayes":         { lat: 14.449,  lng: -11.443, country: "Mali", continent: "Afrique" },

  // ─── AFRIQUE ─ Guinée ─────────────────────────────────────────────────────
  "Conakry":       { lat: 9.537,   lng: -13.677, country: "Guinée", continent: "Afrique" },
  "Kindia":        { lat: 10.056,  lng: -12.868, country: "Guinée", continent: "Afrique" },
  "Kankan":        { lat: 10.385,  lng: -9.306,  country: "Guinée", continent: "Afrique" },
  "Labé":          { lat: 11.318,  lng: -12.285, country: "Guinée", continent: "Afrique" },
  "Nzérékoré":     { lat: 7.756,   lng: -8.820,  country: "Guinée", continent: "Afrique" },

  // ─── AFRIQUE ─ Burkina Faso ───────────────────────────────────────────────
  "Ouagadougou":   { lat: 12.362,  lng: -1.534,  country: "Burkina Faso", continent: "Afrique" },
  "Bobo-Dioulasso":{ lat: 11.178,  lng: -4.297,  country: "Burkina Faso", continent: "Afrique" },
  "Koudougou":     { lat: 12.250,  lng: -2.367,  country: "Burkina Faso", continent: "Afrique" },

  // ─── AFRIQUE ─ Ghana ──────────────────────────────────────────────────────
  "Accra":         { lat: 5.603,   lng: -0.187,  country: "Ghana", continent: "Afrique" },
  "Kumasi":        { lat: 6.688,   lng: -1.623,  country: "Ghana", continent: "Afrique" },
  "Tamale":        { lat: 9.401,   lng: -0.839,  country: "Ghana", continent: "Afrique" },
  "Sekondi-Takoradi": { lat: 4.934, lng: -1.713, country: "Ghana", continent: "Afrique" },

  // ─── AFRIQUE ─ Nigéria ────────────────────────────────────────────────────
  "Lagos":         { lat: 6.455,   lng: 3.384,   country: "Nigéria", continent: "Afrique" },
  "Abuja":         { lat: 9.057,   lng: 7.492,   country: "Nigéria", continent: "Afrique" },
  "Ibadan":        { lat: 7.378,   lng: 3.947,   country: "Nigéria", continent: "Afrique" },
  "Kano":          { lat: 12.000,  lng: 8.517,   country: "Nigéria", continent: "Afrique" },
  "Port Harcourt": { lat: 4.815,   lng: 7.049,   country: "Nigéria", continent: "Afrique" },
  "Benin City":    { lat: 6.338,   lng: 5.627,   country: "Nigéria", continent: "Afrique" },

  // ─── AFRIQUE ─ RDC ────────────────────────────────────────────────────────
  "Kinshasa":      { lat: -4.322,  lng: 15.322,  country: "RDC", continent: "Afrique" },
  "Lubumbashi":    { lat: -11.665, lng: 27.479,  country: "RDC", continent: "Afrique" },
  "Goma":          { lat: -1.679,  lng: 29.221,  country: "RDC", continent: "Afrique" },
  "Mbuji-Mayi":    { lat: -6.150,  lng: 23.600,  country: "RDC", continent: "Afrique" },
  "Kisangani":     { lat: 0.515,   lng: 25.190,  country: "RDC", continent: "Afrique" },

  // ─── AFRIQUE ─ Mauritanie ────────────────────────────────────────────────
  "Nouakchott":    { lat: 18.079,  lng: -15.965, country: "Mauritanie", continent: "Afrique" },
  "Nouadhibou":    { lat: 20.930,  lng: -17.034, country: "Mauritanie", continent: "Afrique" },
  "Rosso":         { lat: 16.513,  lng: -15.805, country: "Mauritanie", continent: "Afrique" },

  // ─── AFRIQUE ─ Gabon ─────────────────────────────────────────────────────
  "Libreville":    { lat: 0.393,   lng: 9.453,   country: "Gabon", continent: "Afrique" },
  "Port-Gentil":   { lat: -0.719,  lng: 8.780,   country: "Gabon", continent: "Afrique" },
  "Franceville":   { lat: -1.633,  lng: 13.583,  country: "Gabon", continent: "Afrique" },

  // ─── EUROPE ─ France ──────────────────────────────────────────────────────
  "Paris":         { lat: 48.853,  lng: 2.350,   country: "France", continent: "Europe" },
  "Marseille":     { lat: 43.296,  lng: 5.370,   country: "France", continent: "Europe" },
  "Lyon":          { lat: 45.750,  lng: 4.850,   country: "France", continent: "Europe" },
  "Lille":         { lat: 50.629,  lng: 3.057,   country: "France", continent: "Europe" },
  "Bordeaux":      { lat: 44.837,  lng: -0.580,  country: "France", continent: "Europe" },
  "Nantes":        { lat: 47.218,  lng: -1.554,  country: "France", continent: "Europe" },
  "Toulouse":      { lat: 43.605,  lng: 1.444,   country: "France", continent: "Europe" },
  "Nice":          { lat: 43.710,  lng: 7.262,   country: "France", continent: "Europe" },
  "Rennes":        { lat: 48.117,  lng: -1.678,  country: "France", continent: "Europe" },
  "Strasbourg":    { lat: 48.584,  lng: 7.746,   country: "France", continent: "Europe" },
  "Montpellier":   { lat: 43.611,  lng: 3.877,   country: "France", continent: "Europe" },

  // ─── EUROPE ─ Espagne ─────────────────────────────────────────────────────
  "Madrid":        { lat: 40.416,  lng: -3.703,  country: "Espagne", continent: "Europe" },
  "Barcelone":     { lat: 41.385,  lng: 2.173,   country: "Espagne", continent: "Europe" },
  "Séville":       { lat: 37.388,  lng: -5.982,  country: "Espagne", continent: "Europe" },
  "Valence":       { lat: 39.469,  lng: -0.377,  country: "Espagne", continent: "Europe" },
  "Bilbao":        { lat: 43.263,  lng: -2.935,  country: "Espagne", continent: "Europe" },
  "Malaga":        { lat: 36.721,  lng: -4.421,  country: "Espagne", continent: "Europe" },
  "Villarreal":    { lat: 39.940,  lng: -0.103,  country: "Espagne", continent: "Europe" },
  "Saint-Sébastien": { lat: 43.318, lng: -1.981, country: "Espagne", continent: "Europe" },

  // ─── EUROPE ─ Belgique ────────────────────────────────────────────────────
  "Bruxelles":     { lat: 50.850,  lng: 4.351,   country: "Belgique", continent: "Europe" },
  "Anvers":        { lat: 51.220,  lng: 4.402,   country: "Belgique", continent: "Europe" },
  "Gand":          { lat: 51.054,  lng: 3.718,   country: "Belgique", continent: "Europe" },
  "Liège":         { lat: 50.633,  lng: 5.567,   country: "Belgique", continent: "Europe" },
  "Namur":         { lat: 50.466,  lng: 4.867,   country: "Belgique", continent: "Europe" },
  "Bruges":        { lat: 51.209,  lng: 3.224,   country: "Belgique", continent: "Europe" },
  "Charleroi":     { lat: 50.411,  lng: 4.444,   country: "Belgique", continent: "Europe" },

  // ─── EUROPE ─ Pays-Bas ────────────────────────────────────────────────────
  "Amsterdam":     { lat: 52.373,  lng: 4.890,   country: "Pays-Bas", continent: "Europe" },
  "Rotterdam":     { lat: 51.924,  lng: 4.479,   country: "Pays-Bas", continent: "Europe" },
  "Eindhoven":     { lat: 51.441,  lng: 5.478,   country: "Pays-Bas", continent: "Europe" },
  "Utrecht":       { lat: 52.090,  lng: 5.121,   country: "Pays-Bas", continent: "Europe" },
  "La Haye":       { lat: 52.079,  lng: 4.311,   country: "Pays-Bas", continent: "Europe" },

  // ─── EUROPE ─ Italie ──────────────────────────────────────────────────────
  "Rome":          { lat: 41.903,  lng: 12.496,  country: "Italie", continent: "Europe" },
  "Milan":         { lat: 45.465,  lng: 9.188,   country: "Italie", continent: "Europe" },
  "Naples":        { lat: 40.851,  lng: 14.268,  country: "Italie", continent: "Europe" },
  "Turin":         { lat: 45.070,  lng: 7.687,   country: "Italie", continent: "Europe" },
  "Florence":      { lat: 43.769,  lng: 11.255,  country: "Italie", continent: "Europe" },
  "Bologne":       { lat: 44.494,  lng: 11.342,  country: "Italie", continent: "Europe" },
  "Gênes":         { lat: 44.407,  lng: 8.934,   country: "Italie", continent: "Europe" },

  // ─── EUROPE ─ Portugal ────────────────────────────────────────────────────
  "Lisbonne":      { lat: 38.717,  lng: -9.139,  country: "Portugal", continent: "Europe" },
  "Porto":         { lat: 41.150,  lng: -8.612,  country: "Portugal", continent: "Europe" },
  "Braga":         { lat: 41.545,  lng: -8.428,  country: "Portugal", continent: "Europe" },
  "Coimbra":       { lat: 40.210,  lng: -8.429,  country: "Portugal", continent: "Europe" },
  "Funchal":       { lat: 32.649,  lng: -16.908, country: "Portugal", continent: "Europe" },

  // ─── EUROPE ─ Allemagne ───────────────────────────────────────────────────
  "Berlin":        { lat: 52.520,  lng: 13.405,  country: "Allemagne", continent: "Europe" },
  "Munich":        { lat: 48.137,  lng: 11.575,  country: "Allemagne", continent: "Europe" },
  "Francfort":     { lat: 50.111,  lng: 8.682,   country: "Allemagne", continent: "Europe" },
  "Hambourg":      { lat: 53.551,  lng: 9.993,   country: "Allemagne", continent: "Europe" },
  "Dortmund":      { lat: 51.514,  lng: 7.468,   country: "Allemagne", continent: "Europe" },
  "Cologne":       { lat: 50.938,  lng: 6.960,   country: "Allemagne", continent: "Europe" },
  "Leipzig":       { lat: 51.340,  lng: 12.374,  country: "Allemagne", continent: "Europe" },

  // ─── EUROPE ─ Angleterre ──────────────────────────────────────────────────
  "Londres":       { lat: 51.508,  lng: -0.128,  country: "Angleterre", continent: "Europe" },
  "Manchester":    { lat: 53.481,  lng: -2.243,  country: "Angleterre", continent: "Europe" },
  "Liverpool":     { lat: 53.408,  lng: -2.991,  country: "Angleterre", continent: "Europe" },
  "Birmingham":    { lat: 52.486,  lng: -1.890,  country: "Angleterre", continent: "Europe" },
  "Newcastle":     { lat: 54.978,  lng: -1.618,  country: "Angleterre", continent: "Europe" },
  "Leeds":         { lat: 53.800,  lng: -1.549,  country: "Angleterre", continent: "Europe" },

  // ─── EUROPE ─ Suisse ──────────────────────────────────────────────────────
  "Zurich":        { lat: 47.377,  lng: 8.541,   country: "Suisse", continent: "Europe" },
  "Genève":        { lat: 46.204,  lng: 6.143,   country: "Suisse", continent: "Europe" },
  "Bâle":          { lat: 47.559,  lng: 7.589,   country: "Suisse", continent: "Europe" },
  "Lausanne":      { lat: 46.519,  lng: 6.632,   country: "Suisse", continent: "Europe" },
  "Berne":         { lat: 46.948,  lng: 7.447,   country: "Suisse", continent: "Europe" },

  // ─── AMÉRIQUE ─ Brésil ────────────────────────────────────────────────────
  "São Paulo":     { lat: -23.549, lng: -46.634, country: "Brésil", continent: "Amérique" },
  "Rio de Janeiro":{ lat: -22.906, lng: -43.173, country: "Brésil", continent: "Amérique" },
  "Brasília":      { lat: -15.779, lng: -47.930, country: "Brésil", continent: "Amérique" },
  "Salvador":      { lat: -12.971, lng: -38.501, country: "Brésil", continent: "Amérique" },
  "Belo Horizonte":{ lat: -19.917, lng: -43.934, country: "Brésil", continent: "Amérique" },
  "Porto Alegre":  { lat: -30.034, lng: -51.218, country: "Brésil", continent: "Amérique" },
  "Santos":        { lat: -23.963, lng: -46.333, country: "Brésil", continent: "Amérique" },

  // ─── AMÉRIQUE ─ Argentine ─────────────────────────────────────────────────
  "Buenos Aires":  { lat: -34.603, lng: -58.382, country: "Argentine", continent: "Amérique" },
  "Córdoba":       { lat: -31.420, lng: -64.188, country: "Argentine", continent: "Amérique" },
  "Rosario":       { lat: -32.947, lng: -60.639, country: "Argentine", continent: "Amérique" },
  "Mendoza":       { lat: -32.890, lng: -68.845, country: "Argentine", continent: "Amérique" },
  "La Plata":      { lat: -34.920, lng: -57.953, country: "Argentine", continent: "Amérique" },

  // ─── AMÉRIQUE ─ Colombie ──────────────────────────────────────────────────
  "Bogotá":        { lat: 4.711,   lng: -74.072, country: "Colombie", continent: "Amérique" },
  "Medellín":      { lat: 6.252,   lng: -75.564, country: "Colombie", continent: "Amérique" },
  "Cali":          { lat: 3.451,   lng: -76.532, country: "Colombie", continent: "Amérique" },
  "Barranquilla":  { lat: 10.980,  lng: -74.796, country: "Colombie", continent: "Amérique" },

  // ─── AMÉRIQUE ─ Uruguay ───────────────────────────────────────────────────
  "Montevideo":    { lat: -34.901, lng: -56.187, country: "Uruguay", continent: "Amérique" },
  "Salto":         { lat: -31.383, lng: -57.966, country: "Uruguay", continent: "Amérique" },
  "Maldonado":     { lat: -34.908, lng: -54.960, country: "Uruguay", continent: "Amérique" },

  // ─── AMÉRIQUE ─ USA ───────────────────────────────────────────────────────
  "New York":      { lat: 40.714,  lng: -74.006, country: "USA", continent: "Amérique" },
  "Los Angeles":   { lat: 34.052,  lng: -118.244, country: "USA", continent: "Amérique" },
  "Chicago":       { lat: 41.878,  lng: -87.630, country: "USA", continent: "Amérique" },
  "Miami":         { lat: 25.774,  lng: -80.195, country: "USA", continent: "Amérique" },
  "Boston":        { lat: 42.360,  lng: -71.059, country: "USA", continent: "Amérique" },
  "Atlanta":       { lat: 33.749,  lng: -84.388, country: "USA", continent: "Amérique" },
  "Dallas":        { lat: 32.776,  lng: -96.797, country: "USA", continent: "Amérique" },

  // ─── AMÉRIQUE ─ Canada ────────────────────────────────────────────────────
  "Montréal":      { lat: 45.508,  lng: -73.554, country: "Canada", continent: "Amérique" },
  "Québec":        { lat: 46.813,  lng: -71.208, country: "Canada", continent: "Amérique" },
  "Toronto":       { lat: 43.653,  lng: -79.383, country: "Canada", continent: "Amérique" },
  "Vancouver":     { lat: 49.246,  lng: -123.116, country: "Canada", continent: "Amérique" },
  "Ottawa":        { lat: 45.421,  lng: -75.697, country: "Canada", continent: "Amérique" },

  // ─── ASIE/OCÉANIE ─ Qatar ────────────────────────────────────────────────
  "Doha":          { lat: 25.286,  lng: 51.534,  country: "Qatar", continent: "Asie/Océanie" },
  "Al Rayyan":     { lat: 25.292,  lng: 51.424,  country: "Qatar", continent: "Asie/Océanie" },
  "Al Wakrah":     { lat: 25.166,  lng: 51.601,  country: "Qatar", continent: "Asie/Océanie" },
  "Al Khor":       { lat: 25.683,  lng: 51.496,  country: "Qatar", continent: "Asie/Océanie" },
  "Lusail":        { lat: 25.423,  lng: 51.491,  country: "Qatar", continent: "Asie/Océanie" },

  // ─── ASIE/OCÉANIE ─ Arabie Saoudite ─────────────────────────────────────
  "Riyad":         { lat: 24.688,  lng: 46.722,  country: "Arabie Saoudite", continent: "Asie/Océanie" },
  "Djeddah":       { lat: 21.490,  lng: 39.187,  country: "Arabie Saoudite", continent: "Asie/Océanie" },
  "La Mecque":     { lat: 21.390,  lng: 39.857,  country: "Arabie Saoudite", continent: "Asie/Océanie" },
  "Médine":        { lat: 24.470,  lng: 39.610,  country: "Arabie Saoudite", continent: "Asie/Océanie" },
  "Dammam":        { lat: 26.432,  lng: 50.104,  country: "Arabie Saoudite", continent: "Asie/Océanie" },

  // ─── ASIE/OCÉANIE ─ Émirats Arabes Unis ─────────────────────────────────
  "Dubaï":         { lat: 25.205,  lng: 55.271,  country: "Émirats Arabes Unis", continent: "Asie/Océanie" },
  "Abou Dabi":     { lat: 24.453,  lng: 54.377,  country: "Émirats Arabes Unis", continent: "Asie/Océanie" },
  "Charjah":       { lat: 25.357,  lng: 55.393,  country: "Émirats Arabes Unis", continent: "Asie/Océanie" },
  "Al-Aïn":        { lat: 24.207,  lng: 55.745,  country: "Émirats Arabes Unis", continent: "Asie/Océanie" },

  // ─── ASIE/OCÉANIE ─ Japon ────────────────────────────────────────────────
  "Tokyo":         { lat: 35.689,  lng: 139.692, country: "Japon", continent: "Asie/Océanie" },
  "Osaka":         { lat: 34.694,  lng: 135.502, country: "Japon", continent: "Asie/Océanie" },
  "Kyoto":         { lat: 35.011,  lng: 135.768, country: "Japon", continent: "Asie/Océanie" },
  "Yokohama":      { lat: 35.444,  lng: 139.638, country: "Japon", continent: "Asie/Océanie" },
  "Nagoya":        { lat: 35.181,  lng: 136.906, country: "Japon", continent: "Asie/Océanie" },

  // ─── ASIE/OCÉANIE ─ Australie ────────────────────────────────────────────
  "Sydney":        { lat: -33.869, lng: 151.209, country: "Australie", continent: "Asie/Océanie" },
  "Melbourne":     { lat: -37.814, lng: 144.963, country: "Australie", continent: "Asie/Océanie" },
  "Brisbane":      { lat: -27.471, lng: 153.024, country: "Australie", continent: "Asie/Océanie" },
  "Perth":         { lat: -31.951, lng: 115.861, country: "Australie", continent: "Asie/Océanie" },
  "Adélaïde":      { lat: -34.929, lng: 138.601, country: "Australie", continent: "Asie/Océanie" },
};

/** Couleur associée à chaque continent pour les marqueurs */
export const CONTINENT_COLORS: Record<string, string> = {
  "Maroc":        "#e11d48", // rouge/rose Maroc
  "Afrique":      "#ef4444", // rouge
  "Europe":       "#3b82f6", // bleu
  "Amérique":     "#22c55e", // vert
  "Asie/Océanie": "#f59e0b", // ambre
};
