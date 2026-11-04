# The Light That Traveled to You

**The light of your birth is still traveling.** Enter the day you were born and this site shows the real sky above you in your first minutes of life — then follows the light that left Earth at that moment through the real neighbourhood of the Sun: which stars it has already reached, at what age, and when it will touch the next one.

*Свет, который летел к тебе — the site is bilingual: English by default, Russian one click away.*

## The experience

1. **Opening.** A single point of light in the dark. Choose sound or silence. The stars appear brightest first, the way eyes adjust at night, while pulses of light leave the Sun.
2. **Your night.** The exact sky over your birthplace at your birth time: 12,125 real stars, the Moon in its real phase, the planets, constellation figures, refraction and extinction near the horizon. A daytime birth shows a physically scattered blue sky first.
3. **The light leaves.** The camera pulls away from Earth while a golden sphere — the distance your light has traveled — grows through real 3D space. Every star it touches lights up and rings: *age 8 — Sirius, age 11 — Procyon, age 25 — Vega.*
4. **The next star.** The next bright, named star the light will reach that rises where you live, and the month it will arrive.
5. **Tonight.** Back to tonight's real sky over you, with a live counter of how far the light is right now (299,792 km further every second).
6. **What happens next.** The light keeps going, year by year, to your hundredth birthday and the stars it will touch on the way.

Hover (or tap) any star to read what it means to you. Drag, or tilt your phone, to look around. Download a personal postcard, or send someone the link to their own light.

## Built with

Plain HTML, CSS and JavaScript — no frameworks, no libraries, no build step, no server. Everything is computed in the browser; nothing is sent anywhere.

- **Rendering:** hand-written WebGL. HDR pipeline with half-float targets, two-radius bloom, a filmic shoulder, vignette and grain. Stars are drawn with a point-spread function, coloured from their B−V index, reddened and twinkling near the horizon. The day sky is single-scattering Rayleigh + Mie with ozone absorption; the Moon is shaded with the Lommel–Seeliger law; the Milky Way is laid out in galactic coordinates and baked once into a texture.
- **Astronomy:** formulas from Jean Meeus, *Astronomical Algorithms* — sidereal time, IAU 1976 precession, horizontal coordinates, refraction, the Sun, the Moon (main periodic terms, seen from where you stand) and the planets (JPL Keplerian elements with light-time correction; Saturn's brightness includes its rings). Historical time zones come from the browser's own IANA database.
- **Sound:** generated live with the Web Audio API — no audio files.

## Accuracy

The core formulas are checked against the book's worked examples:

```bash
node tools/test-astro.mjs
node tools/test-planets.mjs
```

The Moon matches Meeus example 47.a to 0.002°, Venus (example 33.a) to 0.0004°, precession (example 21.b) to 0.0001°, Saturn's ring tilt (example 45.a) to 0.03°. The tests also cover historical time zones, including clock changes and times that never existed. Distances to nearby stars are known to a few percent and to distant ones less well, so arrival dates are given to the month.

## Run locally

```bash
python tools/serve.py
```

Then open http://127.0.0.1:5173. (Any static server works; this one disables caching so edits always show up.)

## Project layout

| Path | What it is |
|---|---|
| `index.html`, `css/` | The page and its styles |
| `js/main.js` | Story, scroll choreography, interaction |
| `js/sky.js` | WebGL renderer and shaders |
| `js/astro.js` | Astronomy (pure functions, also used by the tests) |
| `js/catalog.js`, `js/data/` | Packed star catalogue, constellation lines, time-zone coordinates |
| `js/i18n.js` | English and Russian copy |
| `js/audio.js` | Generative sound |
| `tools/` | Data builders and tests (never loaded by the site) |
| `docs/` | Risk register and third-party licences |

## Credits

Star data: [HYG Database](https://github.com/astronexus/HYG-Database) v4.1 by David Nash, CC BY-SA 4.0. Constellation lines: [d3-celestial](https://github.com/ofrohn/d3-celestial) by Olaf Frohn, BSD 3-Clause. Time zones: IANA tz database, public domain. Fonts: Cormorant Garamond and IBM Plex Mono, SIL Open Font License. Full texts in [docs/LICENSES.md](docs/LICENSES.md).
