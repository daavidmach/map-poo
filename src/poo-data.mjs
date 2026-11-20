// ── Zdieľané pomocné funkcie pre App.jsx aj scripts/prepare-data.mjs ─────────

// Koľko záznamov detailov je v jednom súbore public/data/d/<n>.json
export const DETAIL_CHUNK = 2000

// ── CP1250 → UTF-8 oprava mojibake (PowerShell double-encoding) ───────────────
const _CP1250 = [
  0x20AC,0,0x201A,0,0x201E,0x2026,0x2020,0x2021,0,0x2030,0x0160,0x2039,0x015A,0x0164,0x017D,0x0179,
  0,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0,0x2122,0x0161,0x203A,0x015B,0x0165,0x017E,0x017A,
  0x00A0,0x02C7,0x02D8,0x0141,0x00A4,0x0104,0x00A6,0x00A7,0x00A8,0x00A9,0x015E,0x00AB,0x00AC,0x00AD,0x00AE,0x017B,
  0x00B0,0x00B1,0x02DB,0x0142,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x0105,0x015F,0x00BB,0x013D,0x02DD,0x013E,0x017C,
  0x0154,0x00C1,0x00C2,0x0102,0x00C4,0x0139,0x0106,0x00C7,0x010C,0x00C9,0x0118,0x00CB,0x011A,0x00CD,0x00CE,0x010E,
  0x0110,0x0143,0x0147,0x00D3,0x00D4,0x0150,0x00D6,0x00D7,0x0158,0x016E,0x00DA,0x0170,0x00DC,0x00DD,0x0162,0x00DF,
  0x0155,0x00E1,0x00E2,0x0103,0x00E4,0x013A,0x0107,0x00E7,0x010D,0x00E9,0x0119,0x00EB,0x011B,0x00ED,0x00EE,0x010F,
  0x0111,0x0144,0x0148,0x00F3,0x00F4,0x0151,0x00F6,0x00F7,0x0159,0x016F,0x00FA,0x0171,0x00FC,0x00FD,0x0163,0x02D9
]
const _CP1250R = new Map()
for (let b = 0; b < 128; b++) _CP1250R.set(b, b)
_CP1250.forEach((cp, i) => { if (cp) _CP1250R.set(cp, 0x80 + i) })

export function fixMojibake(s) {
  if (!s || typeof s !== 'string') return s
  let hasTell = false
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c > 0xFF && _CP1250R.has(c)) { hasTell = true; break }
  }
  if (!hasTell) return s
  try {
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++)
      bytes[i] = _CP1250R.get(s.charCodeAt(i)) ?? (s.charCodeAt(i) & 0xFF)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch { return s }
}

export function normStav(s) {
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().trim().replace(/\s+/g,'_')
}

// ASCII-normalizovaný kľúč — odstráni diakritiku, lowercase
export function normKeyA(k) {
  return (k || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Robustný getter — skúša presný kľúč aj ASCII-normalizovaný fallback
export function g(p, ...keys) {
  for (const k of keys) {
    let v = p[k]
    if (v != null && v !== '' && v !== 'N' && v !== 'null')
      return typeof v === 'number' ? v : String(v)
    v = p[normKeyA(k)]
    if (v != null && v !== '' && v !== 'N' && v !== 'null')
      return typeof v === 'number' ? v : String(v)
  }
  return ''
}

// Opraví kľúče/hodnoty jedného surového záznamu (rovnako ako pôvodný loader v App.jsx)
export function normalizeRecord(p) {
  const out = {}
  for (const [k, v] of Object.entries(p)) {
    const fk = fixMojibake(k).normalize('NFC')
    const val = typeof v === 'string' ? fixMojibake(v).normalize('NFC') : v
    out[fk] = val
    const nk = normKeyA(fk)
    if (nk !== fk) out[nk] = val
  }
  return out
}

// ── Aliasy polí v datasete ────────────────────────────────────────────────────
export const F = {
  kraj:  ['kraj','Kraj'],
  okres: ['okres','Okres'],
  obec:  ['prijímateľ adresa mesto','žiadateľ adresa mesto','adresa mesto'],
  stav:  ['stav projektu','stav'],
  kod:   ['kód investície / reformy','kod investicie','kod'],
  meno:  ['prijímateľ meno a priezvisko / názov','žiadateľ meno a priezvisko / názov','ziadatel meno a priezvisko / nazov','ziadatel'],
  forma: ['prijímateľ právna forma','žiadateľ právna forma','pravna forma','právna forma'],
  pos:   ['prijímateľ postavenie','žiadateľ postavenie','prijimatel postavenie','ziadatel postavenie'],
  poo:   ['poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma','poskytute poo'],
  zuc:   ['zúčtované poo €','zuctovane poo €','zuctovane poo','zuctovane_poo'],
  pozad: ['požadovaná suma','požadovaná suma bez dph','pozadovana suma'],
}

// Polia pre popup — prvý kľúč je kanonický (pod ním sa uloží), ďalšie sú aliasy
export const DETAIL_FIELDS = [
  ['názov projektu','nazov projektu','nazov','name'],
  ['názov výzvy','nazov vyzvy'],
  F.kod,
  F.meno,
  ['prijímateľ ičo','žiadateľ ičo','ziadatel ico','ico'],
  ['prijímateľ ič dph','žiadateľ ič dph'],
  ['prijímateľ dič','žiadateľ dič'],
  ['prijímateľ právna forma','žiadateľ právna forma','právna forma','pravna forma'],
  ['prijímateľ postavenie','žiadateľ postavenie'],
  ['dátum predloženia žiadosti','datum predlozenia ziadosti'],
  ['link crz','link_crz'],
  ['dátum uzavretia zmluvy','datum uzavretia zmluvy','datum_zmluvy','datum zmluvy'],
  ['dátum crz','datum crz'],
  ['číslo zmluvy','cislo zmluvy'],
  F.poo,
  F.zuc,
  ['celková suma projektu','celkova suma projektu','celkova_suma','celkova suma'],
  F.pozad,
  ['požadovaná suma z toho dph','pozadovana suma z toho dph'],
  ['kód výzvy','kod vyzvy'],
  ['kód žiadosti','kód projektu','kod projektu','kod ziadosti'],
  ['posúdenie výsledok','posudenie vysledok'],
  ['projekt evidenčnej výzvy','projekt evidencnej vyzvy'],
]

// ── Právna forma → typ subjektu ───────────────────────────────────────────────
const PRAVNA_FORMA_MAP = [
  [/spoločnosť s ručením obmedzeným|s\.r\.o/i,  { icon:'🏢', label:'s.r.o.', cls:'entity-sro' }],
  [/akciová spoločnosť|a\.s\./i,                 { icon:'🏦', label:'a.s.', cls:'entity-as' }],
  [/štátny podnik|štátna organizácia|príspevková organizácia|rozpočtová organizácia/i,
                                                  { icon:'🏛️', label:'Štátna org.', cls:'entity-stat' }],
  [/obec|mesto|samosprávny kraj|vyšší územný celok/i,
                                                  { icon:'🏙️', label:'Samospráva', cls:'entity-samo' }],
  [/verejnoprávna|verejná výskumná/i,             { icon:'🎓', label:'Verejná inštitúcia', cls:'entity-edu' }],
  [/fyzická osoba - podnikateľ|živnostník/i,      { icon:'👷', label:'Živnostník / SZČO', cls:'entity-szco' }],
  [/fyzická osoba|^fo$/i,                         { icon:'👤', label:'Fyzická osoba', cls:'entity-fyzicka' }],
  [/občianske združenie|nezisková|nadácia|cirkev|neinvestičný fond/i,
                                                  { icon:'🤝', label:'Nezisková org.', cls:'entity-ngo' }],
  [/družstvo/i,                                   { icon:'🤝', label:'Družstvo', cls:'entity-ngo' }],
  [/komanditná spoločnosť|verejná obchodná/i,     { icon:'🏢', label:'Osobná spol.', cls:'entity-sro' }],
]

export function entityInfo(name, pravnaForma) {
  if (pravnaForma) {
    for (const [re, meta] of PRAVNA_FORMA_MAP) {
      if (re.test(pravnaForma)) return meta
    }
    return { icon:'🏢', label:'Právnická osoba', cls:'entity-sro' }
  }
  if (!name) return { icon:'👤', label:'Fyzická osoba', cls:'entity-fyzicka' }
  if (/\bs\.r\.o|spol\. s r\.o/i.test(name))   return { icon:'🏢', label:'s.r.o.', cls:'entity-sro' }
  if (/\ba\.s\.\b|\bakcio/i.test(name))         return { icon:'🏦', label:'a.s.', cls:'entity-as' }
  if (/ministerstvo|úrad vlády|štátna|agentúra|fond|inšpektorát/i.test(name))
    return { icon:'🏛️', label:'Štátna inštitúcia', cls:'entity-stat' }
  if (/obec |mesto |mestská |obecný |kraj|samosprávny/i.test(name))
    return { icon:'🏙️', label:'Samospráva', cls:'entity-samo' }
  if (/škola|gymnázium|univerzita|fakulta|akadémia|výskumný|ústav/i.test(name))
    return { icon:'🎓', label:'Vzdelávanie', cls:'entity-edu' }
  if (/nemocnica|zdravotn|poliklinika|klinika/i.test(name))
    return { icon:'🏥', label:'Zdravotníctvo', cls:'entity-health' }
  if (/o\.z\.|n\.o\.|n\.f\.|združenie|nadácia|spolok|cirkev/i.test(name))
    return { icon:'🤝', label:'Nezisková org.', cls:'entity-ngo' }
  return { icon:'🏢', label:'Právnická osoba', cls:'entity-sro' }
}
