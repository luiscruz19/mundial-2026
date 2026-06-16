/**
 * Mapeo de nombres de selección (como vienen en el dataset internacional, en inglés)
 * a su código FIFA de 3 letras. Lo usan el cálculo de Elo y la ingesta de historial
 * real (forma / head-to-head) para enganchar el CSV con nuestras 48 selecciones.
 *
 * El dataset de referencia (resultados internacionales) usa nombres en inglés
 * ("United States", "South Korea", "Ivory Coast"...). Acá normalizamos y resolvemos
 * variantes habituales (con/sin acentos, alias FIFA).
 */

// Código FIFA -> nombre canónico del dataset (verificado contra el dataset real).
export const CODE_TO_DATASET = {
    MEX: 'Mexico', RSA: 'South Africa', KOR: 'South Korea', CZE: 'Czech Republic',
    CAN: 'Canada', BIH: 'Bosnia and Herzegovina', QAT: 'Qatar', SUI: 'Switzerland',
    BRA: 'Brazil', MAR: 'Morocco', HAI: 'Haiti', SCO: 'Scotland',
    USA: 'United States', PAR: 'Paraguay', AUS: 'Australia', TUR: 'Turkey',
    GER: 'Germany', CUW: 'Curaçao', CIV: 'Ivory Coast', ECU: 'Ecuador',
    NED: 'Netherlands', JPN: 'Japan', SWE: 'Sweden', TUN: 'Tunisia',
    BEL: 'Belgium', EGY: 'Egypt', IRN: 'Iran', NZL: 'New Zealand',
    ESP: 'Spain', CPV: 'Cape Verde', KSA: 'Saudi Arabia', URU: 'Uruguay',
    FRA: 'France', SEN: 'Senegal', IRQ: 'Iraq', NOR: 'Norway',
    ARG: 'Argentina', ALG: 'Algeria', AUT: 'Austria', JOR: 'Jordan',
    POR: 'Portugal', COD: 'DR Congo', UZB: 'Uzbekistan', COL: 'Colombia',
    ENG: 'England', CRO: 'Croatia', GHA: 'Ghana', PAN: 'Panama',
};

// Variantes adicionales aceptadas -> código (acentos, alias, nombres alternativos).
const EXTRA_ALIASES = {
    'usa': 'USA', 'united states of america': 'USA',
    'korea republic': 'KOR', 'republic of korea': 'KOR',
    'czechia': 'CZE',
    'turkiye': 'TUR', 'türkiye': 'TUR',
    'cote divoire': "CIV", "côte d'ivoire": 'CIV', "cote d'ivoire": 'CIV',
    'cabo verde': 'CPV',
    'dr congo': 'COD', 'democratic republic of the congo': 'COD', 'congo dr': 'COD',
    'curacao': 'CUW',
    'ksa': 'KSA',
    'ir iran': 'IRN', 'iran islamic republic': 'IRN',
};

function normalize(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // sacar acentos
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Índice normalizado nombre -> código (canónicos + variantes).
const INDEX = new Map();
for (const [code, name] of Object.entries(CODE_TO_DATASET)) INDEX.set(normalize(name), code);
for (const [name, code] of Object.entries(EXTRA_ALIASES)) INDEX.set(normalize(name), code);

/**
 * Devuelve el código FIFA para un nombre del dataset, o null si no es una de las 48.
 * @param {string} name
 * @returns {string|null}
 */
export function nameToCode(name) {
    return INDEX.get(normalize(name)) || null;
}

export default { CODE_TO_DATASET, nameToCode };
