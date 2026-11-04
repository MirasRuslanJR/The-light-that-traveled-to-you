// English star naming tables used by build-catalog.mjs (IAU conventions).

export const GREEK_EN = {
  Alp: 'Alpha', Bet: 'Beta', Gam: 'Gamma', Del: 'Delta', Eps: 'Epsilon', Zet: 'Zeta', Eta: 'Eta',
  The: 'Theta', Iot: 'Iota', Kap: 'Kappa', Lam: 'Lambda', Mu: 'Mu', Nu: 'Nu', Xi: 'Xi', Omi: 'Omicron',
  Pi: 'Pi', Rho: 'Rho', Sig: 'Sigma', Tau: 'Tau', Ups: 'Upsilon', Phi: 'Phi', Chi: 'Chi', Psi: 'Psi', Ome: 'Omega',
};

// [nominative, genitive]: "in Lyra", "Alpha Lyrae".
export const CONST_EN = {
  And: ['Andromeda', 'Andromedae'], Ant: ['Antlia', 'Antliae'], Aps: ['Apus', 'Apodis'], Aqr: ['Aquarius', 'Aquarii'],
  Aql: ['Aquila', 'Aquilae'], Ara: ['Ara', 'Arae'], Ari: ['Aries', 'Arietis'], Aur: ['Auriga', 'Aurigae'],
  Boo: ['Boötes', 'Boötis'], Cae: ['Caelum', 'Caeli'], Cam: ['Camelopardalis', 'Camelopardalis'], Cnc: ['Cancer', 'Cancri'],
  CVn: ['Canes Venatici', 'Canum Venaticorum'], CMa: ['Canis Major', 'Canis Majoris'], CMi: ['Canis Minor', 'Canis Minoris'],
  Cap: ['Capricornus', 'Capricorni'], Car: ['Carina', 'Carinae'], Cas: ['Cassiopeia', 'Cassiopeiae'], Cen: ['Centaurus', 'Centauri'],
  Cep: ['Cepheus', 'Cephei'], Cet: ['Cetus', 'Ceti'], Cha: ['Chamaeleon', 'Chamaeleontis'], Cir: ['Circinus', 'Circini'],
  Col: ['Columba', 'Columbae'], Com: ['Coma Berenices', 'Comae Berenices'], CrA: ['Corona Australis', 'Coronae Australis'],
  CrB: ['Corona Borealis', 'Coronae Borealis'], Crv: ['Corvus', 'Corvi'], Crt: ['Crater', 'Crateris'], Cru: ['Crux', 'Crucis'],
  Cyg: ['Cygnus', 'Cygni'], Del: ['Delphinus', 'Delphini'], Dor: ['Dorado', 'Doradus'], Dra: ['Draco', 'Draconis'],
  Equ: ['Equuleus', 'Equulei'], Eri: ['Eridanus', 'Eridani'], For: ['Fornax', 'Fornacis'], Gem: ['Gemini', 'Geminorum'],
  Gru: ['Grus', 'Gruis'], Her: ['Hercules', 'Herculis'], Hor: ['Horologium', 'Horologii'], Hya: ['Hydra', 'Hydrae'],
  Hyi: ['Hydrus', 'Hydri'], Ind: ['Indus', 'Indi'], Lac: ['Lacerta', 'Lacertae'], Leo: ['Leo', 'Leonis'],
  LMi: ['Leo Minor', 'Leonis Minoris'], Lep: ['Lepus', 'Leporis'], Lib: ['Libra', 'Librae'], Lup: ['Lupus', 'Lupi'],
  Lyn: ['Lynx', 'Lyncis'], Lyr: ['Lyra', 'Lyrae'], Men: ['Mensa', 'Mensae'], Mic: ['Microscopium', 'Microscopii'],
  Mon: ['Monoceros', 'Monocerotis'], Mus: ['Musca', 'Muscae'], Nor: ['Norma', 'Normae'], Oct: ['Octans', 'Octantis'],
  Oph: ['Ophiuchus', 'Ophiuchi'], Ori: ['Orion', 'Orionis'], Pav: ['Pavo', 'Pavonis'], Peg: ['Pegasus', 'Pegasi'],
  Per: ['Perseus', 'Persei'], Phe: ['Phoenix', 'Phoenicis'], Pic: ['Pictor', 'Pictoris'], Psc: ['Pisces', 'Piscium'],
  PsA: ['Piscis Austrinus', 'Piscis Austrini'], Pup: ['Puppis', 'Puppis'], Pyx: ['Pyxis', 'Pyxidis'], Ret: ['Reticulum', 'Reticuli'],
  Sge: ['Sagitta', 'Sagittae'], Sgr: ['Sagittarius', 'Sagittarii'], Sco: ['Scorpius', 'Scorpii'], Scl: ['Sculptor', 'Sculptoris'],
  Sct: ['Scutum', 'Scuti'], Ser: ['Serpens', 'Serpentis'], Sex: ['Sextans', 'Sextantis'], Tau: ['Taurus', 'Tauri'],
  Tel: ['Telescopium', 'Telescopii'], Tri: ['Triangulum', 'Trianguli'], TrA: ['Triangulum Australe', 'Trianguli Australis'],
  Tuc: ['Tucana', 'Tucanae'], UMa: ['Ursa Major', 'Ursae Majoris'], UMi: ['Ursa Minor', 'Ursae Minoris'], Vel: ['Vela', 'Velorum'],
  Vir: ['Virgo', 'Virginis'], Vol: ['Volans', 'Volantis'], Vul: ['Vulpecula', 'Vulpeculae'],
};

if (Object.keys(CONST_EN).length !== 88) throw new Error('English constellation table must list all 88');
