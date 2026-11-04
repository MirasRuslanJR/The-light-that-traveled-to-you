// Venus, Meeus example 33.a: 1992 Dec 20, 0h TD -> apparent RA 21h04m41.454s, Dec -18°53'16.84".
import * as A from '../js/astro.js';
const jd = 2448976.5;
const v = A.planets(jd).find((p) => p.name === 'venus');
const d = A.vecToRadec(A.mulMat3Vec(A.precessionMatrix(jd), v.dir));
const ra = (21 + 4 / 60 + 41.454 / 3600) * 15, dec = -(18 + 53 / 60 + 16.84 / 3600);
const err = Math.hypot((d.ra - ra) * Math.cos(dec * Math.PI / 180), d.dec - dec);
console.log(`Venus: RA ${d.ra.toFixed(4)} (want ${ra.toFixed(4)}), Dec ${d.dec.toFixed(4)} (want ${dec.toFixed(4)}), error ${err.toFixed(4)}°, mag ${v.mag.toFixed(2)}`);
// No aberration or nutation in our model: allow 0.05° (a tenth of the Moon's diameter).
process.exit(err < 0.05 ? 0 : 1);
