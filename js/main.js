// Story controller: turns scroll position into a camera path through real space and time.
import * as A from './astro.js?v=25';
import { loadCatalog } from './catalog.js?v=25';
import { createSky } from './sky.js?v=25';
import { PLACES, findPlace, guessPlace, placeName } from './places.js?v=25';
import { STATIC, PHRASES, LANGS, detectLang, saveLang } from './i18n.js?v=25';
import * as F from './format.js?v=25';
import { createAudio } from './audio.js?v=25';
import { LINES } from './data/lines.js?v=25';

const $ = (s) => document.querySelector(s);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- small vector kit ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const ease = (x) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const mulT = (m, v) => [ // transpose(m) * v : equator-of-date -> J2000
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];
function rotateAbout(v, axis, ang) { // Rodrigues
  const c = Math.cos(ang), s = Math.sin(ang);
  return add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c)));
}
/** Size of the drawing surface in CSS px. window.innerWidth includes a classic scrollbar; the canvas does not. */
const viewW = () => (sky && sky.gl.canvas.clientWidth) || document.documentElement.clientWidth || window.innerWidth;
const viewH = () => (sky && sky.gl.canvas.clientHeight) || window.innerHeight;
const asinDeg = (x) => Math.asin(Math.max(-1, Math.min(1, x))) * 180 / Math.PI;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- astronomy for one place and moment, in the J2000 frame the stars live in ----------
function earthFrame(jd, lat, lon, lstOverrideDeg = null) {
  const P = A.precessionMatrix(jd);
  let b;
  if (lstOverrideDeg == null) b = A.horizonBasis(jd, lat, lon);
  else {
    const l = lstOverrideDeg * Math.PI / 180, p = lat * Math.PI / 180;
    b = {
      east: [-Math.sin(l), Math.cos(l), 0],
      north: [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)],
      zenith: [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)],
    };
  }
  const zen = mulT(P, b.zenith), east = mulT(P, b.east), north = mulT(P, b.north);
  const sun = norm(mulT(P, A.sunVector(jd)));
  // Seen from the surface, not Earth's centre: the Moon is ~60 Earth radii away, so standing one radius
  // off-centre shifts it by up to a degree (Meeus ch. 40).
  const moon = norm(sub(mul(norm(mulT(P, A.moonVector(jd))), 60.27), zen));
  const sunAlt = asinDeg(dot(sun, zen));
  const moonAlt = asinDeg(dot(moon, zen));
  const phase = A.moonPhase(jd);
  const pl = A.planets(jd).map((p) => ({ ...p, alt: asinDeg(dot(p.dir, zen)) }));
  return { jd, lat, lon, zen, east, north, sun, moon, sunAlt, moonAlt, phase, planets: pl };
}
const lstDeg = (jd, lon) => A.gmstDeg(jd) + lon;
const azOf = (f, v) => ((Math.atan2(dot(v, f.east), dot(v, f.north)) * 180 / Math.PI) + 360) % 360;

function lookFrom(frame, azDeg, altDeg) {
  const az = azDeg * Math.PI / 180, al = altDeg * Math.PI / 180;
  const fwd = norm(add(mul(add(mul(frame.north, Math.cos(az)), mul(frame.east, Math.sin(az))), Math.cos(al)), mul(frame.zen, Math.sin(al))));
  return { pos: [0, 0, 0], fwd, up: frame.zen };
}
function blendCam(a, b, t) {
  return { pos: lerpV(a.pos, b.pos, t), fwd: norm(lerpV(a.fwd, b.fwd, t)), up: norm(lerpV(a.up, b.up, t)) };
}
function envFromFrame(f) {
  const day = smooth((f.sunAlt + 4) / 10);
  const twilight = smooth((f.sunAlt + 18) / 14) * (1 - day);
  const sh = sub(f.sun, mul(f.zen, dot(f.sun, f.zen)));
  return {
    zenith: f.zen, east: f.east, north: f.north, sunDir: f.sun, sunHorizonDir: norm(sh), moonDir: f.moon,
    day, twilight, moonOn: smooth((f.moonAlt + 0.6) / 1.2),
    moonLight: f.phase.fraction * smooth(f.moonAlt / 25),
  };
}

// ---------- opening: the light of the present moment, leaving Earth (time-lapse) ----------
const PULSE_PERIOD = 8;   // seconds for one pulse to grow to PULSE_MAX
const PULSE_MAX = 40;     // light-years
const SPEEDUP_MILLIONS = Math.round(PULSE_MAX * 31557600 / PULSE_PERIOD / 1e6);   // ≈ 158 million times
const drag = { yaw: 0, pitch: 0, vy: 0, vp: 0, active: false, x: 0, y: 0, used: false };
// The opening: a single point of light, then the dark fills with stars and the camera pulls away.
const OPEN_DUR = 6.5;                                  // seconds from "enter" to the finished first screen
const opening = { phase: 'gate', t0: 0 };              // gate → play → done
function openP(t) {
  if (opening.phase === 'gate') return 0;
  if (opening.phase === 'done') return 1;
  return clamp01((t - opening.t0) / OPEN_DUR);
}
function introCam(t) {
  const p = S.ready ? 1 : openP(t);
  const k = ease(clamp01(p / 0.82));
  const since = opening.phase === 'gate' ? 0 : t - opening.t0;
  const yaw = 0.6 + (reduceMotion ? 0 : since * 0.02) + drag.yaw;
  const pitch = Math.max(-1.1, Math.min(1.1, lerp(0.04, 0.32, k) + drag.pitch));
  const D = lerp(58, 95, k);
  const pos = [D * Math.cos(pitch) * Math.cos(yaw), D * Math.cos(pitch) * Math.sin(yaw), D * Math.sin(pitch)];
  return { pos, fwd: norm(mul(pos, -1)), up: [0, 0, 1] };
}

// ---------- boot ----------
const catalog = loadCatalog();
let sky = null;
try { sky = createSky($('#sky'), catalog, LINES); } catch (err) {
  document.body.classList.add('no-webgl');
  console.warn('Sky renderer unavailable:', err);
}

const skyCanvas = $('#sky');
skyCanvas.addEventListener('webglcontextrestored', () => {
  try { sky = createSky(skyCanvas, catalog, LINES); if (qualityLevel > 0) applyQuality(qualityLevel); } catch (err) { console.warn('Sky could not be restored:', err); }
});
const here = guessPlace();
let nowFrame = earthFrame(A.julianDay(Date.now()), here.lat, here.lon);
setInterval(() => { nowFrame = earthFrame(A.julianDay(Date.now()), here.lat, here.lon); }, 60000);
let lang = detectLang();
let L = PHRASES[lang];
const tr = (k) => STATIC[lang][k];
const audio = createAudio();
const soundBtn = $('#sound');
function readPref() { try { return localStorage.getItem('svet-sound') !== 'off'; } catch { return true; } }
function writePref(on) { try { localStorage.setItem('svet-sound', on ? 'on' : 'off'); } catch { /* private mode */ } }
function showSound(on) {
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', tr('soundOn'));
  soundBtn.lastElementChild.textContent = on ? tr('soundOn') : tr('soundOff');
}
let soundOn = readPref();
audio.setEnabled(soundOn);
showSound(soundOn);
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  writePref(soundOn); showSound(soundOn);
  audio.setEnabled(soundOn);
  if (soundOn && opening.phase !== 'gate') audio.start();
});

/** Wrap each word of a headline so it can arrive on its own. Non-breaking spaces stay inside words. */
function splitWords(el) {
  const words = el.textContent.split(' ').filter(Boolean);
  el.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'w'; s.style.setProperty('--i', i); s.textContent = w;
    el.append(s, document.createTextNode(' '));
  });
}
const datalist = $('#places');
function fillDatalist() {
  datalist.replaceChildren(...PLACES.map((p) => Object.assign(document.createElement('option'), { value: placeName(p, lang) })));
}

/** Put the current language's fixed copy into the page. */
function applyStatic() {
  document.documentElement.lang = lang;
  document.title = tr('title');
  document.querySelector('meta[name="description"]').content = tr('description');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = tr(el.dataset.i18n);
    if (el.classList.contains('display')) splitWords(el);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = tr(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('.lang-switch [data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  showSound(soundOn);
}

function setLang(next, { save = true } = {}) {
  if (next === lang || !LANGS.includes(next)) return;
  lang = next; L = PHRASES[lang];
  if (save) saveLang(lang);
  applyStatic();
  fillDatalist();
  if (S.ready) fillTexts(S.story);
  lastFrame = null; metaKey = ''; tipKey = '';
  F_STATE.shown = -1;                          // the finale's log is rebuilt in the new language
  if (gateEl.classList.contains('is-ready')) gateEl.querySelector('.gate-count-num').textContent = L.num(catalog.n);
  $('#share-note').textContent = '';
  if (errEl.textContent) errEl.textContent = '';
}
document.querySelectorAll('.lang-switch [data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
const today = new Date();
$('#f-date').max = `${today.getFullYear()}-${F.pad2(today.getMonth() + 1)}-${F.pad2(today.getDate())}`;

const S = { ready: false };   // the computed story, filled on submit
const chapters = [...document.querySelectorAll('.chapter')];
let metrics = [];

function measure() {
  const vh = window.innerHeight;
  metrics = chapters.filter((c) => !c.hidden).map((c) => ({ el: c, top: c.offsetTop, h: c.offsetHeight, vh }));
}

/** Scroll position → story time T (chapter index + progress) and per-chapter text opacity. */
function readScroll() {
  const y = window.scrollY;
  let T = 0;
  metrics.forEach((m, i) => {
    const span = Math.max(1, i === 0 ? m.h : m.h - m.vh);
    const p = clamp01((y - m.top) / span);
    if (y >= m.top) T = i + p;
    let o;
    if (i === 0) o = S.ready ? 1 - smooth((y / m.vh - 0.15) / 0.5) : 1;
    else {
      const fadeIn = smooth((y - (m.top - m.vh * 0.35)) / (m.vh * 0.5));
      const fadeOut = 0;
      o = fadeIn * (1 - fadeOut);
    }
    const os = o.toFixed(3);
    if (m.o !== os) { m.o = os; m.el.firstElementChild.style.setProperty('--o', os); }
    m.el.classList.toggle('is-in', o > 0.35);
  });
  return T;
}

// ---------- the story ----------
/**
 * The star shown as "next": among naked-eye stars ahead of the light front, a bright named one that rises at
 * least 20° over where the viewer lives (preferred within 3 ly of the very nearest). Every candidate is a real
 * star ahead of the light, so whichever is chosen, its dates stay true; the copy calls it "the next star", not "the nearest".
 */
function pickHero(R) {
  const list = catalog.upcoming(R, 60);
  const rises = (i) => 90 - Math.abs(here.lat - catalog.dec(i)) >= 20;
  const named = (i) => catalog.isNamed(i);
  const bright = (i) => catalog.mag[i] <= 5.5;
  const first = list[0];
  const best = list.find((i) => rises(i) && named(i) && bright(i) && catalog.dist[i] - catalog.dist[first] < 3)
    ?? list.find((i) => rises(i) && named(i))
    ?? list.find(rises)
    ?? first;
  return best ?? catalog.frontier(R).last;
}

function computeStory(birthMs, place, timeKnown) {
  const nowMs = Date.now();
  const R = A.lightYearsBetween(birthMs, nowMs);
  const birth = earthFrame(A.julianDay(birthMs), place.lat, place.lon);
  const now = earthFrame(A.julianDay(nowMs), here.lat, here.lon);
  const reached = catalog.reached(R);
  const hero = pickHero(R);
  const heroPos = [catalog.pos[hero * 3], catalog.pos[hero * 3 + 1], catalog.pos[hero * 3 + 2]];
  const heroDist = catalog.dist[hero];
  const heroDir = norm(heroPos);

  // Where to look on the birth night: toward the Moon if it was up, otherwise toward the equator.
  const southward = place.lat >= 0 ? 180 : 0;
  const birthLook = birth.moonAlt > 6 && birth.moonAlt < 42
    ? { az: azOf(birth, birth.moon) - 16, alt: Math.max(16, Math.min(30, birth.moonAlt - 4)) }
    : { az: southward, alt: 24 };
  const heroAltNow = asinDeg(dot(heroDir, now.zen));
  const heroAzNow = azOf(now, heroDir);
  const nowLook = heroAltNow > 10
    ? { az: heroAzNow - 10, alt: Math.max(18, Math.min(55, heroAltNow + 4)) }
    : { az: here.lat >= 0 ? 180 : 0, alt: 32 };

  // Space views. A: pulled straight back from the birth view. B: side-on to the Sun–star line.
  const camBirth = lookFrom(birth, birthLook.az, birthLook.alt);
  const dA = Math.max(R * 2.9, 16);
  const upRef = Math.abs(dot(heroDir, birth.zen)) > 0.95 ? birth.north : birth.zen;
  const side = norm(cross(heroDir, upRef));
  const mid = mul(heroPos, 0.55);
  const dB = Math.max(heroDist * 1.35, 14);
  const posB = add(sub(mid, mul(side, dB)), mul(upRef, dB * 0.22));
  const camB = { pos: posB, fwd: norm(sub(mid, posB)), up: upRef };

  // "Your life in stars": the brightest named stars the light has touched, in the order it touched them.
  // Only stars that rise over the birthplace: this is the sky that person could actually look up at.
  const risesThere = (i) => 90 - Math.abs(place.lat - catalog.dec(i)) >= 10;
  const touched = catalog.between(0, R).filter((i) => catalog.mag[i] <= 4.2 && catalog.isNamed(i) && risesThere(i));
  touched.sort((a, b) => catalog.mag[a] - catalog.mag[b]);
  const milestones = touched.slice(0, 16).sort((a, b) => catalog.dist[a] - catalog.dist[b]).map((i) => ({
    i, dist: catalog.dist[i], at: A.arrivalMs(birthMs, catalog.dist[i]),
    pos: [catalog.pos[i * 3], catalog.pos[i * 3 + 1], catalog.pos[i * 3 + 2]],
  }));

  return {
    milestones,
    ready: true, birthMs, nowMs, place, timeKnown, R, birth, now, reached, hero, heroPos, heroDist,
    heroAltNow, heroAzNow, birthLook, nowLook, camBirth, dA, camB,
    lstNow: lstDeg(now.jd, here.lon), lstBirth: lstDeg(birth.jd, place.lon),
  };
}

/** Age in whole calendar years on a given date (in the birthplace's time zone). */
function calendarAge(birthMs, atMs, tz) {
  const a = F.parts(birthMs, tz), b = F.parts(atMs, tz);
  let y = b.year - a.year;
  if (b.month < a.month || (b.month === a.month && b.day < a.day)) y--;
  return Math.max(0, y);
}
const ageAt = (m) => calendarAge(S.story.birthMs, m.at, S.story.place.tz);

function fillTexts(s) {
  const fill = (key, html) => document.querySelectorAll(`[data-fill="${key}"]`).forEach((el) => {
    el.innerHTML = html;
    if (el.classList.contains('display')) splitWords(el);
  });
  const tz = s.place.tz;
  const bp = F.parts(s.birthMs, tz);
  const where = s.place.name ? esc(placeName(s.place, lang)) : L.noPlace;
  fill('birthLine', `${L.longDate(s.birthMs, tz)} · ${s.timeKnown ? `${F.pad2(bp.hour)}:${F.pad2(bp.minute)}` : L.aroundMidnight} · ${where}`);

  let night = L.moonSentence(s.birth.phase, s.birth.moonAlt > 0);
  const brightest = brightestPoint(s.birth);
  if (brightest) night += L.brightest(brightest);
  if (s.birth.sunAlt > -0.83) night = L.daytime(night);               // the Sun's upper limb above the horizon
  else if (s.birth.sunAlt > -8) night = L.twilightBirth(night);
  if (!s.timeKnown) night += L.noTime;
  if (s.place.approximate) night += L.approx;
  else if (s.place.guessed) night += L.guessed;
  fill('nightText', night);

  fill('lightText', L.lightText(L.duration(s.birthMs, s.nowMs), L.ly(s.R), L.km(s.R)));

  const heroName = esc(catalog.label(s.hero, lang));
  fill('heroName', heroName);
  heroLabel.querySelector('.star-name').textContent = catalog.label(s.hero, lang);
  heroLabel.querySelector('.star-meta').textContent = L.labelMeta(s.heroDist);
  const arrival = A.arrivalMs(s.birthMs, s.heroDist);
  const gap = s.heroDist - s.R;
  const sameMonth = L.monthYear(arrival, here.tz) === L.monthYear(s.nowMs, here.tz);
  const when = `<strong>${sameMonth ? L.thisMonth : L.monthYear(arrival, here.tz)}</strong>`;
  let heroText = gap < 0 ? L.heroPassed : gap < 0.25 ? L.heroNow(when) : L.heroOnWay(gap, when);
  if (gap >= 0) heroText += L.heroAge(calendarAge(s.birthMs, arrival, s.place.tz));
  fill('heroText', heroText);
  fill('heroMeta', L.heroMeta(s.heroDist, esc(catalog.constellation(s.hero, lang))));

  const nights = Math.floor((s.nowMs - s.birthMs) / 86400000);
  fill('nowLine', `${L.longDate(s.nowMs, here.tz)} · ${L.today}`);
  fill('nightsText', L.nights(nights));
  fill('nowText', s.heroAltNow > 2
    ? (s.now.sunAlt > -6 ? L.nowUpDay(heroName, L.compass(s.heroAzNow)) : L.nowUp(heroName, L.compass(s.heroAzNow)))
    : L.nowDown(heroName));

  lifeKey = '';
}

// ---------- your life in stars (chapter 2) ----------
const lifeAgeEl = $('#life-age'), lifeUnitEl = $('#life-unit'), lifeLogEl = $('#life-log'), lifeSummaryEl = $('#life-summary');
let lifeKey = '', lifeShown = 0;
function updateLife(R) {
  const s = S.story;
  if (!s) return;
  const yearMs = 365.25 * 86400000;
  const age = calendarAge(s.birthMs, s.birthMs + R * yearMs, s.place.tz);
  const young = s.R < 1 ? L.youngAge(R * 365.25) : null;   // a baby's light is days or months old, not "0 years"
  const done = s.milestones.filter((m) => m.dist <= R);
  const counts = catalog.reached(R);
  const key = `${young ? young.num + young.unit : age}|${done.length}|${counts.visible}|${lang}`;
  if (key === lifeKey) return;
  lifeKey = key;
  lifeAgeEl.textContent = young ? young.num : L.num(age);
  lifeUnitEl.textContent = young ? young.unit : L.years(age);
  const fresh = done.length > lifeShown;
  lifeShown = done.length;
  lifeLogEl.replaceChildren(...done.slice(-4).reverse().map((m, k) => {
    const li = document.createElement('li');
    if (k === 0 && fresh) li.className = 'is-new';
    const year = F.parts(m.at, here.tz).year;
    li.innerHTML = `<span class="life-when mono">${year} · ${L.logAge(ageAt(m))}</span><span class="life-star">${esc(catalog.label(m.i, lang))}</span>`;
    return li;
  }));
  lifeSummaryEl.textContent = R >= Math.min(0.5, s.R * 0.9) ? L.summary(counts.visible, counts.all - counts.visible) : '';
}

// Names that light up on the 3D stars at the moment the light front touches them.
const msPool = Array.from({ length: 3 }, () => {
  const el = document.createElement('div');
  el.className = 'star-label star-label--ms';
  el.innerHTML = '<span class="ring"></span><span class="star-name"></span><span class="star-meta"></span>';
  document.querySelector('.labels').append(el);
  return el;
});
function placeMilestoneLabels(sc) {
  const s = S.story;
  const R = S.Rshow || 0;
  const live = s && sc.env.earth < 0.5 && Ts > 2 && Ts < 3.05
    ? s.milestones.filter((m) => R - m.dist >= 0 && R - m.dist < Math.max(2.5, s.R * 0.08)).slice(-3) : [];
  msPool.forEach((el, k) => {
    const m = live[k];
    const p0 = m ? sky.project(m.pos) : null;
    const p = p0 && clearOfTextAt(p0) ? p0 : null;
    el.classList.toggle('is-on', !!p);
    if (!p) return;
    el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    el.classList.toggle('is-flipped', p.x > viewW() - 170);
    const name = catalog.label(m.i, lang), meta = L.logAge(ageAt(m));
    if (el.children[1].textContent !== name) el.children[1].textContent = name;
    if (el.children[2].textContent !== meta) el.children[2].textContent = meta;
  });
}

// The 30 brightest stars, for labels and for "the brightest point of that sky".
const BRIGHT = Array.from({ length: 30 }, (_, i) => i);
const starDir = (i) => [catalog.pos[i * 3] / catalog.dist[i], catalog.pos[i * 3 + 1] / catalog.dist[i], catalog.pos[i * 3 + 2] / catalog.dist[i]];

function brightestPoint(f) {
  let best = null;
  for (const p of f.planets) if (p.alt > 5 && (!best || p.mag < best.mag)) best = { name: L.planet[p.name], mag: p.mag, planet: true };
  for (const i of BRIGHT) {
    if (asinDeg(dot(starDir(i), f.zen)) > 5 && (!best || catalog.mag[i] < best.mag)) best = { name: catalog.label(i, lang), mag: catalog.mag[i], planet: false };
  }
  return best;
}

/** Things worth naming in an Earth view: the Moon, bright planets, the brightest stars. */
function namedObjects(f) {
  const out = [];
  if (f.moonAlt > 1) out.push({ name: L.moonName, dir: f.moon, meta: '' });
  for (const p of f.planets) if (p.alt > 2 && p.mag < 2.2) out.push({ name: L.planet[p.name], dir: p.dir, meta: L.planetWord });
  for (const i of BRIGHT) if (catalog.mag[i] < 1.3 && asinDeg(dot(starDir(i), f.zen)) > 2) out.push({ name: catalog.label(i, lang), dir: starDir(i), meta: '' });
  return out;
}

// ---------- scene for a story time T ----------
function sceneStory(T, t) {
  const drift = reduceMotion ? 0 : t * 0.35;
  const since = opening.phase === 'gate' ? 0 : t - opening.t0;
  const pulses = { pulse: window.innerWidth < 640 ? 0.5 : 1, pulseMax: PULSE_MAX, pulsePhase: reduceMotion ? 0.55 : since / PULSE_PERIOD, pulseAge: reduceMotion ? 1000 : since / PULSE_PERIOD };
  if (!S.ready) {
    const p = openP(t);
    const breathe = 0.8 + 0.2 * Math.sin(t * 1.7);
    const flash = opening.phase === 'gate' ? 0 : 3.2 * Math.exp(-Math.pow(since / 0.45, 2));
    return {
      cam: introCam(t),
      env: {
        ...envFromFrame(nowFrame), earth: 0, sphereR: 0, sphereOn: 0, ...pulses,
        pulse: pulses.pulse * smooth((p - 0.02) / 0.2),
        reveal: smooth((p - 0.03) / 0.55),
        sunGlow: opening.phase === 'gate' ? breathe : 1 + flash,
      },
      frame: null, planetFrame: nowFrame, layout: smooth((p - 0.42) / 0.4),
    };
  }
  const s = S.story;
  let cam, env, labelHero = 0, labelSun = 0, Rshow = 0;
  let frameOnScreen = null, planetFrame = null;

  if (T < 2) {
    // Opening → birth night: dive from deep space straight down to the place and moment of birth.
    const k = reduceMotion ? (T > 0.5 ? 1 : 0) : ease((T - 0.06) / 0.94);
    const f = s.birth;
    const land = lookFrom(f, s.birthLook.az + drift * 0.25, s.birthLook.alt);
    cam = blendCam(introCam(t), land, k);
    const earth = smooth((k - 0.78) / 0.22);
    const e = envFromFrame(f);
    const sunHide = f.sunAlt > -4 ? smooth((T - 1.08) / 0.3) : 0;   // "remove the Sun" to reveal the stars
    e.day *= 1 - sunHide; e.twilight *= 1 - sunHide * 0.8;
    e.moonOn *= earth;
    env = { ...e, earth, sphereR: 0, sphereOn: 0, ...pulses, pulse: 1 - smooth(k / 0.55), lines: smooth((T - 0.9) / 0.12) };
    frameOnScreen = k > 0.98 ? s.birth : null;
    planetFrame = s.birth;
  } else {
    const f = s.birth;
    const e = envFromFrame(f);
    if (f.sunAlt > -4) { e.day = 0; e.twilight *= 0.2; }
    const base = lookFrom(f, s.birthLook.az + drift * 0.25, s.birthLook.alt);
    // Chapter 2: pull straight back from Earth while the light of the birth expands through real space.
    const k = smooth((T - 2.02) / 0.42);
    const orbit = reduceMotion ? 0 : k * 0.55 + (T - 2) * 0.08;
    const back = mul(base.fwd, -s.dA * k);
    const camA = {
      pos: rotateAbout(back, base.up, orbit),
      fwd: rotateAbout(base.fwd, base.up, orbit),
      up: base.up,
    };
    const earth = 1 - smooth(k / 0.38);
    Rshow = s.R * clamp01((T - 2.3) / 0.6);
    cam = camA;
    env = { ...e, earth, sphereR: Rshow, sphereOn: 1 - earth * 0.999, lines: 1 };
    if (T < 2.03) frameOnScreen = s.birth;          // labels follow directions: only valid before the camera moves
    labelSun = smooth((k - 0.55) / 0.3);

    if (T >= 3) {
      // Chapter 3: swing round to see the light front and the star it is about to touch.
      const k3 = ease((T - 3) / 0.62);
    planetFrame = s.birth;
      cam = blendCam(camA, s.camB, k3);
      Rshow = s.R;
      env.sphereR = Rshow;
      labelHero = smooth((k3 - 0.55) / 0.3);
      labelSun = Math.max(labelSun * (1 - k3), smooth((k3 - 0.6) / 0.3));
    }
    if (T >= 4) {
      // Chapter 4: come home, to tonight's real sky over the viewer.
      const k4 = ease((T - 4) / 0.62);
      const fN = s.now;
      const home = lookFrom(fN, s.nowLook.az + drift * 0.2, s.nowLook.alt);
      cam = blendCam(cam, home, k4);
      const eN = envFromFrame(fN);
      const land = smooth((k4 - 0.62) / 0.38);
      env = { ...eN, earth: land, sphereR: s.R, sphereOn: 1 - land, lines: smooth((T - 4.45) / 0.3) };
      frameOnScreen = land > 0.9 ? s.now : null;
      if (land > 0.05) planetFrame = s.now;
      labelSun = labelSun * (1 - smooth(k4 / 0.4));
      labelHero = s.heroAltNow > 2 ? 1 : 1 - smooth(k4 / 0.5);
    }
  }
  S.Rshow = Rshow;
  return { cam, env, labelHero, labelSun, frame: frameOnScreen, planetFrame: planetFrame ?? frameOnScreen ?? s.birth };
}

// ---------- finale: watch the light keep going, into the years still ahead ----------
const FUTURE_DUR = 16;   // seconds to fly the light from today to its hundredth year
const F_STATE = { on: false, t0: 0, exitT: 0, from: 0, to: 100, list: [], last: null, bellDone: false };
function startFuture() {
  const s = S.story;
  if (!s || !sky) return;
  const t = performance.now() / 1000;
  const from = s.R, to = Math.max(100, s.R + 25);
  const risesThere = (i) => 90 - Math.abs(s.place.lat - catalog.dec(i)) >= 10;
  const ahead = catalog.between(from, to).filter((i) => catalog.mag[i] <= 4.3 && catalog.isNamed(i) && risesThere(i));
  ahead.sort((a, b) => catalog.mag[a] - catalog.mag[b]);
  const pick = ahead.slice(0, 14);
  if (!pick.includes(s.hero)) pick.push(s.hero);
  const list = pick.sort((a, b) => catalog.dist[a] - catalog.dist[b]).map((i) => ({
    i, dist: catalog.dist[i], at: A.arrivalMs(s.birthMs, catalog.dist[i]),
    pos: [catalog.pos[i * 3], catalog.pos[i * 3 + 1], catalog.pos[i * 3 + 2]],
  }));
  Object.assign(F_STATE, { on: true, t0: t, exitT: 0, from, to, list, bellDone: false, shown: -1, endShown: false });
  prevR = from;
  body.classList.add('in-future');
  document.documentElement.classList.add('no-scroll');
  futureEl.hidden = false;
  futureEl.classList.remove('is-done');
  $('#future-log').replaceChildren();
  $('#ch-now').inert = true;
  futureEl.focus({ preventScroll: true });
}
function stopFuture() {
  if (!F_STATE.on || F_STATE.exitT) return;
  F_STATE.exitT = performance.now() / 1000;
  body.classList.remove('in-future');
  document.documentElement.classList.remove('no-scroll');
  $('#ch-now').inert = false;
  $('#future-go').focus({ preventScroll: true });
}
const futureR = (t) => {
  const k = clamp01((t - F_STATE.t0 - 0.8) / FUTURE_DUR);
  const a = 0.08, w = 2 * a * (1 - a);                     // gentle start and landing, linear middle, no jumps
  const e = k < a ? (k * k) / w : k > 1 - a ? 1 - ((1 - k) * (1 - k)) / w : (k - a / 2) / (1 - a);
  return lerp(F_STATE.from, F_STATE.to, e);
};
function futureScene(t, base) {
  const s = S.story;
  const R = futureR(t);
  const since = t - F_STATE.t0;
  // Keep the whole sphere in frame as it grows, turning slowly around it.
  const D = (R * 2.7 + 12) * (window.innerWidth < 640 ? 1.45 : 1);   // phones: smaller, so it fits above the panel
  const yaw = 0.9 + since * 0.035, pitch = 0.35;
  const up0 = s.birth.zen;
  const ref = Math.abs(up0[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const ex = norm(cross(ref, up0)), ey = cross(up0, ex);
  const dirv = add(add(mul(ex, Math.cos(yaw) * Math.cos(pitch)), mul(ey, Math.sin(yaw) * Math.cos(pitch))), mul(up0, Math.sin(pitch)));
  const pos = mul(dirv, D);
  const cam = { pos, fwd: norm(mul(pos, -1)), up: up0 };
  const env = { ...base.env, earth: 0, sphereR: R, sphereOn: 1, lines: 0, day: 0, twilight: 0, moonOn: 0, moonLight: 0, pulse: 0, reveal: 1 };
  S.Rfuture = R;
  return { ...base, cam, env, labelHero: R >= s.heroDist - 0.2 ? 1 : 0, labelSun: 1, frame: null };
}
function scene(T, t) {
  const base = sceneStory(T, t);
  if (!F_STATE.on || !S.ready) return base;
  const fut = futureScene(t, base);
  if (!F_STATE.exitT) return fut;
  // Coming back: blend from the future view to wherever the story is.
  const k = ease((t - F_STATE.exitT) / 1.6);
  if (k >= 1) { F_STATE.on = false; futureEl.hidden = true; return base; }
  const mixEnv = { ...base.env };
  for (const key of ['earth', 'sphereR', 'sphereOn', 'lines', 'day', 'twilight', 'moonOn', 'moonLight']) mixEnv[key] = lerp(fut.env[key] ?? 0, base.env[key] ?? 0, k);
  return { ...base, cam: blendCam(fut.cam, base.cam, k), env: mixEnv };
}

// The panel that tells the years as they pass.
const futureEl = $('#future');
function updateFuture(t) {
  if (!F_STATE.on || F_STATE.exitT) return;
  const s = S.story, R = S.Rfuture ?? F_STATE.from;
  const nowAt = s.birthMs + R * 365.25 * 86400000;
  const year = F.parts(nowAt, s.place.tz).year;
  const age = calendarAge(s.birthMs, nowAt, s.place.tz);
  $('#future-year').textContent = String(year);
  $('#future-age').textContent = L.futureAge(age);
  const done = F_STATE.list.filter((m) => m.dist <= R);
  if (done.length !== F_STATE.shown) {
    const fresh = done.length > F_STATE.shown;
    F_STATE.shown = done.length;
    $('#future-log').replaceChildren(...done.slice(-4).reverse().map((m, k) => {
      const li = document.createElement('li');
      if (k === 0 && fresh) li.className = 'is-new';
      li.innerHTML = `<span class="life-when mono">${F.parts(m.at, s.place.tz).year} · ${esc(L.futureAge(ageAt(m)))}</span><span class="life-star">${esc(catalog.label(m.i, lang))}</span>`;
      return li;
    }));
  }
  if (!F_STATE.bellDone && R >= s.heroDist) { F_STATE.bellDone = true; audio.bell(); }
  if (!F_STATE.endShown && t - F_STATE.t0 > FUTURE_DUR + 1.2) { F_STATE.endShown = true; futureEl.classList.add('is-done'); }
}
// Future stars light up with their names at the moment the light reaches them.
const clearOfTextAt = (p) => (viewW() >= 900 ? p.x > viewW() * 0.5 && p.x < viewW() - 230 : p.y < viewH() * 0.38);
function placeFutureLabels() {
  const R = S.Rfuture ?? 0;
  const live = F_STATE.on && !F_STATE.exitT ? F_STATE.list.filter((m) => R - m.dist >= 0 && R - m.dist < Math.max(3, R * 0.06)).slice(-3) : [];
  msPool.forEach((el, k) => {
    const m = live[k];
    const p0 = m ? sky.project(m.pos) : null;
    const p = p0 && clearOfTextAt(p0) ? p0 : null;
    el.classList.toggle('is-on', !!p);
    if (!p) return;
    el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    el.classList.toggle('is-flipped', p.x > viewW() - 170);
    const name = catalog.label(m.i, lang), meta = L.futureAge(ageAt(m));
    if (el.children[1].textContent !== name) el.children[1].textContent = name;
    if (el.children[2].textContent !== meta) el.children[2].textContent = meta;
  });
}
$('#future-go').addEventListener('click', startFuture);
$('#future-back').addEventListener('click', stopFuture);
$('#future-postcard').addEventListener('click', () => { makePostcard().catch((err) => console.warn('postcard failed', err)); });
window.addEventListener('wheel', () => { if (F_STATE.on && performance.now() / 1000 - F_STATE.t0 > 1) stopFuture(); }, { passive: true });
window.addEventListener('keydown', (e) => { if (F_STATE.on && e.key === 'Escape') stopFuture(); });
// On phones a vertical swipe leaves the finale (the page itself is locked while it plays).
let swipeY = null;
window.addEventListener('touchstart', (e) => { swipeY = F_STATE.on ? e.touches[0].clientY : null; }, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (swipeY == null || !F_STATE.on || e.target.closest('#future .actions')) return;
  if (Math.abs(e.touches[0].clientY - swipeY) > 40 && performance.now() / 1000 - F_STATE.t0 > 1) { swipeY = null; stopFuture(); }
}, { passive: true });

// ---------- labels ----------
const heroLabel = $('#label-hero');
const sunLabel = $('#label-sun');
function placeLabel(el, p, on) {
  const pt = on > 0.01 && sky ? sky.project(p) : null;
  const W = viewW(), H = viewH();
  // Never sit on top of the text column (left half on desktop, upper part only on phones) or the rail.
  const clearOfText = !pt || clearOfTextAt(pt);
  const visible = !!pt && clearOfText && pt.x > 10 && pt.y > 60 && pt.x < W - 10 && pt.y < H - 30;
  el.classList.toggle('is-on', visible && on > 0.5);
  if (pt) {
    el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
    el.classList.toggle('is-flipped', pt.x > W - 170);
  }
}

// Small names for the Moon, planets and brightest stars while standing on Earth.
const objLayer = document.querySelector('.labels');
const objPool = Array.from({ length: 6 }, () => {
  const el = document.createElement('div');
  el.className = 'obj-label';
  el.innerHTML = '<span class="obj-tick"></span><span class="obj-name"></span>';
  objLayer.append(el);
  return el;
});
let lastFrame = null, lastObjects = [];
function placeObjectLabels(sc) {
  if (sc.frame !== lastFrame) { lastFrame = sc.frame; lastObjects = sc.frame ? namedObjects(sc.frame) : []; }
  if ((sc.env.earth ?? 1) < 0.97) lastObjects = [];     // names are on directions: only valid with the camera on Earth
  const W = viewW(), H = viewH();
  const minX = W >= 900 ? W * 0.5 : 0;   // keep clear of the text column
  const shown = [];
  for (const o of lastObjects) {
    if (shown.length >= objPool.length) break;
    const p = sky.project(o.dir);
    const maxY = W >= 900 ? H - 40 : H * 0.36;   // on phones the text fills the lower part
    if (!p || p.x < minX || p.x > W - (W >= 900 ? 250 : 120) || p.y < 70 || p.y > maxY) continue;
    if (shown.some((q) => Math.abs(q.p.x - p.x) < 110 && Math.abs(q.p.y - p.y) < 28)) continue;
    shown.push({ o, p });
  }
  objPool.forEach((el, k) => {
    const it = shown[k];
    el.classList.toggle('is-on', !!it);
    if (!it) return;
    el.style.transform = `translate3d(${it.p.x.toFixed(1)}px, ${it.p.y.toFixed(1)}px, 0)`;
    const nameEl = el.lastElementChild;
    const text = it.o.meta ? `${it.o.name} · ${it.o.meta}` : it.o.name;
    if (nameEl.textContent !== text) nameEl.textContent = text;
  });
}

/**
 * Names on the 3D scene must never pile up: when two would overlap, the more important one stays
 * (the next star, then the newest star the light touched, then the Sun).
 */
function declutterLabels() {
  const order = [heroLabel, ...msPool.slice().reverse(), sunLabel];
  const kept = [];
  for (const el of order) {
    if (!el.classList.contains('is-on')) continue;
    const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(el.style.transform);
    if (!m) continue;
    const box = { x: +m[1] - 22, y: +m[2] - 26, w: el.offsetWidth + 22, h: 46 };
    if (kept.some((b) => box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h)) { el.classList.remove('is-on'); continue; }
    kept.push(box);
  }
}

// ---------- live meta line ----------
const metaEl = $('#meta-live');
let metaKey = '';
function updateMeta(T) {
  const idx = Math.min(4, Math.floor(T + 0.05));
  const s = S.story;
  let key, text;
  if (!S.ready || idx === 0) { key = 'pulse'; text = L.pulseMeta(SPEEDUP_MILLIONS); }
  else if (idx === 1) { key = 'birth'; text = `${L.coord(s.place.lat, s.place.lon)} · ${L.longDate(s.birthMs, s.place.tz)}`; }
  else if (idx === 4) { key = 'home'; text = `${L.coord(here.lat, here.lon)} · ${L.today}`; }
  else { key = 'space'; text = L.fromEarth(s.R); }
  if (key !== metaKey) { metaKey = key; metaEl.textContent = text; }
}

// ---------- tilt the phone to look around ----------
// Relative to how the phone was held when the story started, so nothing jumps; drifts back to centre slowly.
const tilt = { yaw: 0, pitch: 0, ty: 0, tp: 0, base: null, on: false, angle: null };
const coarse = matchMedia('(pointer: coarse)').matches;
function onOrient(e) {
  if (e.alpha == null || e.beta == null) return;
  const raw = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
  const angle = ((raw % 360) + 360) % 360;
  if (angle !== tilt.angle) { tilt.angle = angle; tilt.base = null; }   // turned the phone: start from the new pose
  const yawDeg = e.alpha;
  const pitchDeg = angle === 90 ? -e.gamma : angle === 270 ? e.gamma : angle === 180 ? -e.beta : e.beta;
  if (!tilt.base) tilt.base = { yaw: yawDeg, pitch: pitchDeg };
  let dy = yawDeg - tilt.base.yaw;
  dy = ((dy + 540) % 360) - 180;
  const dp = Math.max(-50, Math.min(50, pitchDeg - tilt.base.pitch));
  tilt.ty = dy * Math.PI / 180;
  tilt.tp = dp * Math.PI / 180;
  // The reference creeps toward the current pose, so a phone put down at an angle recentres itself.
  tilt.base.yaw += ((((yawDeg - tilt.base.yaw) + 540) % 360) - 180) * 0.002;
  tilt.base.pitch += (pitchDeg - tilt.base.pitch) * 0.002;
}
async function enableTilt() {
  if (!coarse || tilt.on || typeof DeviceOrientationEvent === 'undefined') return;
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {   // iOS asks the person, inside a tap
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== 'granted') return;
    }
    window.addEventListener('deviceorientation', onOrient);
    tilt.on = true;
  } catch { /* no sensor or refused: touch dragging still works */ }
}
/** Turn the camera by the phone's tilt: around the local up for yaw, around its right for pitch. */
function applyTilt(cam) {
  if (!tilt.on) return cam;
  tilt.yaw += (tilt.ty - tilt.yaw) * 0.12;
  tilt.pitch += (tilt.tp - tilt.pitch) * 0.12;
  if (Math.abs(tilt.yaw) < 1e-4 && Math.abs(tilt.pitch) < 1e-4) return cam;
  const up = norm(cam.up);
  let fwd = rotateAbout(cam.fwd, up, -tilt.yaw * 0.9);
  const right = norm(cross(fwd, up));
  fwd = rotateAbout(fwd, right, tilt.pitch * 0.8);
  return { ...cam, fwd: norm(fwd), up };
}

// ---------- composition ----------
/** In space, slide the camera sideways so the subject sits beside the text column, not under it. */
function compose(sc) {
  const space = 1 - (sc.env.earth ?? 1);
  if (space <= 0) return sc.cam;
  const cam = sc.cam;
  const right = norm(cross(cam.fwd, cam.up));
  const up = cross(right, cam.fwd);
  const d = Math.hypot(...cam.pos);
  const wide = window.innerWidth >= 900;
  const lay = sc.layout ?? 1;   // during the opening the Sun starts centred and slides aside for the text
  const shift = wide ? mul(right, -d * 0.3 * space * lay) : mul(up, -d * 0.28 * space * lay);
  let out = { ...cam, pos: add(cam.pos, shift) };
  if (S.ready && (Math.abs(spaceDrag.yaw) > 1e-4 || Math.abs(spaceDrag.pitch) > 1e-4)) {
    // The viewer's own turn of the scene, around the Sun.
    const Z = [0, 0, 1];
    let p = rotateAbout(out.pos, Z, spaceDrag.yaw), fw = rotateAbout(out.fwd, Z, spaceDrag.yaw), u = rotateAbout(out.up, Z, spaceDrag.yaw);
    const ax = norm(cross(fw, u));
    p = rotateAbout(p, ax, spaceDrag.pitch); fw = rotateAbout(fw, ax, spaceDrag.pitch); u = rotateAbout(u, ax, spaceDrag.pitch);
    out = { pos: p, fwd: fw, up: u };
  }
  return out;
}

// ---------- sound for the scene ----------
let prevR = 0, bellArmed = true;
function soundForScene(sc) {
  const e = sc.env;
  audio.mood(e.earth, 1 - e.earth);
  const R = e.sphereOn > 0.5 ? e.sphereR : 0;
  if (R > prevR + 1e-4) {
    const touched = catalog.between(prevR, R).slice(0, 6);
    for (const i of touched) {
      const c = catalog.color;
      const temp = Math.max(0, Math.min(1, (c[i * 3 + 2] - c[i * 3]) * 2.2 + 0.5));
      const bright = Math.max(0, Math.min(1, (6.5 - catalog.mag[i]) / 6));
      const p = sky.project([catalog.pos[i * 3], catalog.pos[i * 3 + 1], catalog.pos[i * 3 + 2]]);
      audio.chime(temp, bright, p ? (p.x / window.innerWidth) * 2 - 1 : 0);
    }
  }
  prevR = R;
  if (sc.labelHero > 0.6 && bellArmed) { bellArmed = false; audio.bell(); }
  if (sc.labelHero < 0.2) bellArmed = true;
}

// ---------- adaptive quality ----------
// Level 0: full quality. 1: no glow. 2: no glow, 1× resolution. 3: no glow, 0.75× resolution.
// Judged on the median frame time of each second; steps down fast, climbs back after sustained headroom.
let qualityLevel = 0, frameTimes = [], judgedAt = 0, fastSeconds = 0;
function applyQuality(level) {
  qualityLevel = level;
  if (!sky) return;
  sky.setPost(level === 0);
  sky.setMaxDpr(level <= 1 ? 2 : level === 2 ? 1 : 0.75);
}
function watchPerformance(rawDt, now) {
  if (document.hidden || rawDt > 0.5) { frameTimes = []; return; }   // tab switches are not slow frames
  frameTimes.push(rawDt);
  if (now - judgedAt < 1000 || frameTimes.length < 10) return;
  judgedAt = now;
  const sorted = frameTimes.slice().sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  frameTimes = [];
  if (median > 0.034 && qualityLevel < 3) { applyQuality(qualityLevel + 1); fastSeconds = 0; }
  else if (median < 0.019 && qualityLevel > 0) { if (++fastSeconds >= 6) { applyQuality(qualityLevel - 1); fastSeconds = 0; } }
  else fastSeconds = 0;
}

// ---------- the finale's live distance ----------
const tickerEl = $('#ticker-num');
function updateTicker(T) {
  if (!S.ready || T < 3.6) return;
  const km = (Date.now() - S.story.birthMs) / 1000 * 299792.458;   // the light never stops: neither does this number
  tickerEl.textContent = L.num(km);
}

// ---------- chapter rail ----------
const railEl = $('#rail');
const railBtns = [...railEl.querySelectorAll('[data-go]')];
function updateRail(T) {
  const railOn = S.ready && T > 0.9 && !F_STATE.on;
  railEl.classList.toggle('is-on', railOn);
  railEl.inert = !railOn;
  const idx = Math.min(4, Math.max(1, Math.floor(T + 0.02)));
  railBtns.forEach((b) => b.classList.toggle('is-active', +b.dataset.go === idx));
}
railBtns.forEach((b) => b.addEventListener('click', () => {
  const i = +b.dataset.go, m = metrics[i];
  const settle = { 1: 0.05, 2: 0.6, 3: 0.66, 4: 0.7 }[i] ?? 0;   // where that chapter's scene has finished arriving
  if (m) smoothScrollTo(m.top + (m.h - m.vh) * settle, 1400);
}));
function smoothScrollTo(target, dur) {
  if (reduceMotion) { window.scrollTo(0, target); return; }
  const from = window.scrollY, t0 = performance.now();
  const step = (now) => {
    const k = clamp01((now - t0) / dur);
    window.scrollTo(0, from + (target - from) * ease(k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- cursor: a ring that follows the mouse and settles on stars ----------
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  && !matchMedia('(prefers-contrast: more), (forced-colors: active)').matches;
const cursorEl = document.querySelector('.cursor');
const ring = { x: -100, y: -100, tx: -100, ty: -100, s: 1 };
let mouse = null, mouseTarget = null;
if (fine && !reduceMotion) {
  document.documentElement.classList.add('has-cursor');
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse = { x: e.clientX, y: e.clientY }; mouseTarget = e.target; } });
  document.addEventListener('pointerleave', () => { mouse = null; });
}
function updateCursor() {
  if (!fine || reduceMotion) return;
  if (!mouse) { cursorEl.classList.remove('is-on'); return; }
  cursorEl.classList.add('is-on');
  const t = mouseTarget;
  const overInput = t && t.closest && t.closest('input, textarea');
  const overAction = t && t.closest && t.closest('button, a, summary, label, [data-go], [data-lang], [data-enter]');
  const star = tipEl.classList.contains('is-on') && tipXY;
  cursorEl.classList.toggle('is-input', !!overInput);
  cursorEl.classList.toggle('is-action', !!overAction && !overInput);
  cursorEl.classList.toggle('is-star', !!star && !overAction);
  cursorEl.classList.toggle('is-drag', drag.active);
  ring.tx = mouse.x;
  ring.ty = mouse.y;
  ring.x += (ring.tx - ring.x) * 0.45;
  ring.y += (ring.ty - ring.y) * 0.45;
  cursorEl.firstElementChild.style.transform = `translate3d(${ring.x.toFixed(1)}px, ${ring.y.toFixed(1)}px, 0)`;
  cursorEl.lastElementChild.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
}

// ---------- postcard: a personal poster of the light sphere ----------
async function makePostcard() {
  const s = S.story;
  if (!s || !sky) return;
  const W = 1080, H = 1350;
  const saveView = { ...sky.view }, saveEnv = { ...sky.env, bloom: sky.env.bloom ?? 1 };
  // Frame the sphere side-on, high enough to see its depth, with the Sun at the centre.
  const heroDir = norm(s.heroPos);
  const up0 = Math.abs(dot(heroDir, s.birth.zen)) > 0.95 ? s.birth.north : s.birth.zen;
  const side = norm(cross(heroDir, up0));
  const pos = add(mul(side, -s.R * 3.6 - 8), mul(up0, s.R * 0.6 + 2));
  const fwd = norm(mul(pos, -1));
  const right = norm(cross(fwd, up0));
  Object.assign(sky.view, { cam: pos, fwd, right, up: cross(right, fwd), fov: 46 });
  Object.assign(sky.env, { earth: 0, sphereR: s.R, sphereOn: 1, pulse: 0, reveal: 1, trail: 0, lines: 0, sunGlow: 1, day: 0, bloom: 1.15 });
  sky.render();
  const src = sky.gl.canvas;
  const marks = s.milestones.slice(-7).map((m) => ({ m, p: sky.project(m.pos) }));
  const heroP = sky.project(s.heroPos);
  const sunP = sky.project([0, 0, 0]);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#04060b'; g.fillRect(0, 0, W, H);
  // Crop the render to the poster's 4:5 shape, centred on the Sun.
  const k = src.width / src.clientWidth;
  const ch = src.height, cw = Math.min(src.width, ch * 0.8);
  const cx = Math.max(0, Math.min(src.width - cw, (sunP ? sunP.x * k : src.width / 2) - cw / 2));
  const sc = W / cw;
  const oy = (H - ch * sc) / 2 - H * 0.1;                   // the sphere sits in the upper part, above the type
  g.drawImage(src, cx, 0, cw, ch, 0, oy, W, ch * sc);
  const toPoster = (p) => ({ x: (p.x * k - cx) * sc, y: p.y * k * sc + oy });
  Object.assign(sky.view, saveView); Object.assign(sky.env, saveEnv);

  await Promise.all(['300 80px "Cormorant Garamond"', 'italic 300 40px "Cormorant Garamond"', '400 20px "IBM Plex Mono"'].map((f) => document.fonts.load(f).catch(() => {})));
  const gold = '#f1d3a1', ink = '#ece6da', dim = 'rgba(236,230,218,0.66)', faint = 'rgba(236,230,218,0.42)';
  const mono = (size, color, text, x, y, align = 'left') => { g.font = `400 ${size}px "IBM Plex Mono", monospace`; g.fillStyle = color; g.textAlign = align; g.letterSpacing = '3px'; g.fillText(text.toUpperCase(), x, y); g.letterSpacing = '0px'; };
  const placed = [];   // label boxes already drawn, so names never overlap
  // Milestones drawn on their real stars.
  g.lineWidth = 1.5;
  for (const { m, p } of marks) {
    if (!p) continue;
    const q = toPoster(p);
    if (q.x < 40 || q.x > W - 40 || q.y < 160 || q.y > H - 420) continue;
    g.font = 'italic 400 26px "Cormorant Garamond", serif';
    const box = { x: q.x - 14, y: q.y - 22, w: g.measureText(catalog.label(m.i, lang)).width + 40, h: 52 };
    if (placed.some((b) => box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h)) continue;
    placed.push(box);
    g.strokeStyle = 'rgba(241,211,161,0.75)'; g.beginPath(); g.arc(q.x, q.y, 13, 0, Math.PI * 2); g.stroke();
    g.font = 'italic 400 26px "Cormorant Garamond", serif'; g.fillStyle = ink; g.textAlign = 'left';
    g.fillText(catalog.label(m.i, lang), q.x + 22, q.y + 2);
    mono(13, faint, L.postAge(ageAt(m)), q.x + 22, q.y + 24);
  }
  if (heroP) {
    const q = toPoster(heroP);
    if (q.x > 40 && q.x < W - 40 && q.y > 160 && q.y < H - 420) { g.strokeStyle = gold; g.beginPath(); g.arc(q.x, q.y, 19, 0, Math.PI * 2); g.stroke(); }
  }
  // Type.
  const grad = g.createLinearGradient(0, H - 520, 0, H);
  grad.addColorStop(0, 'rgba(4,6,11,0)'); grad.addColorStop(0.45, 'rgba(4,6,11,0.85)'); grad.addColorStop(1, 'rgba(4,6,11,0.97)');
  g.fillStyle = grad; g.fillRect(0, H - 520, W, 520);
  const top = g.createLinearGradient(0, 0, 0, 220);
  top.addColorStop(0, 'rgba(4,6,11,0.9)'); top.addColorStop(1, 'rgba(4,6,11,0)');
  g.fillStyle = top; g.fillRect(0, 0, W, 220);
  g.font = 'italic 300 40px "Cormorant Garamond", serif'; g.fillStyle = ink; g.textAlign = 'left';
  g.fillText(tr('title'), 72, 104);
  const birthLine = document.querySelector('[data-fill="birthLine"]').textContent;
  mono(16, dim, birthLine, 72, 146);
  const strip = (h) => h.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '');
  let big = 132;
  g.font = `300 ${big}px "Cormorant Garamond", serif`;
  while (g.measureText(strip(L.ly(s.R))).width > W - 140 && big > 60) { big -= 4; g.font = `300 ${big}px "Cormorant Garamond", serif`; }
  g.fillStyle = gold;
  g.fillText(strip(L.ly(s.R)), 68, H - 300);
  mono(16, dim, tr('postCaption'), 72, H - 256);
  const done = s.milestones.slice(-4);
  g.font = 'italic 400 30px "Cormorant Garamond", serif';
  let x = 72;
  for (const m of done) {
    const label = `${ageAt(m)} · ${catalog.label(m.i, lang)}`;
    g.fillStyle = ink; g.fillText(label, x, H - 186);
    x += g.measureText(label).width + 40;
    if (x > W - 200) break;
  }
  const arrival = A.arrivalMs(s.birthMs, s.heroDist);
  mono(16, gold, L.postNext(catalog.label(s.hero, lang), L.monthYear(arrival, here.tz)), 72, H - 130);
  mono(13, faint, `${location.host || 'svet'} · HYG v4.1 · ${L.longDate(Date.now(), here.tz)}`, 72, H - 72);

  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `svet-${S.query.date}.png` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  flashNote(tr('postSaved'));
}
/** Status line under the finale buttons: says what happened, then clears itself. */
let noteTimer = 0;
function flashNote(text) {
  const el = $('#share-note');
  el.textContent = text;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { el.textContent = ''; }, 6000);
}
$('#postcard').addEventListener('click', () => { makePostcard().catch((err) => console.warn('postcard failed', err)); });

// ---------- opening stages ----------
const gateEl = $('#gate');
const body = document.body;
function stageOpening(t) {
  if (opening.phase === 'play' && t - opening.t0 >= OPEN_DUR) opening.phase = 'done';
  const p = S.ready ? 1 : openP(t);
  body.classList.toggle('op-gate', opening.phase === 'gate');
  body.classList.toggle('op-title', p >= 0.46);
  body.classList.toggle('op-form', p >= 0.64);
  body.classList.toggle('op-done', p >= 0.9);
  if (!S.ready && opening.phase !== 'gate' && sky) introChimes(t);
  const gated = opening.phase === 'gate';
  if (gated !== stageOpening.gated) {
    stageOpening.gated = gated;
    for (const el of [$('#story'), $('.wordmark'), soundBtn, $('#colophon')]) el.inert = gated;   // nothing invisible is reachable
  }
}
// Each pulse that crosses a bright star rings it, softly.
let ringPrev = [0, 0, 0, 0];
function introChimes(t) {
  const since = t - opening.t0, phase = since / PULSE_PERIOD;
  for (let k = 0; k < 4; k++) {
    const f = ((phase + k * 0.25) % 1 + 1) % 1;
    const r = f <= phase ? PULSE_MAX * f : 0;
    if (r > ringPrev[k] && r < PULSE_MAX * 0.6) {
      for (const i of catalog.between(ringPrev[k], r).slice(0, 2)) {
        if (catalog.absmag[i] > 3.2) continue;
        const p = sky.project([catalog.pos[i * 3], catalog.pos[i * 3 + 1], catalog.pos[i * 3 + 2]]);
        const c = catalog.color;
        audio.chime(Math.max(0, Math.min(1, (c[i * 3 + 2] - c[i * 3]) * 2.2 + 0.5)), 0.35, p ? (p.x / window.innerWidth) * 2 - 1 : 0);
      }
    }
    ringPrev[k] = r;
  }
}
function enter(withSound) {
  if (opening.phase !== 'gate') return;
  soundOn = withSound;
  writePref(soundOn); showSound(soundOn);
  audio.setEnabled(soundOn);
  if (soundOn) { audio.start(); audio.bell(); }
  enableTilt();
  const t = performance.now() / 1000;
  opening.t0 = t;
  opening.phase = reduceMotion || S.ready || !sky ? 'done' : 'play';
  ringPrev = [0, 0, 0, 0];
  pointer = null;   // the cursor is still resting on the button: do not read a star under it
  gateEl.setAttribute('aria-hidden', 'true');
  if (S.ready && metrics[1]) {
    // A shared link: the story is already computed, so fly straight into that sky.
    if (!reduceMotion) audio.whoosh(2.8);
    smoothScrollTo(metrics[1].top, reduceMotion ? 0 : 3800);
    return;
  }
  if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => { if (!S.ready) $('#f-date').focus({ preventScroll: true }); }, reduceMotion ? 50 : OPEN_DUR * 640);
}
gateEl.querySelector('[data-enter="sound"]').addEventListener('click', () => enter(true));
gateEl.querySelector('[data-enter="quiet"]').addEventListener('click', () => enter(false));
window.addEventListener('keydown', (e) => {
  // Enter on a focused button is that button's own click; only a bare Enter means "enter with the saved choice".
  if (opening.phase === 'gate' && e.key === 'Enter' && gateEl.classList.contains('is-ready') && !e.target.closest('button, a, input, select, textarea')) { e.preventDefault(); enter(soundOn); }
  else if (opening.phase === 'play') skipOpening();
});
// Impatient viewers can jump straight to the finished first screen.
function skipOpening() {
  if (opening.phase !== 'play') return;
  const t = performance.now() / 1000;
  opening.t0 = Math.min(opening.t0, t - OPEN_DUR * 0.9);
}
window.addEventListener('wheel', skipOpening, { passive: true });
window.addEventListener('pointerdown', (e) => { if (!e.target.closest('#gate')) skipOpening(); });

// Loading: count the real catalogue up while fonts and the first frame settle.
(function runGate() {
  const countEl = gateEl.querySelector('.gate-count-num');
  const t0 = performance.now(), dur = reduceMotion ? 1 : 1500;
  let fontsReady = false;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fontsReady = true; });
  const tick = (now) => {
    const k = clamp01((now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    countEl.textContent = L.num(Math.round(catalog.n * e));
    if (k < 1 || !fontsReady) { requestAnimationFrame(tick); return; }
    gateEl.classList.add('is-ready');
    gateEl.querySelector('[data-enter="sound"]').focus({ preventScroll: true });
  };
  requestAnimationFrame(tick);
  // Background tabs pause animation frames: never leave the gate stuck.
  setTimeout(() => { countEl.textContent = L.num(catalog.n); gateEl.classList.add('is-ready'); }, 4000);
}());

// ---------- frame loop ----------
let Ts = 0, last = performance.now(), skyShown = false;
let prevCam = { fwd: [0, 0, 1], pos: [0, 0, 0] };
let pointer = null;

// ---------- star tooltips: hover (or tap) any star to read what it means to you ----------
const tipEl = document.createElement('div');
tipEl.className = 'star-tip';
tipEl.innerHTML = '<span class="ring"></span><div class="tip-body"><span class="tip-name"></span><span class="tip-meta mono"></span><span class="tip-text"></span></div>';
document.querySelector('.labels').append(tipEl);
let tipKey = '', tipXY = null;
/**
 * The star actually drawn under the cursor. Mirrors the star shader exactly — same projection, same
 * atmospheric refraction and extinction on Earth, same brightness and point size — and picks by screen
 * distance alone, so the ring lands on the dot you are pointing at, not on a brighter neighbour.
 */
function pickStar(px, py, radius) {
  const v = sky.view, e = sky.env, W = viewW(), H = viewH();
  const f = 1 / Math.tan((v.fov * Math.PI) / 360), aspect = W / H;
  const earth = e.earth, Z = e.zenith;
  const pxScale = Math.max(0.8, Math.min(1.4, H / 900));
  const lim = -6 + 13.5 * (e.reveal ?? 1);
  let best = -1, bestD = Infinity, bestB = 0, bestXY = null;
  for (let i = 0; i < catalog.n; i++) {
    let x0 = catalog.pos[i * 3] - v.cam[0], y0 = catalog.pos[i * 3 + 1] - v.cam[1], z0 = catalog.pos[i * 3 + 2] - v.cam[2];
    const dc = Math.hypot(x0, y0, z0);
    x0 /= dc; y0 /= dc; z0 /= dc;
    let m = catalog.absmag[i] + 5 * Math.log10(Math.max(dc, 1e-3) / 3.261563777) - 5;
    if (m > 9) continue;
    let vis = 1;
    if (earth > 0.001) {
      const s = Math.max(-1, Math.min(1, x0 * Z[0] + y0 * Z[1] + z0 * Z[2]));
      const sp = Math.max(s, 0);
      m += earth * 0.2 * (Math.min(1 / (sp + 0.025 * Math.exp(-11 * sp)), 38) - 1);
      const alt = Math.asin(s) * 180 / Math.PI;
      const h = Math.max(alt, -1.9);
      const refr = alt < -2 ? 0 : 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * Math.PI / 180) / 60;
      const hx = x0 - Z[0] * s, hy = y0 - Z[1] * s, hz = z0 - Z[2] * s, hl = Math.hypot(hx, hy, hz) || 1;
      const a2 = (alt + refr * earth) * Math.PI / 180;
      x0 = Math.cos(a2) * hx / hl + Math.sin(a2) * Z[0];
      y0 = Math.cos(a2) * hy / hl + Math.sin(a2) * Z[1];
      z0 = Math.cos(a2) * hz / hl + Math.sin(a2) * Z[2];
      vis = 1 + earth * (smooth((alt - 0.2) / 1.2) - 1);
    }
    const vz = x0 * v.fwd[0] + y0 * v.fwd[1] + z0 * v.fwd[2];
    if (vz <= 1e-6) continue;
    const sx = ((x0 * v.right[0] + y0 * v.right[1] + z0 * v.right[2]) * f / aspect / vz * 0.5 + 0.5) * W;
    const sy = (0.5 - (x0 * v.up[0] + y0 * v.up[1] + z0 * v.up[2]) * f / vz * 0.5) * H;
    const d = Math.hypot(sx - px, sy - py);
    if (d > radius + 12) continue;
    const b = Math.pow(10, -0.4 * (m - catalog.magLimit));
    const inten = Math.min(0.26 * Math.pow(b, 0.62), 60) * vis * (1 - 0.99 * (e.day || 0)) * smooth((lim + 0.7 - m) / 1.4);
    if (inten < 0.06) continue;                         // too faint to be seen as a dot
    // Radius of the visible dot: where the shader's Gaussian core falls to the faint-light floor.
    const dot = 0.75 * pxScale * Math.sqrt(2 * Math.log(Math.max(inten, 0.04) / 0.04));
    if (d > Math.max(radius, dot + 3)) continue;
    // Nearest wins; when two dots practically overlap, the brighter one is the one you see.
    if (d < bestD - 1.5 || (Math.abs(d - bestD) <= 1.5 && b > bestB)) { best = i; bestD = d; bestB = b; bestXY = { x: sx, y: sy }; }
  }
  return best < 0 ? null : { i: best, ...bestXY };
}
let pickCache = { key: '', hit: null };
function placeTooltip(now) {
  if (pointer && pointer.touch && now > pointer.until) pointer = null;
  const settled = S.ready || opening.phase === 'done';   // no tooltips while the opening plays
  let hit = null;
  if (settled && pointer && !drag.active && sky) {
    // Re-pick only when the pointer or the camera moved (12k stars per frame is wasted work otherwise).
    const v = sky.view;
    const key = `${pointer.x}|${pointer.y}|${v.cam.map((c) => c.toFixed(3))}|${v.fwd.map((c) => c.toFixed(5))}|${(sky.env.earth || 0).toFixed(2)}`;
    if (key !== pickCache.key) pickCache = { key, hit: pickStar(pointer.x, pointer.y, pointer.touch ? 22 : 10) };
    hit = pickCache.hit;
  }
  tipEl.classList.toggle('is-on', !!hit);
  if (!hit) { tipKey = ''; return; }
  tipEl.style.transform = `translate3d(${hit.x.toFixed(1)}px, ${hit.y.toFixed(1)}px, 0)`;
  tipXY = { x: hit.x, y: hit.y };
  // Text to the right of the star, or to the left near the edge; on narrow screens keep it inside the view.
  const bodyW = tipEl.lastElementChild.offsetWidth || 260;
  const W = viewW();
  const fitsRight = hit.x + 24 + bodyW < W - 8, fitsLeft = hit.x - 24 - bodyW > 8;
  tipEl.classList.toggle('is-flipped', !fitsRight && fitsLeft);
  const key = `${hit.i}|${lang}|${S.ready}`;
  if (key === tipKey) return;
  tipKey = key;
  const i = hit.i, dist = catalog.dist[i];
  const nowYear = new Date().getFullYear();
  let text;
  if (S.ready) {
    const s = S.story, at = A.arrivalMs(s.birthMs, dist), year = F.parts(at, s.place.tz).year, age = calendarAge(s.birthMs, at, s.place.tz);
    text = dist <= s.R ? L.tipReached(year, age) : age > 100 ? L.tipFar(year) : L.tipWill(L.monthYear(at, here.tz), age);
  } else {
    text = L.tipSeen(nowYear - dist, dist);
  }
  if (!catalog.distKnown(i)) text = L.tipUnknown;
  tipEl.querySelector('.tip-name').textContent = catalog.names.has(i) ? catalog.label(i, lang) : L.unnamedStar;
  tipEl.lastElementChild.style.maxWidth = `${Math.min(300, viewW() - 64)}px`;
  const con = catalog.constellation(i, lang);
  tipEl.querySelector('.tip-meta').textContent = (catalog.distKnown(i) ? L.tipDist(dist) : L.tipDistUnknown) + (con ? ` · ${L.tipCon(con)}` : '');
  tipEl.querySelector('.tip-text').textContent = text;
}
const hintEl = $('#scroll-hint');
const dragHintEl = $('#drag-hint');

// ---------- drag to look around (deep-space views) ----------
const spaceDrag = { yaw: 0, pitch: 0, vy: 0, vp: 0 };
const inSpaceChapter = () => S.ready && Ts > 2.12 && Ts < 3.9;
const canDrag = () => !!sky && ((!S.ready && openP(performance.now() / 1000) > 0.7) || (S.ready && Ts < 0.35) || inSpaceChapter());
let dragTarget = drag, downAt = null;
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && !e.target.closest('button, a, input, select, textarea, label, summary, .birth')) downAt = { x: e.clientX, y: e.clientY };
  if (!canDrag() || e.button !== 0) return;
  if (e.target.closest('input, button, a, select, textarea, label, summary, .birth, .topbar, .colophon')) return;
  dragTarget = !S.ready || Ts < 0.35 ? drag : spaceDrag;
  Object.assign(drag, { active: true, x: e.clientX, y: e.clientY });
  dragTarget.vy = 0; dragTarget.vp = 0;
  downAt = { x: e.clientX, y: e.clientY };
  document.body.classList.add('is-dragging');
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') pointer = e.target.closest('.chapter-text > *, .topbar, .colophon, .birth') ? null : { x: e.clientX, y: e.clientY, touch: false };
  if (!drag.active) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  const t = dragTarget;
  t.vy = -dx * 0.004; t.vp = dy * 0.003;
  t.yaw += t.vy;
  t.pitch = t === drag ? Math.max(-1.4, Math.min(0.8, t.pitch + t.vp)) : Math.max(-0.9, Math.min(0.9, t.pitch + t.vp));
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.used = true;
});
const endDrag = (e) => {
  // A tap that did not move is a request to read the star under the finger.
  if (e && e.pointerType !== 'mouse' && downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 8) {
    pointer = { x: e.clientX, y: e.clientY, touch: true, until: performance.now() + 4500 };
  }
  downAt = null;
  drag.active = false; document.body.classList.remove('is-dragging');
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', () => endDrag(null));
document.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') pointer = null; });
window.addEventListener('blur', () => { pointer = null; });
function frame(now) {
  if (window.__svet && window.__svet.paused) { requestAnimationFrame(frame); return; }
  const rawDt = (now - last) / 1000;
  const dt = Math.min(0.05, rawDt);
  last = now;
  if (sky && sky.gl.isContextLost()) { requestAnimationFrame(frame); return; }
  const T = readScroll();
  Ts += (T - Ts) * (1 - Math.exp(-dt * (reduceMotion ? 30 : 5)));
  if (sky) {
    const sc = scene(Ts, now / 1000);
    const cam = applyTilt(compose(sc));
    const right = norm(cross(cam.fwd, cam.up));
    Object.assign(sky.view, { cam: cam.pos, fwd: cam.fwd, right, up: cross(right, cam.fwd), fov: window.innerWidth < 640 ? 82 : 68 });
    // Fast camera moves leave light trails, the way a long exposure would.
    const ang = Math.acos(Math.max(-1, Math.min(1, dot(cam.fwd, prevCam.fwd))));
    const moved = Math.hypot(...sub(cam.pos, prevCam.pos)) / (Math.hypot(...cam.pos) + 8);
    const speed = (ang + moved) / Math.max(dt, 1 / 240);
    prevCam = { fwd: cam.fwd, pos: cam.pos };
    const diving = S.ready && Ts > 0.05 && Ts < 0.97;
    const trail = reduceMotion || !diving ? 0 : Math.max(0, Math.min(0.5, (speed - 0.35) * 0.3));
    Object.assign(sky.env, sc.env, { time: now / 1000, trail });
    sky.setPlanets(sc.planetFrame.planets);
    sky.render();
    placeObjectLabels(sc);
    placeTooltip(now);
    if (S.ready) {
      placeLabel(heroLabel, S.story.heroPos, sc.labelHero);
      placeLabel(sunLabel, [0, 0, 0], sc.labelSun);
      if (F_STATE.on) placeFutureLabels(); else placeMilestoneLabels(sc);
      declutterLabels();
      updateLife(S.Rshow || 0);
      updateFuture(now / 1000);
      soundForScene(sc);
    }
    if (!skyShown) { skyShown = true; document.body.classList.add('sky-on'); }
    watchPerformance(rawDt, now);
  } else if (S.ready) {
    scene(Ts, now / 1000);
  }
  updateMeta(Ts);
  hintEl.classList.toggle('is-on', S.ready && T > 0.98 && T < 1.25 && !F_STATE.on);
  if (sky) document.body.classList.toggle('sky-bright', (sky.env.day || 0) * (sky.env.earth || 0) > 0.3);
  updateTicker(Ts);
  updateRail(Ts);
  updateCursor();
  dragHintEl.classList.toggle('is-on', !S.ready && !drag.used && !!sky && opening.phase === 'done');
  stageOpening(now / 1000);
  document.body.classList.toggle('can-drag', canDrag());
  if (!drag.active || dragTarget !== drag) {
    drag.yaw += drag.vy; drag.pitch = Math.max(-1.4, Math.min(0.8, drag.pitch + drag.vp));
    drag.vy *= 0.94; drag.vp *= 0.94;
  }
  if (!drag.active || dragTarget !== spaceDrag) {
    spaceDrag.yaw += spaceDrag.vy; spaceDrag.pitch = Math.max(-0.9, Math.min(0.9, spaceDrag.pitch + spaceDrag.vp));
    spaceDrag.vy *= 0.94; spaceDrag.vp *= 0.94;
    if (!inSpaceChapter()) { spaceDrag.yaw *= 0.92; spaceDrag.pitch *= 0.92; }
  }
  requestAnimationFrame(frame);
}

// ---------- form ----------
const form = $('#birth-form');
const errEl = $('#form-error');
function fail(msg, field) {
  errEl.textContent = msg;
  form.querySelectorAll('input').forEach((i) => i.removeAttribute('aria-invalid'));
  if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
}

function placeFromGeo(geo) {
  if (!geo || typeof geo !== 'object') return null;
  const lat = +geo.lat, lon = +geo.lon, tz = String(geo.tz || '');
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180) || !tz) return null;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { return null; }
  return { name: null, lat, lon, tz, guessed: true };
}
function start({ date, time, placeName, geo }, { animate = true } = {}) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!m) return fail(tr('errDate'), $('#f-date'));
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  if (y < 1900) return fail(tr('errOld'), $('#f-date'));
  let place = placeFromGeo(geo) || here;
  if (placeName && placeName.trim()) {
    place = findPlace(placeName);
    if (!place) return fail(tr('errPlace'), $('#f-place'));
  }
  const tm = /^(\d{2}):(\d{2})$/.exec(time || '');
  const timeKnown = !!tm;
  let birthMs;
  try { birthMs = A.zonedToUtc(y, mo, d, tm ? +tm[1] : 0, tm ? +tm[2] : 0, place.tz); } catch { birthMs = Date.UTC(y, mo - 1, d); }
  if (!Number.isFinite(birthMs)) return fail(tr('errParse'), $('#f-date'));
  if (birthMs > Date.now()) return fail(tr('errFuture'), $('#f-date'));
  fail('');

  const btn = form.querySelector('.cta');
  btn.setAttribute('aria-busy', 'true');
  if (animate) { audio.start(); if (!reduceMotion) audio.whoosh(2.8); enableTilt(); }
  S.story = computeStory(birthMs, place, timeKnown);
  fillTexts(S.story);
  S.ready = true;
  chapters.forEach((c) => { c.hidden = false; });
  $('#colophon').hidden = false;
  measure();
  btn.removeAttribute('aria-busy');
  S.query = { date, time: timeKnown ? time : '', placeName: place.guessed ? '' : place.name, lang };
  if (place.guessed) S.query.geo = { lat: +place.lat.toFixed(2), lon: +place.lon.toFixed(2), tz: place.tz };   // the sky of the sender's place, not the reader's

  const target = metrics[1].top;
  if (!animate || reduceMotion) { window.scrollTo(0, target); return; }
  const from = window.scrollY, t0 = performance.now(), dur = 3800;
  const step = (now) => {
    const k = clamp01((now - t0) / dur);
    window.scrollTo(0, from + (target - from) * ease(k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // Background tabs throttle animation frames: make sure the viewer still lands on the first chapter.
  setTimeout(() => { if (window.scrollY === from) window.scrollTo(0, target); }, dur + 400);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  start({ date: $('#f-date').value, time: $('#f-time').value, placeName: $('#f-place').value });
});

// ---------- share and restart ----------
const toB64u = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
$('#share').addEventListener('click', async () => {
  const note = $('#share-note');
  // The date travels in the #hash, which browsers never send to any server.
  const url = `${location.origin}${location.pathname}#s=${toB64u(JSON.stringify(S.query))}`;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: tr('title'), url });
      flashNote(tr('shared'));
    } else {
      await navigator.clipboard.writeText(url);
      flashNote(tr('copied'));
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    note.textContent = url;
  }
});
$('#restart').addEventListener('click', () => {
  if (F_STATE.on) {
    F_STATE.on = false; futureEl.hidden = true; body.classList.remove('in-future');
    document.documentElement.classList.remove('no-scroll'); $('#ch-now').inert = false;
  }
  S.ready = false; S.story = null; S.Rshow = 0; prevR = 0; lifeShown = 0; lifeKey = '';
  opening.phase = 'done';
  msPool.forEach((el) => el.classList.remove('is-on'));
  chapters.forEach((c, i) => { if (i > 0) c.hidden = true; });
  $('#colophon').hidden = true;
  measure();
  window.scrollTo(0, 0);
  heroLabel.classList.remove('is-on'); sunLabel.classList.remove('is-on');
  history.replaceState(null, '', location.pathname);
  $('#f-date').focus();
});

applyStatic();
fillDatalist();
window.addEventListener('resize', measure);
measure();

// Open a shared link: prefill and compute; entering through the gate then flies straight into that sky.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('hashchange', () => { if (/#s=/.test(location.hash)) location.reload(); });
const shared = /#s=([\w-]+)/.exec(location.hash);
if (shared) {
  try {
    const q = JSON.parse(fromB64u(shared[1]));
    // The link's language is used for this visit only; the reader's own saved choice is left alone.
    if (LANGS.includes(q.lang) && q.lang !== lang && !new URLSearchParams(location.search).get('lang')) setLang(q.lang, { save: false });
    if (q.placeName) { const p = findPlace(q.placeName); if (p) q.placeName = placeName(p, lang); }
    $('#f-date').value = q.date || '';
    $('#f-time').value = q.time || '';
    $('#f-place').value = q.placeName || '';
    start(q, { animate: false });
    window.scrollTo(0, 0);
  } catch { /* a broken link just shows the empty form */ }
}

if (document.body.classList.contains('no-webgl')) {
  const n = document.createElement('p');
  n.className = 'fallback-note mono';
  n.dataset.i18n = 'noWebgl';
  n.textContent = tr('noWebgl');
  $('#intro .chapter-text').append(n);
}

// ?debug exposes a synchronous render at a given story time, for automated visual checks.
// Test hook: only on a local dev server, never on the public site.
if (new URLSearchParams(location.search).has('debug') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  opening.phase = 'done';
  window.__svet = {
    paused: false,
    renderAt(T) {
      readScroll();
      Ts = T;
      const sc = scene(T, performance.now() / 1000);
      const cam = compose(sc);
      const right = norm(cross(cam.fwd, cam.up));
      Object.assign(sky.view, { cam: cam.pos, fwd: cam.fwd, right, up: cross(right, cam.fwd) });
      Object.assign(sky.env, sc.env, { trail: 0 });
      sky.setPlanets(sc.planetFrame.planets);
      sky.render();
      placeObjectLabels(sc);
      if (S.ready) { placeLabel(heroLabel, S.story.heroPos, sc.labelHero); placeLabel(sunLabel, [0, 0, 0], sc.labelSun); }
      if (S.ready) { placeMilestoneLabels(sc); updateLife(S.Rshow || 0); }
      return { R: S.Rshow, life: $('#life-log').textContent, hero: S.story && catalog.label(S.story.hero, lang) };
    },
  };
}

requestAnimationFrame(frame);
