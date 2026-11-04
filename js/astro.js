// Astronomy core. Pure functions, no DOM: the same file runs in the browser and in tools/test-astro.mjs.
// Formulas: Jean Meeus, "Astronomical Algorithms", 2nd ed. (chapters noted per function).

export const DEG = Math.PI / 180;
export const LY_PER_YEAR = 1;            // light covers one light-year per Julian year, by definition
export const DAYS_PER_YEAR = 365.25;     // Julian year, the one the light-year is defined with
const J2000 = 2451545.0;

const norm360 = (d) => ((d % 360) + 360) % 360;

/** Julian Day from a JS timestamp (ms since 1970-01-01 UTC). */
export function julianDay(ms) {
  return ms / 86400000 + 2440587.5;
}

/** Greenwich mean sidereal time in degrees (Meeus 12.4). */
export function gmstDeg(jd) {
  const T = (jd - J2000) / 36525;
  return norm360(280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * T * T - (T * T * T) / 38710000);
}

/**
 * Rotation matrix taking J2000 equatorial vectors to the mean equator and equinox of date
 * (IAU 1976 precession, Meeus 21.2–21.4). Row-major 3x3 as a flat array.
 */
export function precessionMatrix(jd) {
  const T = (jd - J2000) / 36525;
  const as = DEG / 3600;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * as;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * as;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * as;
  const cz = Math.cos(zeta), sz = Math.sin(zeta);
  const cZ = Math.cos(z), sZ = Math.sin(z);
  const ct = Math.cos(theta), st = Math.sin(theta);
  return [
    cz * ct * cZ - sz * sZ, -sz * ct * cZ - cz * sZ, -st * cZ,
    cz * ct * sZ + sz * cZ, -sz * ct * sZ + cz * cZ, -st * sZ,
    cz * st, -sz * st, ct,
  ];
}

export function mulMat3Vec(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function radecToVec(raDeg, decDeg) {
  const a = raDeg * DEG, d = decDeg * DEG;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

export function vecToRadec(v) {
  const r = Math.hypot(v[0], v[1], v[2]);
  return { ra: norm360(Math.atan2(v[1], v[0]) / DEG), dec: Math.asin(v[2] / r) / DEG };
}

/**
 * Local horizon basis expressed in the equatorial frame of date.
 * Returns unit vectors east, north, zenith. lonDeg is east-positive.
 */
export function horizonBasis(jd, latDeg, lonDeg) {
  const lst = (gmstDeg(jd) + lonDeg) * DEG;
  const phi = latDeg * DEG;
  const cl = Math.cos(lst), sl = Math.sin(lst), cp = Math.cos(phi), sp = Math.sin(phi);
  return {
    east: [-sl, cl, 0],
    north: [-sp * cl, -sp * sl, cp],
    zenith: [cp * cl, cp * sl, sp],
  };
}

/** Altitude and azimuth (from north through east), degrees, for an equatorial-of-date vector. */
export function altAz(vDate, basis) {
  const r = Math.hypot(vDate[0], vDate[1], vDate[2]);
  const z = (vDate[0] * basis.zenith[0] + vDate[1] * basis.zenith[1] + vDate[2] * basis.zenith[2]) / r;
  const e = vDate[0] * basis.east[0] + vDate[1] * basis.east[1] + vDate[2] * basis.east[2];
  const n = vDate[0] * basis.north[0] + vDate[1] * basis.north[1] + vDate[2] * basis.north[2];
  return { alt: Math.asin(Math.max(-1, Math.min(1, z))) / DEG, az: norm360(Math.atan2(e, n) / DEG) };
}

/** Atmospheric refraction in degrees for a true altitude (Saemundsson, Meeus 16.4). */
export function refractionDeg(altDeg) {
  if (altDeg < -2) return 0;
  const h = Math.max(altDeg, -1.9);
  return 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG) / 60;
}

/** Mean obliquity of the ecliptic, degrees (Meeus 22.2). */
export function obliquityDeg(jd) {
  const T = (jd - J2000) / 36525;
  return 23.439291111 - 0.0130041667 * T - 1.6389e-7 * T * T + 5.0361e-7 * T * T * T;
}

function eclipticToEquatorial(lamDeg, betaDeg, jd) {
  const e = obliquityDeg(jd) * DEG, l = lamDeg * DEG, b = betaDeg * DEG;
  return [
    Math.cos(b) * Math.cos(l),
    Math.cos(e) * Math.cos(b) * Math.sin(l) - Math.sin(e) * Math.sin(b),
    Math.sin(e) * Math.cos(b) * Math.sin(l) + Math.cos(e) * Math.sin(b),
  ];
}

/** Sun: geometric ecliptic longitude of date, degrees, accurate to ~0.01° (Meeus ch. 25). */
export function sunLongitude(jd) {
  const T = (jd - J2000) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return norm360(L0 + C);
}

/** Sun direction as an equatorial-of-date unit vector. */
export function sunVector(jd) {
  return eclipticToEquatorial(sunLongitude(jd), 0, jd);
}

// Moon, Meeus ch. 47: the largest periodic terms (all terms above 0.01° in longitude and latitude).
// Truncation error stays below ~0.05°, a tenth of the Moon's own diameter.
const MOON_LON = [ // D, M, M', F, coefficient (1e-6 deg)
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110],
];
const MOON_LAT = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107],
];

/** Moon geocentric ecliptic longitude/latitude of date (degrees). */
export function moonEcliptic(jd) {
  const T = (jd - J2000) / 36525;
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841);
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868) * DEG;
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * DEG;
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699) * DEG;
  const F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) * DEG;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const A1 = norm360(119.75 + 131.849 * T) * DEG;
  const A2 = norm360(53.09 + 479264.290 * T) * DEG;
  const A3 = norm360(313.45 + 481266.484 * T) * DEG;
  let sl = 0, sb = 0;
  for (const [d, m, mp, f, c] of MOON_LON) {
    const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sl += c * e * Math.sin(d * D + m * M + mp * Mp + f * F);
  }
  for (const [d, m, mp, f, c] of MOON_LAT) {
    const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sb += c * e * Math.sin(d * D + m * M + mp * Mp + f * F);
  }
  sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp * DEG - F) + 318 * Math.sin(A2);
  sb += -2235 * Math.sin(Lp * DEG) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - F)
    + 175 * Math.sin(A1 + F) + 127 * Math.sin(Lp * DEG - Mp) - 115 * Math.sin(Lp * DEG + Mp);
  return { lon: norm360(Lp + sl / 1e6), lat: sb / 1e6 };
}

export function moonVector(jd) {
  const { lon, lat } = moonEcliptic(jd);
  return eclipticToEquatorial(lon, lat, jd);
}

/**
 * Moon phase. fraction: illuminated part 0..1. waxing: true between new and full.
 * Uses the Sun–Moon elongation (Meeus 48.2 simplified; error < 0.01 in fraction).
 */
export function moonPhase(jd) {
  const s = sunVector(jd), m = moonVector(jd);
  const cosPsi = s[0] * m[0] + s[1] * m[1] + s[2] * m[2];
  const fraction = (1 - cosPsi) / 2;
  const dLon = norm360(moonEcliptic(jd).lon - sunLongitude(jd));
  return { fraction, waxing: dLon < 180, ageDeg: dLon };
}

/** Convert a wall-clock time in an IANA time zone to a UTC timestamp, honouring historical offsets. */
export function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  const offsetAt = (ms) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return asUtc - Math.floor(ms / 1000) * 1000;
  };
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const first = wall - offsetAt(wall);
  const second = wall - offsetAt(first);
  if (second === first) return first;
  // The first guess crossed a clock change. If the second guess reads back as the same wall time, it is the answer.
  if (wall - offsetAt(second) === second) return second;
  // Neither reads back: the wall time falls in a spring-forward gap and never existed. Move it forward, as clocks did.
  return Math.max(first, second);
}

/** Years (Julian) between two timestamps: the radius of the light sphere in light-years. */
export function lightYearsBetween(fromMs, toMs) {
  return (toMs - fromMs) / 86400000 / DAYS_PER_YEAR;
}

/** Timestamp at which light emitted at birthMs reaches a star distLy away. */
export function arrivalMs(birthMs, distLy) {
  return birthMs + distLy * DAYS_PER_YEAR * 86400000;
}

// Planets: Keplerian elements and rates valid 1800–2050 (E. M. Standish, JPL, "Keplerian Elements for
// Approximate Positions of the Major Planets"). [a AU, e, I°, L°, long.peri°, long.node°] and per-century rates.
const PLANET_ELEMENTS = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus: [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  mars: [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
};
const EPS_J2000 = 23.43928 * DEG;

/** Heliocentric position, J2000 equatorial, AU. */
function heliocentric(name, jd) {
  const [el, rate] = PLANET_ELEMENTS[name];
  const T = (jd - J2000) / 36525;
  const [a, e, I, L, wbar, node] = el.map((v, i) => v + rate[i] * T);
  const w = (wbar - node) * DEG, O = node * DEG, inc = I * DEG;
  let M = ((L - wbar) % 360 + 540) % 360 - 180;
  M *= DEG;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(inc), sI = Math.sin(inc);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z = (sw * sI) * xp + (cw * sI) * yp;
  return [x, Math.cos(EPS_J2000) * y - Math.sin(EPS_J2000) * z, Math.sin(EPS_J2000) * y + Math.cos(EPS_J2000) * z];
}

const MAG = { // Meeus 41, simplified: base + 5 log(r·Δ) + phase terms
  mercury: (i) => -0.42 + 0.0380 * i - 0.000273 * i * i + 0.000002 * i * i * i,
  venus: (i) => -4.40 + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i * i * i,
  mars: (i) => -1.52 + 0.016 * i,
  jupiter: (i) => -9.40 + 0.005 * i,
  saturn: (i, B) => -8.68 - 2.60 * Math.abs(Math.sin(B)) + 1.25 * Math.sin(B) ** 2,   // Meeus 41: the rings add light
};

/**
 * Tilt B of Saturn's rings toward Earth, radians (Meeus 45), from Saturn's geocentric J2000 equatorial vector.
 * The ring-plane node is taken in the J2000 frame, so it stays fixed; precession would move both together.
 */
export function saturnRingTilt(g, jd) {
  const T = (jd - J2000) / 36525;
  const y = Math.cos(EPS_J2000) * g[1] + Math.sin(EPS_J2000) * g[2];
  const z = -Math.sin(EPS_J2000) * g[1] + Math.cos(EPS_J2000) * g[2];
  const r = Math.hypot(g[0], y, z);
  const lam = Math.atan2(y, g[0]), beta = Math.asin(z / r);
  const inc = (28.075216 - 0.012998 * T) * DEG, node = 169.50847 * DEG;
  return Math.asin(Math.sin(inc) * Math.cos(beta) * Math.sin(lam - node) - Math.cos(inc) * Math.sin(beta));
}

/** Geocentric planets: direction (J2000 equatorial unit vector, light-time corrected) and magnitude. */
export function planets(jd) {
  const earth = heliocentric('earth', jd);
  const R = Math.hypot(...earth);
  return ['mercury', 'venus', 'mars', 'jupiter', 'saturn'].map((name) => {
    let p = heliocentric(name, jd);
    let g = [p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]];
    const delta0 = Math.hypot(...g);
    p = heliocentric(name, jd - 0.0057755183 * delta0);   // light-time
    g = [p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]];
    const delta = Math.hypot(...g), r = Math.hypot(...p);
    const cosI = (r * r + delta * delta - R * R) / (2 * r * delta);
    const i = Math.acos(Math.max(-1, Math.min(1, cosI))) / DEG;
    const B = name === 'saturn' ? saturnRingTilt(g, jd) : 0;
    return { name, dir: [g[0] / delta, g[1] / delta, g[2] / delta], mag: MAG[name](i, B) + 5 * Math.log10(r * delta), delta };
  });
}
