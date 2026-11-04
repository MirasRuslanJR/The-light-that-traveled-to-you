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

// Polaris over Kazan: the horizon basis against the textbook formula sin h = sin φ sin δ + cos φ cos δ cos H (Meeus 13.6).
{
  const jd = A.julianDay(Date.UTC(1998, 2, 13, 23, 40));
  const lat = 55.79, lon = 49.12;
  const v = A.mulMat3Vec(A.precessionMatrix(jd), A.radecToVec(hms(2, 31, 49.09), dms(89, 15, 50.8)));
  const { ra, dec } = A.vecToRadec(v);
  const H = (A.gmstDeg(jd) + lon - ra) * A.DEG, f = lat * A.DEG, d = dec * A.DEG;
  const want = Math.asin(Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(H)) / A.DEG;
  check('Polaris altitude at Kazan', A.altAz(v, A.horizonBasis(jd, lat, lon)).alt, want, 1e-9);
}

// Example 45.a — Saturn's rings, 1992 December 16, 0h TD: B = 16.442°.
{
  const jd = 2448972.5;
  const s = A.planets(jd).find((p) => p.name === 'saturn');
  check("Saturn's ring tilt B", Math.abs(A.saturnRingTilt(s.dir, jd)) / A.DEG, 16.442, 0.3);
}
// Saturn at opposition on 2003 December 31, rings wide open: observed about −0.45. Meeus's formula has no
// opposition surge, so it lands near −0.3; without the ring term it would say +0.4.
check('Saturn magnitude 2003-12-31', A.planets(A.julianDay(Date.UTC(2003, 11, 31))).find((p) => p.name === 'saturn').mag, -0.45, 0.25);

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
  t(2021, 3, 14, 2, 30, 'America/New_York', '2021-03-14T07:30'); // inside the gap: moves forward to 3:30
  t(2007, 12, 30, 0, 0, 'America/Argentina/Buenos_Aires', '2007-12-30T03:00'); // midnight skipped: moves to 1:00
  t(2021, 11, 7, 1, 30, 'America/New_York', '2021-11-07T05:30'); // repeated hour: the first (summer) 1:30
}

// Light travel: Proxima Centauri (4.2465 ly) is reached 4.2465 Julian years after birth.
check('Arrival at Proxima, years', (A.arrivalMs(0, 4.2465) - 0) / 86400000 / 365.25, 4.2465, 1e-9);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
