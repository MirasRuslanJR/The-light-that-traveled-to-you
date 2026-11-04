// Russian star naming tables used by build-catalog.mjs.

export const GREEK_RU = {
  Alp: 'Альфа', Bet: 'Бета', Gam: 'Гамма', Del: 'Дельта', Eps: 'Эпсилон', Zet: 'Дзета',
  Eta: 'Эта', The: 'Тета', Iot: 'Йота', Kap: 'Каппа', Lam: 'Лямбда', Mu: 'Мю', Nu: 'Ню',
  Xi: 'Кси', Omi: 'Омикрон', Pi: 'Пи', Rho: 'Ро', Sig: 'Сигма', Tau: 'Тау', Ups: 'Ипсилон',
  Phi: 'Фи', Chi: 'Хи', Psi: 'Пси', Ome: 'Омега',
};

// Genitive case, as used in star designations ("Альфа Лиры").
export const CONST_GEN_RU = {
  And: 'Андромеды', Ant: 'Насоса', Aps: 'Райской Птицы', Aqr: 'Водолея', Aql: 'Орла',
  Ara: 'Жертвенника', Ari: 'Овна', Aur: 'Возничего', Boo: 'Волопаса', Cae: 'Резца',
  Cam: 'Жирафа', Cnc: 'Рака', CVn: 'Гончих Псов', CMa: 'Большого Пса', CMi: 'Малого Пса',
  Cap: 'Козерога', Car: 'Киля', Cas: 'Кассиопеи', Cen: 'Центавра', Cep: 'Цефея',
  Cet: 'Кита', Cha: 'Хамелеона', Cir: 'Циркуля', Col: 'Голубя', Com: 'Волос Вероники',
  CrA: 'Южной Короны', CrB: 'Северной Короны', Crv: 'Ворона', Crt: 'Чаши', Cru: 'Южного Креста',
  Cyg: 'Лебедя', Del: 'Дельфина', Dor: 'Золотой Рыбы', Dra: 'Дракона', Equ: 'Малого Коня',
  Eri: 'Эридана', For: 'Печи', Gem: 'Близнецов', Gru: 'Журавля', Her: 'Геркулеса',
  Hor: 'Часов', Hya: 'Гидры', Hyi: 'Южной Гидры', Ind: 'Индейца', Lac: 'Ящерицы',
  Leo: 'Льва', LMi: 'Малого Льва', Lep: 'Зайца', Lib: 'Весов', Lup: 'Волка',
  Lyn: 'Рыси', Lyr: 'Лиры', Men: 'Столовой Горы', Mic: 'Микроскопа', Mon: 'Единорога',
  Mus: 'Мухи', Nor: 'Наугольника', Oct: 'Октанта', Oph: 'Змееносца', Ori: 'Ориона',
  Pav: 'Павлина', Peg: 'Пегаса', Per: 'Персея', Phe: 'Феникса', Pic: 'Живописца',
  Psc: 'Рыб', PsA: 'Южной Рыбы', Pup: 'Кормы', Pyx: 'Компаса', Ret: 'Сетки',
  Sge: 'Стрелы', Sgr: 'Стрельца', Sco: 'Скорпиона', Scl: 'Скульптора', Sct: 'Щита',
  Ser: 'Змеи', Sex: 'Секстанта', Tau: 'Тельца', Tel: 'Телескопа', Tri: 'Треугольника',
  TrA: 'Южного Треугольника', Tuc: 'Тукана', UMa: 'Большой Медведицы', UMi: 'Малой Медведицы',
  Vel: 'Парусов', Vir: 'Девы', Vol: 'Летучей Рыбы', Vul: 'Лисички',
};

// Traditional names with an established Russian form. Anything missing falls back
// to the Bayer/Flamsteed designation in Russian, which is always correct.
export const PROPER_RU = {
  Sirius: 'Сириус', Canopus: 'Канопус', 'Rigil Kentaurus': 'Альфа Центавра', Toliman: 'Толиман',
  Arcturus: 'Арктур', Vega: 'Вега', Capella: 'Капелла', Rigel: 'Ригель', Procyon: 'Процион',
  Achernar: 'Ахернар', Betelgeuse: 'Бетельгейзе', Hadar: 'Хадар', Altair: 'Альтаир',
  Acrux: 'Акрукс', Aldebaran: 'Альдебаран', Antares: 'Антарес', Spica: 'Спика',
  Pollux: 'Поллукс', Fomalhaut: 'Фомальгаут', Deneb: 'Денеб', Mimosa: 'Мимоза',
  Regulus: 'Регул', Adhara: 'Адара', Castor: 'Кастор', Shaula: 'Шаула', Gacrux: 'Гакрукс',
  Bellatrix: 'Беллатрикс', Elnath: 'Элнат', Miaplacidus: 'Миаплацидус', Alnilam: 'Альнилам',
  Alnair: 'Альнаир', Alnitak: 'Альнитак', Alioth: 'Алиот', Dubhe: 'Дубхе', Mirfak: 'Мирфак',
  Wezen: 'Везен', Sargas: 'Саргас', 'Kaus Australis': 'Каус Аустралис', Avior: 'Авиор',
  Alkaid: 'Алькаид', Menkalinan: 'Менкалинан', Atria: 'Атрия', Alhena: 'Альхена',
  Peacock: 'Пикок', Mirzam: 'Мирзам', Alphard: 'Альфард', Polaris: 'Полярная звезда',
  Hamal: 'Хамаль', Algieba: 'Альгиеба', Diphda: 'Дифда', Nunki: 'Нунки', Menkent: 'Менкент',
  Mirach: 'Мирах', Alpheratz: 'Альферац', Rasalhague: 'Рас Альхаг', Kochab: 'Кохаб',
  Saiph: 'Саиф', Denebola: 'Денебола', Algol: 'Алголь', Alphecca: 'Альфекка',
  Mintaka: 'Минтака', Sadr: 'Садр', Eltanin: 'Этамин', Schedar: 'Шедар', Naos: 'Наос',
  Almach: 'Аламак', Caph: 'Каф', Izar: 'Ицар', Dschubba: 'Дшубба', Merak: 'Мерак',
  Ankaa: 'Анкаа', Enif: 'Эниф', Scheat: 'Шеат', Sabik: 'Сабик', Phecda: 'Фекда',
  Aludra: 'Алудра', Markab: 'Маркаб', Acrab: 'Акраб', Alderamin: 'Альдерамин',
  Mizar: 'Мицар', Alcor: 'Алькор', Zubeneschamali: 'Зубенэшемали', Zubenelgenubi: 'Зубенэльгенуби',
  Unukalhai: 'Унукальхай', Rasalgethi: 'Рас Альгети', Albireo: 'Альбирео', Errai: 'Эррай',
  Thuban: 'Тубан', Megrez: 'Мегрец', Sheratan: 'Шератан', Mira: 'Мира', Tarazed: 'Таразед',
  Vindemiatrix: 'Виндемиатрикс', Gienah: 'Гиена', Porrima: 'Порима', Zosma: 'Зосма',
  Rastaban: 'Растабан', Alcyone: 'Альциона', Atlas: 'Атлас', Electra: 'Электра', Maia: 'Майя',
  Merope: 'Меропа', Taygeta: 'Тайгета', Pleione: 'Плейона', Sadalmelik: 'Садальмелик',
  Sadalsuud: 'Садальсууд', Ruchbah: 'Рукбах', Achird: 'Ахирд', Muphrid: 'Муфрид',
  Seginus: 'Сегин', Alshain: 'Альшаин', Sulafat: 'Сулафат', Sheliak: 'Шелиак', Ran: 'Ран',
  Keid: 'Кейд', Alsafi: 'Альсафи', 'Cor Caroli': 'Сердце Карла', Menkar: 'Менкар', Algenib: 'Альгениб', Homam: 'Хомам',
  Matar: 'Матар', Sadachbia: 'Садахбия', Alrescha: 'Альриша', Fafnir: 'Фафнир',
  Altais: 'Альтаис', Alkalurops: 'Алькалуропс', Nekkar: 'Неккар', Chara: 'Хара',
  'Tania Borealis': 'Тания Северная', 'Tania Australis': 'Тания Южная', Talitha: 'Талита',
  'Alula Borealis': 'Алула Северная', 'Alula Australis': 'Алула Южная', Alkes: 'Алькес',
  Kraz: 'Краз', Algorab: 'Альгораб', Minkar: 'Минкар', Chertan: 'Шертан', Adhafera: 'Адхафера',
  Mebsuta: 'Мебсута', Tejat: 'Тейят', Propus: 'Пропус', Wasat: 'Васат', Mekbuda: 'Мекбуда',
  Alzirr: 'Альзир', Gomeisa: 'Гомейза', Furud: 'Фуруд', Muliphein: 'Мульфейн', Aspidiske: 'Аспидиске',
  Suhail: 'Сухаиль',
};

if (Object.keys(CONST_GEN_RU).length !== 88) throw new Error('constellation table must list all 88');
