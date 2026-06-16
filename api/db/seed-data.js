/**
 * Dataset OFICIAL del Mundial 2026 (verificado contra fuentes: FIFA / ESPN / Wikipedia).
 *
 * Sorteo final: 5 de diciembre de 2025 (Washington D.C.). 48 selecciones, 12 grupos
 * de 4 (A–L). Anfitriones: México (A), Canadá (B), Estados Unidos (D).
 *
 * Incluye: las 48 selecciones reales con su grupo, las 16 sedes, los 72 partidos de
 * la fase de grupos con fecha/sede reales (horarios en UTC), los resultados ya
 * jugados, y el esqueleto de la fase final (32 partidos) con fechas y sedes reales.
 *
 * Los puntos FIFA son aproximados (referencia 2025/26) y solo alimentan la fuerza
 * del modelo; configurá FIFA_RANKING_URL para los puntos exactos.
 */

// [code, name(es), confederation, group, fifa_points]
const RAW_TEAMS = [
    // Grupo A
    ['MEX', 'México', 'CONCACAF', 'A', 1656],
    ['RSA', 'Sudáfrica', 'CAF', 'A', 1445],
    ['KOR', 'Corea del Sur', 'AFC', 'A', 1576],
    ['CZE', 'Chequia', 'UEFA', 'A', 1490],
    // Grupo B
    ['CAN', 'Canadá', 'CONCACAF', 'B', 1530],
    ['BIH', 'Bosnia y Herzegovina', 'UEFA', 'B', 1470],
    ['QAT', 'Catar', 'AFC', 'B', 1456],
    ['SUI', 'Suiza', 'UEFA', 'B', 1648],
    // Grupo C
    ['BRA', 'Brasil', 'CONMEBOL', 'C', 1764],
    ['MAR', 'Marruecos', 'CAF', 'C', 1712],
    ['HAI', 'Haití', 'CONCACAF', 'C', 1320],
    ['SCO', 'Escocia', 'UEFA', 'C', 1500],
    // Grupo D
    ['USA', 'Estados Unidos', 'CONCACAF', 'D', 1648],
    ['PAR', 'Paraguay', 'CONMEBOL', 'D', 1480],
    ['AUS', 'Australia', 'AFC', 'D', 1500],
    ['TUR', 'Turquía', 'UEFA', 'D', 1549],
    // Grupo E
    ['GER', 'Alemania', 'UEFA', 'E', 1724],
    ['CUW', 'Curazao', 'CONCACAF', 'E', 1330],
    ['CIV', 'Costa de Marfil', 'CAF', 'E', 1490],
    ['ECU', 'Ecuador', 'CONMEBOL', 'E', 1567],
    // Grupo F
    ['NED', 'Países Bajos', 'UEFA', 'F', 1756],
    ['JPN', 'Japón', 'AFC', 'F', 1652],
    ['SWE', 'Suecia', 'UEFA', 'F', 1530],
    ['TUN', 'Túnez', 'CAF', 'F', 1485],
    // Grupo G
    ['BEL', 'Bélgica', 'UEFA', 'G', 1740],
    ['EGY', 'Egipto', 'CAF', 'G', 1518],
    ['IRN', 'Irán', 'AFC', 'G', 1616],
    ['NZL', 'Nueva Zelanda', 'OFC', 'G', 1320],
    // Grupo H
    ['ESP', 'España', 'UEFA', 'H', 1867],
    ['CPV', 'Cabo Verde', 'CAF', 'H', 1360],
    ['KSA', 'Arabia Saudita', 'AFC', 'H', 1450],
    ['URU', 'Uruguay', 'CONMEBOL', 'H', 1679],
    // Grupo I
    ['FRA', 'Francia', 'UEFA', 'I', 1862],
    ['SEN', 'Senegal', 'CAF', 'I', 1630],
    ['IRQ', 'Irak', 'AFC', 'I', 1400],
    ['NOR', 'Noruega', 'UEFA', 'I', 1530],
    // Grupo J
    ['ARG', 'Argentina', 'CONMEBOL', 'J', 1873],
    ['ALG', 'Argelia', 'CAF', 'J', 1507],
    ['AUT', 'Austria', 'UEFA', 'J', 1571],
    ['JOR', 'Jordania', 'AFC', 'J', 1389],
    // Grupo K
    ['POR', 'Portugal', 'UEFA', 'K', 1772],
    ['COD', 'RD Congo', 'CAF', 'K', 1460],
    ['UZB', 'Uzbekistán', 'AFC', 'K', 1420],
    ['COL', 'Colombia', 'CONMEBOL', 'K', 1701],
    // Grupo L
    ['ENG', 'Inglaterra', 'UEFA', 'L', 1819],
    ['CRO', 'Croacia', 'UEFA', 'L', 1714],
    ['GHA', 'Ghana', 'CAF', 'L', 1445],
    ['PAN', 'Panamá', 'CONCACAF', 'L', 1430],
];

const HOSTS = new Set(['USA', 'MEX', 'CAN']);
const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

/**
 * Las 48 selecciones con su grupo real y su rank global por puntos.
 */
export function buildTeams() {
    const teams = RAW_TEAMS.map(([code, name, confederation, group, fifa_points]) => ({
        code, name, confederation, group, fifa_points,
        fifa_rank: null,
        is_host: HOSTS.has(code),
    }));
    const byPoints = [...teams].sort((a, b) => b.fifa_points - a.fifa_points);
    byPoints.forEach((t, i) => { t.fifa_rank = i + 1; });
    return teams;
}

/**
 * 16 sedes oficiales (EE.UU., Canadá, México). Clave = ciudad usada en el fixture.
 */
const CITY_VENUE = {
    'Mexico City': { name: 'Estadio Azteca', city: 'Ciudad de México', country: 'México' },
    'Zapopan': { name: 'Estadio Akron', city: 'Guadalajara', country: 'México' },
    'Guadalupe': { name: 'Estadio BBVA', city: 'Monterrey', country: 'México' },
    'Toronto': { name: 'BMO Field', city: 'Toronto', country: 'Canadá' },
    'Vancouver': { name: 'BC Place', city: 'Vancouver', country: 'Canadá' },
    'Inglewood': { name: 'SoFi Stadium', city: 'Los Ángeles', country: 'Estados Unidos' },
    'Santa Clara': { name: "Levi's Stadium", city: 'San Francisco', country: 'Estados Unidos' },
    'Seattle': { name: 'Lumen Field', city: 'Seattle', country: 'Estados Unidos' },
    'East Rutherford': { name: 'MetLife Stadium', city: 'Nueva York', country: 'Estados Unidos' },
    'Foxborough': { name: 'Gillette Stadium', city: 'Boston', country: 'Estados Unidos' },
    'Philadelphia': { name: 'Lincoln Financial Field', city: 'Filadelfia', country: 'Estados Unidos' },
    'Miami Gardens': { name: 'Hard Rock Stadium', city: 'Miami', country: 'Estados Unidos' },
    'Atlanta': { name: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'Estados Unidos' },
    'Houston': { name: 'NRG Stadium', city: 'Houston', country: 'Estados Unidos' },
    'Arlington': { name: 'AT&T Stadium', city: 'Dallas', country: 'Estados Unidos' },
    'Kansas City': { name: 'Arrowhead Stadium', city: 'Kansas City', country: 'Estados Unidos' },
};

export const VENUES = Object.values(CITY_VENUE);

const venueNameOf = (city) => (CITY_VENUE[city] ? CITY_VENUE[city].name : city);

// Fixture de grupos: [group, matchday, home, away, city, kickoff_utc, homeScore?, awayScore?]
// Horarios convertidos a UTC (junio = EDT, ET = UTC−4). Resultados de los partidos ya jugados.
const GROUP_FIXTURES_RAW = [
    // ── Grupo A ──
    ['A', 1, 'MEX', 'RSA', 'Mexico City', '2026-06-12T02:00:00Z', 2, 0],
    ['A', 1, 'KOR', 'CZE', 'Zapopan', '2026-06-12T02:00:00Z', 2, 1],
    ['A', 2, 'CZE', 'RSA', 'Atlanta', '2026-06-18T16:00:00Z'],
    ['A', 2, 'MEX', 'KOR', 'Zapopan', '2026-06-19T03:00:00Z'],
    ['A', 3, 'CZE', 'MEX', 'Mexico City', '2026-06-25T01:00:00Z'],
    ['A', 3, 'RSA', 'KOR', 'Guadalupe', '2026-06-25T01:00:00Z'],
    // ── Grupo B ──
    ['B', 1, 'CAN', 'BIH', 'Toronto', '2026-06-12T19:00:00Z', 1, 1],
    ['B', 1, 'QAT', 'SUI', 'Santa Clara', '2026-06-13T19:00:00Z'],
    ['B', 2, 'SUI', 'BIH', 'Inglewood', '2026-06-18T19:00:00Z'],
    ['B', 2, 'CAN', 'QAT', 'Vancouver', '2026-06-18T22:00:00Z'],
    ['B', 3, 'SUI', 'CAN', 'Vancouver', '2026-06-24T19:00:00Z'],
    ['B', 3, 'BIH', 'QAT', 'Seattle', '2026-06-24T19:00:00Z'],
    // ── Grupo C ──
    ['C', 1, 'BRA', 'MAR', 'East Rutherford', '2026-06-13T22:00:00Z'],
    ['C', 1, 'HAI', 'SCO', 'Foxborough', '2026-06-14T01:00:00Z'],
    ['C', 2, 'SCO', 'MAR', 'Foxborough', '2026-06-19T22:00:00Z'],
    ['C', 2, 'BRA', 'HAI', 'Philadelphia', '2026-06-20T01:00:00Z'],
    ['C', 3, 'SCO', 'BRA', 'Miami Gardens', '2026-06-24T22:00:00Z'],
    ['C', 3, 'MAR', 'HAI', 'Atlanta', '2026-06-24T22:00:00Z'],
    // ── Grupo D ──
    ['D', 1, 'USA', 'PAR', 'Inglewood', '2026-06-13T01:00:00Z', 4, 1],
    ['D', 1, 'AUS', 'TUR', 'Vancouver', '2026-06-14T04:00:00Z'],
    ['D', 2, 'USA', 'AUS', 'Seattle', '2026-06-19T19:00:00Z'],
    ['D', 2, 'TUR', 'PAR', 'Santa Clara', '2026-06-20T04:00:00Z'],
    ['D', 3, 'TUR', 'USA', 'Inglewood', '2026-06-26T02:00:00Z'],
    ['D', 3, 'PAR', 'AUS', 'Santa Clara', '2026-06-26T02:00:00Z'],
    // ── Grupo E ──
    ['E', 1, 'GER', 'CUW', 'Houston', '2026-06-14T17:00:00Z'],
    ['E', 1, 'CIV', 'ECU', 'Philadelphia', '2026-06-14T23:00:00Z'],
    ['E', 2, 'GER', 'CIV', 'Toronto', '2026-06-20T20:00:00Z'],
    ['E', 2, 'ECU', 'CUW', 'Kansas City', '2026-06-21T00:00:00Z'],
    ['E', 3, 'ECU', 'GER', 'East Rutherford', '2026-06-25T20:00:00Z'],
    ['E', 3, 'CUW', 'CIV', 'Philadelphia', '2026-06-25T20:00:00Z'],
    // ── Grupo F ──
    ['F', 1, 'NED', 'JPN', 'Arlington', '2026-06-14T20:00:00Z'],
    ['F', 1, 'SWE', 'TUN', 'Guadalupe', '2026-06-15T02:00:00Z'],
    ['F', 2, 'NED', 'SWE', 'Houston', '2026-06-20T17:00:00Z'],
    ['F', 2, 'TUN', 'JPN', 'Guadalupe', '2026-06-21T04:00:00Z'],
    ['F', 3, 'JPN', 'SWE', 'Arlington', '2026-06-25T23:00:00Z'],
    ['F', 3, 'TUN', 'NED', 'Kansas City', '2026-06-25T23:00:00Z'],
    // ── Grupo G ──
    ['G', 1, 'BEL', 'EGY', 'Seattle', '2026-06-15T22:00:00Z'],
    ['G', 1, 'IRN', 'NZL', 'Inglewood', '2026-06-16T04:00:00Z'],
    ['G', 2, 'BEL', 'IRN', 'Inglewood', '2026-06-21T19:00:00Z'],
    ['G', 2, 'NZL', 'EGY', 'Vancouver', '2026-06-22T01:00:00Z'],
    ['G', 3, 'EGY', 'IRN', 'Seattle', '2026-06-27T03:00:00Z'],
    ['G', 3, 'NZL', 'BEL', 'Vancouver', '2026-06-27T03:00:00Z'],
    // ── Grupo H ──
    ['H', 1, 'ESP', 'CPV', 'Atlanta', '2026-06-15T17:00:00Z'],
    ['H', 1, 'KSA', 'URU', 'Miami Gardens', '2026-06-15T22:00:00Z'],
    ['H', 2, 'ESP', 'KSA', 'Atlanta', '2026-06-21T16:00:00Z'],
    ['H', 2, 'URU', 'CPV', 'Miami Gardens', '2026-06-21T22:00:00Z'],
    ['H', 3, 'CPV', 'KSA', 'Houston', '2026-06-27T00:00:00Z'],
    ['H', 3, 'URU', 'ESP', 'Zapopan', '2026-06-27T00:00:00Z'],
    // ── Grupo I ──
    ['I', 1, 'FRA', 'SEN', 'East Rutherford', '2026-06-16T19:00:00Z'],
    ['I', 1, 'IRQ', 'NOR', 'Foxborough', '2026-06-16T22:00:00Z'],
    ['I', 2, 'FRA', 'IRQ', 'Philadelphia', '2026-06-22T21:00:00Z'],
    ['I', 2, 'NOR', 'SEN', 'East Rutherford', '2026-06-23T00:00:00Z'],
    ['I', 3, 'NOR', 'FRA', 'Foxborough', '2026-06-26T19:00:00Z'],
    ['I', 3, 'SEN', 'IRQ', 'Toronto', '2026-06-26T19:00:00Z'],
    // ── Grupo J ──
    ['J', 1, 'ARG', 'ALG', 'Kansas City', '2026-06-17T01:00:00Z'],
    ['J', 1, 'AUT', 'JOR', 'Santa Clara', '2026-06-17T04:00:00Z'],
    ['J', 2, 'ARG', 'AUT', 'Arlington', '2026-06-22T17:00:00Z'],
    ['J', 2, 'JOR', 'ALG', 'Santa Clara', '2026-06-23T03:00:00Z'],
    ['J', 3, 'ALG', 'AUT', 'Kansas City', '2026-06-28T02:00:00Z'],
    ['J', 3, 'JOR', 'ARG', 'Arlington', '2026-06-28T02:00:00Z'],
    // ── Grupo K ──
    ['K', 1, 'POR', 'COD', 'Houston', '2026-06-17T17:00:00Z'],
    ['K', 1, 'UZB', 'COL', 'Mexico City', '2026-06-18T02:00:00Z'],
    ['K', 2, 'POR', 'UZB', 'Houston', '2026-06-23T17:00:00Z'],
    ['K', 2, 'COL', 'COD', 'Zapopan', '2026-06-24T02:00:00Z'],
    ['K', 3, 'COL', 'POR', 'Miami Gardens', '2026-06-27T23:30:00Z'],
    ['K', 3, 'COD', 'UZB', 'Atlanta', '2026-06-27T23:30:00Z'],
    // ── Grupo L ──
    ['L', 1, 'ENG', 'CRO', 'Arlington', '2026-06-17T20:00:00Z'],
    ['L', 1, 'GHA', 'PAN', 'Toronto', '2026-06-17T23:00:00Z'],
    ['L', 2, 'ENG', 'GHA', 'Foxborough', '2026-06-23T20:00:00Z'],
    ['L', 2, 'PAN', 'CRO', 'Toronto', '2026-06-23T23:00:00Z'],
    ['L', 3, 'PAN', 'ENG', 'East Rutherford', '2026-06-27T21:00:00Z'],
    ['L', 3, 'CRO', 'GHA', 'Philadelphia', '2026-06-27T21:00:00Z'],
];

/**
 * Los 72 partidos de la fase de grupos, normalizados.
 */
export function buildGroupFixtures() {
    return GROUP_FIXTURES_RAW.map(([group, matchday, home_code, away_code, city, kickoff_utc, hs, as]) => {
        const played = hs !== undefined && as !== undefined;
        return {
            stage: 'group', group, matchday,
            home_code, away_code,
            kickoff_utc,
            venue_name: venueNameOf(city),
            status: played ? 'finished' : 'scheduled',
            home_score: played ? hs : null,
            away_score: played ? as : null,
        };
    });
}

// Fase final: [stage, slot, homePlaceholder, awayPlaceholder, city, kickoff_utc]
const KNOCKOUT_RAW = [
    // Dieciseisavos (Round of 32) — cruces oficiales por posición de grupo.
    ['round_of_32', 'R32-1', '2A', '2B', 'Inglewood', '2026-06-28T23:00:00Z'],
    ['round_of_32', 'R32-2', '1C', '2F', 'Houston', '2026-06-29T20:00:00Z'],
    ['round_of_32', 'R32-3', '1E', '3 A/B/C/D/F', 'Foxborough', '2026-06-29T23:00:00Z'],
    ['round_of_32', 'R32-4', '1F', '2C', 'Guadalupe', '2026-06-30T01:00:00Z'],
    ['round_of_32', 'R32-5', '2E', '2I', 'Arlington', '2026-06-30T20:00:00Z'],
    ['round_of_32', 'R32-6', '1I', '3 C/D/F/G/H', 'East Rutherford', '2026-06-30T23:00:00Z'],
    ['round_of_32', 'R32-7', '1A', '3 C/E/F/H/I', 'Mexico City', '2026-07-01T01:00:00Z'],
    ['round_of_32', 'R32-8', '1L', '3 E/H/I/J/K', 'Atlanta', '2026-07-01T20:00:00Z'],
    ['round_of_32', 'R32-9', '1G', '3 A/E/H/I/J', 'Seattle', '2026-07-01T23:00:00Z'],
    ['round_of_32', 'R32-10', '1D', '3 B/E/F/I/J', 'Santa Clara', '2026-07-02T01:00:00Z'],
    ['round_of_32', 'R32-11', '1H', '2J', 'Inglewood', '2026-07-02T20:00:00Z'],
    ['round_of_32', 'R32-12', '2K', '2L', 'Toronto', '2026-07-02T23:00:00Z'],
    ['round_of_32', 'R32-13', '1B', '3 E/F/G/I/J', 'Vancouver', '2026-07-03T01:00:00Z'],
    ['round_of_32', 'R32-14', '2D', '2G', 'Arlington', '2026-07-03T20:00:00Z'],
    ['round_of_32', 'R32-15', '1J', '2H', 'Miami Gardens', '2026-07-03T23:00:00Z'],
    ['round_of_32', 'R32-16', '1K', '3 D/E/I/J/L', 'Kansas City', '2026-07-04T01:00:00Z'],
    // Octavos (Round of 16) — ganadores de R32, emparejados en orden.
    ['round_of_16', 'R16-1', 'W:R32-1', 'W:R32-2', 'Houston', '2026-07-04T20:00:00Z'],
    ['round_of_16', 'R16-2', 'W:R32-3', 'W:R32-4', 'Philadelphia', '2026-07-04T23:00:00Z'],
    ['round_of_16', 'R16-3', 'W:R32-5', 'W:R32-6', 'East Rutherford', '2026-07-05T20:00:00Z'],
    ['round_of_16', 'R16-4', 'W:R32-7', 'W:R32-8', 'Mexico City', '2026-07-05T23:00:00Z'],
    ['round_of_16', 'R16-5', 'W:R32-9', 'W:R32-10', 'Arlington', '2026-07-06T20:00:00Z'],
    ['round_of_16', 'R16-6', 'W:R32-11', 'W:R32-12', 'Seattle', '2026-07-06T23:00:00Z'],
    ['round_of_16', 'R16-7', 'W:R32-13', 'W:R32-14', 'Atlanta', '2026-07-07T20:00:00Z'],
    ['round_of_16', 'R16-8', 'W:R32-15', 'W:R32-16', 'Vancouver', '2026-07-07T23:00:00Z'],
    // Cuartos
    ['quarter_final', 'QF-1', 'W:R16-1', 'W:R16-2', 'Foxborough', '2026-07-09T23:00:00Z'],
    ['quarter_final', 'QF-2', 'W:R16-3', 'W:R16-4', 'Inglewood', '2026-07-10T23:00:00Z'],
    ['quarter_final', 'QF-3', 'W:R16-5', 'W:R16-6', 'Miami Gardens', '2026-07-11T20:00:00Z'],
    ['quarter_final', 'QF-4', 'W:R16-7', 'W:R16-8', 'Kansas City', '2026-07-11T23:00:00Z'],
    // Semifinales
    ['semi_final', 'SF-1', 'W:QF-1', 'W:QF-2', 'Arlington', '2026-07-14T23:00:00Z'],
    ['semi_final', 'SF-2', 'W:QF-3', 'W:QF-4', 'Atlanta', '2026-07-15T23:00:00Z'],
    // Tercer puesto
    ['third_place', '3P', 'L:SF-1', 'L:SF-2', 'Miami Gardens', '2026-07-18T20:00:00Z'],
    // Final
    ['final', 'F', 'W:SF-1', 'W:SF-2', 'East Rutherford', '2026-07-19T19:00:00Z'],
];

/**
 * Esqueleto de la fase final (32 partidos) con fechas y sedes reales.
 */
export function buildKnockoutSkeleton() {
    return KNOCKOUT_RAW.map(([stage, bracket_slot, home_placeholder, away_placeholder, city, kickoff_utc]) => ({
        stage, bracket_slot, home_placeholder, away_placeholder,
        kickoff_utc, venue_name: venueNameOf(city),
    }));
}

export { RAW_TEAMS, HOSTS, GROUP_LETTERS };
