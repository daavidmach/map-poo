# Finančný model — map-poo

> Tento súbor vysvetľuje, odkiaľ pochádzajú sumy zobrazované v appke a čo každé pole znamená.
> Edituj ho kedykoľvek keď sa logika zmení alebo niečo nie je jasné.

---

## Životný cyklus projektu POO

```
ŽIADATEĽ         →  POSÚDENIE   →  ZAZMLUVNENÝ     →  REALIZÁCIA   →  VYPLATENÝ
(žiadosť podaná)    (schválená)    (zmluva uzavretá)  (v realizácii)  (zaúčtované)

"požadovaná suma"   posúdenie     "zazmluvnená suma   "celková suma    "zúčtované poo €"
                    výsledok       zdroj poo"          projektu"
                    = SPLNENE                          "poskytnuté poo €"
```

---

## Polia v JSON (planobnovy.json)

| JSON kľúč | Čo znamená | Kedy je vyplnené |
|---|---|---|
| `požadovaná suma` | Suma, o ktorú žiadateľ žiada | Vždy pri podaní žiadosti |
| `požadovaná suma bez dph` | Suma bez DPH | Vždy pri podaní |
| `požadovaná suma z toho dph` | Len DPH časť | Vždy pri podaní |
| `posúdenie výsledok` | Výsledok hodnotenia žiadosti | Po posúdení (`SPLNENE_PODMIENKY` = schválená) |
| `zazmluvnená suma zdroj poo` | Zazmluvnená suma z POO zdrojov | **Po podpise zmluvy** |
| `zazmluvnená suma zdroj poo dph` | Zazmluvnená suma vrátane DPH | Po podpise zmluvy |
| `zazmluvnená suma iné zdroje` | Spolufinancovanie (nie z POO) | Po podpise zmluvy |
| `celková suma projektu` | Celková suma projektu (POO + iné zdroje) | Po podpise zmluvy |
| `poskytnuté poo €` | Reálne prevedené/vyplatené peniaze | Po výplate |
| `zúčtované poo €` | Finančne zúčtované (záverečné vyrovnanie) | Po zaúčtovaní |
| `žiadateľ postavenie` | Rola žiadateľa: `ZIADATEL` | V časti žiadosť |
| `prijímateľ postavenie` | Rola príjemcu: `PRIJIMATEL` / `PARTNER` / `null` | `null` = žiadosť bez zmluvy |

---

## Vysvetlenie: žiadateľ vs prijímateľ vs partner

- **ZIADATEL** (žiadateľ postavenie = ZIADATEL, prijímateľ postavenie = null)
  → Žiadosť bola podaná, ale zmluva NIE JE uzavretá. Príklad: nemocnica podala žiadosť, čaká.

- **PRIJIMATEL** (prijímateľ postavenie = PRIJIMATEL)
  → Zmluva je uzavretá, subjekt je **hlavný príjemca** POO prostriedkov.

- **PARTNER** (prijímateľ postavenie = PARTNER)
  → Subjekt je **partnerom** v projekte (nie hlavný príjemca, ale zapojený do realizácie).

---

## Ako appka počíta sumy

### totalZazmluvnena (Zazmluvnené POO)
```js
filtered.reduce((s,p) => s + (p['zazmluvnená suma zdroj poo'] || 0), 0)
```
→ Suma zazmluvnených POO prostriedkov vo filtrovaných projektoch.
→ **Zobrazuje sa v headeri ako "zazmluvnené POO"** (zelená).

### totalZuctovane (Zúčtované POO)
```js
filtered.reduce((s,p) => s + (p['zúčtované poo €'] || 0), 0)
```
→ Suma reálne zúčtovaných POO prostriedkov.
→ **Zobrazuje sa v headeri ako "zúčtované POO"** (modrá).

### totalCelk (Celková suma)
```js
filtered.reduce((s,p) => s + (p['celková suma projektu'] || 0), 0)
```
→ Celková suma projektov vrátane iných zdrojov (nie len POO).
→ **Zobrazuje sa v headeri ako "celková suma"** (biela).

### totalPOO (Poskytnuté POO — starší výpočet, interné)
```js
// Fallback: ak 'poskytnuté poo €' je null, berie 'zazmluvnená suma zdroj poo'
filtered.reduce((s,p) => s + (p['poskytnuté poo €'] || p['zazmluvnená suma zdroj poo'] || 0), 0)
```
→ Používa sa interne pre výpočet percent v bar charte markera.

---

## Prečo sú niektoré sumy null

Väčšina projektov v štádiu **žiadosť** (ZIADATEL) má:
- `zazmluvnená suma zdroj poo` = null (zmluva ešte nebola podpísaná)
- `celková suma projektu` = null
- `poskytnuté poo €` = null

Len `požadovaná suma` je vyplnená.

**Postup zobrazenia v appke:**
1. Ak existuje `celková suma projektu` → zobraz ju
2. Ak existuje `zazmluvnená suma zdroj poo` → zobraz v bar
3. Ak len `požadovaná suma` → zobraz ako záložnú sumu

---

## Ako zmeniť výpočet

Všetky výpočty sú v `src/App.jsx`, sekcia **`// ── Štatistiky`** (cca riadok 595).

Funkcia `fmt(n)` formátuje sumy: < 1000€ → €, < 1M → tis. €, < 1B → M €, ≥ 1B → mld. €

---

*Posledná aktualizácia: 2026-10-21*
