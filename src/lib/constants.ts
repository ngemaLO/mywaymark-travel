// ── Globe / Map ────────────────────────────────────────────────────────────────
export const GLOBE_SIZE = 500;
export const GLOBE_SCALE = 240;
export const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
export const FLAG_CDN_BASE_URL = 'https://flagcdn.com/w160/';
export const GLOBE_FLAG_FALLBACK_COLOR = '#555';

// Compare-globe player colors
export const COMPARE_COLOR_BOTH   = '#10B981'; // emerald — visited together
export const COMPARE_COLOR_MINE   = '#F97316'; // amber   — only you
export const COMPARE_COLOR_THEIRS = '#818CF8'; // indigo  — only them

// ── Pagination / Feed ──────────────────────────────────────────────────────────
export const PAGE_SIZE           = 30;
export const FEED_ITEM_LIMIT     = 50;
export const SEARCH_RESULTS_LIMIT = 10;

// ── Feature limits ─────────────────────────────────────────────────────────────
export const FREE_CHAPTER_LIMIT    = 2;
export const CITIES_DISPLAY_LIMIT  = 6;
export const IMAGES_DISPLAY_LIMIT  = 3;
export const VISIT_YEARS_SPAN      = 51; // current year + 50 years back

// ── Field length limits ────────────────────────────────────────────────────────
export const NOTE_MAX_LENGTH                = 500;
export const CHAPTER_NAME_MAX_LENGTH        = 100;
export const CHAPTER_DESCRIPTION_MAX_LENGTH = 240;

// ── External APIs ──────────────────────────────────────────────────────────────
export const GEO_API_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

// ── UI feedback ────────────────────────────────────────────────────────────────
export const COPY_FEEDBACK_MS = 2000;

// ── Password strength thresholds (fraction of requirements met) ────────────────
export const STRENGTH_VERY_WEAK = 0.2;
export const STRENGTH_WEAK      = 0.4;
export const STRENGTH_FAIR      = 0.6;
export const STRENGTH_GOOD      = 0.8;
