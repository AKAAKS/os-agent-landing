/* Build the page's data from the agent's own files.
 *
 *   node scripts/extract.mjs            # expects ../OS_agent beside this repo
 *   node scripts/extract.mjs <repo>     # or point it at the repo
 *
 * Reads, and never writes to, the source repo:
 *   data/actions.jsonl   the append-only audit trail — every record on the page
 *   logs/agent.log       quoted lines, each carried with its 1-based line number
 *   config/settings.yaml the thresholds table
 *   data/cost_ledger.json  daily USD spend
 *
 * Output: src/data/ledger.json, checked in.
 *
 * REDACTION (see README "Redaction"). The process-name allowlist below is
 * FAIL-CLOSED on purpose: a name not on it is replaced with a visible mark,
 * never dropped and never swapped for a plausible substitute. Adding a name
 * here is a decision to publish it. The rule matches the thing the page is
 * about — when in doubt, refuse.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const SRC = resolve(process.argv[2] ?? join(process.cwd(), '..', 'OS_agent'))
const OUT = join(process.cwd(), 'src', 'data', 'ledger.json')

/* Public, commercially available software only. Anything the owner wrote, or
 * anything whose name could identify a client, a workplace or a private
 * project, is NOT on this list and must not be added without a decision. */
const PUBLIC_PROCESSES = new Set([
  'VALORANT-Win64-Shipping.exe', 'firefox.exe', 'chrome.exe', 'javaw.exe',
  'dwm.exe', 'claude.exe', 'AimLab_tb.exe', 'Spotify.exe', 'audiodg.exe',
  'llama-server.exe', 'Stardew Valley.exe', 'ollama app.exe',
  'OLED Care Screensaver.scr',
])
const REDACTED = '[a private app]'

/* Two of the real names carry a space ("Stardew Valley.exe", "ollama app.exe"),
 * and one carries two ("OLED Care Screensaver.scr"), so the pattern has to
 * allow up to two leading words — which means it also swallows the ordinary
 * English words before a one-word name ("Refused to kill user app firefox.exe"
 * matches as "user app firefox.exe"). The caller below therefore decides on the
 * LAST token and keeps any prefix verbatim, instead of trusting the match
 * boundary. Do not "simplify" this to a plain name match: the first version
 * did, and marked 521 of 564 records redacted. */
const NAME_RE = /(?:[A-Za-z0-9_\-]+ ){0,2}[A-Za-z0-9_\-]+\.(?:exe|scr)/g

const redactedNames = new Set()

function redact(message) {
  let hit = false
  const out = message.replace(NAME_RE, (whole) => {
    // The match may have swallowed ordinary words before the name, so test
    // every token-suffix, longest first: the longest one on the allowlist IS
    // the process name, and anything ahead of it is English to keep verbatim.
    const tokens = whole.split(' ')
    for (let i = 0; i < tokens.length; i++) {
      if (PUBLIC_PROCESSES.has(tokens.slice(i).join(' '))) return whole
    }
    hit = true
    redactedNames.add(tokens[tokens.length - 1])
    return tokens.slice(0, -1).map((t) => t + ' ').join('') + REDACTED
  })
  return { message: out, redacted: hit }
}

/* ---- the audit trail ---------------------------------------------------- */
const lines = readFileSync(join(SRC, 'data', 'actions.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())

const records = lines.map((l) => {
  const r = JSON.parse(l)
  const { message, redacted } = redact(r.message)
  return {
    ts: r.timestamp,
    action: r.action,
    pid: r.args?.pid ?? null,
    ok: r.success,
    risk: r.risk_level,
    event: r.event_type,
    summary: r.event_summary,
    profile: r.profile,
    ms: r.duration_ms,
    message,
    ...(redacted ? { redacted: true } : {}),
  }
})

/* ---- quoted log lines ---------------------------------------------------
 * Each entry names the line number it was taken from, so a reader can run
 *   sed -n '<n>p' logs/agent.log
 * and get the same string back. Picked by matching a stable substring; the
 * build FAILS if a quote stops matching, rather than silently shipping a line
 * that no longer exists (a page about auditability cannot quote from memory). */
const agentLog = readFileSync(join(SRC, 'logs', 'agent.log'), 'utf8').split(/\r?\n/)
const QUOTES = [
  ['observer', 'Observer daemon started (poll every'],
  ['headless', 'HITL denied (headless, fail-closed): kill_process'],
  ['triage', 'LLM call → gpt-5-mini'],
  ['advisory', 'LLM fix is advisory (no actionable command)'],
  ['profile', 'Power plan → power_saver (profile idle stable for'],
  ['gpu', 'Anomaly detected: gpu_high'],
]
const quotes = {}
for (const [key, needle] of QUOTES) {
  const i = agentLog.findLastIndex((l) => l.includes(needle))
  if (i === -1) throw new Error(`quote "${key}" no longer matches logs/agent.log — do not ship a quote that is not in the file`)
  const { message, redacted } = redact(agentLog[i])
  quotes[key] = { line: i + 1, text: message, ...(redacted ? { redacted: true } : {}) }
}

/* ---- thresholds --------------------------------------------------------- */
const yaml = readFileSync(join(SRC, 'config', 'settings.yaml'), 'utf8')
const num = (k) => {
  const m = yaml.match(new RegExp(`^\\s*${k}:\\s*([0-9.]+)`, 'm'))
  if (!m) throw new Error(`setting "${k}" not found in config/settings.yaml`)
  return Number(m[1])
}
const settings = Object.fromEntries(
  ['poll_interval_seconds', 'poll_interval_battery_seconds', 'cpu_threshold_percent',
   'cpu_sustained_seconds', 'ram_threshold_percent', 'disk_threshold_percent',
   'memory_leak_growth_mb', 'memory_leak_window_minutes', 'gpu_threshold_percent',
   'cooldown_minutes', 'confidence_threshold', 'similarity_threshold',
  ].map((k) => [k, num(k)]),
)

/* ---- cost --------------------------------------------------------------- */
const costByDay = JSON.parse(readFileSync(join(SRC, 'data', 'cost_ledger.json'), 'utf8'))

/* ---- test count ---------------------------------------------------------
 * Asked of pytest, never counted by grepping for "def test_": a grep counts
 * helpers, parametrised cases and commented-out tests, and the page would
 * quote a number nobody can reproduce. If pytest is not available the build
 * fails rather than shipping yesterday's figure. */
const collect = spawnSync('python', ['-m', 'pytest', '--collect-only', '-q'], { cwd: SRC, encoding: 'utf8' })
const collected = (collect.stdout ?? '').match(/^(\d+) tests? collected/m)
if (!collected) throw new Error(`could not read a test count from pytest in ${SRC}:\n${collect.stdout ?? ''}${collect.stderr ?? ''}`)
const tests = Number(collected[1])

writeFileSync(
  OUT,
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), tests, records, quotes, settings, costByDay }, null, 0) + '\n',
)

const n = records.filter((r) => r.redacted).length
console.log(`${records.length} records -> ${OUT}`)
console.log(`${n} record(s) carry a visible redaction mark`)
console.log(`${Object.keys(quotes).length} quoted log lines, all re-matched against the file`)
console.log(`names withheld (review before adding any to PUBLIC_PROCESSES):`)
for (const name of [...redactedNames].sort()) console.log(`  ${name}`)
