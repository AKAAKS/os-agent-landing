/* Every number printed on the page is computed here, from ledger.json.
 *
 * Nothing in the page may type a count. Add a record to the ledger and every
 * figure moves by itself. If a figure cannot be derived, the page does not
 * make the claim — see README, "Numbers".
 */
import ledger from './ledger.json'

export const { records, quotes, settings, costByDay, generated, tests } = ledger

const by = (fn) => records.reduce((m, r) => { const k = fn(r); m[k] = (m[k] || 0) + 1; return m }, {})

/* ---- span ----
 * Dates only, never a range inside one record: the ledger covers 81 separate
 * days and rendering it as a continuous period would overstate uptime. */
const days = [...new Set(records.map((r) => r.ts.slice(0, 10)))].sort()
export const span = { from: days[0], to: days[days.length - 1], activeDays: days.length }

export const totals = {
  records: records.length,
  byAction: by((r) => r.action),
  byRisk: by((r) => r.risk),
  byProfile: by((r) => r.profile),
  failed: records.filter((r) => !r.ok).length,
}

/* ---- the kill ledger ----
 * The page's central claim. "Refused" and "denied" are different events and
 * are counted separately on purpose: one is the agent's own policy declining,
 * the other is Windows declining. Collapsing them would credit the agent with
 * restraint that was really an access check. */
const kills = records.filter((r) => r.action === 'kill_process')
export const killLedger = {
  attempted: kills.length,
  allowed: kills.filter((r) => r.ok).length,
  refusedByPolicy: kills.filter((r) => /^Refused/.test(r.message)).length,
  refusedByWindows: kills.filter((r) => /^Access denied/.test(r.message)).length,
  theOneThatWentThrough: kills.find((r) => r.ok) ?? null,
}

/* Priority changes — the action it actually takes instead of killing. */
const priority = records.filter((r) => r.action === 'set_priority')
export const priorityLedger = {
  attempted: priority.length,
  applied: priority.filter((r) => r.ok).length,
  deniedByWindows: priority.filter((r) => !r.ok).length,
}

/* ---- distinct outcomes ----
 * Every record collapses to one of a small number of message shapes, so the
 * FIRST occurrence of each shape, dated, is the complete set of things that
 * have ever happened — once each, with the number of repeats beside it.
 * The count is derived, so a new shape appearing in the data turns up on the
 * page by itself. */
const shape = (m) => m
  .replace(/\(PID \d+\)/, '(PID …)')
  .replace(/for PID \d+/, 'for PID …')
  .replace(/killing PID \d+/, 'killing PID …')
export const outcomes = Object.entries(
  records.reduce((m, r) => {
    const k = shape(r.message)
    ;(m[k] ||= { n: 0, ok: r.ok, risk: r.risk, sample: r })
    m[k].n++
    return m
  }, {}),
).map(([text, v]) => ({ text, ...v })).sort((a, b) => b.n - a.n)

/* ---- what the appendix prints ----
 * The first version printed all 564 records. Honest, 26,000px long, and nobody
 * was going to read it, so its completeness bought nothing. The second printed
 * a 64-row rule, which was the same problem one third as loudly.
 *
 * This is the complete set of DISTINCT outcomes, oldest first: one real,
 * dated record per shape, with how many times that shape has recurred. It is
 * still a complete claim — there is no event in the ledger that is not
 * represented here — and it is bounded by how many kinds of thing the agent
 * can do, not by how often it did them.
 *
 * Do not re-expand this to every record "for completeness". Completeness of
 * KINDS is the useful claim; completeness of instances is the file, which is
 * linked. And do not hand-pick interesting rows instead: a selection a reader
 * cannot reproduce is one they have to take on trust. */
export const ledgerRows = [...outcomes].sort((a, b) => (a.sample.ts < b.sample.ts ? -1 : 1))

/* ---- processes ----
 * Named by the longest .exe/.scr token in the message, which is also what the
 * redaction pass operated on, so a withheld name counts as "[a private app]"
 * rather than vanishing from the tally. */
const nameOf = (m) => (m.match(/(?:[A-Za-z0-9_\-]+ ){0,2}[A-Za-z0-9_\-]+\.(?:exe|scr)|\[a private app\]/g) || []).pop() ?? null
export const processes = Object.entries(
  records.reduce((m, r) => { const n = nameOf(r.message); if (n) m[n] = (m[n] || 0) + 1; return m }, {}),
).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)

/* ---- cost ----
 * Real USD from data/cost_ledger.json. Rounded for display only where the page
 * says so; the raw values stay in the ledger. */
const costDays = Object.entries(costByDay)
export const cost = {
  days: costDays.length,
  total: costDays.reduce((s, [, v]) => s + v, 0),
  max: costDays.reduce((a, b) => (b[1] > a[1] ? b : a)),
}

export const redactions = records.filter((r) => r.redacted).length
/* redactions among the rows the appendix actually prints — the page must not
 * quote the whole-file figure beside a table that shows twenty of them */
export const redactionsShown = ledgerRows.filter((o) => o.sample.redacted || /\[a private app\]/.test(o.text)).length
