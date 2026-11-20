import { useEffect, useState } from 'react'

// ── Stránka „O projekte“ — čo priniesol plán obnovy + odkiaľ sú dáta ─────────
// Čísla sa načítajú z public/data/summary.json (vyrába scripts/prepare-data.mjs)

const ALOKACIA = 6.4e9
const DATASET_URL = 'https://data.slovensko.sk/datasety/ba6af44e-51ca-4590-9774-d4aac63cec82'

const PILLARS = [
  ['vzdelavanie', 'Kvalitné vzdelávanie',                     '#9C27B0', '🎓'],
  ['sprava',      'Efektívna verejná správa a digitalizácia', '#FF9800', '🏛️'],
  ['veda',        'Veda, výskum, inovácie',                   '#2196F3', '🔬'],
  ['zelena',      'Zelená ekonomika',                         '#4CAF50', '🌿'],
  ['zdravie',     'Lepšie zdravie',                           '#ef5350', '❤️'],
]

function eur(v) {
  if (v >= 1e9) return (v / 1e9).toLocaleString('sk-SK', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' mld €'
  if (v >= 1e6) return (v / 1e6).toLocaleString('sk-SK', { maximumFractionDigits:1 }) + ' mil. €'
  return Math.round(v).toLocaleString('sk-SK') + ' €'
}
const num = v => Math.round(v).toLocaleString('sk-SK')

// Plynulé „dobehnutie“ čísla pri otvorení
function useCountUp(target, ms = 1200) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!target) return
    let raf, start
    const step = t => {
      if (!start) start = t
      const k = Math.min(1, (t - start) / ms)
      setV(target * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function BigStat({ value, format, label, sub, color, bar }) {
  const v = useCountUp(value)
  return (
    <div className="ab-stat">
      <div className="ab-stat-n" style={{ color }}>{format(v)}</div>
      <div className="ab-stat-l">{label}</div>
      {bar != null && (
        <div className="ab-stat-bar"><div style={{ width: `${Math.min(100, bar)}%`, background: color }} /></div>
      )}
      {sub && <div className="ab-stat-sub">{sub}</div>}
    </div>
  )
}

export default function AboutPage({ onClose }) {
  const [s, setS] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    fetch('/data/summary.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setS)
      .catch(() => setErr(true))
  }, [])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const t = s?.totals
  const pilTotal = s ? PILLARS.reduce((a, [k]) => a + (s.pillars[k]?.poo || 0), 0) : 0

  return (
    <div className="ab" role="dialog" aria-label="O projekte">
      <div className="ab-top">
        <div className="ab-brand">🇸🇰 <b>Plán obnovy SR</b> <span>· mapa projektov</span></div>
        <button className="ab-back" onClick={onClose}>🗺️ Späť na mapu</button>
      </div>

      <div className="ab-wrap">
        {/* ── Úvod ─────────────────────────────────────────────── */}
        <section className="ab-hero">
          <div className="ab-eyebrow">Plán obnovy a odolnosti SR · otvorené dáta</div>
          <h1>Čo priniesol Plán obnovy na Slovensku</h1>
          <p className="ab-lead">
            Desaťtisíce projektov — od zateplených rodinných domov cez nové miesta v škôlkach
            až po modernejšie nemocnice. Na jednej mape, podľa krajov a oblastí,
            priamo z oficiálnych otvorených dát štátu. Každý si tak môže pozrieť,
            čo sa deje v jeho obci.
          </p>
          <button className="ab-cta" onClick={onClose}>Preskúmať projekty na mape →</button>
        </section>

        {err && <p className="ab-err">Súhrnné čísla sa nepodarilo načítať.</p>}
        {!s && !err && <p className="ab-loading">⏳ Načítavam čísla…</p>}

        {t && <>
          {/* ── Veľké čísla ──────────────────────────────────── */}
          <section className="ab-stats">
            <BigStat value={t.zazmluvnene} format={eur} color="#3ecf8e"
              label="zazmluvnených na projekty"
              bar={(t.zazmluvnene / ALOKACIA) * 100}
              sub={`${((t.zazmluvnene / ALOKACIA) * 100).toFixed(0)} % z alokácie 6,4 mld €`} />
            <BigStat value={t.zuctovane} format={eur} color="#4fa8e8"
              label="už zúčtovaných"
              bar={(t.zuctovane / t.zazmluvnene) * 100}
              sub={`${((t.zuctovane / t.zazmluvnene) * 100).toFixed(0)} % zo zazmluvnených`} />
            <BigStat value={t.projekty} format={num} color="#f0a030"
              label="projektov v realizácii a dokončených"
              sub={`z ${num(t.ziadosti)} podaných žiadostí`} />
            <BigStat value={t.obce} format={num} color="#CE93D8"
              label="obcí a miest s prijímateľmi"
              sub={`${num(t.prijimatelia)} rôznych prijímateľov`} />
          </section>

          {/* ── Hmatateľné výsledky ──────────────────────────── */}
          {s.impact?.length > 0 && (
            <section>
              <h2>Čo sa vďaka tomu deje</h2>
              <p className="ab-sec-lead">Počty podporených projektov a ľudí podľa jednotlivých výziev.</p>
              <div className="ab-impact">
                {s.impact.map(x => (
                  <div key={x.id} className="ab-card">
                    <div className="ab-card-icon">{x.icon}</div>
                    <div className="ab-card-n">{num(x.n)}</div>
                    <div className="ab-card-l">{x.l}</div>
                    {x.poo > 0 && <div className="ab-card-eur">{eur(x.poo)}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Kam idú peniaze — 5 oblastí ─────────────────── */}
          <section>
            <h2>Kam idú peniaze</h2>
            <p className="ab-sec-lead">Plán obnovy má 5 oblastí. Takto sa medzi ne delia zazmluvnené prostriedky.</p>
            <div className="ab-pillars">
              {PILLARS.map(([k, l, c, icon]) => {
                const p = s.pillars[k] || { poo:0, n:0 }
                const pct = pilTotal ? (p.poo / pilTotal) * 100 : 0
                return (
                  <div key={k} className="ab-pil">
                    <div className="ab-pil-head">
                      <span className="ab-pil-icon">{icon}</span>
                      <span className="ab-pil-l">{l}</span>
                      <span className="ab-pil-eur" style={{ color: c }}>{eur(p.poo)}</span>
                    </div>
                    <div className="ab-pil-track">
                      <div className="ab-pil-fill" style={{ width: `${pct}%`, background: c }} />
                    </div>
                    <div className="ab-pil-sub">{pct.toFixed(0)} % · {num(p.n)} projektov</div>
                  </div>
                )
              })}
            </div>
          </section>
        </>}

        {/* ── Odkiaľ sú dáta ─────────────────────────────────── */}
        <section>
          <h2>Odkiaľ sú dáta</h2>
          <p className="ab-sec-lead">
            Všetko na tejto stránke vychádza z oficiálnych, verejne dostupných údajov. Nič sme nedopĺňali odhadom.
          </p>
          <div className="ab-sources">
            <a className="ab-src" href={DATASET_URL} target="_blank" rel="noopener">
              <div className="ab-src-icon">📊</div>
              <div>
                <b>Národný katalóg otvorených dát</b>
                <p>Dataset „Plán obnovy a odolnosti – prijímatelia (aktuálny)“, ktorý zverejňuje
                  Úrad podpredsedu vlády Slovenskej republiky pre Plán obnovy a znalostnú ekonomiku. Zdroj všetkých projektov, súm a stavov.</p>
                <span>data.slovensko.sk →</span>
              </div>
            </a>
            <a className="ab-src" href="https://ispo.planobnovy.sk/vyzvy" target="_blank" rel="noopener">
              <div className="ab-src-icon">🗂️</div>
              <div>
                <b>ISPO — informačný systém plánu obnovy</b>
                <p>Cez ISPO sa vyhlasujú výzvy, podávajú a posudzujú žiadosti a uzatvárajú zmluvy.
                  Práve odtiaľ pochádzajú údaje v datasete.</p>
                <span>ispo.planobnovy.sk →</span>
              </div>
            </a>
            <a className="ab-src" href="https://www.planobnovy.sk/" target="_blank" rel="noopener">
              <div className="ab-src-icon">🌐</div>
              <div>
                <b>planobnovy.sk</b>
                <p>Oficiálny web plánu obnovy — rozdelenie do 5 oblastí a 19 komponentov,
                  ktoré používame na triedenie projektov.</p>
                <span>planobnovy.sk →</span>
              </div>
            </a>
          </div>
        </section>

        {/* ── Ako čítať čísla ────────────────────────────────── */}
        <section>
          <h2>Ako čítať čísla</h2>
          <div className="ab-faq">
            <details>
              <summary>Prečo je projektov menej ako riadkov v datasete?</summary>
              <p>Jeden projekt má v dátach často viac riadkov — napríklad partnerov alebo viacerých
                prijímateľov. Každú žiadosť (podľa kódu žiadosti) počítame aj so sumou len raz,
                aby sa peniaze nezapočítali dvakrát.</p>
            </details>
            <details>
              <summary>Čo znamená „zazmluvnené“?</summary>
              <p>Súčet prostriedkov z plánu obnovy pri projektoch, ktoré sú v realizácii alebo už ukončené
                (vrátane národných projektov ministerstiev). Zrušené, neschválené a späťvzaté projekty
                nezapočítavame. Pre porovnanie: celková alokácia plánu obnovy pre Slovensko je 6,4 mld €.</p>
            </details>
            <details>
              <summary>Prečo je toľko peňazí v Bratislave?</summary>
              <p>Projekty sú na mape podľa adresy prijímateľa. Veľké národné projekty ministerstiev
                a štátnych inštitúcií (napr. nemocnice, digitalizácia) preto „sedia“ v Bratislave,
                aj keď sa realizujú po celom Slovensku.</p>
            </details>
            <details>
              <summary>Aké staré sú údaje?</summary>
              <p>Čísla sme spracovali {s?.generated ? new Date(s.generated).toLocaleDateString('sk-SK') : '—'} z aktuálnej
                verzie datasetu. Stav projektov sa priebežne mení, preto sa môžu mierne líšiť
                od oficiálnych súhrnov.</p>
            </details>
          </div>
        </section>

        <footer className="ab-foot">
          <p>
            Nezávislá vizualizácia z verejne dostupných otvorených dát. Nejde o oficiálnu stránku
            Úradu podpredsedu vlády SR pre Plán obnovy a znalostnú ekonomiku ani planobnovy.sk. Ak nájdete chybu, dajte vedieť — radi ju opravíme.
          </p>
          <button className="ab-cta" onClick={onClose}>🗺️ Späť na mapu</button>
        </footer>
      </div>
    </div>
  )
}
