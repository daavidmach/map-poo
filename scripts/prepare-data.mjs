// scripts/prepare-data.mjs
// Rozdelí veľký public/planobnovy.json na:
//   public/data/points.json   — malé dáta pre mapu, filtre a štatistiky (načíta sa hneď)
//   public/data/d/<n>.json    — detaily pre popupy, po DETAIL_CHUNK záznamov (načítajú sa až po kliknutí)
//
// Spustenie v koreni projektu:
//   node --max-old-space-size=6144 scripts/prepare-data.mjs public/planobnovy.json

import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  DETAIL_CHUNK, F, DETAIL_FIELDS, g, normStav, normalizeRecord, entityInfo,
} from '../src/poo-data.mjs'

const inPath = process.argv[2] || 'public/planobnovy.json'
const outDir = process.argv[3] || 'public/data'

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
            kod:makeDict(), ent:makeDict(), pos:makeDict() }
const entList = [null]          // objekty {icon,label,cls} v poradí D.ent
const num = v => { const n = parseFloat(v); return n ? Math.round(n * 100) / 100 : 0 }

const rows = []
const detailKeys = DETAIL_FIELDS.map(a => a[0])
let chunk = []

rmSync(outDir, { recursive: true, force: true })
mkdirSync(join(outDir, 'd'), { recursive: true })
const flush = n => writeFileSync(join(outDir, 'd', `${n}.json`), JSON.stringify({ k: detailKeys, r: chunk }))

arr.forEach((rawP, i) => {
  const p = normalizeRecord(rawP)
  const ent = entityInfo(g(p, ...F.meno), g(p, ...F.forma))
  const before = D.ent.list.length
  const entId = D.ent.id(ent.label)
  if (D.ent.list.length > before) entList.push(ent)

  rows.push([
    D.kraj.id(g(p, ...F.kraj)),
    D.okres.id(g(p, ...F.okres)),
    D.obec.id(g(p, ...F.obec)),
    D.stav.id(normStav(g(p, ...F.stav)) || 'NEZNAMY'),
    D.kod.id(g(p, ...F.kod)),
    entId,
    D.pos.id(normStav(g(p, ...F.pos))),
    num(g(p, ...F.poo)),
    num(g(p, ...F.zuc)),
    num(g(p, ...F.pozad)),
  ])

  chunk.push(DETAIL_FIELDS.map(aliases => {
    const v = g(p, ...aliases)
    return v === '' ? null : v
  }))
  if (chunk.length === DETAIL_CHUNK) { flush(Math.floor(i / DETAIL_CHUNK)); chunk = [] }
})
if (chunk.length) flush(Math.floor((arr.length - 1) / DETAIL_CHUNK))

const dict = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, d.list]))
dict.ent = entList
writeFileSync(join(outDir, 'points.json'), JSON.stringify({ dict, rows }))

// ── Súhrn ────────────────────────────────────────────────────────────────────
const mb = b => (b / 1024 / 1024).toFixed(1) + ' MB'
const pts = statSync(join(outDir, 'points.json')).size
const dFiles = readdirSync(join(outDir, 'd'))
const dSizes = dFiles.map(f => statSync(join(outDir, 'd', f)).size)
console.log(`points.json: ${mb(pts)} (${rows.length} bodov)`)
console.log(`detaily: ${dFiles.length} súborov, spolu ${mb(dSizes.reduce((a, b) => a + b, 0))}, najväčší ${mb(Math.max(...dSizes))}`)
console.log(`kraje: ${dict.kraj.length - 1}, stavy: ${dict.stav.length - 1}, typy subjektov: ${dict.ent.length - 1}`)
if (pts > 25 * 1024 * 1024 || Math.max(...dSizes) > 25 * 1024 * 1024)
  console.warn('POZOR: niektorý súbor je nad 25 MB limit Cloudflare!')
console.timeEnd('hotovo za')
