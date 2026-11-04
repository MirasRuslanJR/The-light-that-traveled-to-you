// Star catalogue: decodes the packed HYG data and answers the light-sphere questions.
import { STAR_DATA_B64, STAR_COUNT, STAR_FIELDS, STAR_NAMES, MAG_LIMIT, LN_DIST } from './data/stars.js?v=24';

const PC_PER_LY = 1 / 3.261563777;

function decode(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

/** B–V colour index → linear RGB, via effective temperature (Ballesteros 2012) and a blackbody fit. */
export function bvToRgb(bv) {
  const b = Math.max(-0.4, Math.min(2.0, bv));
  const t = 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
  const k = t / 100;
  let r, g, bl;
  if (k <= 66) { r = 255; g = 99.47 * Math.log(k) - 161.12; }
  else { r = 329.7 * Math.pow(k - 60, -0.1332); g = 288.12 * Math.pow(k - 60, -0.0755); }
  if (k >= 66) bl = 255; else if (k <= 19) bl = 0; else bl = 138.52 * Math.log(k - 10) - 305.04;
  const c = [r, g, bl].map((v) => Math.max(0, Math.min(255, v)) / 255);
  // The eye sees star colours paler than a blackbody swatch: keep most of the hue, normalised so colour never dims a star.
  const hue = c.map((v) => 0.3 + 0.7 * v);
  const mx = Math.max(...hue);
  return hue.map((v) => v / mx);
}

export function loadCatalog() {
  const raw = decode(STAR_DATA_B64);
  const n = STAR_COUNT;
  const pos = new Float32Array(n * 3);
  const absmag = new Float32Array(n);
  const mag = new Float32Array(n);
  const dist = new Float32Array(n);
  const color = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * STAR_FIELDS;
    const ux = raw[o] / 32767, uy = raw[o + 1] / 32767, uz = raw[o + 2] / 32767;
    const un = Math.hypot(ux, uy, uz);
    const d = Math.exp(LN_DIST[0] + (raw[o + 3] + 32768) / 65535 * (LN_DIST[1] - LN_DIST[0]));
    pos.set([ux / un * d, uy / un * d, uz / un * d], i * 3);
    absmag[i] = raw[o + 4] / 1000;
    dist[i] = d;
    mag[i] = absmag[i] + 5 * Math.log10(d * PC_PER_LY) - 5;
    color.set(bvToRgb(raw[o + 5] / 5000), i * 3);
  }
  const names = new Map(STAR_NAMES.map(([i, name, con, en, conEn]) => [i, { name, con, en, conEn }]));

  // Naked-eye stars ordered by distance, for "how far has the light got" queries.
  const visibleByDist = [];
  for (let i = 0; i < n; i++) if (mag[i] <= MAG_LIMIT && names.has(i)) visibleByDist.push(i);
  visibleByDist.sort((a, b) => dist[a] - dist[b]);
  const allByDist = Array.from({ length: n }, (_, i) => i).sort((a, b) => dist[a] - dist[b]);

  const countWithin = (sorted, r) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (dist[sorted[mid]] <= r) lo = mid + 1; else hi = mid; }
    return lo;
  };

  return {
    n, pos, absmag, mag, dist, color, names, magLimit: MAG_LIMIT,
    /** Stars the light of a moment has reached after travelling r light-years. */
    reached(r) {
      return { visible: countWithin(visibleByDist, r), all: countWithin(allByDist, r) };
    },
    /** The next naked-eye star the light will reach, plus the one it reached most recently. */
    frontier(r) {
      const k = countWithin(visibleByDist, r);
      return {
        next: visibleByDist[k] ?? null,
        last: k > 0 ? visibleByDist[k - 1] : null,
      };
    },
    /** Naked-eye stars the light has not reached yet, nearest first. */
    upcoming(r, count = 40) {
      const k = countWithin(visibleByDist, r);
      return visibleByDist.slice(k, k + count);
    },
    /** Naked-eye stars whose distance lies in (r0, r1]: the ones a growing light front just touched. */
    between(r0, r1) {
      const a = countWithin(visibleByDist, r0), b = countWithin(visibleByDist, r1);
      return visibleByDist.slice(a, b);
    },
    /** Declination (J2000) in degrees. */
    dec(i) { return Math.asin(pos[i * 3 + 2] / dist[i]) * 180 / Math.PI; },
    /** Star name in 'ru' or 'en'. */
    /** A real name (traditional or Bayer/Flamsteed), not just a catalogue number. */
    isNamed(i) { const e = names.get(i); return !!e && !/^HIP /.test(e.name); },
    label(i, lang = 'ru') {
      const e = names.get(i);
      if (!e) return lang === 'en' ? `Star #${i}` : `Звезда №${i}`;
      return lang === 'en' ? e.en : e.name;
    },
    /** Constellation: Russian genitive ("Лиры") or English nominative ("Lyra"). */
    constellation(i, lang = 'ru') { const e = names.get(i); return e ? (lang === 'en' ? e.conEn : e.con) : ''; },
  };
}
