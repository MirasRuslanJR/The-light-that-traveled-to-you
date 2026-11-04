// Builds js/data/stars.js from the HYG v4.1 catalog (CC BY-SA 4.0, astronexus/HYG-Database).
// Usage: node tools/build-catalog.mjs path/to/hygdata_v41.csv
// Dev-only tool: the site itself never runs this file.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GREEK_RU, CONST_GEN_RU, PROPER_RU } from './names-ru.mjs';
import { GREEK_EN, CONST_EN } from './names-en.mjs';

const PC_TO_LY = 3.261563777;
const MAG_LIMIT = 6.5;      // naked-eye limit under a dark sky
const NEAR_LIMIT_LY = 100;  // keep every catalogued star this close, however faint
const NAME_LIMIT_LY = 130;  // stars that can be "the next star" need a readable name
const UNKNOWN_LY = 3000;    // naked-eye stars without a usable parallax: kept in the sky at a nominal, far distance
const PAIR_SEP = 30 / 3600 * Math.PI / 180;   // components closer than 30″ look like one star to the eye

const src = process.argv[2];
if (!src) { console.error('usage: node tools/build-catalog.mjs hygdata_v41.csv'); process.exit(1); }

// Minimal RFC-4180 CSV line parser (HYG quotes some fields).
function parseLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}

const lines = readFileSync(src, 'utf8').split(/\r?\n/);
const head = parseLine(lines[0]);
const col = Object.fromEntries(head.map((h, i) => [h, i]));

function ruName(r) {
  const proper = r[col.proper];
  if (proper && PROPER_RU[proper]) return PROPER_RU[proper];
  const con = CONST_GEN_RU[r[col.con]];
  const bayer = r[col.bayer];
  if (bayer && con) {
    const [letter, num] = bayer.split('-');
    const g = GREEK_RU[letter];
    if (g) return `${g}${num ? `-${num}` : ''} ${con}`;
  }
  const flam = r[col.flam];
  if (flam && con) return `${flam} ${con}`;
  if (proper) return proper;
  return catalogueId(r);
}

// Same rule as the Russian names, so switching language never swaps one star for a different-sounding one:
// a well-known traditional name, otherwise the Bayer/Flamsteed designation, otherwise the IAU name.
function enName(r) {
  const proper = r[col.proper];
  if (proper && PROPER_RU[proper]) return proper === 'Rigil Kentaurus' ? 'Alpha Centauri' : proper;
  const con = CONST_EN[r[col.con]];
  const bayer = r[col.bayer];
  if (bayer && con) {
    const [letter, num] = bayer.split('-');
    const g = GREEK_EN[letter];
    if (g) return `${g}${num ? `-${num}` : ''} ${con[1]}`;
  }
  const flam = r[col.flam];
  if (flam && con) return `${flam} ${con[1]}`;
  if (proper) return proper;
  return catalogueId(r);
}

// Catalogue number when a star has no name: Hipparcos, then Henry Draper, then Gliese.
function catalogueId(r) {
  if (r[col.hip]) return `HIP ${r[col.hip]}`;
  if (r[col.hd]) return `HD ${r[col.hd]}`;
  const gl = r[col.gl].trim().replace(/s+/g, ' ');
  return gl || null;
}

// Pass 1: every row with a magnitude and a direction.
const rows = new Map();
for (let li = 1; li < lines.length; li++) {
  if (!lines[li]) continue;
  const r = parseLine(lines[li]);
  if (r[col.proper] === 'Sol') continue;
  const mag = parseFloat(r[col.mag]);
  const x = parseFloat(r[col.x]), y = parseFloat(r[col.y]), z = parseFloat(r[col.z]);
  const len = Math.hypot(x, y, z);
  if (!Number.isFinite(mag) || !(len > 0)) continue;
  const distPc = parseFloat(r[col.dist]);
  const known = distPc > 0 && distPc < 100000;
  rows.set(r[col.id], { r, mag, u: [x / len, y / len, z / len], known, distLy: known ? distPc * PC_TO_LY : UNKNOWN_LY });
}

// Pass 2: multiple stars. HYG lists some components twice: Hipparcos measured the combined light of a close pair,
// and the Gliese catalogue adds the companion again (Capella, Castor B). Such a companion is dropped. Two
// Hipparcos components (Alpha Centauri A and B) are real separate measurements: their light is added together.
let dropped = 0, combined = 0;
for (const [id, s] of rows) {
  const pid = s.r[col.comp_primary];
  if (!pid || pid === id) continue;
  const p = rows.get(pid);
  if (!p || p.dropped) continue;
  const sep = Math.acos(Math.min(1, s.u[0] * p.u[0] + s.u[1] * p.u[1] + s.u[2] * p.u[2]));
  if (sep > PAIR_SEP || !(s.known && p.known) || Math.abs(s.distLy - p.distLy) > 0.15 * p.distLy) continue;
  if (s.r[col.hip] && p.r[col.hip]) {
    const prim = p.mag <= s.mag ? p : s, sec = prim === p ? s : p;
    prim.mag = -2.5 * Math.log10(10 ** (-0.4 * p.mag) + 10 ** (-0.4 * s.mag));
    sec.dropped = true;
    if (prim !== p) { prim.nameRow = p.r; }   // the system keeps the primary's name
    combined++;
  } else { s.dropped = true; dropped++; }
}

// Pass 3: keep naked-eye stars and every star near enough to matter.
const stars = [];
let unknown = 0;
for (const s of rows.values()) {
  if (s.dropped) continue;
  const { mag, distLy } = s;
  if (mag > MAG_LIMIT && (distLy > NEAR_LIMIT_LY || !s.known)) continue;
  const nr = s.nameRow || s.r;
  const ci = parseFloat(s.r[col.ci]);
  const named = distLy <= NAME_LIMIT_LY || mag <= 3.5;
  if (!s.known) unknown++;
  stars.push({
    x: s.u[0] * distLy, y: s.u[1] * distLy, z: s.u[2] * distLy,
    absmag: mag - 5 * Math.log10(distLy / PC_TO_LY) + 5,
    ci: Number.isFinite(ci) ? ci : 0.65,
    mag, distLy, known: s.known,
    name: named ? ruName(nr) : null,
    con: CONST_GEN_RU[nr[col.con]] || '',
    nameEn: named ? enName(nr) : null,
    conEn: CONST_EN[nr[col.con]]?.[0] || '',
  });
}

// Brightest first: a renderer that caps star count on weak devices just takes a prefix.
stars.sort((a, b) => a.mag - b.mag);

// Wide pairs that share one name (61 Cygni, Alpha Comae Berenices) become "A" and "B", brightest first.
for (const key of ['name', 'nameEn']) {
  const seen = new Map();
  for (const s of stars) if (s[key] && !/^(HIP|HD|Gl|GJ|NN|Wo) /.test(s[key])) seen.set(s[key], [...(seen.get(s[key]) || []), s]);
  for (const group of seen.values()) if (group.length > 1) group.forEach((s, k) => { s[key] += ' ' + 'ABCDEF'[k]; });
}

// Packed as six Int16 per star (12 bytes): unit direction ×32767, log-distance, absolute magnitude ×1000,
// B–V ×5000. Distance resolution is 0.015% — a thousand times finer than the measurements themselves.
const F = 6;
const lnMin = Math.log(Math.min(...stars.map((s) => s.distLy))) - 1e-6;
const lnMax = Math.log(Math.max(...stars.map((s) => s.distLy))) + 1e-6;
const buf = new Int16Array(stars.length * F);
const names = [];
const unknownIdx = [];
const q = (v, k, label) => { const r = Math.round(v * k); if (r < -32767 || r > 32767) throw new Error(label + ' out of range: ' + v); return r; };
stars.forEach((s, i) => {
  const d = Math.hypot(s.x, s.y, s.z);
  const ld = Math.round((Math.log(s.distLy) - lnMin) / (lnMax - lnMin) * 65535) - 32768;
  buf.set([q(s.x / d, 32767, 'x'), q(s.y / d, 32767, 'y'), q(s.z / d, 32767, 'z'), ld, q(s.absmag, 1000, 'absmag'), q(s.ci, 5000, 'ci')], i * F);
  if (s.name) names.push([i, s.name, s.con, s.nameEn || s.name, s.conEn]);
  if (!s.known) unknownIdx.push(i);
});

const b64 = Buffer.from(buf.buffer).toString('base64');
const visible = stars.filter(s => s.mag <= MAG_LIMIT).length;
const out = `// Generated by tools/build-catalog.mjs — do not edit by hand.
// Star data: HYG Database v4.1 by David Nash (astronexus, https://github.com/astronexus/HYG-Database),
// licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
// Changes from the original: only naked-eye stars (V ≤ ${MAG_LIMIT}) and stars within ${NEAR_LIMIT_LY} ly are kept;
// duplicate companions of close pairs are removed and true pairs closer than 30″ are combined into one star;
// stars without a usable parallax are placed at a nominal ${UNKNOWN_LY} ly; names were added in Russian and
// English; values are rounded and packed. This file is shared under the same licence, CC BY-SA 4.0.
// Layout: Int16 [unit x, y, z ×32767 (equatorial J2000), log-distance, absolute magnitude ×1000, B-V ×5000] per star,
// sorted brightest-first. STAR_NAMES rows: [index, Russian name, constellation (RU genitive), English name, constellation (EN)].
export const STAR_FIELDS = ${F};
export const STAR_COUNT = ${stars.length};
export const VISIBLE_COUNT = ${visible};
export const MAG_LIMIT = ${MAG_LIMIT};
export const LN_DIST = [${lnMin}, ${lnMax}];
export const STAR_DATA_B64 = '${b64}';
export const STAR_NAMES = ${JSON.stringify(names)};
// Stars whose distance is unknown (shown at a nominal ${UNKNOWN_LY} ly).
export const UNKNOWN_DIST = ${JSON.stringify(unknownIdx)};
`;

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, '..', 'js', 'data', 'stars.js');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
const named = names.length;
const unnamedNear = stars.filter(s => s.distLy <= NAME_LIMIT_LY && !s.name).length;
console.log(`stars: ${stars.length} (naked-eye ${visible}), named: ${named}, near-but-unnamed: ${unnamedNear}, unknown distance: ${unknown}, companions dropped: ${dropped}, pairs combined: ${combined}, file: ${(out.length / 1024).toFixed(0)} KB`);
