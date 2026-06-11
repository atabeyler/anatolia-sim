/**
 * landMask.js — Approximate land/water detection using simplified polygons.
 *
 * Approach:
 *  1. If a point is not within any continent bounding box → open ocean → water.
 *  2. If it IS in a land box, check known water-body polygons. Any match → water.
 *  3. Otherwise → land.
 *
 * Polygons are approximate (not satellite-accurate) but prevent individuals
 * from walking across the Black Sea, Mediterranean, Red Sea, etc.
 * Coordinates are [longitude, latitude] pairs.
 *
 * Design notes:
 * - The Black Sea polygon conservatively starts at 41.5°N to avoid misclassifying
 *   Istanbul (41.0°N) and the Bosphorus strait as water.
 * - The Sea of Marmara is intentionally not modeled — it is a narrow body and
 *   the Bosphorus was historically crossable; blocking it creates more
 *   classification errors than it prevents.
 * - Polygon vertices avoid integer or .0 latitudes to prevent ray-casting
 *   edge cases where a test point sits exactly on a polygon edge.
 */

// ── Ray-casting point-in-polygon ──────────────────────────────────────────────
function pip(lon, lat, ring) {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Water-body polygons [lon, lat] ────────────────────────────────────────────

// Black Sea + Sea of Azov
// Conservative: polygon stays ≥ 41.5°N so Istanbul (41.0°N) is not caught.
// The narrow southern strip (41.0–41.5°N near Turkey) is left unmodeled;
// individuals won't be able to traverse the main body of the sea.
const BLACK_SEA = [
  [28.3, 43.2],  [28.1, 44.3],  [28.6, 45.8],
  [30.1, 46.6],  [31.6, 46.6],
  // Sea of Azov
  [33.6, 46.6],  [33.6, 47.3],  [35.1, 47.3],  [36.6, 46.6],
  // Kerch and Russian coast
  [37.6, 45.3],  [38.6, 44.4],  [40.1, 43.4],  [41.6, 43.1],
  [41.8, 42.4],  [41.6, 41.8],  [40.6, 41.6],
  // Turkish coast at 41.5° min — does NOT dip to Istanbul level
  [38.6, 41.5],  [35.6, 41.5],  [33.1, 41.5],  [31.1, 41.6],
  [29.6, 42.3],  [28.8, 42.9],  [28.3, 43.2],
];

// Caspian Sea
const CASPIAN = [
  [49.6, 37.4],  [51.1, 36.9],  [52.6, 37.1],  [54.1, 37.6],
  [54.6, 40.3],  [53.6, 42.1],  [52.6, 45.4],  [51.1, 47.4],
  [50.1, 47.1],  [49.6, 44.9],  [49.1, 40.1],  [49.6, 37.4],
];

// Persian Gulf
const PERSIAN_GULF = [
  [48.1, 24.3],  [52.1, 23.6],  [56.6, 23.6],  [57.6, 25.3],
  [57.1, 27.1],  [56.6, 26.6],  [55.6, 25.6],  [54.1, 24.6],
  [52.1, 26.6],  [50.6, 29.1],  [48.6, 29.6],  [48.1, 24.3],
];

// Gulf of Oman
const GULF_OF_OMAN = [
  [56.6, 22.6],  [61.6, 22.1],  [63.6, 23.6],  [64.6, 24.6],
  [63.1, 25.6],  [60.1, 25.1],  [57.6, 25.3],  [56.6, 22.6],
];

// Red Sea — single non-self-intersecting polygon tracing both coasts
// East coast (Saudi/Yemen) going south, west coast (Egypt/Eritrea) going north.
const RED_SEA = [
  // North end (Gulf of Suez/Aqaba)
  [32.6, 29.3],  [35.1, 29.3],
  // East coast — Saudi Arabia going south
  [37.1, 27.9],  [37.6, 25.4],  [38.6, 23.4],  [39.6, 22.1],
  [41.1, 20.3],  [42.6, 18.4],  [43.6, 16.9],  [44.1, 14.9],
  [43.6, 11.9],
  // Bottom (Bab el-Mandeb) — across the strait
  [42.6, 11.4],  [40.1, 11.9],
  // West coast — Eritrea/Sudan/Egypt going north
  [39.6, 14.4],  [38.6, 17.9],  [37.6, 20.9],  [36.6, 23.4],
  [36.1, 25.4],  [35.6, 27.4],  [34.6, 28.9],
  // Close at north
  [32.6, 29.3],
];

// Gulf of Aden
const GULF_OF_ADEN = [
  [43.6, 11.1],  [51.1, 11.1],  [52.6, 12.4],  [51.6, 13.4],
  [49.1, 11.9],  [46.1, 11.4],  [43.6, 11.1],
];

// Arabian Sea (between Arabian Peninsula, Iran, Pakistan, India)
const ARABIAN_SEA = [
  [44.1, 11.4],  [52.1, 11.4],  [57.1, 11.9],  [63.1, 13.9],
  [67.1, 15.9],  [67.6, 21.9],  [65.1, 24.9],  [62.6, 22.4],
  [60.6, 20.4],  [58.1, 17.9],  [55.1, 13.9],  [52.1, 11.4],
  [44.1, 11.4],
];

// Indian Ocean (NW patch — between Africa, Arabia, India)
const INDIAN_OCEAN_NW = [
  [40.1, -11.9],  [80.1, -11.9],  [80.1,  7.9],
  [78.1,  7.9],   [72.1,  2.9],   [65.1, -4.9],
  [55.1, -9.9],   [45.1, -11.9],  [40.1, -11.9],
];

// Bay of Bengal
const BAY_OF_BENGAL = [
  [80.1, 7.9],  [100.1, 7.9],  [100.1, 22.9],
  [97.1, 21.9], [94.1, 17.9],  [90.1, 10.9],
  [82.1, 5.9],  [80.1,  7.9],
];

// Mediterranean — split into sub-basins for accuracy

// Western Mediterranean (Gibraltar → Strait of Sicily, Ligurian Sea)
const MED_WEST = [
  [-5.4, 35.9],  [0.1, 37.4],   [5.1, 36.9],   [8.1, 36.9],
  [10.6, 37.4],  [12.6, 37.4],  [14.6, 36.9],  [15.6, 36.9],
  [15.6, 38.4],  [13.1, 38.4],  [11.1, 37.9],  [9.6, 38.4],
  [8.6, 39.4],   [9.1, 40.9],   [9.6, 41.4],   [8.6, 41.9],
  [7.6, 43.4],   [5.1, 43.4],   [3.1, 43.4],   [1.6, 42.9],
  [0.1, 42.4],   [-1.9, 41.4],  [-5.4, 37.4],  [-5.4, 35.9],
];

// Adriatic Sea
const ADRIATIC = [
  [12.6, 37.9],  [15.6, 38.4],  [18.6, 39.9],  [20.1, 40.9],
  [20.1, 42.4],  [19.1, 43.9],  [17.6, 45.4],  [16.1, 45.4],
  [14.6, 44.9],  [13.6, 45.4],  [13.1, 44.4],  [13.6, 43.4],
  [14.6, 42.4],  [15.6, 41.4],  [15.1, 40.4],  [13.6, 39.9],
  [12.6, 37.9],
];

// Ionian + Central Mediterranean (between Italy's boot, Greece, Libya)
const MED_CENTRAL = [
  [11.1, 35.4],  [16.1, 35.4],  [20.1, 35.4],  [22.1, 35.4],
  [22.1, 37.9],  [21.6, 38.4],  [20.6, 37.9],  [19.6, 38.9],
  [18.6, 40.4],  [16.6, 39.9],  [15.6, 38.4],  [13.6, 38.4],
  [13.1, 37.4],  [11.6, 37.4],  [11.1, 35.4],
];

// Aegean Sea
const AEGEAN = [
  [21.6, 35.9],  [22.6, 35.4],  [24.1, 35.4],  [26.6, 36.4],
  [28.1, 36.4],  [28.6, 37.4],  [28.1, 38.4],  [27.1, 39.4],
  [26.6, 40.4],  [26.1, 40.9],  [24.6, 40.4],  [23.6, 39.4],
  [22.1, 37.9],  [21.6, 37.4],  [21.6, 35.9],
];

// Eastern Mediterranean (Turkey south coast → Egypt)
const MED_EAST = [
  [26.1, 35.4],  [28.1, 36.4],  [30.1, 35.9],  [32.1, 34.9],
  [34.6, 34.4],  [36.6, 34.9],  [37.1, 36.4],  [36.6, 36.9],
  [34.1, 36.4],  [32.6, 34.4],  [30.1, 32.9],  [28.1, 30.9],
  [26.1, 30.9],  [25.1, 31.4],  [25.1, 33.9],  [26.1, 35.4],
];

// ── Continent bounding boxes [minLon, minLat, maxLon, maxLat] ─────────────────
// Points outside ALL boxes are open ocean → water.
const LAND_BBOXES = [
  [ -12,  35,   50,  72],  // Europe
  [  26,   5,  145,  75],  // North/Central/East Asia
  [  26,   0,   80,  40],  // Middle East & Arabia (overlap ok)
  [  68,  -5,   97,  37],  // South Asia (India subcontinent)
  [  97,  -5,  145,  28],  // SE Asia
  [ -18, -35,   52,  38],  // Africa
  [-170,   7,  -52,  83],  // North America
  [ -82, -56,  -34,  13],  // South America
  [ 113, -44,  154, -10],  // Australia
  [ -58,  59,  -17,  84],  // Greenland
  [  43, -26,   51, -12],  // Madagascar
  [ -25,  63,  -13,  67],  // Iceland
  [ 129,  30,  146,  46],  // Japan
];

const WATER_POLYGONS = [
  BLACK_SEA, CASPIAN,
  PERSIAN_GULF, GULF_OF_OMAN,
  RED_SEA, GULF_OF_ADEN, ARABIAN_SEA,
  INDIAN_OCEAN_NW, BAY_OF_BENGAL,
  MED_WEST, ADRIATIC, MED_CENTRAL, AEGEAN, MED_EAST,
];

// ── Public API ────────────────────────────────────────────────────────────────

export function isOnLand(lat, lon) {
  if (lat < -60 || lat > 84) return false;

  const inBox = LAND_BBOXES.some(
    ([x0, y0, x1, y1]) => lon >= x0 && lon <= x1 && lat >= y0 && lat <= y1
  );
  if (!inBox) return false;

  for (const poly of WATER_POLYGONS) {
    if (pip(lon, lat, poly)) return false;
  }

  return true;
}
