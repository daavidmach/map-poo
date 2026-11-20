// scripts/prepare-data.mjs
// Rozdelí veľký public/planobnovy.json na:
//   public/data/points.json   — malé dáta pre mapu, filtre a štatistiky (načíta sa hneď)
//   public/data/d/<n>.json    — detaily pre popupy, po DETAIL_CHUNK záznamov (načítajú sa až po kliknutí)
//   public/data/summary.json  — súhrnné čísla pre stránku „O projekte“
//
// Dôležité: dataset má pre jednu žiadosť (kód žiadosti) často viac riadkov — napr. viac
// prijímateľov alebo opakované riadky s nulou. Sumy preto započítame iba RAZ za žiadosť
// (na „hlavnom“ riadku), inak by sa celkový súčet nafúkol.
//
// Spustenie v koreni projektu:
//   node --max-old-space-size=6144 scripts/prepare-data.mjs public/planobnovy.json

import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  DETAIL_CHUNK, F, DETAIL_FIELDS, g, normStav, normalizeRecord, entityInfo, pillarOf, stavGroup,
} from '../src/poo-data.mjs'

const inPath = process.argv[2] || 'public/planobnovy.json'
const outDir = process.argv[3] || 'public/data'
const SOURCE_URL = 'https://data.slovensko.sk/datasety/ba6af44e-51ca-4590-9774-d4aac63cec82'

console.time('hotovo za')
const text = readFileSync(inPath, 'utf8').replace(/^﻿/, '')
const raw = JSON.parse(text)
const arr = Array.isArray(raw) ? raw : raw.data || Object.values(raw)[0] || []
console.log(`Načítaných ${arr.length} záznamov`)

// Slovníky — opakujúce sa texty sa uložia raz, v riadkoch je len index
function makeDict() {
  const list = [''], idx = new Map([['', 0]])
  return {
    list,
    id(v) {
      const k = typeof v === 'string' ? v.trim() : v
      if (!idx.has(k)) { idx.set(k, list.length); list.push(k) }
      return idx.get(k)
    },
  }
}
const D = { kraj:makeDict(), okres:makeDict(), obec:makeDict(), stav:makeDict(),
            kod:makeDict(), ent:makeDict(), pos:makeDict(), grp:makeDict() }
const entList = [null]
const num = v => { const n = parseFloat(v); return n ? Math.round(n * 100) / 100 : 0 }

// ── 1. prechod: normalizácia + zoskupenie riadkov podľa kódu žiadosti ───────
const recs = new Array(arr.length)
const apps = new Map()            // kód žiadosti → [indexy riadkov]
arr.forEach((rawP, i) => {
  const p = normalizeRecord(rawP)
  arr[i] = null                   // uvoľni pamäť
  const pos = normStav(g(p, ...F.pos))
  const r = {
    p, pos,
    poo: num(g(p, ...F.poo)), zuc: num(g(p, ...F.zuc)), pozad: num(g(p, ...F.pozad)),
    kz: g(p, 'kód žiadosti', 'kód projektu', 'kod projektu', 'kod ziadosti') || `__row${i}`,
  }
  recs[i] = r
  if (!apps.has(r.kz)) apps.set(r.kz, [])
  apps.get(r.kz).push(i)
})

// ── 2. deduplikácia súm: jedna žiadosť = jedna suma ──────────────────────────
const appId = new Map()
let dupRows = 0, dupMoney = 0
for (const [kz, idxs] of apps) {
  appId.set(kz, appId.size)
  if (idxs.length === 1) continue
  const rank = i => (recs[i].pos === 'PRIJIMATEL' ? 0 : recs[i].pos === 'ZIADATEL' ? 1 : 2)
  const main = idxs.reduce((a, b) =>
    recs[b].poo > recs[a].poo || (recs[b].poo === recs[a].poo && rank(b) < rank(a)) ? b : a)
  const mx = f => Math.max(...idxs.map(i => recs[i][f]))
  const sumPoo = idxs.reduce((s, i) => s + recs[i].poo, 0)
  const keep = { poo: mx('poo'), zuc: mx('zuc'), pozad: mx('pozad') }
  if (sumPoo > keep.poo) { dupRows++; dupMoney += sumPoo - keep.poo }
  for (const i of idxs) {
    const r = recs[i]
    if (i === main) Object.assign(r, keep)
    else { r.poo = 0; r.zuc = 0; r.pozad = 0 }
  }
}

// ── 3. výstup bodov + detailov + súhrnu ──────────────────────────────────────
rmSync(outDir, { recursive: true, force: true })
mkdirSync(join(outDir, 'd'), { recursive: true })
const detailKeys = DETAIL_FIELDS.map(a => a[0])
let chunk = []
const flush = n => writeFileSync(join(outDir, 'd', `${n}.json`), JSON.stringify({ k: detailKeys, r: chunk }))

// Hmatateľné výsledky — podľa názvu výzvy (počítajú sa podporené žiadosti, nie riadky)
const IMPACT = [
  { id:'domy',       icon:'🏡', re:/rodinných domov/i,                       l:'rodinných domov dostalo podporu na obnovu' },
  { id:'stipendia',  icon:'🎓', re:/štipendi/i,                              l:'štipendií pre študentov a výskumníkov' },
  { id:'skolky',     icon:'🧸', re:/kapacít MŠ/i,                            l:'projektov na nové miesta v materských školách' },
  { id:'nemocnice',  icon:'🏥', re:/nemocn/i,                               l:'projektov pre modernejšie nemocnice' },
  { id:'ambulancie', icon:'🩺', re:/všeobecných ambulancií/i,                l:'nových ambulancií všeobecných lekárov' },
  { id:'komunita',   icon:'🤝', re:/komunitnej starostlivosti/i,             l:'projektov komunitnej starostlivosti' },
  { id:'pamiatky',   icon:'🏛️', re:/historických/i,                          l:'historických a pamiatkových budov v obnove' },
  { id:'energia',    icon:'⚡', re:/energetickej efektívnosti verejných budov/i, l:'verejných budov so znížením spotreby energie' },
  { id:'debarier',   icon:'♿', re:/debarierizáci/i,                          l:'stredných škôl bez bariér' },
  { id:'cyklo',      icon:'🚲', re:/cyklistick/i,                            l:'projektov cyklistickej infraštruktúry' },
  { id:'inovacie',   icon:'💡', re:/voucher|inovatívnych digitálnych/i,      l:'inovačných projektov firiem a vedcov' },
  { id:'dusevne',    icon:'🧠', re:/duševné zdravie/i,                       l:'odborníkov vzdelaných v duševnom zdraví' },
].map(x => ({ ...x, n:0, poo:0 }))

const S = { pridelene:0, zazmluvnene:0, zuctovane:0, projekty:0, ziadosti:apps.size,
            obce:new Set(), prijimatelia:new Set(), pillars:{}, kraje:{}, byGrp:{} }
const CONTRACTED = new Set(['realizacia', 'ukoncene'])
const rows = []

recs.forEach((r, i) => {
  const p = r.p
  const ent = entityInfo(g(p, ...F.meno), g(p, ...F.forma))
  const before = D.ent.list.length
  const entId = D.ent.id(ent.label)
  if (D.ent.list.length > before) entList.push(ent)

  const stav = normStav(g(p, ...F.stav)) || 'NEZNAMY'
  const grp = stavGroup(stav, r.pos, g(p, 'posúdenie výsledok', 'posudenie vysledok'))
  const kod = g(p, ...F.kod)
  const kraj = g(p, ...F.kraj), obec = g(p, ...F.obec)

  rows.push([
    D.kraj.id(kraj), D.okres.id(g(p, ...F.okres)), D.obec.id(obec), D.stav.id(stav),
    D.kod.id(kod), entId, D.pos.id(r.pos), r.poo, r.zuc, r.pozad,
    appId.get(r.kz), D.grp.id(grp),
  ])

  // súhrn podľa skupiny stavu
  const B = S.byGrp[grp] || (S.byGrp[grp] = { n:0, poo:0, zuc:0 })
  if (r.poo > 0) { B.n++; B.poo += r.poo; B.zuc += r.zuc }
  if (r.poo > 0 && grp !== 'zrusene') S.pridelene += r.poo
  // ďalej len zazmluvnené projekty (v realizácii + ukončené)
  if (r.poo > 0 && CONTRACTED.has(grp)) {
    S.zazmluvnene += r.poo; S.zuctovane += r.zuc; S.projekty++
    if (obec) S.obce.add(obec)
    const ico = g(p, 'prijímateľ ičo', 'žiadateľ ičo') || g(p, ...F.meno)
    if (ico) S.prijimatelia.add(ico)
    const pil = pillarOf(kod) || 'ine'
    const P = S.pillars[pil] || (S.pillars[pil] = { n:0, poo:0, zuc:0 })
    P.n++; P.poo += r.poo; P.zuc += r.zuc
    const K = S.kraje[kraj || 'Neznámy'] || (S.kraje[kraj || 'Neznámy'] = { n:0, poo:0 })
    K.n++; K.poo += r.poo
    const vyzva = g(p, 'názov výzvy', 'nazov vyzvy')
    const hit = IMPACT.find(x => x.re.test(vyzva))
    if (hit) { hit.n++; hit.poo += r.poo }
  }

  chunk.push(DETAIL_FIELDS.map(aliases => {
    const v = g(p, ...aliases)
    return v === '' ? null : v
  }))
  if (chunk.length === DETAIL_CHUNK) { flush(Math.floor(i / DETAIL_CHUNK)); chunk = [] }
})
if (chunk.length) flush(Math.floor((recs.length - 1) / DETAIL_CHUNK))

const dict = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, d.list]))
dict.ent = entList
writeFileSync(join(outDir, 'points.json'), JSON.stringify({ dict, rows }))

const round = v => Math.round(v)
const summary = {
  generated: new Date().toISOString().slice(0, 10),
  source: SOURCE_URL,
  totals: {
    pridelene: round(S.pridelene), zazmluvnene: round(S.zazmluvnene), zuctovane: round(S.zuctovane),
    projekty: S.projekty, ziadosti: S.ziadosti,
    obce: S.obce.size, prijimatelia: S.prijimatelia.size,
  },
  groups: Object.fromEntries(Object.entries(S.byGrp).map(([k, v]) => [k, { n:v.n, poo:round(v.poo), zuc:round(v.zuc) }])),
  pillars: Object.fromEntries(Object.entries(S.pillars).map(([k, v]) => [k, { n:v.n, poo:round(v.poo), zuc:round(v.zuc) }])),
  kraje: Object.fromEntries(Object.entries(S.kraje).map(([k, v]) => [k, { n:v.n, poo:round(v.poo) }])),
  impact: IMPACT.filter(x => x.n > 0).map(({ id, icon, l, n, poo }) => ({ id, icon, l, n, poo:round(poo) })),
}
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1))

// ── Výpis ─────────────────────────────────────────────────────────────────────
const mb = b => (b / 1024 / 1024).toFixed(1) + ' MB'
const eur = v => (v / 1e9).toFixed(3) + ' mld €'
const pts = statSync(join(outDir, 'points.json')).size
const dFiles = readdirSync(join(outDir, 'd'))
const dSizes = dFiles.map(f => statSync(join(outDir, 'd', f)).size)
console.log(`points.json: ${mb(pts)} (${rows.length} riadkov, ${apps.size} žiadostí)`)
console.log(`detaily: ${dFiles.length} súborov, spolu ${mb(dSizes.reduce((a, b) => a + b, 0))}, najväčší ${mb(Math.max(...dSizes))}`)
console.log(`duplicity: ${dupRows} žiadostí malo sumu viackrát → odstránených ${eur(dupMoney)}`)
console.log(`zazmluvnené POO: ${eur(S.zazmluvnene)} (${S.projekty} projektov) · zúčtované: ${eur(S.zuctovane)} · vrátane pripravovaných: ${eur(S.pridelene)}`)
if (pts > 25 * 1024 * 1024 || Math.max(...dSizes) > 25 * 1024 * 1024)
  console.warn('POZOR: niektorý súbor je nad 25 MB limit Cloudflare!')
console.timeEnd('hotovo za')
