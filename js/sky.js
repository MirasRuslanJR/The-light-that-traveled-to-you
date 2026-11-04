// WebGL sky renderer: one 3D engine for both the view from Earth and the view from deep space.
// Stars are drawn at their real 3D positions; apparent brightness is recomputed from the camera's
// distance every frame, so standing at Earth reproduces the real night sky and flying out reveals depth.

const BG_VERT = `
attribute vec2 aXY;
varying vec2 vNdc;
void main() { vNdc = aXY; gl_Position = vec4(aXY, 0.0, 1.0); }`;

const BG_FRAG = `
precision highp float;
varying vec2 vNdc;
uniform vec3 uRight, uUp, uFwd, uCam, uZenith, uSunDir, uMoonDir, uGalN, uGalC;
uniform float uFocal, uAspect, uEarth, uDay, uTwilight, uMoonOn, uMoonR, uR, uSphere, uTime, uMoonLight;
uniform float uPulse, uPulseMax, uPulsePhase, uBgAlpha, uReveal, uPulseAge, uSunGlow;
uniform vec3 uSunHorizonDir, uEastV, uNorthV;

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

// Relative air mass (Kasten & Young 1989) for a direction with sine of altitude mu.
float airmass(float mu) {
  mu = clamp(mu, 0.0, 1.0);
  return 1.0 / (mu + 0.50572 * pow(max(96.07995 - degrees(asin(mu)), 0.1), -1.6364));
}

// Single-scattering sky (Rayleigh + Mie): blue days, white haze at the horizon, red sunsets come out of the physics.
const vec3 TAU_R = vec3(0.0465, 0.1080, 0.2648);   // Rayleigh optical depth at zenith, R G B
const float TAU_M = 0.055;                          // aerosols: a clear summer day, not a perfect vacuum
const vec3 TAU_O3 = vec3(0.034, 0.042, 0.002);     // ozone absorption at zenith
vec3 skyLight(vec3 dir, vec3 light, float mu) {
  float muL = dot(light, uZenith);
  float c = dot(dir, light);
  float pR = 0.0596831 * (1.0 + c * c);
  const float g = 0.76;
  float pM = 0.0795775 * (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * c, 1.5);
  vec3 tau = TAU_R + TAU_M;
  vec3 sunlit = exp(-(tau + TAU_O3 * 2.2) * airmass(muL + 0.035));
  vec3 inscatter = (TAU_R * pR + TAU_M * pM) / tau * (1.0 - exp(-tau * airmass(mu)));
  // A little multiple scattering: light that bounced more than once fills the whole dome with soft blue.
  vec3 multi = TAU_R * 0.06 * exp(-(tau + TAU_O3 * 2.2) * airmass(max(muL, 0.0) + 0.06)) * (1.0 - exp(-tau * airmass(mu)));
  return inscatter * sunlit + multi;
}

// Glow of a shell of light of radius R centred on the Sun.
float shellGlow(vec3 dir, float R) {
  float b = dot(uCam, dir);
  float cc = dot(uCam, uCam) - R * R;
  float disc = b * b - cc;
  float g = 0.0;
  if (disc > 0.0) {
    float t1 = -b - sqrt(disc);
    if (t1 > 0.0) {
      vec3 nrm = (uCam + dir * t1) / R;
      float rim = pow(1.0 - abs(dot(nrm, dir)), 5.0);
      float ripple = 0.85 + 0.15 * sin(dot(nrm, vec3(9.0, 7.0, 11.0)) + uTime * 0.6);
      g += rim * 1.1 * ripple + 0.022;
    }
  }
  float dmin = sqrt(max(dot(uCam, uCam) - b * b, 0.0));
  if (b < 0.0) g += 0.22 * exp(-pow((dmin - R) / (R * 0.035), 2.0));
  return g;
}

// Faint background stars far below the catalogue's limit: the grain of the Milky Way.
float starDust(vec3 dir, float density) {
  vec3 p = dir * 330.0;
  vec3 i = floor(p), f = fract(p);
  float h = hash(i);
  if (h > density) return 0.0;
  vec3 c = vec3(hash(i + 1.31), hash(i + 2.77), hash(i + 4.13));
  vec3 d = f - c;
  float br = pow(hash(i + 9.17), 5.0);
  return exp(-dot(d, d) * 38.0) * (0.06 + br * 0.9);
}

void main() {
  vec3 dir = normalize(uFwd + vNdc.x * uAspect / uFocal * uRight + vNdc.y / uFocal * uUp);
  float s = dot(dir, uZenith);                       // sine of altitude
  vec3 col = vec3(0.0035, 0.0045, 0.009);

  // ----- Milky Way, laid out in real galactic coordinates -----
  vec3 gx = uGalC, gz = uGalN, gy = normalize(cross(gz, gx));
  float gb = asin(clamp(dot(dir, gz), -1.0, 1.0));
  float glon = atan(dot(dir, gy), dot(dir, gx));       // 0 toward the centre in Sagittarius
  float disk = exp(-abs(gb) / 0.10) * (0.32 + 0.68 * exp(-glon * glon / 1.9));
  float bulge = exp(-(glon * glon / 0.09 + gb * gb / 0.028));
  float n1 = fbm(dir * 6.0), n2 = fbm(dir * 15.0 + 7.0);
  float clouds = smoothstep(0.2, 0.9, n1 * 0.75 + n2 * 0.45);
  float rift = smoothstep(0.42, 0.78, fbm(dir * 8.0 + 3.0)) * exp(-pow(gb / 0.04, 2.0)) * smoothstep(1.5, 0.3, abs(glon));
  float mw = (disk * (0.35 + 0.95 * clouds) + bulge * 1.3) * (1.0 - 0.88 * rift);
  vec3 mwTint = mix(vec3(0.72, 0.8, 1.0), vec3(1.0, 0.85, 0.66), clamp(bulge * 1.6 + exp(-glon * glon / 0.6) * 0.45, 0.0, 1.0));
  float skyDark = uEarth > 0.001 ? (1.0 - uDay) * (1.0 - 0.75 * uMoonLight) * (1.0 - 0.8 * uTwilight) : 1.0;
  col += mwTint * mw * 0.075 * uReveal * mix(1.0, skyDark, uEarth);
  float dust = starDust(dir, 0.035 + 0.3 * clamp(mw, 0.0, 1.0));
  col += vec3(0.95, 0.95, 1.0) * dust * 0.55 * uReveal * mix(1.0, skyDark, uEarth);

  // ----- Atmosphere, only while standing on Earth -----
  if (uEarth > 0.001) {
    float mu = max(s, 0.0);
    float sunAlt = degrees(asin(clamp(dot(uSunDir, uZenith), -1.0, 1.0)));
    float dayP = smoothstep(-4.0, 6.0, sunAlt);
    float twiP = smoothstep(-18.0, 0.0, sunAlt) * (1.0 - dayP);
    float skyK = clamp((uDay + uTwilight) / max(dayP + twiP, 1e-3), 0.0, 1.0);   // lets the story "switch the Sun off"
    float lightUp = smoothstep(-18.0, -2.0, sunAlt);
    vec3 sky = skyLight(dir, uSunDir, mu) * 26.0 * lightUp * skyK;
    // Moonlight scatters the same way, about 400 000 times fainter than sunlight; eyes adapt, so it is boosted.
    sky += skyLight(dir, uMoonDir, mu) * 1.5 * uMoonLight;
    // Airglow and a little light pollution, strongest near the horizon.
    float hz = exp(-mu * 7.0);
    vec3 night = vec3(0.008, 0.012, 0.010) * hz + vec3(0.007, 0.0065, 0.006) * exp(-mu * 14.0);
    vec3 skyCol = col * exp(-(TAU_R + TAU_M) * airmass(mu) * 0.5) + sky + night;

    // Sun disc with limb darkening, reddened by the air in front of it.
    float cs = dot(dir, uSunDir);
    float rS = 0.00467;                                          // 0.267°
    float ang = acos(clamp(cs, -1.0, 1.0));
    if (ang < rS * 1.2) {
      float q = clamp(ang / rS, 0.0, 1.0);
      float limb = 1.0 - 0.6 * (1.0 - sqrt(1.0 - q * q));
      vec3 sunCol = vec3(1.0, 0.97, 0.92) * exp(-(TAU_R + TAU_M) * airmass(dot(uSunDir, uZenith)));
      skyCol += sunCol * limb * smoothstep(1.05, 0.95, ang / rS) * 60.0 * skyK * lightUp;
    }

    // Ground: a low, irregular horizon so it reads as a real place, lit by whatever lights the sky.
    float az = atan(dot(dir, uEastV), dot(dir, uNorthV));
    float far = 0.012 + 0.03 * fbm(vec3(cos(az) * 2.0, sin(az) * 2.0, 1.7));
    float near = 0.004 + 0.018 * fbm(vec3(cos(az) * 5.0, sin(az) * 5.0, 7.3));
    float gFar = smoothstep(far + 0.0015, far - 0.0015, s);
    float gNear = smoothstep(near + 0.0015, near - 0.0015, s);
    vec3 ambient = skyLight(uZenith, uSunDir, 1.0) * 26.0 * lightUp * skyK + vec3(0.004, 0.005, 0.007) + skyLight(uZenith, uMoonDir, 1.0) * 0.5 * uMoonLight;
    float amb = dot(ambient, vec3(0.2126, 0.7152, 0.0722));
    vec3 aerial = ambient * 0.35;                                // distant hills fade into the air
    vec3 farCol = mix(vec3(0.30, 0.31, 0.27) * amb * 0.5, aerial, 0.55) + vec3(0.006, 0.008, 0.013);
    vec3 nearCol = vec3(0.16, 0.17, 0.13) * amb * 0.35 + vec3(0.002, 0.0025, 0.004);
    vec3 ground = mix(farCol, nearCol, gNear);
    col = mix(col, mix(skyCol, ground, gFar), uEarth);
  }

  // ----- Moon: a sphere of regolith (Lommel–Seeliger), so phase and the bright limb come out of the geometry -----
  if (uMoonOn > 0.001) {
    float c = dot(dir, uMoonDir);
    vec3 off = dir - uMoonDir * c;
    float rho = length(off) / sin(uMoonR);
    vec3 mx = normalize(cross(uMoonDir, abs(uMoonDir.z) < 0.9 ? vec3(0,0,1) : vec3(1,0,0)));
    vec3 my = cross(uMoonDir, mx);
    if (c > 0.0 && rho < 1.0) {
      float u = dot(off, mx) / sin(uMoonR), v = dot(off, my) / sin(uMoonR);
      float w = sqrt(max(0.0, 1.0 - u * u - v * v));
      vec3 nrm = u * mx + v * my - w * uMoonDir;
      float mu0 = max(dot(nrm, uSunDir), 0.0);
      float ls = 2.0 * mu0 / (mu0 + w + 1e-4);
      vec3 sp = vec3(u, v, w);
      float maria = 1.0 - 0.38 * smoothstep(0.45, 0.62, fbm(sp * 2.2 + 5.0));
      float craters = 0.9 + 0.1 * smoothstep(0.3, 0.8, fbm(sp * 9.0 + 1.0)) - 0.12 * smoothstep(0.72, 0.9, noise(sp * 18.0));
      float albedo = maria * craters;
      vec3 moonCol = vec3(1.0, 0.97, 0.92) * albedo * ls * 1.5 + vec3(0.010, 0.012, 0.018) * albedo;   // + earthshine
      if (uEarth > 0.001) moonCol *= mix(vec3(1.0), exp(-(TAU_R + TAU_M) * 0.6 * airmass(max(dot(uMoonDir, uZenith), 0.0))), uEarth);
      float edge = smoothstep(1.0, 0.96, rho);
      // Seen from the ground the Moon's light adds to the sky in front of it (its night side shows sky, never a hole);
      // seen from space it simply covers what lies behind.
      col = mix(col, mix(moonCol, col + moonCol, uEarth), edge * uMoonOn);
    }
    float glowR = acos(clamp(c, -1.0, 1.0)) / uMoonR;
    col += vec3(0.85, 0.88, 1.0) * (0.05 * exp(-glowR * 0.5) + 0.01 * exp(-glowR * 0.06)) * uMoonOn * (1.0 - uDay) * uMoonLight;
  }

  vec3 gold = vec3(1.0, 0.78, 0.48);
  // The light sphere: everywhere the light of one moment has reached.
  if (uSphere > 0.001 && uR > 0.0) col += gold * shellGlow(dir, uR) * uSphere;

  // Pulses: the light of the present moment, leaving Earth again and again (time-lapse).
  if (uPulse > 0.001) {
    for (int k = 0; k < 4; k++) {
      float f = fract(uPulsePhase + float(k) * 0.25);
      float fade = smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.5, 1.0, f)) * step(f, uPulseAge);
      col += gold * shellGlow(dir, max(uPulseMax * f, 0.05)) * fade * uPulse * 0.8;
    }
  }

  // The Sun from deep space: a G2V star (white with a hint of warmth), shown brighter than life so home is never lost.
  float space = 1.0 - uEarth;
  if (space > 0.001 && length(uCam) > 0.5) {
    float c = max(dot(dir, normalize(-uCam)), 0.0);
    vec3 g2v = vec3(1.0, 0.95, 0.88);
    col += g2v * (pow(c, 90000.0) * 4.0 + pow(c, 6000.0) * 0.35 + pow(c, 600.0) * 0.03 + pow(c, 300.0) * 0.05 * max(uSunGlow - 1.0, 0.0)) * space * uSunGlow;
  }

  // Dither to keep the dark gradients free of banding.
  col += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, uBgAlpha);
}`;

// Constellation figures, drawn faintly on the celestial sphere while standing on Earth.
const LINE_VERT = `
attribute vec3 aDir;
uniform vec3 uRight, uUp, uFwd, uZenith;
uniform float uFocal, uAspect;
varying float vA;
void main() {
  vA = smoothstep(0.03, 0.14, dot(aDir, uZenith));
  gl_Position = vec4(dot(aDir, uRight) * uFocal / uAspect, dot(aDir, uUp) * uFocal, 0.0, dot(aDir, uFwd));
}`;
const LINE_FRAG = `
precision mediump float;
uniform float uAlpha;
varying float vA;
void main() { gl_FragColor = vec4(vec3(0.72, 0.78, 0.95) * 0.13 * uAlpha * vA, 1.0); }`;

const STAR_VERT = `
attribute vec4 aPosAbs;     // xyz light-years (J2000), absolute magnitude
attribute vec4 aColSeed;    // rgb, seed (seed < 0: Sun; < -1.5: planet)
uniform vec3 uCam, uRight, uUp, uFwd, uZenith;
uniform float uFocal, uAspect, uPx, uTime, uEarth, uDay, uR, uSphere, uMagLimit, uMoonLight;
uniform float uPulse, uPulseMax, uPulsePhase, uReveal, uPulseAge;
varying vec3 vColor;
varying float vI;
varying float vSize;
varying float vSigma;
varying float vSpike;

float log10(float x) { return log(x) * 0.4342944819; }

void main() {
  vec3 rel = aPosAbs.xyz - uCam;
  float d = max(length(rel), 1e-3);
  vec3 dir = rel / d;
  float m = aPosAbs.w + 5.0 * log10(d / 3.261563777) - 5.0;
  vec3 c = aColSeed.rgb;

  float vis = 1.0, scint = 0.0;
  if (uEarth > 0.001) {
    float s = clamp(dot(dir, uZenith), -1.0, 1.0);
    float sp = max(s, 0.0);
    float am = min(1.0 / (sp + 0.025 * exp(-11.0 * sp)), 38.0);
    m += uEarth * 0.2 * (am - 1.0);                                  // atmospheric extinction
    c *= mix(vec3(1.0), exp(-vec3(-0.02, 0.025, 0.09) * (am - 1.0)), uEarth);   // reddening near the horizon
    float altDeg = degrees(asin(s));
    float h = max(altDeg, -1.9);
    float refr = altDeg < -2.0 ? 0.0 : 1.02 / tan(radians(h + 10.3 / (h + 5.11))) / 60.0;
    vec3 hor = normalize(dir - uZenith * s + vec3(1e-6));
    float a2 = radians(altDeg + refr * uEarth);
    dir = normalize(cos(a2) * hor + sin(a2) * uZenith);             // atmospheric refraction lifts stars
    vis = mix(1.0, smoothstep(0.2, 1.4, altDeg), uEarth);
    scint = uEarth * (0.06 + 0.3 * pow(1.0 - sp, 3.0));             // twinkling grows toward the horizon
  }
  bool isSun = aColSeed.w < 0.0 && aColSeed.w > -1.5;
  bool isPlanet = aColSeed.w < -1.5;
  if (isSun) vis = 0.0;
  if (isPlanet) { vis *= uEarth; scint *= 0.15; }

  float dist0 = length(aPosAbs.xyz);
  float star = step(0.0, aColSeed.w);
  float reached = step(dist0, uR) * uSphere * star;
  float front = exp(-pow((dist0 - uR) / max(0.35, uR * 0.012), 2.0)) * uSphere * star;
  if (uPulse > 0.001) {
    for (int k = 0; k < 4; k++) {
      float f = fract(uPulsePhase + float(k) * 0.25);
      float fade = smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.5, 1.0, f)) * step(f, uPulseAge);
      front += exp(-pow((dist0 - uPulseMax * f) / 0.9, 2.0)) * fade * uPulse * 0.8 * star;
    }
  }

  // Flux relative to the naked-eye limit; brightness on screen follows the eye's response, without a ceiling (HDR).
  float b = pow(10.0, -0.4 * (m - uMagLimit));
  float seed = fract(aColSeed.w * 7.31);
  float tw = 1.0 + scint * sin(uTime * (7.0 + seed * 9.0) + aColSeed.w * 91.0) * (0.6 + 0.4 * sin(uTime * 2.3 + seed * 40.0));
  float inten = min(0.26 * pow(b, 0.62), 60.0);
  inten *= tw * vis * (1.0 - 0.99 * uDay) * (1.0 - 0.6 * uMoonLight * star);
  float lim = mix(-6.0, 7.5, uReveal);
  inten *= smoothstep(lim + 0.7, lim - 0.7, m);
  inten += front * 2.2;
  if (scint > 0.0) c *= 1.0 + scint * 0.5 * vec3(sin(uTime * 11.0 + seed * 60.0), sin(uTime * 13.0 + seed * 23.0), sin(uTime * 9.0 + seed * 87.0));

  float lb = log10(1.0 + b);
  float size = (6.0 + 9.0 * lb + front * 10.0) * uPx;
  size = min(size, 64.0 * uPx);
  vSize = size;
  vSigma = 0.75 * uPx;
  vSpike = isPlanet || isSun ? 0.0 : clamp((lb - 2.4) / 1.6, 0.0, 1.0) * (1.0 - uDay) * uEarth;

  c = mix(c, vec3(1.0, 0.82, 0.56), reached * 0.55 + front * 0.6);
  vColor = c;
  vI = inten;

  float vx = dot(dir, uRight), vy = dot(dir, uUp), vz = dot(dir, uFwd);
  gl_Position = vec4(vx * uFocal / uAspect, vy * uFocal, 0.0, vz);
  gl_PointSize = inten < 0.004 ? 0.0 : size;
}`;

// Point-spread function: a sharp core and soft wings, as a real lens and eye render a star.
const STAR_FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vI;
varying float vSize;
varying float vSigma;
varying float vSpike;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float q = r * vSize * 0.5 / vSigma;
  float core = exp(-0.5 * q * q);
  float wings = 0.03 / (1.0 + 0.06 * q * q);
  float spike = (exp(-abs(p.y) * vSize * 0.5 / vSigma * 0.9) * (1.0 - abs(p.x)) + exp(-abs(p.x) * vSize * 0.5 / vSigma * 0.9) * (1.0 - abs(p.y))) * 0.12 * vSpike;
  float edge = smoothstep(1.0, 0.7, r);
  gl_FragColor = vec4(vColor * vI * (core + (wings + spike) * edge), 1.0);
}`;

// ---------- post-processing: bloom, film grain, vignette ----------
const POST_VERT = `
attribute vec2 aXY;
varying vec2 vUv;
void main() { vUv = aXY * 0.5 + 0.5; gl_Position = vec4(aXY, 0.0, 1.0); }`;

// Downsample and keep only what is bright enough to glow.
const BRIGHT_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThr;
void main() {
  vec3 c = texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture2D(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float lum = max(max(c.r, c.g), c.b);
  float k = uThr <= 0.0 ? 1.0 : smoothstep(uThr * 0.6, uThr * 2.2, lum);   // soft knee
  gl_FragColor = vec4(c * k, 1.0);
}`;

// Separable Gaussian blur.
const BLUR_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.2270270;
  c += (texture2D(uTex, vUv + uDir * 1.0).rgb + texture2D(uTex, vUv - uDir * 1.0).rgb) * 0.1945946;
  c += (texture2D(uTex, vUv + uDir * 2.0).rgb + texture2D(uTex, vUv - uDir * 2.0).rgb) * 0.1216216;
  c += (texture2D(uTex, vUv + uDir * 3.0).rgb + texture2D(uTex, vUv - uDir * 3.0).rgb) * 0.0540541;
  c += (texture2D(uTex, vUv + uDir * 4.0).rgb + texture2D(uTex, vUv - uDir * 4.0).rgb) * 0.0162162;
  gl_FragColor = vec4(c, 1.0);
}`;

// Scene + two glow radii, a soft vignette and moving film grain.
const COMPOSITE_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uScene, uBloomNear, uBloomFar;
uniform vec2 uRes;
uniform float uTime, uBloomK, uAspect;
float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main() {
  vec3 c = texture2D(uScene, vUv).rgb;
  vec3 bn = texture2D(uBloomNear, vUv).rgb, bf = texture2D(uBloomFar, vUv).rgb;
  c += (bn * 0.55 + bf * 0.5) * uBloomK;
  float L = max(max(c.r, c.g), c.b);
  float Lt = L < 0.7 ? L : 0.7 + 0.3 * (1.0 - exp(-(L - 0.7) / 0.3));
  c *= Lt / max(L, 1e-5);
  c = mix(c, vec3(Lt), smoothstep(1.5, 10.0, L) * 0.75);            // the hottest cores burn to white, like film
  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
  c *= mix(0.7, 1.0, smoothstep(0.95, 0.25, length(q) / max(uAspect, 1.0) * 1.35));
  c += (hash(vUv * uRes + fract(uTime * 7.31) * 100.0) - 0.5) * 0.022;
  gl_FragColor = vec4(c, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

// Galactic north pole and centre (J2000), for the Milky Way band.
const radec = (ra, dec) => { const a = ra * Math.PI / 180, d = dec * Math.PI / 180; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; };
const GAL_N = radec(192.85948, 27.12825);
const GAL_C = radec(266.40499, -28.93617);

export function createSky(canvas, catalog, lines = []) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  if (!gl) throw new Error('webgl-unavailable');

  const bg = program(gl, BG_VERT, BG_FRAG);
  const st = program(gl, STAR_VERT, STAR_FRAG);
  const ln = program(gl, LINE_VERT, LINE_FRAG);
  const lineBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
  const lineCount = lines.length / 3;
  const brightP = program(gl, POST_VERT, BRIGHT_FRAG);
  const blurP = program(gl, POST_VERT, BLUR_FRAG);
  const compP = program(gl, POST_VERT, COMPOSITE_FRAG);
  let post = true;
  const targets = { w: 0, h: 0 };
  const halfExt = gl.getExtension('OES_texture_half_float');
  const halfLinear = !!gl.getExtension('OES_texture_half_float_linear');
  gl.getExtension('EXT_color_buffer_half_float');
  let hdr = !!halfExt;   // switched off below if the GPU cannot render into half-float textures
  function target(tw, th, wantHdr = hdr) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const type = wantHdr ? halfExt.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
    const filter = wantHdr && !halfLinear ? gl.NEAREST : gl.LINEAR;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ok ? { tex, fb, w: tw, h: th } : null;
  }
  function freeTargets() {
    for (const k of ['scene', 'a', 'b', 'c', 'd']) if (targets[k]) { gl.deleteTexture(targets[k].tex); gl.deleteFramebuffer(targets[k].fb); targets[k] = null; }
  }
  /** Off-screen buffers, rebuilt when the canvas size changes. False if this GPU cannot render to textures. */
  function ensureTargets() {
    if (targets.w === w && targets.h === h && targets.scene) return true;
    freeTargets();
    targets.w = w; targets.h = h;
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2), ew = Math.max(1, w >> 3), eh = Math.max(1, h >> 3);
    const build = () => {
      targets.scene = target(w, h);
      // Glow buffers are sampled with filtering: keep them half-float only if filtering works there.
      const glowHdr = hdr && halfLinear;
      targets.a = target(qw, qh, glowHdr); targets.b = target(qw, qh, glowHdr);
      targets.c = target(ew, eh, glowHdr); targets.d = target(ew, eh, glowHdr);
      return targets.scene && targets.a && targets.b && targets.c && targets.d;
    };
    if (!build()) {
      freeTargets();
      if (hdr) { hdr = false; targets.w = w; targets.h = h; if (build()) return true; freeTargets(); }
      post = false;
      return false;
    }
    return true;
  }
  function fullscreen(prog) {
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    const a = gl.getAttribLocation(prog.p, 'aXY');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(a);
  }
  function pass(prog, dst, src, set) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
    gl.viewport(0, 0, dst ? dst.w : w, dst ? dst.h : h);
    gl.useProgram(prog.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(prog.u.uTex, 0);
    set(prog.u);
    fullscreen(prog);
  }

  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  // Star buffer, plus the Sun at the origin (visible only once the camera leaves Earth).
  const PLANETS = 5;
  const n = catalog.n + 1 + PLANETS;
  const data = new Float32Array(n * 8);
  for (let i = 0; i < catalog.n; i++) {
    data.set([catalog.pos[i * 3], catalog.pos[i * 3 + 1], catalog.pos[i * 3 + 2], catalog.absmag[i],
      catalog.color[i * 3], catalog.color[i * 3 + 1], catalog.color[i * 3 + 2], (i * 0.618034) % 1], i * 8);
  }
  data.set([0, 0, 0, 4.83, 1, 0.9, 0.7, -1], catalog.n * 8);
  const starBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const view = { cam: [0, 0, 0], right: [1, 0, 0], up: [0, 0, 1], fwd: [0, 1, 0], fov: 70 };
  const env = {
    zenith: [0, 0, 1], east: [1, 0, 0], north: [0, 1, 0], earth: 1, day: 0, twilight: 0, sunDir: [1, 0, 0], sunHorizonDir: [1, 0, 0],
    moonDir: [1, 0, 0], moonOn: 0, moonScale: 3.0, moonLight: 0, sphereR: 0, sphereOn: 0, time: 0,
    pulse: 0, pulseMax: 40, pulsePhase: 0, lines: 0, trail: 0, reveal: 1, pulseAge: 1000, sunGlow: 1,
  };
  const FAR = 1e6; // light-years: far enough that planets keep their place while the camera moves on Earth
  const PLANET_RGB = { mercury: [0.92, 0.88, 0.82], venus: [1, 0.97, 0.9], mars: [1, 0.72, 0.52], jupiter: [1, 0.95, 0.86], saturn: [1, 0.92, 0.76] };
  /** Planets as seen from Earth: [{ name, dir (J2000 unit), mag }]. */
  function setPlanets(list) {
    const buf = new Float32Array(PLANETS * 8);
    list.slice(0, PLANETS).forEach((p, k) => {
      const absmag = p.mag - 5 * Math.log10(FAR / 3.261563777) + 5;
      const c = PLANET_RGB[p.name] || [1, 1, 1];
      buf.set([p.dir[0] * FAR, p.dir[1] * FAR, p.dir[2] * FAR, absmag, c[0], c[1], c[2], -2], k * 8);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, (catalog.n + 1) * 32, buf);
  }
  let w = 1, h = 1, dpr = 1, maxDpr = 2;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }

  const focal = () => 1 / Math.tan((view.fov * Math.PI) / 360);

  function render() {
    resize();
    const aspect = w / h;
    const f = focal();
    if (post && ensureTargets()) {
      const T = targets;
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.scene.fb);
      gl.viewport(0, 0, w, h);
      drawScene(aspect, f);
      gl.disable(gl.BLEND);
      pass(brightP, T.a, T.scene, (u) => { gl.uniform2f(u.uTexel, 1 / w, 1 / h); gl.uniform1f(u.uThr, hdr ? 0.9 : 0.35); });
      pass(blurP, T.b, T.a, (u) => gl.uniform2f(u.uDir, 1 / T.a.w, 0));
      pass(blurP, T.a, T.b, (u) => gl.uniform2f(u.uDir, 0, 1 / T.a.h));
      pass(brightP, T.c, T.a, (u) => { gl.uniform2f(u.uTexel, 0.5 / T.a.w, 0.5 / T.a.h); gl.uniform1f(u.uThr, 0); });
      pass(blurP, T.d, T.c, (u) => gl.uniform2f(u.uDir, 1.5 / T.c.w, 0));
      pass(blurP, T.c, T.d, (u) => gl.uniform2f(u.uDir, 0, 1.5 / T.c.h));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(compP.p);
      const C = compP.u;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.scene.tex); gl.uniform1i(C.uScene, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.a.tex); gl.uniform1i(C.uBloomNear, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.c.tex); gl.uniform1i(C.uBloomFar, 2);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform2f(C.uRes, w, h); gl.uniform1f(C.uTime, env.time); gl.uniform1f(C.uAspect, aspect);
      gl.uniform1f(C.uBloomK, env.bloom ?? 1);
      fullscreen(compP);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      drawScene(aspect, f);
    }
  }

  function drawScene(aspect, f) {
    gl.disable(gl.DEPTH_TEST);
    const trail = Math.max(0, Math.min(0.8, env.trail || 0));
    if (trail > 0.01) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
    else gl.disable(gl.BLEND);

    gl.useProgram(bg.p);
    gl.uniform1f(bg.u.uBgAlpha, 1 - trail);
    const U = bg.u;
    gl.uniform3fv(U.uRight, view.right); gl.uniform3fv(U.uUp, view.up); gl.uniform3fv(U.uFwd, view.fwd);
    gl.uniform3fv(U.uCam, view.cam); gl.uniform3fv(U.uZenith, env.zenith);
    gl.uniform3fv(U.uSunDir, env.sunDir); gl.uniform3fv(U.uSunHorizonDir, env.sunHorizonDir);
    gl.uniform3fv(U.uMoonDir, env.moonDir);
    gl.uniform3fv(U.uEastV, env.east); gl.uniform3fv(U.uNorthV, env.north);
    gl.uniform3fv(U.uGalN, GAL_N); gl.uniform3fv(U.uGalC, GAL_C);
    gl.uniform1f(U.uFocal, f); gl.uniform1f(U.uAspect, aspect);
    gl.uniform1f(U.uEarth, env.earth); gl.uniform1f(U.uDay, env.day); gl.uniform1f(U.uTwilight, env.twilight);
    gl.uniform1f(U.uMoonOn, env.moonOn * env.earth);
    gl.uniform1f(U.uMoonR, (0.2595 * env.moonScale * Math.PI) / 180);
    gl.uniform1f(U.uR, env.sphereR); gl.uniform1f(U.uSphere, env.sphereOn); gl.uniform1f(U.uTime, env.time);
    gl.uniform1f(U.uMoonLight, env.moonLight * env.earth);
    gl.uniform1f(U.uPulse, env.pulse); gl.uniform1f(U.uPulseMax, env.pulseMax); gl.uniform1f(U.uPulsePhase, env.pulsePhase);
    gl.uniform1f(U.uReveal, env.reveal ?? 1); gl.uniform1f(U.uPulseAge, env.pulseAge ?? 1000); gl.uniform1f(U.uSunGlow, env.sunGlow ?? 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    const aXY = gl.getAttribLocation(bg.p, 'aXY');
    gl.enableVertexAttribArray(aXY);
    gl.vertexAttribPointer(aXY, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(aXY);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const lineAlpha = (env.lines || 0) * env.earth * (1 - env.day);
    if (lineAlpha > 0.01 && lineCount) {
      gl.useProgram(ln.p);
      gl.uniform3fv(ln.u.uRight, view.right); gl.uniform3fv(ln.u.uUp, view.up); gl.uniform3fv(ln.u.uFwd, view.fwd);
      gl.uniform3fv(ln.u.uZenith, env.zenith);
      gl.uniform1f(ln.u.uFocal, f); gl.uniform1f(ln.u.uAspect, aspect); gl.uniform1f(ln.u.uAlpha, lineAlpha);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      const aD = gl.getAttribLocation(ln.p, 'aDir');
      gl.enableVertexAttribArray(aD);
      gl.vertexAttribPointer(aD, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, lineCount);
      gl.disableVertexAttribArray(aD);
    }
    gl.useProgram(st.p);
    const S = st.u;
    gl.uniform3fv(S.uCam, view.cam); gl.uniform3fv(S.uRight, view.right); gl.uniform3fv(S.uUp, view.up);
    gl.uniform3fv(S.uFwd, view.fwd); gl.uniform3fv(S.uZenith, env.zenith);
    gl.uniform1f(S.uFocal, f); gl.uniform1f(S.uAspect, aspect);
    gl.uniform1f(S.uPx, dpr * Math.max(0.8, Math.min(1.4, h / dpr / 900)));
    gl.uniform1f(S.uTime, env.time); gl.uniform1f(S.uEarth, env.earth); gl.uniform1f(S.uDay, env.day);
    gl.uniform1f(S.uR, env.sphereR); gl.uniform1f(S.uSphere, env.sphereOn); gl.uniform1f(S.uMagLimit, catalog.magLimit);
    gl.uniform1f(S.uMoonLight, env.moonLight * env.earth);
    gl.uniform1f(S.uPulse, env.pulse); gl.uniform1f(S.uPulseMax, env.pulseMax); gl.uniform1f(S.uPulsePhase, env.pulsePhase);
    gl.uniform1f(S.uReveal, env.reveal ?? 1); gl.uniform1f(S.uPulseAge, env.pulseAge ?? 1000);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    const aP = gl.getAttribLocation(st.p, 'aPosAbs');
    const aC = gl.getAttribLocation(st.p, 'aColSeed');
    gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aC);
    gl.vertexAttribPointer(aP, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(aC, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.disableVertexAttribArray(aP); gl.disableVertexAttribArray(aC);
  }

  /** Screen position (CSS px) of a world point, or null when it is behind the camera. */
  function project(p) {
    const rel = [p[0] - view.cam[0], p[1] - view.cam[1], p[2] - view.cam[2]];
    const vz = rel[0] * view.fwd[0] + rel[1] * view.fwd[1] + rel[2] * view.fwd[2];
    if (vz <= 1e-6) return null;
    const vx = rel[0] * view.right[0] + rel[1] * view.right[1] + rel[2] * view.right[2];
    const vy = rel[0] * view.up[0] + rel[1] * view.up[1] + rel[2] * view.up[2];
    const f = focal();
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const x = (vx * f) / (cw / ch) / vz, y = (vy * f) / vz;
    return { x: (x * 0.5 + 0.5) * cw, y: (0.5 - y * 0.5) * ch };
  }

  gl.canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

  /** Lower the render resolution on devices that cannot keep up. */
  function setMaxDpr(v) { maxDpr = v; }
  /** Bloom and grain on or off (off is the first thing to go on a slow GPU). */
  function setPost(on) { post = on; if (!on) freeTargets(); }
  return { gl, view, env, render, project, resize, setPlanets, setMaxDpr, setPost, get post() { return post; }, get hdr() { return post && hdr; } };
}
