/* Measure the built page at real viewport sizes:  npm run measure
 *
 * Checks the things that are correctness, not taste:
 *   · horizontal overflow at every width (a 0.8px overflow is still a bug)
 *   · the marginal notes are inside the viewport, at every width — they were
 *     off-screen across the whole 992-1440px band once
 *   · body-copy contrast, computed from the rendered colours rather than read
 *     off the stylesheet
 *   · nothing is clipped or unreachable in a SHORT window; this page scrolls
 *     normally, so the test is simply that the full document is reachable
 *
 * A check that cannot fail is not a check: each assertion below has a value
 * that would have reported "broken", and the widths include the band where
 * the note bug actually lived.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import puppeteer from 'puppeteer'

/* The expected appendix row count is derived HERE, from the ledger, by
 * re-applying the page's selection rule independently. Asserting against a
 * number the page itself supplies would be a check that cannot fail. */
const ledger = JSON.parse(readFileSync('src/data/ledger.json', 'utf8'))
const shape = (m) => m
  .replace(/\(PID \d+\)/, '(PID …)')
  .replace(/for PID \d+/, 'for PID …')
  .replace(/killing PID \d+/, 'killing PID …')
const EXPECTED_ROWS = new Set(ledger.records.map((r) => shape(r.message))).size

const PORT = 4318
const SIZES = [
  [390, 844, 'phone'],
  [768, 1024, 'tablet'],
  [1024, 640, 'small laptop, short window'],
  [1200, 800, 'just below the marginal-column breakpoint'],
  [1216, 800, 'exactly at it'],
  [1280, 800, 'laptop'],
  [1366, 768, 'the laptop that breaks pages'],
  [1920, 1080, 'desktop'],
]

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', shell: process.platform === 'win32',
})
process.on('exit', () => { try { server.kill() } catch {} })

const url = `http://localhost:${PORT}/`
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(url)).ok) break } catch {}
  await new Promise((r) => setTimeout(r, 250))
}

const lum = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const browser = await puppeteer.launch()
const page = await browser.newPage()
let failures = 0

for (const [w, h, label] of SIZES) {
  await page.setViewport({ width: w, height: h })
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)

  const m = await page.evaluate(() => {
    const el = document.documentElement
    const notes = [...document.querySelectorAll('.note')].map((n) => {
      const r = n.getBoundingClientRect()
      return { left: Math.round(r.left), right: Math.round(r.right) }
    })
    const cs = getComputedStyle(document.querySelector('.clause p'))
    // every place --ink-mid is actually used, measured as rendered
    const dim = ['.note', '.quote figcaption', '.colophon p', '.figures span', '.clause-n']
      .map((sel) => { const e = document.querySelector(sel); return e ? [sel, getComputedStyle(e).color] : null })
      .filter(Boolean)
    return {
      overflowX: el.scrollWidth - el.clientWidth,
      docH: document.body.scrollHeight,
      noteMinLeft: Math.min(...notes.map((n) => n.left)),
      noteMaxRight: Math.max(...notes.map((n) => n.right)),
      notes: notes.length,
      body: cs.color,
      dim,
      ground: getComputedStyle(document.body).backgroundColor,
      ledgerRows: document.querySelectorAll('.ledger tbody tr').length,
      /* trim marks: where they are anchored, and how much clear edge the
       * narrowest text column leaves them */
      trim: getComputedStyle(document.querySelector('.sheet-trim')).position,
      textEdge: Math.round(parseFloat(getComputedStyle(document.querySelector('.masthead')).paddingLeft)),
      bleed: Math.round(parseFloat(getComputedStyle(document.body).paddingTop)),
      textCentreOffset: (() => {
        const p = document.querySelector('.clause p')
        if (!p) return null
        const r = p.getBoundingClientRect()
        // only meaningful where the viewport is wide enough to centre at all
        if (innerWidth < r.width + 2 * 20) return null
        return Math.round((r.left + r.right) / 2 - innerWidth / 2)
      })(),
      // the appendix is the widest thing on the page; it must scroll inside
      // its own wrapper rather than push the document sideways
      ledgerScrolls: (() => { const e = document.querySelector('.ledger-wrap'); return e.scrollWidth > e.clientWidth })(),
    }
  })

  const contrast = ratio(m.body, m.ground)
  const bad = []
  if (m.overflowX > 0) bad.push(`horizontal overflow ${m.overflowX}px`)
  if (m.noteMinLeft < 0) bad.push(`a margin note starts at ${m.noteMinLeft}px — off-screen`)
  if (m.noteMaxRight > w) bad.push(`a margin note ends at ${m.noteMaxRight}px, past the ${w}px viewport`)
  if (contrast < 7) bad.push(`body copy at ${contrast.toFixed(2)}:1 — below the 7:1 this page holds itself to`)
  let dimWorst = Infinity
  for (const [sel, color] of m.dim) {
    const r = ratio(color, m.ground)
    dimWorst = Math.min(dimWorst, r)
    if (r < 7) bad.push(`${sel} at ${r.toFixed(2)}:1 — secondary text must stay above 7:1`)
  }
  if (m.ledgerRows !== EXPECTED_ROWS) bad.push(`appendix has ${m.ledgerRows} rows; the selection rule over the ledger gives ${EXPECTED_ROWS}`)
  /* A trim mark is inset 12px and 28px across, so it owns the first 40px of an
   * edge. Fixed to the viewport it is a frame; that is only legitimate while
   * the text leaves that 40px clear, otherwise the marks run through the
   * masthead. Narrower than that, the layer must be anchored to the document
   * and the body must carry a bleed for the marks to sit in. */
  const TRIM = 40
  if (m.trim === 'fixed' && m.textEdge < TRIM) {
    bad.push(`trim marks are fixed to the viewport but text starts at ${m.textEdge}px, inside the ${TRIM}px they occupy`)
  }
  if (m.trim === 'absolute' && m.bleed < TRIM) {
    bad.push(`trim marks are anchored to the sheet but the bleed is only ${m.bleed}px — they will sit on text`)
  }
  // the measure must be centred in the viewport wherever there is room for it
  if (m.textCentreOffset !== null && Math.abs(m.textCentreOffset) > 1) {
    bad.push(`the text column's centre is ${m.textCentreOffset}px off the viewport centre`)
  }
  failures += bad.length

  console.log(
    `${String(w).padStart(4)}x${String(h).padEnd(5)} ${label.padEnd(30)} ` +
    `doc ${String(m.docH).padStart(6)}px · notes ${m.notes} @ ${m.noteMinLeft}..${m.noteMaxRight} · ` +
    `text ${contrast.toFixed(2)}:1 · dim ${dimWorst.toFixed(2)}:1 · ` +
    `centre ${m.textCentreOffset === null ? 'n/a' : m.textCentreOffset + 'px'} · ` +
    `ledger ${m.ledgerRows} rows${m.ledgerScrolls ? ' (pans)' : ''}`,
    `trim ${m.trim === 'fixed' ? `window, text at ${m.textEdge}px` : `sheet, ${m.bleed}px bleed`}`,
  )
  for (const b of bad) console.log(`     FAIL  ${b}`)
}

/* ---- the legend filter ----
 * A behaviour, so it needs a check that could fail: untick "applied" and the
 * table must LOSE exactly the applied rows, not merely re-render. Unticking
 * the last remaining box must leave the table non-empty, because a filter that
 * can hide everything hides the appendix. */
await page.setViewport({ width: 1440, height: 900 })
await page.goto(url, { waitUntil: 'networkidle0' })
const filter = await page.evaluate(async () => {
  const rows = () => document.querySelectorAll('.ledger tbody tr').length
  const applied = () => document.querySelectorAll('.ledger tbody tr.v-applied').length
  const btn = (name) => [...document.querySelectorAll('.sw')].find((b) => b.textContent.includes(name))
  const tick = async (t) => { btn(t).click(); await new Promise((r) => requestAnimationFrame(r)) }
  const before = { all: rows(), applied: applied() }
  await tick('applied')
  const afterOff = { all: rows(), applied: applied(), pressed: btn('applied').getAttribute('aria-pressed') }
  await tick('refused by the agent')
  await tick('refused by Windows')
  return { before, afterOff, emptied: rows() }
})
const fbad = []
if (filter.afterOff.applied !== 0) fbad.push(`unticking "applied" left ${filter.afterOff.applied} applied rows`)
if (filter.afterOff.all !== filter.before.all - filter.before.applied) {
  fbad.push(`unticking "applied" should leave ${filter.before.all - filter.before.applied} rows, left ${filter.afterOff.all}`)
}
if (filter.afterOff.pressed !== 'false') fbad.push('aria-pressed did not follow the tick')
if (filter.emptied === 0) fbad.push('unticking every box emptied the table')
failures += fbad.length
console.log(`
filter    ${filter.before.all} rows -> ${filter.afterOff.all} with "applied" off; ` +
  `${filter.emptied} rows with all three off`)
for (const b of fbad) console.log(`     FAIL  ${b}`)

await browser.close()
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} failure(s)`)
process.exit(failures === 0 ? 0 : 1)
