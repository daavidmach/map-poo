// ── „Powered by“ — zdroje dát, tím a zdrojový kód ────────────────────────────
// Používa sa na konci úvodnej stránky aj dole v paneli mapy.

// Adresa Ostrovníka (prepojenie na tím ISPO). Keď bude nasadený, doplň sem
// napr. 'https://ostrovnik.pages.dev/#tim-ispo' — dovtedy je „Tím ISPO“ len text.
export const OSTROVNIK_URL = ''

export const REPO_URL    = 'https://github.com/daavidmach/map-poo'
export const DATASET_URL = 'https://data.slovensko.sk/datasety/ba6af44e-51ca-4590-9774-d4aac63cec82'
export const ISPO_URL    = 'https://ispo.planobnovy.sk/vyzvy'

const GH_ICON = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
)

function Chip({ href, icon, children, title }) {
  if (!href) return <span className="cr-chip cr-chip-plain" title={title}>{icon}{children}</span>
  return (
    <a className="cr-chip" href={href} target="_blank" rel="noopener" title={title}>{icon}{children}</a>
  )
}

export default function Credits({ compact = false }) {
  return (
    <div className={`cr${compact ? ' cr-compact' : ''}`}>
      <div className="cr-label">Powered by</div>
      <div className="cr-chips">
        <Chip href={DATASET_URL} icon="📊" title="Národný katalóg otvorených dát — Plán obnovy a odolnosti, prijímatelia">
          data.slovensko.sk
        </Chip>
        <Chip href={ISPO_URL} icon="🗂️" title="Informačný systém plánu obnovy — výzvy a žiadosti">
          ISPO
        </Chip>
        <Chip href={OSTROVNIK_URL} icon="👥" title="Tím, ktorý stojí za ISPO">
          Tím ISPO
        </Chip>
        <Chip href={REPO_URL} icon={GH_ICON} title="Zdrojový kód tejto stránky">
          GitHub
        </Chip>
      </div>
    </div>
  )
}
