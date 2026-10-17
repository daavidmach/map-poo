import { useState, useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import './App.css'

// ── Kraj NUTS3 IDs → farby (hranice sa fetchujú z Eurostat GISCO) ─────────────
const KRAJE = [
  { nuts:'SK010', name:'Bratislavský kraj',   short:'Bratislavský', color:'#D9CA8C' },
  { nuts:'SK021', name:'Trnavský kraj',       short:'Trnavský',     color:'#CCCF82' },
  { nuts:'SK022', name:'Trenčiansky kraj',    short:'Trenčiansky',  color:'#99BC7A' },
  { nuts:'SK023', name:'Nitriansky kraj',     short:'Nitriansky',   color:'#BECA78' },
  { nuts:'SK031', name:'Žilinský kraj',       short:'Žilinský',     color:'#7DAA6C' },
  { nuts:'SK032', name:'Banskobystrický kraj',short:'Banskobystrický',color:'#6A965C' },
  { nuts:'SK041', name:'Prešovský kraj',      short:'Prešovský',    color:'#7C9C64' },
  { nuts:'SK042', name:'Košický kraj',        short:'Košický',      color:'#94AA6E' },
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
  PROJEKT_UKONCENY:               { c:'#4CAF50', l:'Ukončený' },
  PROJEKT_V_REALIZACII:           { c:'#2196F3', l:'V realizácii' },
  ZMLUVA_UZAVRETA:                { c:'#FF9800', l:'Zmluva uzavretá' },
  ZIADOST_SCHVALENA:              { c:'#9C27B0', l:'Žiadosť schválená' },
  ZIADOST_PODANA:                 { c:'#607D8B', l:'Žiadosť podaná' },
  PROJEKT_ZRUSENY:                { c:'#f44336', l:'Zrušený' },
  PREDPRIPRAVENY:                 { c:'#FDD835', l:'Predpripravený' },
  NESTANDARDNE_UKONCENIE_PROJEKTU:{ c:'#FF5722', l:'Nest. ukončenie' },
  ODSTUPENIE_OD_ZMLUVY:           { c:'#FF7043', l:'Odstúpenie od zmluvy' },
  CIASTOCNE_VYPLATENY:            { c:'#00BCD4', l:'Čiastočne vyplatený' },
  CAKAJUCE_NA_PLATBU:             { c:'#FFCA28', l:'Čakajúce na platbu' },
  NESCHVALENY:                    { c:'#E53935', l:'Neschválený' },
  NOVY:                           { c:'#26C6DA', l:'Nový' },
  NEZNAMY:                        { c:'#546E7A', l:'Neznámy' },
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
  if (v >= 1e6) return (v/1e6).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' M €'
  if (v >= 1e3) return (v/1e3).toLocaleString('sk-SK',{maximumFractionDigits:0}) + ' tis. €'
  return v.toLocaleString('sk-SK') + ' €'
}

function g(p, ...keys) {
  for (const k of keys) {
    const v = p[k]
    if (v != null && v !== '' && v !== 'N' && v !== 'null') return v
  }
  return ''
}

// Určí typ subjektu podľa názvu
function entityInfo(name) {
  if (!name) return { icon:'👤', label:'Fyzická osoba', cls:'entity-fyzicka' }
  const n = name.toLowerCase()
  if (/\bs\.r\.o|spol\. s r\.o/i.test(name))
    return { icon:'🏢', label:'s.r.o.', cls:'entity-sro' }
  if (/\ba\.s\.\b|\bakcio/i.test(name))
    return { icon:'🏦', label:'Akciová spoločnosť', cls:'entity-as' }
  if (/ministerstvo|úrad vlády|štátna|štátny|agentúra|fond|inšpektorát/i.test(name))
    return { icon:'🏛️', label:'Štátna inštitúcia', cls:'entity-stat' }
  if (/obec |mesto |mestská |obecný |vuc|kraj|samosprávny/i.test(name))
    return { icon:'🏙️', label:'Samospráva', cls:'entity-samo' }
  if (/škola|gymnázium|univerzita|fakulta|akadémia|výskumný|ústav/i.test(name))
    return { icon:'🎓', label:'Vzdelávanie / výskum', cls:'entity-edu' }
  if (/nemocnica|zdravotn|poliklinika|klinika|lekár/i.test(name))
    return { icon:'🏥', label:'Zdravotníctvo', cls:'entity-health' }
  if (/o\.z\.|n\.o\.|n\.f\.|združenie|nadácia|spolok|cirkev/i.test(name))
    return { icon:'🤝', label:'Nezisková org.', cls:'entity-ngo' }
  if (/k\.s\.|v\.o\.s\.|družstvo/i.test(name))
    return { icon:'🏢', label:'Obchodná spoločnosť', cls:'entity-sro' }
  return { icon:'🏢', label:'Právnická osoba', cls:'entity-sro' }
}

// Popup HTML — pekná tmavá karta
function makePopup(p, meta, color) {
  const okres  = g(p,'okres','Okres')
  const kraj   = g(p,'kraj','Kraj')
  const kat    = g(p,'kód investície / reformy','kod investicie','kod')
  const nazov  = g(p,'názov projektu','nazov projektu','nazov') || g(p,'názov výzvy','nazov vyzvy','nazov')
  const vyzva  = g(p,'názov výzvy','nazov vyzvy')
  const meno   = g(p,'žiadateľ meno a priezvisko / názov','ziadatel meno a priezvisko / nazov','ziadatel')
  const link   = g(p,'link crz','link_crz')
  const datum  = g(p,'dátum uzavretia zmluvy','datum_zmluvy','datum zmluvy')
  const poo    = parseFloat(g(p,'poskytnuté poo','poo_suma','poskytnute_poo')) || 0
  const celk   = parseFloat(g(p,'celková suma projektu','celkova_suma','celkova suma')) || 0
  const ent    = entityInfo(meno)

  return `
    <div class="pc">
      <div class="pc-head" style="border-left:3px solid ${color}">
        <span class="pc-badge" style="background:${color}22;color:${color}">${meta.l}</span>
        <span class="pc-ent ${ent.cls}" title="${ent.label}">${ent.icon} ${ent.label}</span>
      </div>
      ${nazov ? `<div class="pc-title">${nazov}</div>` : ''}
      ${vyzva && vyzva !== nazov ? `<div class="pc-vyzva">${vyzva}</div>` : ''}
      ${meno ? `
        <div class="pc-entity">
          <span class="pc-entity-lbl">Žiadateľ</span>
          <span class="pc-entity-val">${meno}</span>
        </div>` : ''}
      <div class="pc-rows">
        <div class="pc-row"><span>Okres</span><b>${okres}${kraj ? ' · ' + kraj.replace(' kraj','') : ''}</b></div>
        ${kat ? `<div class="pc-row"><span>Kód investície</span><b>${kat}</b></div>` : ''}
        ${poo > 0 ? `<div class="pc-row pc-money"><span>POO suma</span><b>${fmt(poo)}</b></div>` : ''}
        ${celk > 0 ? `<div class="pc-row"><span>Celková suma</span><b>${fmt(celk)}</b></div>` : ''}
        ${datum ? `<div class="pc-row"><span>Zmluva</span><b>${datum}</b></div>` : ''}
      </div>
      ${link ? `<a class="pc-btn" href="${link}" target="_blank" rel="noopener">Otvoriť zmluvu CRZ →</a>` : ''}
    </div>`
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const layersRef  = useRef({ kraje: null, markers: null })

  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [filterKraj, setFilterKraj] = useState('all')
  const [filterStav, setFilterStav] = useState('all')
  const [filterKat,  setFilterKat]  = useState('all')
  const [showKraje,  setShowKraje]  = useState(true)

  // ── Načítaj JSON ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/planobnovy.json')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
      .then(text => {
        const clean = text.replace(/^﻿/, '')   // strip BOM
        const raw = JSON.parse(clean)
        const arr = Array.isArray(raw) ? raw : raw.data || Object.values(raw)[0] || []
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
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
            return {
              color:       '#1a3a1a',
              weight:      2,
              fillColor:   k?.color || '#7DAA6C',
              fillOpacity: 0.20,
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
        // Fallback — zjednodušené obdĺžniky ak GISCO zlyhá
        console.warn('GISCO nedostupné, použijú sa zjednodušené hranice')
        const FALLBACK = [
          { name:'Bratislavský kraj',   color:'#D9CA8C', coords:[[17.00,48.32],[17.60,48.32],[17.60,48.00],[17.30,47.75],[17.00,47.85],[16.83,47.95],[16.83,48.15]] },
          { name:'Trnavský kraj',       color:'#CCCF82', coords:[[16.83,48.65],[17.90,48.65],[17.90,48.32],[17.00,48.32],[16.83,48.15]] },
          { name:'Trenčiansky kraj',    color:'#99BC7A', coords:[[17.60,49.35],[18.75,49.35],[18.75,48.55],[18.20,48.40],[17.90,48.32],[17.60,48.32]] },
          { name:'Nitriansky kraj',     color:'#BECA78', coords:[[17.90,48.65],[18.75,48.55],[18.75,47.90],[18.20,47.75],[17.60,47.80],[17.30,47.75],[17.60,48.00],[17.90,48.32]] },
          { name:'Žilinský kraj',       color:'#7DAA6C', coords:[[18.20,49.60],[19.70,49.60],[19.70,49.00],[19.20,48.70],[18.75,48.55],[18.20,48.40],[17.90,48.65]] },
          { name:'Banskobystrický kraj',color:'#6A965C', coords:[[18.20,48.40],[18.75,48.55],[19.20,48.70],[19.70,49.00],[20.30,48.80],[20.30,48.20],[19.80,47.90],[19.00,47.75],[18.20,47.90],[17.90,48.20]] },
          { name:'Prešovský kraj',      color:'#7C9C64', coords:[[19.70,49.60],[21.50,49.60],[21.50,48.90],[20.85,48.65],[20.30,48.80],[19.70,49.00]] },
          { name:'Košický kraj',        color:'#94AA6E', coords:[[20.30,48.80],[20.85,48.65],[21.50,48.90],[21.50,48.30],[21.00,48.00],[20.30,47.90],[19.80,47.90],[20.30,48.20]] },
        ]
        const kg = L.layerGroup().addTo(map)
        FALLBACK.forEach(k => {
          const ll = k.coords.map(([lng,lat])=>[lat,lng])
          L.polygon(ll, { color:'#1a3a1a', weight:2, fillColor:k.color, fillOpacity:0.20 })
            .bindTooltip(`<b>${k.name}</b>`, { sticky:true, className:'kraj-tooltip' })
            .addTo(kg)
        })
        layersRef.current.kraje = kg
      })

    // ── Cluster skupina ────────────────────────────────────────────────────────
    const mcg = L.markerClusterGroup({
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction(cluster) {
        const n = cluster.getChildCount()
        const size = n > 1000 ? 50 : n > 100 ? 42 : 34
        return L.divIcon({
          html: `<div class="cl-icon" style="width:${size}px;height:${size}px;line-height:${size}px">${n>999?Math.round(n/1000)+'k':n}</div>`,
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

  // ── Filtrované dáta ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => data.filter(p => {
    const kraj = g(p,'kraj')
    const stav = normStav(g(p,'stav projektu','stav'))
    const kat  = g(p,'kód investície / reformy','kod investicie','kod')
    if (filterKraj !== 'all' && !kraj.includes(filterKraj)) return false
    if (filterStav !== 'all' && stav !== filterStav)        return false
    if (filterKat  !== 'all' && !kat.includes(filterKat))  return false
    return true
  }), [data, filterKraj, filterStav, filterKat])

  // ── Aktualizuj markery ───────────────────────────────────────────────────────
  useEffect(() => {
    const mcg = layersRef.current.markers
    if (!mcg) return
    mcg.clearLayers()

    filtered.forEach(p => {
      const okres = g(p,'okres','Okres')
      const base  = OKRES[okres]
      if (!base) return

      const lat = base[0] + (Math.random()-0.5)*0.05
      const lng = base[1] + (Math.random()-0.5)*0.05
      const stav  = g(p,'stav projektu','stav')
      const meta  = stavMeta(stav)
      const poo   = parseFloat(g(p,'poskytnuté poo','poo_suma')) || 0
      const r     = poo > 0 ? Math.min(14, Math.max(5, 4 + Math.log10(poo/1000+1)*3)) : 5

      L.circleMarker([lat,lng], {
        radius:r, color:meta.c, weight:1.5, fillColor:meta.c, fillOpacity:0.78,
      })
        .bindPopup(makePopup(p, meta, meta.c), { maxWidth:320, className:'dark-popup' })
        .addTo(mcg)
    })
  }, [filtered])

  // ── Štatistiky ────────────────────────────────────────────────────────────────
  const totalPOO  = useMemo(()=>filtered.reduce((s,p)=>s+(parseFloat(g(p,'poskytnuté poo','poo_suma'))||0),0),[filtered])
  const totalCelk = useMemo(()=>filtered.reduce((s,p)=>s+(parseFloat(g(p,'celková suma projektu','celkova_suma','celkova suma'))||0),0),[filtered])

  const byKraj = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{ const k=g(p,'kraj')||'—'; m[k]=(m[k]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[filtered])

  const byStav = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{ const s=normStav(g(p,'stav projektu','stav'))||'NEZNAMY'; m[s]=(m[s]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[filtered])

  const krajList = useMemo(()=>[...new Set(data.map(p=>g(p,'kraj')))].filter(Boolean).sort(),[data])
  const stavList = useMemo(()=>[...new Set(data.map(p=>normStav(g(p,'stav projektu','stav'))))].filter(Boolean).sort(),[data])
  const katList  = useMemo(()=>[...new Set(data.map(p=>g(p,'kód investície / reformy','kod investicie','kod')))].filter(Boolean).sort(),[data])
  const maxKraj  = byKraj[0]?.[1]||1

  return (
    <div className="app">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="hdr">
        <div className="hdr-brand">
          <span className="hdr-flag">🇸🇰</span>
          <div>
            <div className="hdr-title">Plán obnovy SR</div>
            <div className="hdr-sub">Mapa projektov</div>
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
            {katList.map(k=><option key={k} value={k}>{k}</option>)}
          </select>

          <button className={`btn${showKraje?' btn-on':''}`} onClick={()=>setShowKraje(v=>!v)}>
            {showKraje?'Skryť kraje':'Zobraziť kraje'}
          </button>
        </div>

        <div className="hdr-stats">
          {loading ? <span className="st-load">Načítavam…</span>
           : error  ? <span className="st-err">❌ {error}</span>
           : <>
              <div className="st"><div className="st-n">{filtered.length.toLocaleString('sk')}</div><div className="st-l">projektov</div></div>
              <div className="st-sep"/>
              <div className="st"><div className="st-n">{fmt(totalPOO)}</div><div className="st-l">POO suma</div></div>
              <div className="st-sep"/>
              <div className="st"><div className="st-n">{fmt(totalCelk)}</div><div className="st-l">celková suma</div></div>
             </>}
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div className="main">
        <div ref={mapRef} className="map" />

        <aside className="sidebar">

          <div className="panel">
            <div className="panel-title">Projekty podľa kraja</div>
            {byKraj.map(([name,count])=>{
              const k = KRAJE.find(k=>name.includes(k.short)||name.includes(k.name.split(' ')[0]))
              const col = k?.color || '#7DAA6C'
              const active = filterKraj === name
              return (
                <div key={name} className={`bar-row${active?' bar-active':''}`}
                  onClick={()=>setFilterKraj(active?'all':name)}
                  style={{opacity:filterKraj!=='all'&&!active?.45:1}}>
                  <div className="bar-lbl">
                    <span>{name.replace(' kraj','')}</span>
                    <span className="bar-n" style={{color:col}}>{count.toLocaleString('sk')}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{background:col,width:`${(count/maxKraj)*100}%`}}/>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="panel">
            <div className="panel-title">Stav projektov</div>
            {byStav.map(([stav,count])=>{
              const meta = stavMeta(stav)
              const active = filterStav === stav
              return (
                <div key={stav} className={`stav-row${active?' stav-active':''}`}
                  onClick={()=>setFilterStav(active?'all':stav)}
                  style={{opacity:filterStav!=='all'&&!active?.45:1}}>
                  <div className="stav-dot" style={{background:meta.c,boxShadow:`0 0 5px ${meta.c}99`}}/>
                  <span className="stav-lbl">{meta.l}</span>
                  <span className="stav-n">{count.toLocaleString('sk')}</span>
                </div>
              )
            })}
          </div>

        </aside>
      </div>
    </div>
  )
}
