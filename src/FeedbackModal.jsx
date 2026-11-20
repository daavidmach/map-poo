import { useEffect, useState } from 'react'

// ── Formulár „Nahlásiť chybu“ ─────────────────────────────────────────────────
// Bez servera: pripraví e-mail (mailto) s vyplneným textom, alebo text skopíruje.
// Cieľová adresa sa berie z premennej prostredia VITE_FEEDBACK_EMAIL
// (lokálne v súbore .env, na Cloudflare v Settings → Environment variables).
// Ak nie je nastavená, formulár ponúkne len skopírovanie textu.
const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL || ''

const TYPES = ['Chyba v dátach (suma, projekt, obec)', 'Niečo nefunguje', 'Návrh na zlepšenie', 'Iné']

export default function FeedbackModal({ onClose, where }) {
  const [typ, setTyp] = useState(TYPES[0])
  const [miesto, setMiesto] = useState(where || 'Mapa')
  const [popis, setPopis] = useState('')
  const [kontakt, setKontakt] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const text = () => [
    `Typ: ${typ}`,
    `Kde: ${miesto}`,
    '',
    popis.trim(),
    '',
    kontakt.trim() ? `Kontakt: ${kontakt.trim()}` : '',
    '---',
    `Stránka: ${window.location.href}`,
    `Obrazovka: ${window.innerWidth}×${window.innerHeight}`,
    `Dátum: ${new Date().toLocaleString('sk-SK')}`,
    `Prehliadač: ${navigator.userAgent}`,
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')

  const subject = () => `[Mapa POO] ${typ.split(' (')[0]}: ${popis.trim().slice(0, 50)}`

  const send = e => {
    e.preventDefault()
    if (!popis.trim() || !FEEDBACK_EMAIL) return
    window.location.href =
      `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(text())}`
    setDone('mail')
  }

  const copy = async () => {
    if (!popis.trim()) return
    try { await navigator.clipboard.writeText(`${subject()}\n\n${text()}`); setDone('copy') }
    catch { setDone('copyfail') }
  }

  const target = FEEDBACK_EMAIL || 'autorovi stránky'

  return (
    <div className="fb-backdrop" onClick={onClose}>
      <form className="fb" onClick={e => e.stopPropagation()} onSubmit={send}
        role="dialog" aria-label="Nahlásiť chybu">
        <div className="fb-head">
          <h3>🐞 Nahlásiť chybu alebo návrh</h3>
          <button type="button" className="fb-x" onClick={onClose} aria-label="Zavrieť">✕</button>
        </div>

        <label className="fb-l">Čo chcete nahlásiť?
          <select value={typ} onChange={e => setTyp(e.target.value)}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>

        <label className="fb-l">Kde?
          <select value={miesto} onChange={e => setMiesto(e.target.value)}>
            <option>Úvodná stránka</option>
            <option>Mapa</option>
            <option>Detail projektu (popup)</option>
            <option>Mobil</option>
          </select>
        </label>

        <label className="fb-l">Popis <span className="fb-req">*</span>
          <textarea rows={5} required value={popis} onChange={e => setPopis(e.target.value)}
            placeholder="Napr.: Pri obci Humenné je projekt XY so sumou 2 mil. €, podľa CRZ je to 200 tis. €." />
        </label>

        <label className="fb-l">Váš e-mail alebo meno <span className="fb-opt">(nepovinné — ak chcete odpoveď)</span>
          <input value={kontakt} onChange={e => setKontakt(e.target.value)} placeholder="meno@domena.sk" />
        </label>

        <p className="fb-note">Automaticky pridáme adresu stránky a veľkosť obrazovky, aby sa chyba ľahšie našla.</p>

        {done === 'mail' && <p className="fb-ok">✅ Otvorili sme váš e-mailový program. Ak sa neotvoril, použite „Skopírovať text“ a pošlite ho na {target}.</p>}
        {done === 'copy' && <p className="fb-ok">✅ Text je skopírovaný — vložte ho do e-mailu {FEEDBACK_EMAIL ? `na ${FEEDBACK_EMAIL}` : ''} alebo do Teams.</p>}
        {done === 'copyfail' && <p className="fb-ok">Kopírovanie nefungovalo — pošlite prosím popis {target}.</p>}

        <div className="fb-actions">
          <button type="button" className="fb-btn-sec" onClick={copy} disabled={!popis.trim()}>📋 Skopírovať text</button>
          {FEEDBACK_EMAIL && (
            <button type="submit" className="fb-btn" disabled={!popis.trim()}>✉️ Odoslať e-mailom</button>
          )}
        </div>
      </form>
    </div>
  )
}
