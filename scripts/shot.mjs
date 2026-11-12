/* Look at the built page:  node scripts/shot.mjs <name>:<scrollY> [...]
 *
 *   node scripts/shot.mjs top:0 appendix:9000
 *
 * Writes <name>.png beside the repo in the OS temp directory and prints the
 * paths. Width and height come from --w / --h (default 1440x900).
 *
 * This exists because the browser-extension screenshot path could not be
 * trusted on this page: Page.captureScreenshot timed out at 30s against a tall
 * document while the same page answered JavaScript in 0ms. Contradictory
 * measurements of a page that is plainly fine mean the instrument is wrong.
 * Puppeteer drives its own Chrome and has been reliable here.
 */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer'

const args = process.argv.slice(2)
const flag = (name, dflt) => {
  const i = args.indexOf(name)
  return i === -1 ? dflt : Number(args[i + 1])
}
const width = flag('--w', 1440)
const height = flag('--h', 900)
const shots = args.filter((a) => a.includes(':'))
if (!shots.length) { console.error('usage: node scripts/shot.mjs <name>:<scrollY> [...] [--w 1440] [--h 900]'); process.exit(1) }

const PORT = 4319
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', shell: process.platform === 'win32',
})
process.on('exit', () => { try { server.kill() } catch {} })

const url = `http://localhost:${PORT}/`
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(url)).ok) break } catch {}
  await new Promise((r) => setTimeout(r, 250))
}

const browser = await puppeteer.launch()
const page = await browser.newPage()
await page.setViewport({ width, height })
await page.goto(url, { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts.ready)

for (const spec of shots) {
  const [name, y] = spec.split(':')
  await page.evaluate((yy) => scrollTo(0, Number(yy)), y)
  await new Promise((r) => setTimeout(r, 250))
  const path = join(tmpdir(), `${name}.png`)
  await page.screenshot({ path })
  console.log(path)
}

await browser.close()
// vite preview keeps the process alive otherwise
process.exit(0)
