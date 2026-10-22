import { useState, useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import './App.css'

// ── POO Komponenty SR — číselné kódy K01–K16, R ──────────────────────────────
// Zdroj: ispo.planobnovy.sk — kódy investícií / reforiem
const KN_MAP = [
  null,
  { l:'Zdravotníctvo',           icon:'🏥', c:'#ef5350' },  // K01
  { l:'Zdravotníctvo — dlhodobá starostlivosť', icon:'🏥', c:'#e57373' },  // K02
  { l:'Energetická efektívnosť', icon:'⚡', c:'#FDD835' },  // K03
  { l:'Obnoviteľné zdroje',      icon:'☀️', c:'#66BB6A' },  // K04
  { l:'Zelená ekonomika',        icon:'🌱', c:'#4CAF50' },  // K05
  { l:'Udržateľná doprava',      icon:'🚌', c:'#26C6DA' },  // K06
  { l:'Digitalizácia VS',        icon:'🖥️', c:'#42A5F5' },  // K07
  { l:'Digitalizácia ekonomiky', icon:'💻', c:'#1E88E5' },  // K08
  { l:'Veda a výskum',           icon:'🔬', c:'#7ada9c' },  // K09
  { l:'Vzdelávanie',             icon:'🎓', c:'#b07af0' },  // K10
  { l:'Vzdelávanie — školy',     icon:'📚', c:'#9C27B0' },  // K11
  { l:'Trh práce / soc. inklúzia',icon:'💼', c:'#7ab8da' }, // K12
  { l:'Zdravotníctvo III',       icon:'💊', c:'#ec407a' },  // K13
  { l:'Inovácie / financovanie', icon:'💡', c:'#FF9800' },  // K14
  { l:'Rozvoj regiónov',         icon:'🏘️', c:'#78909C' },  // K15
  { l:'Infraštruktúra',          icon:'🏗️', c:'#FF7043' },  // K16
]
function kodMeta(kat) {
  if (!kat) return null
  const k = kat.trim().toUpperCase()
  if (k.startsWith('R')) return { l:'Reformy', icon:'⚖️', c:'#CE93D8' }
  const m = k.match(/^K(\d+)/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (n > 0 && n < KN_MAP.length && KN_MAP[n]) return KN_MAP[n]
    return { l:`Komponent K${String(n).padStart(2,'0')}`, icon:'📋', c:'#546E7A' }
  }
  return { l: kat, icon:'📋', c:'#546E7A' }
}

// ── Kraj NUTS3 IDs + choropleth farby ─────────────────────────────────────────
const KRAJE = [
  { nuts:'SK010', name:'Bratislavský kraj',   short:'Bratislavský', color:'#5C8AFF' },
  { nuts:'SK021', name:'Trnavský kraj',       short:'Trnavský',     color:'#FF9F43' },
  { nuts:'SK022', name:'Trenčiansky kraj',    short:'Trenčiansky',  color:'#48DBFB' },
  { nuts:'SK023', name:'Nitriansky kraj',     short:'Nitriansky',   color:'#FF6B9D' },
  { nuts:'SK031', name:'Žilinský kraj',       short:'Žilinský',     color:'#1DD1A1' },
  { nuts:'SK032', name:'Banskobystrický kraj',short:'Banskobystrický',color:'#FECA57'},
  { nuts:'SK041', name:'Prešovský kraj',      short:'Prešovský',    color:'#A29BFE' },
  { nuts:'SK042', name:'Košický kraj',        short:'Košický',      color:'#FD79A8' },
]

// ── Okres centroids [lat, lng] ────────────────────────────────────────────────
const OKRES = {
  'Bratislava I':[48.1439,17.1097],'Bratislava II':[48.1500,17.1600],
  'Bratislava III':[48.1850,17.1200],'Bratislava IV':[48.1900,17.0400],
  'Bratislava V':[48.0700,17.1300],'Malacky':[48.4350,17.0180],
  'Pezinok':[48.2900,17.2700],'Senec':[48.2200,17.3900],
  'Dunajská Streda':[47.9950,17.6200],'Galanta':[48.1880,17.7290],
  'Hlohovec':[48.4300,17.8000],'Piešťany':[48.5880,17.8340],
  'Senica':[48.6800,17.3680],'Skalica':[48.8440,17.2260],
  'Trnava':[48.3770,17.5880],'Bánovce nad Bebravou':[48.7200,18.2600],
  'Ilava':[48.9980,18.2350],'Myjava':[48.7580,17.5650],
  'Nové Mesto nad Váhom':[48.7550,17.8340],'Partizánske':[48.6280,18.3770],
  'Považská Bystrica':[49.1210,18.4440],'Púchov':[49.1250,18.3290],
  'Trenčín':[48.8930,18.0440],'Komárno':[47.7600,18.1270],
  'Levice':[48.2160,18.6010],'Nitra':[48.3063,18.0844],
  'Nové Zámky':[47.9850,18.1680],'Šaľa':[48.1510,17.8780],
  'Topoľčany':[48.5550,18.1700],'Zlaté Moravce':[48.3840,18.3960],
  'Bytča':[49.2230,18.5580],'Čadca':[49.4360,18.7880],
  'Dolný Kubín':[49.2120,19.2950],'Kysucké Nové Mesto':[49.3010,18.7820],
  'Liptovský Mikuláš':[49.0840,19.6160],'Martin':[49.0630,18.9220],
  'Námestovo':[49.4060,19.4810],'Ružomberok':[49.0750,19.3070],
  'Turčianske Teplice':[48.8620,18.8580],'Tvrdošín':[49.3400,19.5560],
  'Žilina':[49.2231,18.7393],'Banská Bystrica':[48.7355,19.1530],
  'Banská Štiavnica':[48.4600,18.8970],'Brezno':[48.8060,19.6410],
  'Detva':[48.5590,19.4210],'Krupina':[48.3560,19.0690],
  'Lučenec':[48.3320,19.6680],'Poltár':[48.4300,19.7950],
  'Revúca':[48.6840,20.1120],'Rimavská Sobota':[48.3800,20.0180],
  'Veľký Krtíš':[48.2100,19.3510],'Zvolen':[48.5760,19.1280],
  'Žiar nad Hronom':[48.5880,18.8540],'Bardejov':[49.2960,21.2750],
  'Humenné':[48.9340,21.9080],'Kežmarok':[49.1350,20.4310],
  'Levoča':[49.0230,20.5920],'Medzilaborce':[49.2700,21.9000],
  'Poprad':[49.0560,20.2980],'Prešov':[48.9980,21.2390],
  'Sabinov':[49.1010,21.0990],'Snina':[48.9880,22.1490],
  'Stará Ľubovňa':[49.3020,20.6890],'Stropkov':[49.2040,21.6500],
  'Vranov nad Topľou':[48.8800,21.6880],'Gelnica':[48.8560,20.9350],
  'Košice I':[48.7163,21.2611],'Košice II':[48.7000,21.2900],
  'Košice III':[48.7300,21.3100],'Košice IV':[48.6800,21.2200],
  'Košice-okolie':[48.6500,21.1500],'Michalovce':[48.7540,21.9200],
  'Rožňava':[48.6600,20.5280],'Sobrance':[48.7440,22.1810],
  'Spišská Nová Ves':[48.9450,20.5700],'Trebišov':[48.6270,21.7180],
}

// ── Stav metadata ─────────────────────────────────────────────────────────────
const STAV_META = {
  PROJEKT_UKONCENY:                { c:'#4CAF50', l:'Ukončený' },
  PROJEKT_V_REALIZACII:            { c:'#2196F3', l:'V realizácii' },
  ZMLUVA_UZAVRETA:                 { c:'#FF9800', l:'Zmluva uzavretá' },
  ZAZMLUVNENY:                     { c:'#FF9800', l:'Zazmluvnený' },
  ZIADOST_SCHVALENA:               { c:'#9C27B0', l:'Žiadosť schválená' },
  SCHVALENY:                       { c:'#9C27B0', l:'Schválený' },
  ZIADOST_PODANA:                  { c:'#607D8B', l:'Žiadosť podaná' },
  PROJEKT_ZRUSENY:                 { c:'#f44336', l:'Zrušený' },
  ZRUSENY:                         { c:'#f44336', l:'Zrušený' },
  PREDPRIPRAVENY:                  { c:'#FDD835', l:'Predpripravený' },
  NESTANDARDNE_UKONCENIE_PROJEKTU: { c:'#FF5722', l:'Nest. ukončenie' },
  ODSTUPENIE_OD_ZMLUVY:            { c:'#FF7043', l:'Odstúpenie od zmluvy' },
  CIASTOCNE_VYPLATENY:             { c:'#00BCD4', l:'Čiastočne vyplatený' },
  VYPLATENY:                       { c:'#4CAF50', l:'Vyplatený' },
  CAKAJUCE_NA_PLATBU:              { c:'#FFCA28', l:'Čakajúce na platbu' },
  NESCHVALENY:                     { c:'#E53935', l:'Neschválený' },
  ZAMIETNUTA:                      { c:'#E53935', l:'Zamietnutá' },
  ZAMIETNUTA_ZIADOST:              { c:'#E53935', l:'Zamietnutá žiadosť' },
  NOVY:                            { c:'#26C6DA', l:'Nový' },
  UZAVRETY:                        { c:'#26C6DA', l:'Uzavretý' },
  NEZNAMY:                         { c:'#546E7A', l:'Neznámy' },
}

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

function fixMojibake(s) {
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

function normStav(s) {
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().trim().replace(/\s+/g,'_')
}
function stavMeta(stav) {
  return STAV_META[normStav(stav)] || { c:'#546E7A', l: stav || 'Neznámy' }
}

function fmt(n) {
  const v = parseFloat(n)
  if (!v && v !== 0) return '—'
  if (v >= 1e9) return (v/1e9).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' mld. €'
  if (v >= 1e6) return (v/1e6).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' M €'
  if (v >= 1e3) return (v/1e3).toLocaleString('sk-SK',{maximumFractionDigits:1}) + ' tis. €'
  return v.toLocaleString('sk-SK') + ' €'
}

// ── ASCII-normalize kľúč — odstráni diakritiku, lowercase ────────────────────
function normKeyA(k) {
  return (k || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// ── Robustný getter — skúša presný kľúč aj ASCII-normalizovaný fallback ───────
function g(p, ...keys) {
  for (const k of keys) {
    let v = p[k]
    if (v != null && v !== '' && v !== 'N' && v !== 'null')
      return typeof v === 'number' ? v : String(v)
    // Fallback: ASCII-normalizovaný kľúč (rieši NFD/NFC mismatch)
    v = p[normKeyA(k)]
    if (v != null && v !== '' && v !== 'N' && v !== 'null')
      return typeof v === 'number' ? v : String(v)
  }
  return ''
}

// Právna forma → entity typ (priame mapovanie z JSON poľa)
const PRAVNA_FORMA_MAP = [
  [/spoločnosť s ručením obmedzeným|s\.r\.o/i,  { icon:'🏢', label:'s.r.o.', cls:'entity-sro' }],
  [/akciová spoločnosť|a\.s\./i,                 { icon:'🏦', label:'a.s.', cls:'entity-as' }],
  [/štátny podnik|štátna organizácia|príspevková organizácia|rozpočtová organizácia/i,
                                                  { icon:'🏛️', label:'Štátna org.', cls:'entity-stat' }],
  [/obec|mesto|samosprávny kraj|vyšší územný celok/i,
                                                  { icon:'🏙️', label:'Samospráva', cls:'entity-samo' }],
  [/verejnoprávna|verejná výskumná/i,             { icon:'🎓', label:'Verejná inštitúcia', cls:'entity-edu' }],
  [/fyzická osoba - podnikateľ|živnostník/i,      { icon:'👷', label:'Živnostník / SZČO', cls:'entity-szco' }],
  [/fyzická osoba/i,                              { icon:'👤', label:'Fyzická osoba', cls:'entity-fyzicka' }],
  [/občianske združenie|nezisková|nadácia|cirkev|neinvestičný fond/i,
                                                  { icon:'🤝', label:'Nezisková org.', cls:'entity-ngo' }],
  [/družstvo/i,                                   { icon:'🤝', label:'Družstvo', cls:'entity-ngo' }],
  [/komanditná spoločnosť|verejná obchodná/i,     { icon:'🏢', label:'Osobná spol.', cls:'entity-sro' }],
]

function entityInfo(name, pravnaForma) {
  // Prednostne podľa právnej formy (priame pole z JSON)
  if (pravnaForma) {
    for (const [re, meta] of PRAVNA_FORMA_MAP) {
      if (re.test(pravnaForma)) return meta
    }
    // Ak právna forma existuje ale nerozoznali sme → Právnická osoba
    return { icon:'🏢', label:'Právnická osoba', cls:'entity-sro' }
  }
  // Fallback — regex na mene
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

// ── Popup HTML ─────────────────────────────────────────────────────────────────
function makePopup(p, meta, color) {
  const okres   = g(p,'okres','Okres')
  const kraj    = g(p,'kraj','Kraj')
  const kat     = g(p,'kód investície / reformy','kod investicie','kod')
  const km      = kodMeta(kat)
  const nazov   = g(p,'názov projektu','nazov projektu','nazov','name')
  const vyzva   = g(p,'názov výzvy','nazov vyzvy')
  const meno    = g(p,'prijímateľ meno a priezvisko / názov',
                     'žiadateľ meno a priezvisko / názov',
                     'ziadatel meno a priezvisko / nazov','ziadatel')
  const ico        = g(p,'prijímateľ ičo','žiadateľ ičo','ziadatel ico','ico')
  const icDph      = g(p,'prijímateľ ič dph','žiadateľ ič dph').trim()
  const dic        = g(p,'prijímateľ dič','žiadateľ dič')
  const pravnaForma= g(p,'prijímateľ právna forma','žiadateľ právna forma','právna forma')
  const postavenie = g(p,'prijímateľ postavenie','žiadateľ postavenie')
  const datumPred  = g(p,'dátum predloženia žiadosti','datum predlozenia ziadosti')
  const link       = g(p,'link crz','link_crz')
  const datum      = g(p,'dátum uzavretia zmluvy','datum uzavretia zmluvy','datum_zmluvy','datum zmluvy')
  const datumCrz   = g(p,'dátum crz','datum crz')
  const cislo      = g(p,'číslo zmluvy','cislo zmluvy')
  const ent        = entityInfo(meno, pravnaForma)

  const poo        = parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma')) || 0
  const pooZuc     = parseFloat(g(p,'zúčtované poo €','zuctovane poo','zuctovane_poo')) || 0
  const celk       = parseFloat(g(p,'celková suma projektu','celkova suma projektu','celkova_suma')) || 0
  const pozad      = parseFloat(g(p,'požadovaná suma','požadovaná suma bez dph','pozadovana suma')) || 0
  const pozadDph   = parseFloat(g(p,'požadovaná suma z toho dph','pozadovana suma z toho dph')) || 0

  const kodVyzvy  = g(p,'kód výzvy','kod vyzvy')
  const kodZiad   = g(p,'kód žiadosti','kód projektu','kod projektu','kod ziadosti')
  const posudenie = g(p,'posúdenie výsledok','posudenie vysledok')
  const evidencna = g(p,'projekt evidenčnej výzvy','projekt evidencnej vyzvy')

  const mainSum = poo || pozad || celk

  const posLabel = {
    PRIJIMATEL: '✅ Príjemca', ZIADATEL: '📋 Žiadateľ',
    PLATCA: '💳 Platca', PARTNER: '🤝 Partner',
  }[postavenie] || postavenie

  return `
    <div class="pc">
      <div class="pc-head" style="border-left:3px solid ${color}">
        <span class="pc-badge" style="background:${color}22;color:${color}">${meta.l}</span>
        <span class="pc-ent ${ent.cls}">${ent.icon} ${ent.label}</span>
      </div>
      ${nazov ? `<div class="pc-title">${nazov}</div>` : ''}
      ${vyzva && vyzva !== nazov ? `<div class="pc-vyzva">${vyzva}</div>` : ''}
      ${km ? `<div class="pc-area-badge" style="background:${km.c}18;border-color:${km.c}44;color:${km.c}">${km.icon} ${km.l}</div>` : ''}

      ${meno || pravnaForma ? `
        <div class="pc-entity">
          <span class="pc-entity-lbl">${posLabel || 'Príjemca / Žiadateľ'}</span>
          ${meno ? `<span class="pc-entity-val">${meno}</span>` : ''}
          ${pravnaForma ? `<span class="pc-entity-forma">${pravnaForma}</span>` : ''}
          ${ico ? `<span class="pc-entity-ico">
            IČO: <b>${ico}</b>
            · <a href="https://www.finstat.sk/${ico}" target="_blank" rel="noopener">FinStat</a>
            · <a href="https://orsr.sk/hladaj_ico.asp?ico=${ico}" target="_blank" rel="noopener">ORSR</a>
          </span>` : ''}
          ${icDph ? `<span class="pc-entity-ico">IČ DPH: ${icDph}${dic ? ' · DIČ: '+dic : ''}</span>` : ''}
        </div>` : ''}

      <div class="pc-rows">
        <div class="pc-row"><span>Lokalita</span><b>${okres}${kraj ? ' · ' + kraj.replace(' kraj','') : ''}</b></div>
        ${kat ? `<div class="pc-row"><span>Kód invest.</span><b>${kat}</b></div>` : ''}
        ${kodVyzvy  ? `<div class="pc-row"><span>Kód výzvy</span><b>${kodVyzvy}</b></div>` : ''}
        ${kodZiad   ? `<div class="pc-row"><span>Kód žiadosti</span><b>${kodZiad}</b></div>` : ''}
        ${datumPred ? `<div class="pc-row"><span>Podaná</span><b>${datumPred}</b></div>` : ''}
        ${posudenie ? `<div class="pc-row pc-posudenie"><span>Posúdenie</span><b class="${posudenie==='SPLNENE_PODMIENKY'?'pc-ok':'pc-nok'}">${posudenie==='SPLNENE_PODMIENKY'?'✓ Splnené podmienky':posudenie}</b></div>` : ''}
        ${evidencna && evidencna==='N' ? '' : evidencna ? `<div class="pc-row"><span>Evidenčná výzva</span><b>${evidencna}</b></div>` : ''}
        ${poo  > 0 ? `<div class="pc-row pc-money"><span>Poskytnuté POO</span><b>${fmt(poo)}</b></div>` : ''}
        ${pooZuc>0 ? `<div class="pc-row"><span>Zúčtované POO</span><b>${fmt(pooZuc)}</b></div>` : ''}
        ${pozad > 0 ? `<div class="pc-row"><span>Požadovaná suma</span><b>${fmt(pozad)}${pozadDph?` <small>(DPH: ${fmt(pozadDph)})</small>`:''}</b></div>` : ''}
        ${celk  > 0 ? `<div class="pc-row pc-money"><span>Celková suma</span><b>${fmt(celk)}</b></div>` : ''}
        ${datum ? `<div class="pc-row"><span>Uzavretie zmluvy</span><b>${datum}</b></div>` : ''}
        ${datumCrz ? `<div class="pc-row"><span>Dátum CRZ</span><b>${datumCrz}</b></div>` : ''}
        ${cislo ? `<div class="pc-row"><span>Číslo zmluvy</span><b style="font-size:10px">${cislo}</b></div>` : ''}
      </div>

      ${mainSum > 0 ? `
        <div class="pc-bar-wrap">
          <div class="pc-bar-track">
            <div class="pc-bar-fill" style="width:${poo&&celk?Math.min(100,(poo/celk)*100):100}%;background:${color}"></div>
          </div>
          <div class="pc-bar-labels">
            <span>POO: ${fmt(poo||pozad)}</span>
            ${celk>0?`<span>Celkom: ${fmt(celk)}</span>`:''}
          </div>
        </div>` : ''}
      ${link ? `<a class="pc-btn" href="${link}" target="_blank" rel="noopener">📄 Zmluva CRZ →</a>` : ''}
    </div>`
}

// ── Heatmap — hustota projektov per okres (žiadne extra balíčky) ──────────────
function buildHeatLayer(projects) {
  const counts = {}
  projects.forEach(p => {
    const o = g(p,'okres','Okres')
    if (o && OKRES[o]) counts[o] = (counts[o]||0)+1
  })
  const vals = Object.values(counts)
  if (!vals.length) return L.layerGroup()
  const max = Math.max(...vals)
  const circles = Object.entries(counts).map(([name, cnt]) => {
    const ratio = cnt / max
    const [lat, lng] = OKRES[name]
    const radius = 8000 + ratio * 55000
    // Farebný gradient: málo=modrá, stred=zelená, veľa=červená
    const hue = Math.round(240 - ratio * 240)
    const col = `hsl(${hue},85%,58%)`
    return L.circle([lat, lng], {
      radius,
      color: 'transparent',
      fillColor: col,
      fillOpacity: 0.18 + ratio * 0.38,
      interactive: false,
    })
  })
  return L.layerGroup(circles)
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const layersRef  = useRef({ kraje: null, markers: null, heat: null })
  const byKrajRef  = useRef({})

  const [data,      setData]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── Easter egg ───────────────────────────────────────────────────────────────
  const [eggClicks,  setEggClicks]  = useState(0)
  const [eggVisible, setEggVisible] = useState(false)
  const eggTimerRef = useRef(null)
  const EGG_ICONS = ['🏥','👨‍⚕️','💊','🚑','🩺','❤️','🫀','🧬','💉','🩻']
  const handleEggClick = () => {
    setEggClicks(c => {
      const next = c + 1
      if (next >= 5) {
        setEggVisible(true)
        clearTimeout(eggTimerRef.current)
        eggTimerRef.current = setTimeout(() => { setEggVisible(false); setEggClicks(0) }, 3500)
        return 0
      }
      return next
    })
  }

  const [filterKraj,   setFilterKraj]   = useState('all')
  const [filterStav,   setFilterStav]   = useState('all')
  const [filterKat,    setFilterKat]    = useState('all')
  const [filterEntity,    setFilterEntity]    = useState('all')
  const [filterPostavenie,setFilterPostavenie] = useState('all') // 'all' | 'PRIJIMATEL' | 'PARTNER' | 'ZIADATEL'
  const [showKraje,    setShowKraje]    = useState(true)
  const [heatMode,     setHeatMode]     = useState(false)
  const [krajView,     setKrajView]     = useState('count') // 'count' | 'suma'
  const [tileMode,     setTileMode]     = useState('dark')  // 'dark' | 'light'
  const tileLayerRef = useRef(null)

  // ── Načítaj JSON ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/planobnovy.json')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer() })
      .then(buf => {
        const text = new TextDecoder('utf-8').decode(buf)
        const clean = text.replace(/^﻿/, '')
        const raw = JSON.parse(clean)
        const rawArr = Array.isArray(raw) ? raw : raw.data || Object.values(raw)[0] || []
        const arr = rawArr.map(p => {
          const out = {}
          for (const [k, v] of Object.entries(p)) {
            const fixedKey = fixMojibake(k).normalize('NFC')
            const val = typeof v === 'string' ? fixMojibake(v) : v
            out[fixedKey] = val
            // Uložíme aj ASCII-normalizovaný kľúč ako fallback (NFD/NFC mismatch fix)
            const nk = normKeyA(fixedKey)
            if (nk !== fixedKey) out[nk] = val
          }
          return out
        })
        // Debug: vypíšeme kľúče prvého záznamu pre overenie
        if (arr.length > 0) {
          console.log('[POO] Prvý záznam kľúče:', Object.keys(arr[0]).slice(0,10))
          console.log('[POO] pravna forma prvého:', arr[0]['prijímateľ právna forma'] || arr[0][normKeyA('prijímateľ právna forma')] || 'NENÁJDENÁ')
        }
        setData(arr)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  // ── Init Leaflet ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    const map = L.map(mapRef.current, {
      center: [48.7, 19.5], zoom: 7,
      zoomControl: false,
      attributionControl: true,
    })
    L.control.zoom({ position:'topright' }).addTo(map)

    // Tile layer — dark predvolene, prepnuteľné
    tileLayerRef.current = L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openstreetmap.org/copyright">OSM</a>',
        maxZoom: 20,
      }).addTo(map)
    leafletRef.current = map

    // ── Kraj hranice z Eurostat GISCO NUTS3 ────────────────────────────────────
    fetch('https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_03M_2021_4326_LEVL_3.geojson')
      .then(r => r.json())
      .then(geo => {
        const sk = geo.features.filter(f => f.properties.NUTS_ID?.startsWith('SK'))
        const layer = L.geoJSON(sk, {
          style(f) {
            const k = KRAJE.find(k => k.nuts === f.properties.NUTS_ID)
            const cnt = byKrajRef.current[k?.name] || 0
            const max = Math.max(...Object.values(byKrajRef.current), 1)
            return {
              color:       '#ffffff22',
              weight:      1.5,
              fillColor:   k?.color || '#7DAA6C',
              fillOpacity: 0.06 + (cnt/max) * 0.38,
            }
          },
          onEachFeature(f, layer) {
            const k = KRAJE.find(k => k.nuts === f.properties.NUTS_ID)
            layer.bindTooltip(`<b>${k?.name || f.properties.NAME_LATN}</b>`,
              { sticky:true, className:'kraj-tooltip' })
          },
        }).addTo(map)
        layersRef.current.kraje = layer
      })
      .catch(() => {
        console.warn('GISCO nedostupné')
      })

    // ── MarkerClusterGroup ─────────────────────────────────────────────────────
    const mcg = L.markerClusterGroup({
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction(cluster) {
        const n = cluster.getChildCount()
        const size = n > 1000 ? 56 : n > 100 ? 46 : 38
        const all = cluster.getAllChildMarkers()
        const sample = all.length > 60 ? all.slice(0, 60) : all
        const counts = {}
        sample.forEach(m => { const c = m.options.color||'#546E7A'; counts[c]=(counts[c]||0)+1 })
        const dom = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '#3a6a9c'
        const label = n > 9999 ? Math.round(n/1000)+'k' : n > 999 ? (n/1000).toFixed(1)+'k' : n
        return L.divIcon({
          html: `<div class="cl-icon" style="width:${size}px;height:${size}px;line-height:${size}px;border-color:${dom};box-shadow:0 0 20px ${dom}66,0 0 6px ${dom}33,0 2px 8px rgba(0,0,0,.7);color:${dom}">${label}</div>`,
          className:'', iconSize:[size,size],
        })
      },
    }).addTo(map)
    layersRef.current.markers = mcg

    return () => { map.remove(); leafletRef.current = null }
  }, [])

  // ── Toggle kraj vrstvy ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletRef.current
    if (!map || !layersRef.current.kraje) return
    showKraje ? map.addLayer(layersRef.current.kraje) : map.removeLayer(layersRef.current.kraje)
  }, [showKraje])

  // ── Prepínač tiles dark / light ──────────────────────────────────────────────
  useEffect(() => {
    const map = leafletRef.current
    if (!map) return
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
    const TILES = {
      dark: {
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        attr: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openstreetmap.org/copyright">OSM</a>',
      },
      light: {
        url: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
        attr: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openstreetmap.org/copyright">OSM</a>',
      },
    }
    const t = TILES[tileMode] || TILES.dark
    tileLayerRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 20 }).addTo(map)
    // Posuň tile layer pod všetky ostatné vrstvy
    tileLayerRef.current.bringToBack()
  }, [tileMode])

  // ── Filtrované dáta ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => data.filter(p => {
    const kraj       = g(p,'kraj','Kraj')
    const stav       = normStav(g(p,'stav projektu','stav'))
    const kat        = g(p,'kód investície / reformy','kod investicie','kod')
    const meno       = g(p,'prijímateľ meno a priezvisko / názov','žiadateľ meno a priezvisko / názov','ziadatel')
    const pravnaForma= g(p,'prijímateľ právna forma','žiadateľ právna forma','pravna forma','právna forma')
    const ent        = entityInfo(meno, pravnaForma)
    if (filterKraj   !== 'all' && !kraj.includes(filterKraj))   return false
    if (filterStav   !== 'all' && stav !== filterStav)           return false
    if (filterKat    !== 'all' && !kat.startsWith(filterKat))    return false
    if (filterEntity !== 'all' && ent.label !== filterEntity)    return false
    if (filterPostavenie !== 'all') {
      const pos = normStav(g(p,'prijímateľ postavenie','žiadateľ postavenie','prijimatel postavenie','ziadatel postavenie'))
      if (pos !== filterPostavenie) return false
    }
    return true
  }), [data, filterKraj, filterStav, filterKat, filterEntity, filterPostavenie])

  // ── Markery — bulk addLayers ─────────────────────────────────────────────────
  useEffect(() => {
    const mcg = layersRef.current.markers
    if (!mcg) return
    mcg.clearLayers()
    if (heatMode) return  // v heatmap móde neskrývame ale neplníme clustery
    const markers = []
    filtered.forEach((p, idx) => {
      const okres = g(p,'okres','Okres')
      const base  = OKRES[okres]
      if (!base) return
      const jLat = (Math.sin(idx * 127.1 + 0.5) * 0.5) * 0.06
      const jLng = (Math.sin(idx * 311.7 + 1.3) * 0.5) * 0.06
      const stav  = g(p,'stav projektu','stav')
      const meta  = stavMeta(stav)
      const poo   = parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma')) || 0
      const pozad = parseFloat(g(p,'požadovaná suma','požadovaná suma bez dph')) || 0
      const suma  = poo || pozad
      const r     = suma > 0 ? Math.min(14, Math.max(5, 4 + Math.log10(suma/1000+1)*3)) : 5
      const isActive = normStav(stav) === 'PROJEKT_V_REALIZACII'
      const m = L.circleMarker([base[0]+jLat, base[1]+jLng], {
        radius: r,
        color: meta.c,
        weight: isActive ? 2.5 : 1.5,
        fillColor: meta.c,
        fillOpacity: 0.82,
        className: isActive ? 'pulse-marker' : '',
      })
      m.options.color = meta.c  // pre cluster dominant farbu
      m.bindPopup(makePopup(p, meta, meta.c), { maxWidth:340, className:'dark-popup' })
      markers.push(m)
    })
    mcg.addLayers(markers)
  }, [filtered, heatMode])

  // ── Heatmap vrstva ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletRef.current
    if (!map) return
    if (layersRef.current.heat) {
      map.removeLayer(layersRef.current.heat)
      layersRef.current.heat = null
    }
    if (heatMode) {
      const layer = buildHeatLayer(filtered)
      layer.addTo(map)
      layersRef.current.heat = layer
    }
  }, [filtered, heatMode])

  // ── Štatistiky ────────────────────────────────────────────────────────────────
  // Hlavná POO suma: poskytnuté → zazmluvnená → požadovaná (rovnaká fallback logika ako pôvodne)
  const totalPOO  = useMemo(()=>filtered.reduce((s,p)=>
    s+(parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma'))||0),0),[filtered])
  // Zazmluvnená (len projekty so zmluvou)
  const totalZazmluvnena = useMemo(()=>filtered.reduce((s,p)=>{
    const v = parseFloat(g(p,'zazmluvnená suma zdroj poo','zazmluvnena suma zdroj poo'))
    return s + (v > 0 ? v : 0)
  },0),[filtered])
  // Zúčtované POO
  const totalZuctovane = useMemo(()=>filtered.reduce((s,p)=>
    s+(parseFloat(g(p,'zúčtované poo €','zuctovane poo €','zuctovane poo'))||0),0),[filtered])
  const totalCelk = useMemo(()=>filtered.reduce((s,p)=>
    s+(parseFloat(g(p,'celková suma projektu','celkova suma projektu','celkova_suma'))||0),0),[filtered])

  const byKraj = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{ const k=g(p,'kraj','Kraj')||'Neznámy kraj'; m[k]=(m[k]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[filtered])

  // Choropleth update
  useEffect(() => {
    const countMap = Object.fromEntries(byKraj)
    byKrajRef.current = countMap
    const layer = layersRef.current.kraje
    if (layer?.setStyle) {
      const max = byKraj[0]?.[1] || 1
      layer.setStyle(f => {
        const k = KRAJE.find(k => k.nuts === f.properties?.NUTS_ID)
        const cnt = countMap[k?.name] || 0
        return { fillOpacity: 0.06 + (cnt/max) * 0.38 }
      })
    }
  }, [byKraj])

  const byStav = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{ const s=normStav(g(p,'stav projektu','stav'))||'NEZNAMY'; m[s]=(m[s]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[filtered])

  const byArea = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{
      const kat = g(p,'kód investície / reformy','kod investicie','kod')
      if (!kat) return
      const km = kodMeta(kat)
      const key = km?.l || kat
      m[key] = { count:(m[key]?.count||0)+1, meta:km }
    })
    return Object.entries(m).sort((a,b)=>b[1].count-a[1].count)
  },[filtered])

  const byEntity = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{
      const meno = g(p,'prijímateľ meno a priezvisko / názov',
        'žiadateľ meno a priezvisko / názov',
        'ziadatel meno a priezvisko / nazov','ziadatel')
      const pravnaForma = g(p,'prijímateľ právna forma','žiadateľ právna forma','pravna forma','právna forma')
      const ent = entityInfo(meno, pravnaForma)
      if (!m[ent.label]) m[ent.label]={ count:0, icon:ent.icon, cls:ent.cls, poo:0 }
      m[ent.label].count++
      m[ent.label].poo += parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma'))||0
    })
    return Object.entries(m).sort((a,b)=>b[1].count-a[1].count)
  },[filtered])

  const pooByKraj = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{
      const k=g(p,'kraj','Kraj')||'Neznámy kraj'
      m[k]=(m[k]||0)+(parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma'))||0)
    })
    return m
  },[filtered])

  const krajList = useMemo(()=>[...new Set(data.map(p=>g(p,'kraj','Kraj')))].filter(Boolean).sort(),[data])
  const stavList = useMemo(()=>[...new Set(data.map(p=>normStav(g(p,'stav projektu','stav'))))].filter(Boolean).sort(),[data])
  // Pre filter kódov — zobraz len prefix (K01, K02...)
  const katList  = useMemo(()=>{
    const prefixes = new Set()
    data.forEach(p=>{
      const k = g(p,'kód investície / reformy','kod investicie','kod')
      if (!k) return
      const m = k.match(/^[KR]\d*/i)
      if (m) prefixes.add(m[0].toUpperCase())
    })
    return [...prefixes].sort()
  },[data])

  const maxKraj = byKraj[0]?.[1]||1

  return (
    <div className="app">

      {/* ── Easter egg overlay ──────────────────────────────────────── */}
      {eggVisible && (
        <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,overflow:'hidden'}}>
          <style>{`
            @keyframes eggFloat {
              0%   { transform: translateY(110vh) rotate(0deg) scale(0.5); opacity:0; }
              10%  { opacity:1; }
              50%  { transform: translateY(40vh) rotate(360deg) scale(1.3); }
              90%  { opacity:1; }
              100% { transform: translateY(-20vh) rotate(720deg) scale(0.8); opacity:0; }
            }
            @keyframes eggSpin {
              0%   { transform: translateX(-10vw) translateY(50vh) rotate(0deg) scale(1); opacity:0; }
              10%  { opacity:1; }
              50%  { transform: translateX(110vw) translateY(20vh) rotate(540deg) scale(1.5); }
              90%  { opacity:1; }
              100% { transform: translateX(120vw) translateY(70vh) rotate(900deg) scale(0.5); opacity:0; }
            }
          `}</style>
          {EGG_ICONS.map((icon, i) => (
            <div key={i} style={{
              position:'absolute',
              fontSize: `${2 + (i%3)}rem`,
              left: `${(i*17+7) % 90}%`,
              animation: i%2===0
                ? `eggFloat ${2+i*0.2}s ease-in-out forwards`
                : `eggSpin ${2.5+i*0.15}s ease-in-out forwards`,
              animationDelay: `${i*0.15}s`,
            }}>{icon}</div>
          ))}
          <div style={{
            position:'absolute', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            fontSize:'1.1rem', fontWeight:700, color:'#fff',
            textShadow:'0 0 20px #ef5350,0 2px 8px rgba(0,0,0,.8)',
            textAlign:'center', animation:'eggFloat 3s ease-in-out forwards',
          }}>🏥 Plán obnovy — zdravá SR! 🇸🇰</div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="hdr">
        <div className="hdr-brand" onClick={handleEggClick} style={{cursor:'pointer',userSelect:'none'}}>
          <span className="hdr-flag" title={eggClicks>0?`${5-eggClicks} kliknutí zostáva…`:''}>🇸🇰</span>
          <div>
            <div className="hdr-title">Plán obnovy SR</div>
            <div className="hdr-sub">Mapa projektov POO</div>
          </div>
        </div>

        <div className="hdr-filters">
          <select className="sel" value={filterKraj} onChange={e=>setFilterKraj(e.target.value)}>
            <option value="all">Všetky kraje</option>
            {krajList.map(k=><option key={k} value={k}>{k.replace(' kraj','')}</option>)}
          </select>

          <select className="sel" value={filterStav} onChange={e=>setFilterStav(e.target.value)}>
            <option value="all">Všetky stavy</option>
            {stavList.map(s=><option key={s} value={s}>{stavMeta(s).l}</option>)}
          </select>

          <select className="sel sel-wide" value={filterKat} onChange={e=>setFilterKat(e.target.value)}>
            <option value="all">Všetky kódy</option>
            {katList.map(k=>{
              const km = kodMeta(k)
              return <option key={k} value={k}>{k}{km?.l ? ' · '+km.l : ''}</option>
            })}
          </select>

          <div className="btn-group">
            <button className={`btn${showKraje?' btn-on':''}`} onClick={()=>setShowKraje(v=>!v)}>
              🗺 Kraje
            </button>
            <button className={`btn${heatMode?' btn-heat':''}`} onClick={()=>setHeatMode(v=>!v)}
              title="Zobraziť hustotu projektov per okres">
              🔥 Heatmap
            </button>
            <button
              className={`btn btn-tile${tileMode==='light'?' btn-on':''}`}
              onClick={()=>setTileMode(v=>v==='dark'?'light':'dark')}
              title="Prepnúť tmavú/svetlú mapu">
              {tileMode==='dark' ? '☀️ Svetlá' : '🌙 Tmavá'}
            </button>
          </div>
        </div>

        <div className="hdr-stats">
          {loading ? <span className="st-load">⏳ Načítavam…</span>
           : error  ? <span className="st-err">❌ {error}</span>
           : <>
              <div className="st">
                <div className="st-n">{filtered.length.toLocaleString('sk')}</div>
                <div className="st-l">projektov</div>
              </div>
              <div className="st-sep"/>
              {totalPOO > 0 && <>
                <div className="st-sep"/>
                <div className="st">
                  <div className="st-n st-green">{fmt(totalPOO)}</div>
                  <div className="st-l">POO suma</div>
                </div>
              </>}
              {totalZuctovane > 0 && <>
                <div className="st-sep"/>
                <div className="st">
                  <div className="st-n st-blue">{fmt(totalZuctovane)}</div>
                  <div className="st-l">zúčtované POO</div>
                </div>
              </>}
             </>}
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div className="main">
        <div ref={mapRef} className="map" />

        <aside className="sidebar">

          {/* ── Súhrn financií ──────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div className="panel panel-finance">
              <div className="panel-title">Financovanie POO</div>
              <div className="fin-row">
                {totalZazmluvnena > 0 && (
                  <div className="fin-cell">
                    <div className="fin-val fin-val-zazml">{fmt(totalZazmluvnena)}</div>
                    <div className="fin-lbl">Zazmluvnené POO</div>
                  </div>
                )}
                {totalZuctovane > 0 && (
                  <div className="fin-cell">
                    <div className="fin-val fin-val-zuc">{fmt(totalZuctovane)}</div>
                    <div className="fin-lbl">Zúčtované POO</div>
                  </div>
                )}
                {totalCelk > 0 && (
                  <div className="fin-cell">
                    <div className="fin-val fin-val-dim">{fmt(totalCelk)}</div>
                    <div className="fin-lbl">Celková suma</div>
                  </div>
                )}
              </div>
              {totalZazmluvnena > 0 && totalCelk > 0 && (
                <div className="fin-bar-wrap">
                  <div className="fin-bar-track">
                    <div className="fin-bar-poo" style={{width:`${Math.min(100,(totalZazmluvnena/totalCelk)*100)}%`}}/>
                    {totalZuctovane > 0 && (
                      <div className="fin-bar-zuc" style={{width:`${Math.min(100,(totalZuctovane/totalCelk)*100)}%`}}/>
                    )}
                  </div>
                  <div className="fin-bar-leg">
                    <span className="fin-leg-poo">■ Zazml. {((totalZazmluvnena/totalCelk)*100).toFixed(0)}%</span>
                    {totalZuctovane > 0 && <span className="fin-leg-zuc">■ Zúč. {((totalZuctovane/totalCelk)*100).toFixed(0)}%</span>}
                    <span className="fin-leg-other">■ Iné zdroje</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Rola subjektu (Prijímateľ / Partner) ─────────── */}
          {!loading && (
            <div className="panel panel-postavenie">
              <div className="panel-title" style={{marginBottom:'6px'}}>Rola v projekte</div>
              <div className="pos-toggle">
                {[
                  { v:'all',        l:'Všetci' },
                  { v:'PRIJIMATEL', l:'✅ Príjemcovia' },
                  { v:'PARTNER',    l:'🤝 Partneri' },
                  { v:'ZIADATEL',   l:'📋 Žiadatelia' },
                ].map(({v,l})=>(
                  <button key={v}
                    className={`pos-btn${filterPostavenie===v?' pos-on':''}`}
                    onClick={()=>setFilterPostavenie(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Projekty podľa kraja ────────────────────────────── */}
          <div className="panel">
            <div className="panel-title-row">
              <span className="panel-title" style={{marginBottom:0}}>Podľa kraja</span>
              <div className="view-toggle">
                <button className={`vt-btn${krajView==='count'?' vt-on':''}`}
                  onClick={()=>setKrajView('count')}>počet</button>
                <button className={`vt-btn${krajView==='suma'?' vt-on':''}`}
                  onClick={()=>setKrajView('suma')}>suma</button>
              </div>
            </div>
            {byKraj.map(([name,count])=>{
              const k = KRAJE.find(k=>name.includes(k.short)||name.includes(k.name.split(' ')[0]))
              const col = k?.color || '#7DAA6C'
              const active = filterKraj === name
              const poo = pooByKraj[name] || 0
              const maxVal = krajView==='suma'
                ? Math.max(...byKraj.map(([n])=>pooByKraj[n]||0), 1)
                : maxKraj
              const val = krajView==='suma' ? poo : count
              const pct = (val / maxVal) * 100
              const label = krajView==='suma' ? fmt(poo) : count.toLocaleString('sk')
              return (
                <div key={name} className={`bar-row${active?' bar-active':''}`}
                  onClick={()=>setFilterKraj(active?'all':name)}
                  style={{opacity:filterKraj!=='all'&&!active?.45:1}}>
                  <div className="bar-lbl">
                    <span>{name.replace(' kraj','')}</span>
                    <span className="bar-n" style={{color:col}}>{label}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{background:col,width:`${pct}%`}}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Typ subjektu ────────────────────────────────────── */}
          {byEntity.length > 0 && (
            <div className="panel">
              <div className="panel-title">Typ subjektu</div>
              {byEntity.map(([label,{count,icon,cls,poo}])=>{
                const maxE = byEntity[0]?.[1]?.count || 1
                const pct = (count/maxE)*100
                const active = filterEntity === label
                return (
                  <div key={label} className={`ent-row${active?' ent-active':''}`}
                    onClick={()=>setFilterEntity(active?'all':label)}
                    style={{opacity:filterEntity!=='all'&&!active?.45:1,cursor:'pointer'}}>
                    <div className="ent-head">
                      <span className="ent-icon">{icon}</span>
                      <span className={`ent-lbl ${cls}`}>{label}</span>
                      <span className="ent-n">{count.toLocaleString('sk')}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{background:'var(--acc)',opacity:.7,width:`${pct}%`}}/>
                    </div>
                    {poo > 0 && (
                      <div className="ent-poo">{fmt(poo)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Stav projektov ──────────────────────────────────── */}
          <div className="panel">
            <div className="panel-title">Stav projektov</div>
            {byStav.map(([stav,count])=>{
              const meta = stavMeta(stav)
              const active = filterStav === stav
              const pct = (count/filtered.length)*100
              return (
                <div key={stav} className={`stav-row${active?' stav-active':''}`}
                  onClick={()=>setFilterStav(active?'all':stav)}
                  style={{opacity:filterStav!=='all'&&!active?.45:1}}>
                  <div className="stav-dot" style={{background:meta.c,boxShadow:`0 0 6px ${meta.c}bb`}}/>
                  <span className="stav-lbl">{meta.l}</span>
                  <span className="stav-pct" style={{color:meta.c+'cc'}}>{pct.toFixed(0)}%</span>
                  <span className="stav-n">{count.toLocaleString('sk')}</span>
                </div>
              )
            })}
          </div>

          {/* ── Oblasti plánu obnovy ────────────────────────────── */}
          {byArea.length > 0 && (
            <div className="panel">
              <div className="panel-title">Oblasti plánu obnovy</div>
              {byArea.map(([label,{count,meta}])=>{
                const col = meta?.c || '#546E7A'
                const maxA = byArea[0]?.[1]?.count || 1
                return (
                  <div key={label} className="area-row">
                    <div className="area-head">
                      <span className="area-icon">{meta?.icon||'📋'}</span>
                      <span className="area-lbl">{label}</span>
                      <span className="area-n" style={{color:col}}>{count.toLocaleString('sk')}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{background:col,width:`${(count/maxA)*100}%`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </aside>
      </div>
    </div>
  )
}
