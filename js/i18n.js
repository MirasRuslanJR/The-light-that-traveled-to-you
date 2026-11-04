// Two languages. STATIC holds the page's fixed copy (keyed by data-i18n attributes in index.html);
// PHRASES builds the story's sentences, which depend on the computed sky.
import * as F from './format.js?v=23';

export const LANGS = ['ru', 'en'];

/** English is the default; Russian is one click away. ?lang= in the URL or the viewer's own choice wins. */
const LANG_KEY = 'svet-lang-v2';   // new key: earlier automatic choices no longer override the English default
export function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try { const s = localStorage.getItem(LANG_KEY); if (LANGS.includes(s)) return s; } catch { /* private mode */ }
  return 'en';
}
export function saveLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode */ } }

export const STATIC = {
  ru: {
    title: 'Свет, который летел к тебе',
    description: 'Свет твоего рождения всё ещё летит. Сайт вычисляет, до каких настоящих звёзд он уже долетел и когда коснётся следующей.',
    wordmark: 'Свет, который летел к тебе',
    introEyebrow: 'Эксперимент со светом и временем',
    introTitle: 'Свет твоего рождения всё ещё летит.',
    introLead: 'В тот момент он покинул Землю и с тех пор не останавливался ни на секунду. Узнай, до каких настоящих звёзд он уже долетел.',
    fDate: 'Дата рождения', fTime: 'Время', fTimeOpt: 'если знаешь', fPlace: 'Город', fPlaceOpt: 'необязательно',
    fPlaceholder: 'Например, Казань', cta: 'Найти мой свет',
    privacy: 'Всё вычисляется в твоём браузере. Ничего никуда не отправляется.',
    ch1Title: 'Это небо было над тобой в первые минуты жизни.',
    ch2Eyebrow: 'Свет уходит',
    ch2Title: 'В тот момент от Земли ушёл свет.',
    ch3Eyebrow: 'Следующая звезда',
    share: 'Подарить свет', restart: 'Другая дата',
    howTitle: 'Как это посчитано',
    how1: 'Положения и расстояния 12 172 звёзд взяты из каталога HYG v4.1 (измерения спутника Hipparcos и Gaia). Небо строится по формулам Жана Миуса «Астрономические алгоритмы»: звёздное время, прецессия, рефракция, Луна, Солнце и планеты. Каждый расчёт сверен с эталонными примерами книги.',
    how2: 'Свет проходит один световой год за один юлианский год. Сфера на экране — это расстояние, которое прошёл свет с момента твоего рождения. Расстояния до звёзд известны с точностью около 1–2%, поэтому даты прибытия указаны с точностью до месяца. Луна нарисована втрое крупнее настоящей, чтобы была видна её фаза; её положение и фаза — точные.',
    how3: 'Звёзды: HYG Database, David Nash, CC BY-SA 4.0. Линии созвездий: d3-celestial, Olaf Frohn, BSD. Шрифты: Cormorant Garamond, IBM Plex Mono, SIL OFL.',
    scroll: 'Листай', sun: 'Солнце', sunMeta: 'здесь ты',
    lifeCaption: 'Твоему свету', dragHint: 'Потяни, чтобы повернуть',
    tickerLabel: 'Прямо сейчас свет твоего рождения', tickerUnit: 'км от Земли · и ещё 299 792 км каждую секунду',
    futureCta: 'Что будет дальше', futureCaption: 'Твой свет — дальше', futureBack: 'Вернуться',
    futureEnd: 'Он будет лететь всегда — даже когда на небо уже некому будет смотреть.',
    postcard: 'Открытка', rail1: 'Твоя ночь', rail2: 'Свет уходит', rail3: 'Следующая звезда', rail4: 'Сегодня',
    postCaption: 'столько прошёл свет твоего рождения', postSaved: 'Открытка сохранена.',
    gateStars: 'звёзд в каталоге', gateSound: 'Войти со звуком', gateQuiet: 'Без звука', gateNote: 'Лучше в наушниках',
    soundOn: 'Звук', soundOff: 'Без звука',
    noWebgl: 'Браузер не умеет WebGL, поэтому небо не нарисуется. Все вычисления ниже — настоящие.',
    errDate: 'Укажи дату рождения.', errOld: 'Каталог рассчитан на даты с 1900 года.',
    errPlace: 'Не нашёл такой город. Выбери из списка или оставь поле пустым.',
    errParse: 'Не получилось прочитать дату.', errFuture: 'Эта дата ещё не наступила.',
    shared: 'Отправлено.', copied: 'Ссылка скопирована. По ней откроется небо этой даты.',
  },
  en: {
    title: 'The Light That Traveled to You',
    description: 'The light of your birth is still traveling. This site calculates which real stars it has already reached, and when it will touch the next one.',
    wordmark: 'The light that traveled to you',
    introEyebrow: 'An experiment with light and time',
    introTitle: 'The light of your birth is still traveling.',
    introLead: 'It left Earth at that moment and has not stopped for a single second since. Find out which real stars it has already reached.',
    fDate: 'Date of birth', fTime: 'Time', fTimeOpt: 'if you know it', fPlace: 'City', fPlaceOpt: 'optional',
    fPlaceholder: 'For example, London', cta: 'Find my light',
    privacy: 'Everything is calculated in your browser. Nothing is sent anywhere.',
    ch1Title: 'This was the sky above you in the first minutes of your life.',
    ch2Eyebrow: 'The light leaves',
    ch2Title: 'At that moment, light left Earth.',
    ch3Eyebrow: 'The next star',
    share: 'Give this light', restart: 'Another date',
    howTitle: 'How this is calculated',
    how1: 'Positions and distances of 12,172 stars come from the HYG v4.1 catalogue (Hipparcos and Gaia measurements). The sky is built with the formulas of Jean Meeus’s “Astronomical Algorithms”: sidereal time, precession, refraction, the Moon, the Sun and the planets. Every calculation is checked against the book’s worked examples.',
    how2: 'Light covers one light-year in one Julian year. The sphere on screen is the distance light has traveled since the moment you were born. Star distances are known to about 1–2%, so arrival dates are given to the month. The Moon is drawn three times its real size so its phase is visible; its position and phase are exact.',
    how3: 'Stars: HYG Database, David Nash, CC BY-SA 4.0. Constellation lines: d3-celestial, Olaf Frohn, BSD. Fonts: Cormorant Garamond, IBM Plex Mono, SIL OFL.',
    scroll: 'Scroll', sun: 'Sun', sunMeta: 'you are here',
    lifeCaption: 'Your light is', dragHint: 'Drag to look around',
    tickerLabel: 'Right now, the light of your birth is', tickerUnit: 'km from Earth · and 299,792 km further every second',
    futureCta: 'What happens next', futureCaption: 'Your light, from here on', futureBack: 'Back',
    futureEnd: 'It will keep going forever — long after anyone is left to look up.',
    postcard: 'Postcard', rail1: 'Your night', rail2: 'The light leaves', rail3: 'The next star', rail4: 'Tonight',
    postCaption: 'the distance the light of your birth has traveled', postSaved: 'Postcard saved.',
    gateStars: 'stars in the catalogue', gateSound: 'Enter with sound', gateQuiet: 'Without sound', gateNote: 'Best with headphones',
    soundOn: 'Sound', soundOff: 'Sound off',
    noWebgl: 'This browser has no WebGL, so the sky cannot be drawn. Every number below is still real.',
    errDate: 'Enter your date of birth.', errOld: 'The catalogue covers dates from 1900 onwards.',
    errPlace: 'City not found. Pick one from the list or leave the field empty.',
    errParse: 'Could not read the date.', errFuture: 'That date has not happened yet.',
    shared: 'Sent.', copied: 'Link copied. It opens the sky for this date.',
  },
};

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const s = (n, one, many) => (n === 1 ? one : many);

function monthsBetween(fromMs, toMs) {
  const a = new Date(fromMs), b = new Date(toMs);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months--;
  return months;
}
const lyDigits = (R) => (R >= 1 ? 1 : R >= 0.01 ? 2 : 4);

export const PHRASES = {
  ru: {
    num: (n) => F.num(n),
    dec: (x, d) => x.toFixed(d).replace('.', ','),
    longDate: (ms, tz) => F.longDate(ms, tz),
    monthYear: (ms, tz) => F.monthYear(ms, tz),
    planet: { mercury: 'Меркурий', venus: 'Венера', mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн' },
    moonName: 'Луна', planetWord: 'планета',
    aroundMidnight: 'около полуночи', noPlace: 'место не указано',
    moonSentence(phase, up) {
      const w = F.moonWords(phase);
      const cap = w[0].toUpperCase() + w.slice(1);
      return up ? `${cap}. Она стояла над горизонтом.` : `${cap}. Сама Луна в тот час была за горизонтом.`;
    },
    brightest: (b) => (b.planet ? ` Самая яркая точка того неба&nbsp;— не звезда, а ${b.name}.` : ` Самая яркая звезда того неба&nbsp;— ${b.name}.`),
    daytime: (rest) => `В тот момент был день, и звёзды скрывал свет Солнца. Но они стояли на своих местах — вот они. ${rest}`,
    noTime: ' Время не указано, поэтому небо показано около полуночи.',
    approx: ' Город не указан, поэтому координаты примерные.',
    guessed: ' Город не указан, поэтому небо показано для твоего часового пояса.',
    duration(fromMs, toMs) {
      const months = monthsBetween(fromMs, toMs), years = Math.floor(months / 12);
      if (years >= 1) return `За ${years} ${F.plural(years, 'год', 'года', 'лет')}`;
      if (months >= 1) return `За ${months} ${F.plural(months, 'месяц', 'месяца', 'месяцев')}`;
      const days = Math.max(1, Math.floor((toMs - fromMs) / 86400000));
      return `За ${days} ${F.plural(days, 'день', 'дня', 'дней')}`;
    },
    ly(R) { return `${this.dec(R, lyDigits(R))}&nbsp;светового года`; },
    km(R) {
      const tril = R * 9.4607;
      if (tril >= 1) { const n = Math.round(tril); return `${F.num(n)}&nbsp;${F.plural(n, 'триллион', 'триллиона', 'триллионов')} километров`; }
      const bil = Math.max(1, Math.round(tril * 1000));
      return `${F.num(bil)}&nbsp;${F.plural(bil, 'миллиард', 'миллиарда', 'миллиардов')} километров`;
    },
    lightText(dur, ly, km) { return `Он летит со скоростью 299&nbsp;792&nbsp;км/с. ${dur} он ушёл на <strong>${ly}</strong> — это ${km} от Земли.`; },
    reachedLabel: (n) => (n === 0 ? 'звёзд он пока не достиг: до ближайшей ещё летит'
      : n === 1 ? 'звезду, которую видно глазом, он уже достиг'
        : `${F.plural(n, 'звезду', 'звезды', 'звёзд')}, которые видно глазом, он уже достиг`),
    faint: (n) => (n > 0 ? `И ещё ${F.num(n)} — слишком тусклых, чтобы увидеть их без телескопа.` : ''),
    thisMonth: 'в этом месяце',
    heroPassed: 'Свет твоего рождения только что прошёл мимо неё.',
    heroNow: (when) => `Свет твоего рождения подлетает к ней прямо сейчас. Он коснётся её ${when}.`,
    heroOnWay(gap, when) { return `Свет твоего рождения в пути к ней: осталось ${this.dec(gap, 1)}&nbsp;светового года. Он коснётся её ${when}.`; },
    heroAge: (n) => ` В этот день тебе будет ${n}&nbsp;${F.plural(n, 'год', 'года', 'лет')}.`,
    heroMeta(dist, con) { return `${this.dec(dist, 1)} св. лет от Земли${con ? ` · созвездие ${con}` : ''} · видна глазом`; },
    labelMeta(dist) { return `${this.dec(dist, 1)} св. лет`; },
    today: 'сегодня', now: 'сейчас',
    nights: (n) => (n < 1 ? 'Это твоя первая ночь на Земле.'
      : `С твоего рождения ${F.plural(n, 'прошла', 'прошло', 'прошло')} ${F.num(n)}&nbsp;${F.plural(n, 'ночь', 'ночи', 'ночей')}. Это&nbsp;— сегодняшняя.`),
    compass: (az) => ['на севере', 'на северо-востоке', 'на востоке', 'на юго-востоке', 'на юге', 'на юго-западе', 'на западе', 'на северо-западе'][Math.round(az / 45) % 8],
    nowUp(name, dir) { return `${name} сейчас над горизонтом, ${dir}. Свет твоего рождения летит к ней. Выйди и посмотри наверх.`; },
    nowDown: (name) => `${name} сейчас за горизонтом. Но свет твоего рождения уже летит к ней — и однажды ночью она будет прямо над тобой.`,
    fromEarth(R) { return `${this.dec(R, 2)} св. лет от Земли`; },
    years: (n) => F.plural(n, 'год', 'года', 'лет'),
    logAge: (n) => `тебе ${n}`,
    summary(v, faint) {
      if (v === 0) return 'Видимых глазом звёзд свет пока не достиг.';
      const adj = v % 10 === 1 && v % 100 !== 11 ? 'видимая' : 'видимых';
      return `Позади ${F.num(v)} ${F.plural(v, 'звезда', 'звезды', 'звёзд')}, ${adj} глазом${faint > 0 ? `, и ещё ${F.num(faint)} слишком тусклых для глаза` : ''}.`;
    },
    pulseMeta: (n) => `Свет Земли · ускорено в ${n} млн раз`,
    tipDist(d) { return `${this.dec(d, d < 10 ? 2 : 1)} св. лет`; },
    tipSeen: (y) => (y > 0 ? `Свет, который ты сейчас видишь, ушёл от неё в ${y} году.` : 'Свет, который ты сейчас видишь, ушёл от неё ещё до нашей эры.'),
    tipReached: (y, age) => `Твой свет достиг её в ${y} году — тебе было ${age}.`,
    tipWill: (when, age) => `Твой свет коснётся её ${when} — тебе будет ${age}.`,
    tipFar: (y) => `Твой свет доберётся до неё только в ${y} году.`,
    tipCon: (c) => `созвездие ${c}`,
    unnamedStar: 'Звезда без имени',
    postNext: (name, when) => `Следующая — ${name}, ${when}`,
    futureAge: (n) => `тебе ${n}`,
    postAge: (n) => `${n} ${F.plural(n, 'год', 'года', 'лет')}`,
  },

  en: {
    num: (n) => Math.round(n).toLocaleString('en-US'),
    dec: (x, d) => x.toFixed(d),
    longDate(ms, tz) { const p = F.parts(ms, tz); return `${p.day} ${MONTHS_EN[p.month - 1]} ${p.year}`; },
    monthYear(ms, tz) { const p = F.parts(ms, tz); return `in ${MONTHS_EN[p.month - 1]} ${p.year}`; },
    planet: { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' },
    moonName: 'Moon', planetWord: 'planet',
    aroundMidnight: 'around midnight', noPlace: 'place not given',
    moonSentence(phase, up) {
      const f = phase.fraction;
      let w;
      if (f < 0.03) w = 'A new moon: the Moon could not be seen';
      else if (f > 0.97) w = 'A full moon';
      else {
        const kind = f < 0.5 ? (phase.waxing ? 'A waxing crescent' : 'A waning crescent') : (phase.waxing ? 'A waxing gibbous Moon' : 'A waning gibbous Moon');
        w = `${kind}, ${Math.round(f * 100)}% lit`;
      }
      return up ? `${w}. It stood above the horizon.` : `${w}. The Moon itself was below the horizon at that hour.`;
    },
    brightest: (b) => (b.planet ? ` The brightest point in that sky was not a star but ${b.name}.` : ` The brightest star in that sky: ${b.name}.`),
    daytime: (rest) => `It was daytime, and sunlight hid the stars. But they were all in place — here they are. ${rest}`,
    noTime: ' No time given, so the sky is shown around midnight.',
    approx: ' No city given, so the coordinates are approximate.',
    guessed: ' No city given, so the sky is shown for your time zone.',
    duration(fromMs, toMs) {
      const months = monthsBetween(fromMs, toMs), years = Math.floor(months / 12);
      if (years >= 1) return `In ${years} ${s(years, 'year', 'years')}`;
      if (months >= 1) return `In ${months} ${s(months, 'month', 'months')}`;
      const days = Math.max(1, Math.floor((toMs - fromMs) / 86400000));
      return `In ${days} ${s(days, 'day', 'days')}`;
    },
    ly(R) { const v = this.dec(R, lyDigits(R)); return `${v}&nbsp;${v === '1.0' ? 'light‑year' : 'light‑years'}`; },
    km(R) {
      const tril = R * 9.4607;
      if (tril >= 1) return `${this.num(Math.round(tril))}&nbsp;trillion kilometers`;
      return `${this.num(Math.max(1, Math.round(tril * 1000)))}&nbsp;billion kilometers`;
    },
    lightText(dur, ly, km) { return `It travels at 299,792&nbsp;km per second. ${dur} it has covered <strong>${ly}</strong> — ${km} from Earth.`; },
    reachedLabel: (n) => (n === 0 ? 'stars reached so far: it is still on its way to the nearest'
      : n === 1 ? 'naked-eye star it has already reached' : 'naked-eye stars it has already reached'),
    faint(n) { return n > 0 ? `And ${this.num(n)} more, too faint to see without a telescope.` : ''; },
    thisMonth: 'this month',
    heroPassed: 'The light of your birth has just passed it.',
    heroNow: (when) => `The light of your birth is reaching it right now. It will arrive ${when}.`,
    heroOnWay(gap, when) { return `The light of your birth is on its way there, ${this.dec(gap, 1)}&nbsp;light‑years to go. It will arrive ${when}.`; },
    heroAge: (n) => ` You will be ${n} on that day.`,
    heroMeta(dist, con) { return `${this.dec(dist, 1)} light-years from Earth${con ? ` · in ${con}` : ''} · visible to the naked eye`; },
    labelMeta(dist) { return `${this.dec(dist, 1)} light-years`; },
    today: 'today', now: 'now',
    nights(n) { return n < 1 ? 'This is your first night on Earth.' : `${this.num(n)}&nbsp;${s(n, 'night has', 'nights have')} passed since you were born. This one is&nbsp;tonight.`; },
    compass: (az) => ['in the north', 'in the north-east', 'in the east', 'in the south-east', 'in the south', 'in the south-west', 'in the west', 'in the north-west'][Math.round(az / 45) % 8],
    nowUp: (name, dir) => `${name} is above the horizon right now, ${dir}. The light of your birth is on its way to it. Go outside and look up.`,
    nowDown: (name) => `${name} is below the horizon right now. But the light of your birth is already on its way — and one night it will be right above you.`,
    fromEarth(R) { return `${this.dec(R, 2)} light-years from Earth`; },
    years: (n) => (n === 1 ? 'year old' : 'years old'),
    logAge: (n) => `age ${n}`,
    summary(v, faint) {
      if (v === 0) return 'It has not reached a naked-eye star yet.';
      return `Behind it: ${this.num(v)} naked-eye ${v === 1 ? 'star' : 'stars'}${faint > 0 ? `, and ${this.num(faint)} too faint to see` : ''}.`;
    },
    pulseMeta: (n) => `Earth’s light · sped up ${n} million times`,
    tipDist(d) { return `${this.dec(d, d < 10 ? 2 : 1)} light‑years`; },
    tipSeen: (y) => (y > 0 ? `The light you see now left it in ${y}.` : 'The light you see now left it before the Common Era.'),
    tipReached: (y, age) => `Your light reached it in ${y}, when you were ${age}.`,
    tipWill: (when, age) => `Your light will reach it ${when}, when you are ${age}.`,
    tipFar: (y) => `Your light will only get there in ${y}.`,
    tipCon: (c) => `in ${c}`,
    unnamedStar: 'Unnamed star',
    postNext: (name, when) => `Next: ${name}, ${when}`,
    futureAge: (n) => `you'll be ${n}`,
    postAge: (n) => `age ${n}`,
  },
};
