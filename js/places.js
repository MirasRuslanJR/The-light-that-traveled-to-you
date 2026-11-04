import { ZONES } from './data/zones.js?v=25';

const EN = {"Москва":"Moscow","Санкт-Петербург":"Saint Petersburg","Новосибирск":"Novosibirsk","Екатеринбург":"Yekaterinburg","Казань":"Kazan","Нижний Новгород":"Nizhny Novgorod","Челябинск":"Chelyabinsk","Самара":"Samara","Омск":"Omsk","Ростов-на-Дону":"Rostov-on-Don","Уфа":"Ufa","Красноярск":"Krasnoyarsk","Воронеж":"Voronezh","Пермь":"Perm","Волгоград":"Volgograd","Краснодар":"Krasnodar","Саратов":"Saratov","Тюмень":"Tyumen","Тольятти":"Tolyatti","Ижевск":"Izhevsk","Барнаул":"Barnaul","Ульяновск":"Ulyanovsk","Иркутск":"Irkutsk","Хабаровск":"Khabarovsk","Ярославль":"Yaroslavl","Владивосток":"Vladivostok","Махачкала":"Makhachkala","Томск":"Tomsk","Оренбург":"Orenburg","Кемерово":"Kemerovo","Новокузнецк":"Novokuznetsk","Рязань":"Ryazan","Астрахань":"Astrakhan","Набережные Челны":"Naberezhnye Chelny","Пенза":"Penza","Киров":"Kirov","Липецк":"Lipetsk","Чебоксары":"Cheboksary","Калининград":"Kaliningrad","Тула":"Tula","Курск":"Kursk","Ставрополь":"Stavropol","Сочи":"Sochi","Улан-Удэ":"Ulan-Ude","Тверь":"Tver","Магнитогорск":"Magnitogorsk","Иваново":"Ivanovo","Брянск":"Bryansk","Белгород":"Belgorod","Сургут":"Surgut","Владимир":"Vladimir","Архангельск":"Arkhangelsk","Чита":"Chita","Смоленск":"Smolensk","Калуга":"Kaluga","Мурманск":"Murmansk","Якутск":"Yakutsk","Грозный":"Grozny","Петропавловск-Камчатский":"Petropavlovsk-Kamchatsky","Южно-Сахалинск":"Yuzhno-Sakhalinsk","Магадан":"Magadan","Норильск":"Norilsk","Минск":"Minsk","Киев":"Kyiv","Алматы":"Almaty","Астана":"Astana","Ташкент":"Tashkent","Бишкек":"Bishkek","Баку":"Baku","Ереван":"Yerevan","Тбилиси":"Tbilisi","Душанбе":"Dushanbe","Кишинёв":"Chișinău","Рига":"Riga","Вильнюс":"Vilnius","Таллин":"Tallinn","Ашхабад":"Ashgabat","Лондон":"London","Париж":"Paris","Берлин":"Berlin","Прага":"Prague","Варшава":"Warsaw","Хельсинки":"Helsinki","Рим":"Rome","Мадрид":"Madrid","Стамбул":"Istanbul","Тель-Авив":"Tel Aviv","Дубай":"Dubai","Каир":"Cairo","Дели":"Delhi","Пекин":"Beijing","Сеул":"Seoul","Токио":"Tokyo","Нью-Йорк":"New York","Торонто":"Toronto","Лос-Анджелес":"Los Angeles","Буэнос-Айрес":"Buenos Aires","Сидней":"Sydney"};

// Birthplaces: name, latitude, longitude (east-positive), IANA time zone.
// The sky barely changes across a few hundred kilometres, so city-level coordinates are plenty.
export const PLACES = [
  ['Москва', 55.756, 37.617, 'Europe/Moscow'], ['Санкт-Петербург', 59.939, 30.316, 'Europe/Moscow'],
  ['Новосибирск', 55.030, 82.920, 'Asia/Novosibirsk'], ['Екатеринбург', 56.838, 60.605, 'Asia/Yekaterinburg'],
  ['Казань', 55.796, 49.106, 'Europe/Moscow'], ['Нижний Новгород', 56.327, 44.006, 'Europe/Moscow'],
  ['Челябинск', 55.160, 61.400, 'Asia/Yekaterinburg'], ['Самара', 53.195, 50.100, 'Europe/Samara'],
  ['Омск', 54.989, 73.368, 'Asia/Omsk'], ['Ростов-на-Дону', 47.236, 39.713, 'Europe/Moscow'],
  ['Уфа', 54.735, 55.959, 'Asia/Yekaterinburg'], ['Красноярск', 56.010, 92.852, 'Asia/Krasnoyarsk'],
  ['Воронеж', 51.672, 39.184, 'Europe/Moscow'], ['Пермь', 58.010, 56.229, 'Asia/Yekaterinburg'],
  ['Волгоград', 48.708, 44.513, 'Europe/Volgograd'], ['Краснодар', 45.035, 38.975, 'Europe/Moscow'],
  ['Саратов', 51.533, 46.034, 'Europe/Saratov'], ['Тюмень', 57.153, 65.534, 'Asia/Yekaterinburg'],
  ['Тольятти', 53.508, 49.420, 'Europe/Samara'], ['Ижевск', 56.852, 53.204, 'Europe/Samara'],
  ['Барнаул', 53.348, 83.780, 'Asia/Barnaul'], ['Ульяновск', 54.314, 48.403, 'Europe/Ulyanovsk'],
  ['Иркутск', 52.287, 104.305, 'Asia/Irkutsk'], ['Хабаровск', 48.480, 135.072, 'Asia/Vladivostok'],
  ['Ярославль', 57.626, 39.894, 'Europe/Moscow'], ['Владивосток', 43.116, 131.882, 'Asia/Vladivostok'],
  ['Махачкала', 42.983, 47.504, 'Europe/Moscow'], ['Томск', 56.485, 84.948, 'Asia/Tomsk'],
  ['Оренбург', 51.768, 55.097, 'Asia/Yekaterinburg'], ['Кемерово', 55.355, 86.087, 'Asia/Novokuznetsk'],
  ['Новокузнецк', 53.757, 87.136, 'Asia/Novokuznetsk'], ['Рязань', 54.629, 39.736, 'Europe/Moscow'],
  ['Астрахань', 46.348, 48.034, 'Europe/Astrakhan'], ['Набережные Челны', 55.743, 52.396, 'Europe/Moscow'],
  ['Пенза', 53.195, 45.018, 'Europe/Moscow'], ['Киров', 58.603, 49.668, 'Europe/Kirov'],
  ['Липецк', 52.603, 39.571, 'Europe/Moscow'], ['Чебоксары', 56.146, 47.251, 'Europe/Moscow'],
  ['Калининград', 54.710, 20.452, 'Europe/Kaliningrad'], ['Тула', 54.193, 37.617, 'Europe/Moscow'],
  ['Курск', 51.730, 36.193, 'Europe/Moscow'], ['Ставрополь', 45.044, 41.969, 'Europe/Moscow'],
  ['Сочи', 43.585, 39.723, 'Europe/Moscow'], ['Улан-Удэ', 51.834, 107.584, 'Asia/Irkutsk'],
  ['Тверь', 56.859, 35.912, 'Europe/Moscow'], ['Магнитогорск', 53.407, 58.980, 'Asia/Yekaterinburg'],
  ['Иваново', 57.000, 40.973, 'Europe/Moscow'], ['Брянск', 53.243, 34.364, 'Europe/Moscow'],
  ['Белгород', 50.596, 36.587, 'Europe/Moscow'], ['Сургут', 61.254, 73.396, 'Asia/Yekaterinburg'],
  ['Владимир', 56.129, 40.407, 'Europe/Moscow'], ['Архангельск', 64.539, 40.516, 'Europe/Moscow'],
  ['Чита', 52.034, 113.500, 'Asia/Chita'], ['Смоленск', 54.782, 32.045, 'Europe/Moscow'],
  ['Калуга', 54.513, 36.261, 'Europe/Moscow'], ['Мурманск', 68.970, 33.075, 'Europe/Moscow'],
  ['Якутск', 62.028, 129.733, 'Asia/Yakutsk'], ['Грозный', 43.318, 45.698, 'Europe/Moscow'],
  ['Петропавловск-Камчатский', 53.037, 158.656, 'Asia/Kamchatka'], ['Южно-Сахалинск', 46.959, 142.738, 'Asia/Sakhalin'],
  ['Магадан', 59.568, 150.808, 'Asia/Magadan'], ['Норильск', 69.349, 88.201, 'Asia/Krasnoyarsk'],
  ['Минск', 53.904, 27.562, 'Europe/Minsk'], ['Киев', 50.450, 30.524, 'Europe/Kiev'],
  ['Алматы', 43.238, 76.946, 'Asia/Almaty'], ['Астана', 51.169, 71.449, 'Asia/Almaty'],
  ['Ташкент', 41.299, 69.240, 'Asia/Tashkent'], ['Бишкек', 42.875, 74.570, 'Asia/Bishkek'],
  ['Баку', 40.409, 49.867, 'Asia/Baku'], ['Ереван', 40.179, 44.499, 'Asia/Yerevan'],
  ['Тбилиси', 41.716, 44.783, 'Asia/Tbilisi'], ['Душанбе', 38.560, 68.774, 'Asia/Dushanbe'],
  ['Кишинёв', 47.011, 28.864, 'Europe/Chisinau'], ['Рига', 56.949, 24.105, 'Europe/Riga'],
  ['Вильнюс', 54.687, 25.280, 'Europe/Vilnius'], ['Таллин', 59.437, 24.754, 'Europe/Tallinn'],
  ['Ашхабад', 37.960, 58.326, 'Asia/Ashgabat'],
  ['Лондон', 51.507, -0.128, 'Europe/London'], ['Париж', 48.857, 2.352, 'Europe/Paris'],
  ['Берлин', 52.520, 13.405, 'Europe/Berlin'], ['Прага', 50.076, 14.438, 'Europe/Prague'],
  ['Варшава', 52.230, 21.012, 'Europe/Warsaw'], ['Хельсинки', 60.170, 24.938, 'Europe/Helsinki'],
  ['Рим', 41.903, 12.496, 'Europe/Rome'], ['Мадрид', 40.417, -3.704, 'Europe/Madrid'],
  ['Стамбул', 41.008, 28.978, 'Europe/Istanbul'], ['Тель-Авив', 32.085, 34.782, 'Asia/Jerusalem'],
  ['Дубай', 25.205, 55.271, 'Asia/Dubai'], ['Каир', 30.044, 31.236, 'Africa/Cairo'],
  ['Дели', 28.614, 77.209, 'Asia/Kolkata'], ['Пекин', 39.904, 116.407, 'Asia/Shanghai'],
  ['Сеул', 37.567, 126.978, 'Asia/Seoul'], ['Токио', 35.676, 139.650, 'Asia/Tokyo'],
  ['Нью-Йорк', 40.713, -74.006, 'America/New_York'], ['Торонто', 43.653, -79.383, 'America/Toronto'],
  ['Лос-Анджелес', 34.052, -118.244, 'America/Los_Angeles'], ['Буэнос-Айрес', -34.604, -58.382, 'America/Argentina/Buenos_Aires'],
  ['Сидней', -33.869, 151.209, 'Australia/Sydney'],
].map(([name, lat, lon, tz]) => ({ name, en: EN[name], lat, lon, tz }));

const key = (s) => (s || '').trim().toLowerCase().replace(/ё/g, 'е').normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Find a city by its Russian or English name. */
export function findPlace(name) {
  const q = key(name);
  if (!q) return null;
  return PLACES.find((p) => key(p.name) === q || key(p.en) === q) || null;
}
/** City name in the given language. */
export const placeName = (p, lang) => (lang === 'en' ? p.en : p.name);

/** Best guess when no birthplace is given: a city in the viewer's own time zone. */
export function guessPlace() {
  let tz = 'Europe/Moscow';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch { /* keep default */ }
  const p = PLACES.find((x) => x.tz === tz);
  if (p) return { ...p, guessed: true };
  const z = ZONES[tz];
  if (z) return { name: null, lat: z[0], lon: z[1], tz, guessed: true };
  // Unknown zone: longitude from the current UTC offset, a mid-northern latitude. Stated as approximate in the UI.
  const lon = Math.max(-180, Math.min(180, -new Date().getTimezoneOffset() / 4));
  return { name: null, lat: 50, lon, tz, guessed: true, approximate: true };
}
