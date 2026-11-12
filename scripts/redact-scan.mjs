/* Re-run after ANY change to the page's data:  node scripts/redact-scan.mjs
 *
 * Scans the SOURCE and the BUILD for strings that must never be published.
 * It checks dist/ as well as src/ because the thing you publish is the build,
 * and it checks the rendered text of index.html too — a page that composes a
 * line out of several fields can print something no single source file holds.
 *
 * Exit code 1 on any hit, so this can gate a deploy.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/* Names the extractor withheld, plus anything else that identifies a person,
 * a machine or a client. Keep this in step with PUBLIC_PROCESSES in
 * scripts/extract.mjs: a name removed from the allowlist belongs here. */
const FORBIDDEN = [
  'FindTheNeedle',
  'QmlRenderer',
  'akshi',          // the Windows user directory, which log paths can carry
  'C:\\Users\\',
  // An API key, not the substring "sk-": a plain "sk-" also matches
  // `mask-image` in the stylesheet, which cost one false alarm already.
  /\bsk-[A-Za-z0-9_\-]{16,}/,
]

const ROOTS = ['src', 'scripts', 'dist', 'index.html'].filter((p) => existsSync(p))
const SKIP = /node_modules|\.git|\.png$|\.jpg$|\.ico$|\.woff2?$/

function* files(path) {
  if (SKIP.test(path)) return
  const s = statSync(path)
  if (s.isDirectory()) { for (const e of readdirSync(path)) yield* files(join(path, e)) }
  else yield path
}

let hits = 0
for (const root of ROOTS) {
  for (const f of files(root)) {
    let text
    try { text = readFileSync(f, 'utf8') } catch { continue }
    for (const needle of FORBIDDEN) {
      // this file names every forbidden string, so it always matches itself
      if (f.endsWith('redact-scan.mjs')) continue
      const found = typeof needle === 'string' ? text.includes(needle) : needle.test(text)
      if (found) { console.log(`LEAK  ${needle}  ->  ${f}`); hits++ }
    }
  }
}

console.log(hits === 0
  ? `clean: ${FORBIDDEN.length} patterns, 0 hits across ${ROOTS.join(', ')}`
  : `${hits} hit(s) — do not publish`)
process.exit(hits === 0 ? 0 : 1)
