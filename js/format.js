// Russian text helpers.

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

export const num = (n) => Math.round(n).toLocaleString('ru-RU');

/** "14 марта 1998" in the given time zone. */
export function longDate(ms, tz) {
  const p = parts(ms, tz);
  return `${p.day} ${MONTHS_GEN[p.month - 1]} ${p.year}`;
}

/** "в марте 2027" — month precision, the honest precision for light arrival dates. */
export function monthYear(ms, tz) {
  const p = parts(ms, tz);
  return `в ${MONTHS_PREP[p.month - 1]} ${p.year}`;
}

export function parts(ms, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
  const o = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, +x.value]));
  return o;
}

export const pad2 = (n) => String(n).padStart(2, '0');

export function coord(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S', ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

/** Waxing / waning wording for an illuminated fraction. */
export function moonWords(phase) {
  const f = phase.fraction;
  if (f < 0.03) return 'новолуние — Луны не было видно';
  if (f > 0.97) return 'полнолуние';
  const kind = f < 0.5 ? (phase.waxing ? 'молодая' : 'старая') : (phase.waxing ? 'растущая' : 'убывающая');
  return `${kind} Луна, освещена на ${Math.round(f * 100)}%`;
}
