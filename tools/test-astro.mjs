// Checks js/astro.js against worked examples from Meeus, "Astronomical Algorithms" (2nd ed.).
// Run: node tools/test-astro.mjs
import * as A from '../js/astro.js';

let failed = 0;
function check(label, got, want, tol) {
  const err = Math.abs(got - want);
  const ok = err <= tol;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: got ${got.toFixed(6)}, want ${want.toFixed(6)}, |err| ${err.toExponential(2)} (tol ${tol})`);
}
const hms = (h, m, s) => (h + m / 60 + s / 3600) * 15;
const dms = (d, m, s) => Math.sign(d || 1) * (Math.abs(d) + m / 60 + s / 3600);

// Example 12.a — mean sidereal time at Greenwich, 1987 April 10, 0h UT.
check('GMST 1987-04-10 0h', A.gmstDeg(2446895.5), hms(13, 10, 46.3668), 1e-5);

// Example 13.b — Venus seen from Washington, 1987 April 10, 19:21 UT.
{
  const jd = 2446896.30625;
  const basis = A.horizonBasis(jd, dms(38, 55, 17), -dms(77, 3, 56));
  const v = A.radecToVec(hms(23, 9, 16.641), dms(-6, 43, 11.61));
  const { alt, az } = A.altAz(v, basis);
  // Meeus measures azimuth from the south; ours is from the north. Mean vs apparent sidereal time adds ~0.001°.
  check('Venus altitude', alt, 15.1249, 0.003);
  check('Venus azimuth', az, 68.0337 + 180, 0.003);
}

// Example 21.b — theta Persei, J2000 -> 2028 Nov 13.19 TD, with proper motion.
{
  const jd = 2462088.69;
  const years = (jd - 2451545) / 365.25;
  const ra0 = hms(2, 44, 11.986 + 0.03425 * years);
  const dec0 = dms(49, 13, 42.48 - 0.0895 * years);
  const p = A.vecToRadec(A.mulMat3Vec(A.precessionMatrix(jd), A.radecToVec(ra0, dec0)));
  check('Precession RA', p.ra, hms(2, 46, 11.331), 2e-5);
  check('Precession Dec', p.dec, dms(49, 20, 54.54), 2e-5);
}

// Example 25.a — Sun, 1992 October 13.0 TD.
check('Sun longitude', A.sunLongitude(2448908.5), 199.90988, 0.01);

// Example 47.a — Moon, 1992 April 12, 0h TD.
{
  const m = A.moonEcliptic(2448724.5);
  check('Moon longitude', m.lon, 133.162655, 0.05);
  check('Moon latitude', m.lat, -3.229126, 0.05);
}

// Example 48.a — illuminated fraction of the Moon on the same date: k = 0.6786.
check('Moon illuminated fraction', A.moonPhase(2448724.5).fraction, 0.6786, 0.01);

// Sanity: Polaris stands at the observer's latitude (within its ~0.7° from the pole).
{
  const jd = A.julianDay(Date.UTC(1998, 2, 13, 23, 40));
  const v = A.mulMat3Vec(A.precessionMatrix(jd), A.radecToVec(hms(2, 31, 49.09), dms(89, 15, 50.8)));
  check('Polaris altitude at Kazan', A.altAz(v, A.horizonBasis(jd, 55.79, 49.12)).alt, 55.79, 0.8);
}

// Historical time zones (browser Intl tz database).
{
  const t = (y, mo, d, h, mi, tz, iso) => {
    const got = new Date(A.zonedToUtc(y, mo, d, h, mi, tz)).toISOString();
    const ok = got.startsWith(iso);
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${tz} ${y}-${mo}-${d} ${h}:${mi} -> ${got} (want ${iso})`);
  };
  t(1998, 3, 14, 2, 40, 'Europe/Moscow', '1998-03-13T23:40');  // winter time, UTC+3
  t(1998, 7, 14, 2, 40, 'Europe/Moscow', '1998-07-13T22:40');  // summer time, UTC+4
  t(2012, 7, 1, 12, 0, 'Europe/Moscow', '2012-07-01T08:00');   // 2011–2014 permanent UTC+4
  t(2020, 7, 1, 12, 0, 'Europe/Moscow', '2020-07-01T09:00');   // UTC+3 since 2014
  t(1985, 6, 1, 0, 30, 'Asia/Almaty', '1985-05-31T17:30');     // Soviet summer time, UTC+7
  t(2021, 3, 14, 3, 30, 'America/New_York', '2021-03-14T07:30'); // right after a DST jump
}

// Light travel bookkeeping.
check('Light-years after 26 Julian years', A.lightYearsBetween(0, 26 * 365.25 * 86400000), 26, 1e-12);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
