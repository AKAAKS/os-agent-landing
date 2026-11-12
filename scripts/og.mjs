/* Photograph the real page for the social card:  npm run og
 *
 * A hand-drawn SVG card is a second drawing of the same thing and drifts
 * silently. A photograph of the page cannot disagree with the page.
 *
 * THE INVALIDATION RULE: any change to how the page LOOKS invalidates
 * public/og.png. Regenerating it is part of that change, not a follow-up —
 * ship them in the same commit, or the card advertises the old page.
 *
 * Captures the title page, which is the one screenful that works at 500px
 * wide: a title, a standfirst, and the two facing columns. A crop of a content
 * section reads as a glitch at card size.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer'

const PORT = 4317
const OUT = 'public/og.png'

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', shell: process.platform === 'win32',
})
const stop = () => { try { server.kill() } catch {} }
process.on('exit', stop)

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { if ((await fetch(url)).ok) return } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`vite preview never came up on ${url} — run "npm run build" first`)
}

const url = `http://localhost:${PORT}/`
await waitForServer(url)

const browser = await puppeteer.launch()
const page = await browser.newPage()
// 2x, so the card is sharp on a retina timeline; the file is still well under
// the 5MB most platforms accept.
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 })
await page.goto(url, { waitUntil: 'networkidle0' })
// The two webfonts are the whole look; capturing before they land photographs
// a fallback-serif page that does not exist anywhere else.
await page.evaluate(() => document.fonts.ready)
mkdirSync('public', { recursive: true })
await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1200, height: 630 } })
await browser.close()
stop()

console.log(`${OUT} captured at 1200x630 @2x from the real page`)
console.log('og:image:alt in index.html describes the title page — update it if the capture changes')
