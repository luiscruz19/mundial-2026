import dotenv from 'dotenv';

dotenv.config();

const toNumber = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const CONFIG = {
    PORT: process.env.API_PORT || 80,
    NODE_ENV: process.env.NODE_ENV || 'development',

    DATABASE: {
        HOST: process.env.DB_HOST || 'localhost',
        USER: process.env.DB_USER || 'root',
        PASSWORD: process.env.DB_ROOT_PASSWORD || '',
        NAME: process.env.DB_NAME || 'mundial',
        PORT: process.env.DB_PORT || 3306,
        DIALECT: process.env.DB_DIALECT || 'mysql',
    },

    REDIS: {
        URL: process.env.REDIS_URL || 'redis://localhost:6379',
        // TTL del snapshot de datos por selección (segundos). Default 6h.
        TEAM_SNAPSHOT_TTL: toNumber(process.env.TEAM_SNAPSHOT_TTL_SECONDS, 6 * 3600),
    },

    // Secreto para disparar jobs/cron manualmente desde el endpoint admin.
    CRON_SECRET: process.env.CRON_SECRET || '',

    // ─── Proveedores de datos ───────────────────────────────────────────
    PROVIDERS: {
        // api-football | football-data
        DEFAULT: process.env.DATA_PROVIDER || 'api-football',
        API_FOOTBALL: {
            KEY: process.env.APIFOOTBALL_KEY || '',
            BASE_URL: process.env.APIFOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
            LEAGUE_ID: toNumber(process.env.APIFOOTBALL_LEAGUE_ID, 1),
            SEASON: toNumber(process.env.APIFOOTBALL_SEASON, 2026),
        },
        FOOTBALL_DATA: {
            KEY: process.env.FOOTBALLDATA_KEY || '',
            BASE_URL: process.env.FOOTBALLDATA_BASE_URL || 'https://api.football-data.org/v4',
            COMPETITION: process.env.FOOTBALLDATA_COMPETITION || 'WC',
        },
        // Dataset abierto de resultados internacionales (1872→hoy). Alimenta el Elo
        // (ancla del modelo) y la forma/H2H reales. Override por env si se quiere otro.
        HISTORY_CSV_URL: process.env.HISTORY_CSV_URL
            || 'https://raw.githubusercontent.com/martj42/international_results/master/results.csv',
        FIFA_RANKING_URL: process.env.FIFA_RANKING_URL || '',
    },

    // ─── Motor de simulación (parámetros calibrables) ───────────────────
    SIMULATION: {
        K: toNumber(process.env.SIM_K, 0.0025),
        // Ancla Elo: diferencia de goles esperada por punto de Elo. Recalibrado por
        // backtest walk-forward (log-loss) sobre los partidos del Mundial ya jugados:
        // 0.0050 hace el motor tan decisivo como su propio Elo (antes subvaluaba a los
        // favoritos en cruces disparejos).
        K_ELO: toNumber(process.env.SIM_K_ELO, 0.0050),
        // Cuánto pesa el ranking FIFA frente a la forma reciente (0..1).
        RANKING_WEIGHT: toNumber(process.env.SIM_RANKING_WEIGHT, 0.6),
        // Goles totales esperados base (backtest: 2.5 calibra un poco mejor que 2.6).
        TOTAL_GOALS: toNumber(process.env.SIM_TOTAL_GOALS, 2.5),
        RHO: toNumber(process.env.SIM_RHO, -0.06),
        FORM_HALFLIFE_DAYS: toNumber(process.env.SIM_FORM_HALFLIFE_DAYS, 240),
        HOME_ADVANTAGE: toNumber(process.env.SIM_HOME_ADVANTAGE, 0.25),
        FORM_MATCHES: toNumber(process.env.SIM_FORM_MATCHES, 12),
        // Peso de la forma por jerarquía de competición: el Mundial pesa más que un
        // amistoso o una eliminatoria vieja. Se aplica además del decaimiento temporal.
        FORM_COMPETITION_WEIGHTS: {
            world_cup: 1.6,      // fase final del Mundial (lo más relevante)
            continental: 1.2,    // finales continentales (Euro, Copa América, etc.)
            qualifier: 1.0,      // eliminatorias
            nations_league: 0.8,
            friendly: 0.5,
            default: 1.0,
        },
        MONTE_CARLO_RUNS: toNumber(process.env.SIM_MONTE_CARLO_RUNS, 10000),
        // Mínimo para las tasas de Poisson, para que nadie quede en 0.
        MIN_LAMBDA: 0.2,
        // Goles máximos a considerar en la matriz de marcadores.
        MAX_GOALS: 10,
        // Marcadores devueltos en el ranking. Alto para que el muestreo del cliente
        // ("Jugá el partido" / Monte Carlo) cubra ~99% de la masa y quede alineado
        // con win_prob (con top-10 quedaba sesgado hacia el favorito).
        SCORELINE_TOPN: toNumber(process.env.SIM_SCORELINE_TOPN, 40),
    },

    // ─── Capa en vivo ───────────────────────────────────────────────────
    LIVE: {
        ENABLED: process.env.LIVE_ENABLED !== 'false',
        POLL_SECONDS: toNumber(process.env.LIVE_POLL_SECONDS, 45),
        WINDOW_BEFORE_MIN: toNumber(process.env.LIVE_WINDOW_BEFORE_MIN, 10),
        WINDOW_AFTER_MIN: toNumber(process.env.LIVE_WINDOW_AFTER_MIN, 30),
    },

    // Países anfitriones 2026 (juegan de local). Códigos FIFA de 3 letras.
    HOST_NATIONS: ['USA', 'CAN', 'MEX'],
};

export default CONFIG;
