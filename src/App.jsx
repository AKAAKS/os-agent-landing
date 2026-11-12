/* =============================================================================
 *  OS AGENT — FIELD GUIDE.
 *
 *  The page is a printed technical manual for a machine that has been given
 *  authority over a computer, with that machine's own audit ledger bound in as
 *  an appendix. The register is not decorative: the source repo contains
 *  docs/OS_Agent_Field_Guide.tex, a 795-line LaTeX manual with exactly these
 *  callout types (CONCEPT, MENTAL MODEL, GOTCHA, WAR STORY). This page renders
 *  that document's vocabulary, not a theme chosen to look technical.
 *
 *  Rules this file is required to keep — see README "Anti-goals":
 *    · No number is typed. Every figure comes from src/data/derive.js.
 *    · No log line is paraphrased. Quoted text is mono; authored text is serif.
 *      The typeface IS the boundary between the two.
 *    · Scroll turns pages and does nothing else. No hijack, no snap, no
 *      reveal-on-scroll, no sticky stage.
 *    · Colour appears only as one of the four callout rules the source document
 *      defines, or as a verdict the agent itself recorded.
 * ========================================================================== */
import { useState } from 'react'
import {
  span, totals, killLedger, priorityLedger, ledgerRows, processes, cost,
  quotes, settings, redactions, redactionsShown, generated, tests,
} from './data/derive.js'

const LINKS = {
  github: 'https://github.com/AKAAKS/OS_agent',
  guide: 'https://github.com/AKAAKS/OS_agent/blob/main/docs/OS_Agent_Field_Guide.tex',
  ledger: 'https://github.com/AKAAKS/OS_agent/blob/main/data/actions.jsonl',
}

const int = (n) => n.toLocaleString('en-GB')
const usd = (n) => `$${n.toFixed(2)}`
const longDate = (iso) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/* ---- the manual's furniture --------------------------------------------- */

/* A callout. `kind` must be one of the four the source document defines; a
 * fifth would be a new colour, and a new colour needs a reason. */
function Box({ kind, title, children }) {
  const label = { concept: 'Concept', model: 'Mental model', gotcha: 'Gotcha', war: 'War story' }[kind]
  return (
    <aside className={`box box-${kind}`}>
      <p className="box-h"><span className="box-kind">{label}</span>{title}</p>
      {children}
    </aside>
  )
}

/* Marginalia. Sits in the left margin on a wide page and folds into the text
 * column on a narrow one — it is a note, not a sidebar, so it never scrolls
 * independently and never carries content the body needs. */
function Note({ children }) {
  return <span className="note">{children}</span>
}

function Clause({ n, title, children }) {
  const id = `s${n}`
  return (
    <section className="clause" id={id}>
      <h2><span className="clause-n">§{n}</span><a href={`#${id}`}>{title}</a></h2>
      {children}
    </section>
  )
}

/* A line lifted from logs/agent.log, carrying the line number it came from so
 * a reader can run `sed -n '<n>p' logs/agent.log` and get the same string. */
function Quoted({ q, file = 'logs/agent.log' }) {
  return (
    <figure className="quote">
      <pre>{q.text}</pre>
      <figcaption>{file} : {int(q.line)}{q.redacted ? ' · one name withheld' : ''}</figcaption>
    </figure>
  )
}

/* ---- figure 1: the control loop ----------------------------------------- */
const LOOP = ['Observe', 'Orient', 'Decide', 'Gate', 'Act', 'Verify']
const KERNEL = [
  ['RiskLevel', 'severity model'],
  ['ApprovalGate', 'fail-closed'],
  ['CommandSanitizer', 'allowlist'],
  ['Audit log', 'JSONL, append-only'],
  ['Cost ledger', 'daily USD cap'],
  ['FixMemory', 'replays past fixes'],
]
function Figure1() {
  /* Geometry derived from the viewBox, not chosen: the 6 loop nodes and the 6
   * kernel boxes each have to span the same 904 units between the 8-unit
   * margins, so the step is (904 - width) / 5. Picking round numbers instead
   * is how the kernel row overflowed the viewBox the first time. */
  const SPAN = 904, X0 = 8
  const W = 128, H = 54
  const x = (i) => X0 + i * ((SPAN - W) / 5)
  const kw = 140, kx = (i) => X0 + i * ((SPAN - kw) / 5)
  return (
    <figure className="fig">
      <svg viewBox="0 0 920 300" role="img"
        aria-label="The OODA control loop — Observe, Orient, Decide, a fail-closed approval gate, Act, Verify — running on top of the agentkernel trust substrate: RiskLevel, ApprovalGate, CommandSanitizer, audit log, cost ledger and FixMemory.">
        <defs>
          <marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6" className="f-ah" />
          </marker>
        </defs>

        {LOOP.slice(0, -1).map((_, i) => (
          <line key={i} className="f-arrow" markerEnd="url(#ah)" x1={x(i) + W} y1={57} x2={x(i + 1) - 3} y2={57} />
        ))}
        <path className="f-return" markerEnd="url(#ah)" d={`M${x(5) + W / 2},86 L${x(5) + W / 2},104 L${x(0) + W / 2},104 L${x(0) + W / 2},33`} />
        <text x={x(2) + W / 2} y="119" className="f-cap" textAnchor="middle">
          re-samples every {settings.poll_interval_seconds}s on AC, {settings.poll_interval_battery_seconds}s on battery
        </text>

        {LOOP.map((n, i) => (
          <g key={n}>
            <rect className={n === 'Gate' ? 'f-node f-gate' : 'f-node'} x={x(i)} y="30" width={W} height={H} />
            <text x={x(i) + W / 2} y="62" className="f-nt" textAnchor="middle">{n}</text>
          </g>
        ))}
        <text x={x(3) + W / 2} y="22" className="f-cap" textAnchor="middle">fail-closed</text>

        <rect className="f-kbox" x="8" y="148" width="904" height="140" />
        <text x="22" y="172" className="f-kt">agentkernel</text>
        <text x="118" y="172" className="f-cap">platform-agnostic · forbidden from importing the Windows code, by a test</text>
        {KERNEL.map(([t, s], i) => (
          <g key={t}>
            <rect className="f-knode" x={kx(i)} y="192" width={kw} height={76} />
            <text x={kx(i) + kw / 2} y="226" className="f-knt" textAnchor="middle">{t}</text>
            <text x={kx(i) + kw / 2} y="245" className="f-cap" textAnchor="middle">{s}</text>
          </g>
        ))}
      </svg>
      <figcaption>
        <b>Figure 1.</b> The loop, and the substrate it stands on. The gate sits between
        deciding and acting; nothing reaches <i>Act</i> around it.
      </figcaption>
    </figure>
  )
}

/* ---- appendix A: the ledger --------------------------------------------- */
const verdictOf = (r) =>
  r.ok ? 'applied' : /^Refused/.test(r.message) ? 'refused' : 'denied'

/* The three verdicts, in the order they appear in the ledger's own vocabulary.
 * "applied" has no hue: it is the unmarked case. */
const VERDICTS = [
  ['applied', 'applied'],
  ['refused', 'refused by the agent'],
  ['denied', 'refused by Windows'],
]

/* The legend doubles as the filter. The swatch is already a printed tickbox —
 * a square rule you fill in — so making it a real control adds a behaviour the
 * form already implied rather than a widget the manual has no place for.
 *
 * Every row is in the DOM at all times; filtering sets a class. A reader who
 * never touches it, or whose JavaScript never runs, sees the complete table,
 * and ctrl-F still finds every line. */
function Ledger() {
  const [on, setOn] = useState(() => new Set(VERDICTS.map(([k]) => k)))
  const toggle = (k) => setOn((prev) => {
    const next = new Set(prev)
    // never let the reader filter the table down to nothing: turning the last
    // one off turns the other two back on, which is what they meant
    if (next.has(k)) next.delete(k); else next.add(k)
    return next.size ? next : new Set(VERDICTS.map(([v]) => v).filter((v) => v !== k))
  })

  const shown = ledgerRows.filter((o) => on.has(verdictOf(o.sample)))

  return (
    <>
      <div className="legend" role="group" aria-label="Filter the ledger by outcome">
        {VERDICTS.map(([k, label]) => {
          const n = ledgerRows.filter((o) => verdictOf(o.sample) === k).length
          return (
            <button
              key={k}
              type="button"
              className={`sw v-${k}${on.has(k) ? ' on' : ''}`}
              aria-pressed={on.has(k)}
              onClick={() => toggle(k)}
            >
              {label} <span className="sw-n">{n}</span>
            </button>
          )
        })}
        <span className="legend-count" aria-live="polite">
          showing {shown.length} of {ledgerRows.length}
        </span>
      </div>

      <div className="ledger-wrap">
        <table className="ledger">
          <caption className="vh">
            Every distinct outcome in the ledger: the date it first happened, the action,
            its risk level, the line the agent wrote, and how many times it has recurred.
          </caption>
          <thead>
            <tr>
              <th>First seen</th><th>Action</th><th>Risk</th><th>Outcome</th>
              <th className="l-n-h">Times</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.text} className={`v-${verdictOf(o.sample)}`}>
                <td className="l-ts">{o.sample.ts.slice(0, 10)}</td>
                <td className="l-act">{o.sample.action}</td>
                <td className="l-risk">{o.sample.risk}</td>
                <td className="l-msg">{o.text}</td>
                <td className="l-n">{int(o.n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ========================================================================== */
export default function App() {
  const oneKill = killLedger.theOneThatWentThrough

  return (
    <>
      {/* the sheet itself: tooth, margin rule, trim marks. See styles.css. */}
      <div className="sheet-tooth" aria-hidden="true" />
      <div className="sheet-trim" aria-hidden="true" />

      <header className="masthead">
        <p className="mh-l">OS Agent</p>
        <p className="mh-r">Field guide · issue {generated}</p>
      </header>

      <main>
        {/* ---- title page ------------------------------------------------ */}
        <section className="title">
          <h1>OS&nbsp;Agent</h1>
          <Note>
            Field guide<br />Issue {generated}<br />
            Appendix&nbsp;A current to {span.to}<br />
            Source: MIT
          </Note>
          <p className="standfirst">
            A background daemon that watches a Windows machine and is permitted to change
            it — set a process priority, kill a process, switch the power plan, restart a
            service, edit the registry. This is the manual: what it does, what stops it,
            and what it has actually done.
          </p>

          <div className="may">
            <div>
              <h3>What it may do</h3>
              <ul>
                <li>Lower a process&rsquo;s priority</li>
                <li>Switch the Windows power plan to match what you&rsquo;re doing</li>
                <li>Trim idle working sets</li>
                <li>Kill a process that is on the profile&rsquo;s kill-candidate list</li>
                <li>Run a command from a narrow allowlist of executables</li>
                <li>Append to its own audit log — always, including dry runs</li>
              </ul>
            </div>
            <div>
              <h3>What it may not</h3>
              <ul>
                <li>Kill anything on the global whitelist — <code>explorer</code>, <code>csrss</code>,
                  <code>winlogon</code>, <code>services</code>, <code>svchost</code>, <code>lsass</code>,
                  <code>dwm</code>, <code>System</code>, <code>smss</code></li>
                <li>Kill a user application that has unsaved state</li>
                <li>Run a shell interpreter — <code>powershell</code> and <code>cmd</code> were
                  removed from the allowlist, not blocklisted</li>
                <li>Approve its own gated actions when running headless</li>
                <li>Acquire privileges it wasn&rsquo;t started with; without admin it fails and says so</li>
                <li>Spend past the daily cost cap</li>
              </ul>
            </div>
          </div>

          <p className="attached">
            It has recorded {int(totals.records)} actions across {span.activeDays} days
            between {longDate(span.from)} and {longDate(span.to)}. They come down to{' '}
            {ledgerRows.length} distinct outcomes, bound in as{' '}
            <a href="#appendix">Appendix&nbsp;A</a> — each one a real dated record, none
            of them paraphrased.
          </p>

          <p className="links">
            <a href={LINKS.github}>Source (MIT)</a>
            <a href={LINKS.ledger}>The ledger itself</a>
            <a href={LINKS.guide}>The manual this page is set from</a>
          </p>
        </section>

        {/* ---- §1 --------------------------------------------------------- */}
        <Clause n="1" title="What it watches">
          <p>
            An observer loop samples the machine on a fixed cadence, with background
            threads beside it for profile detection, Bluetooth, audio suggestions and a
            watchdog — the last two only start if those features are switched on. Each
            signal has a trip threshold and a shared cooldown, so a machine that is
            briefly busy is not a machine in trouble. Every threshold below is read at
            build time from the agent&rsquo;s own <code>config/settings.yaml</code>.
          </p>
          <Note>
            The cooldown is why the ledger has long quiet stretches: a second{' '}
            <code>ram_high</code> inside {settings.cooldown_minutes} minutes is suppressed,
            not acted on twice.
          </Note>

          <table className="spec">
            <caption className="vh">Trip thresholds, read from config/settings.yaml</caption>
            <tbody>
              <tr><th>CPU</th><td>&gt; {settings.cpu_threshold_percent}%</td><td>sustained {settings.cpu_sustained_seconds}s</td></tr>
              <tr><th>RAM</th><td>&gt; {settings.ram_threshold_percent}%</td><td>of total</td></tr>
              <tr><th>Disk</th><td>&gt; {settings.disk_threshold_percent}%</td><td>usage</td></tr>
              <tr><th>GPU</th><td>&gt; {settings.gpu_threshold_percent}%</td><td>utilisation</td></tr>
              <tr><th>Memory leak</th><td>&gt; {settings.memory_leak_growth_mb} MB</td><td>growth in {settings.memory_leak_window_minutes} min</td></tr>
              <tr><th>Cooldown</th><td>{settings.cooldown_minutes} min</td><td>suppresses a repeat of the same anomaly</td></tr>
            </tbody>
          </table>

          <p>It says so itself on the way up:</p>
          <Quoted q={quotes.observer} />
        </Clause>

        {/* ---- §2 --------------------------------------------------------- */}
        <Clause n="2" title="How it decides">
          <p>
            A decision climbs a ladder, cheapest rung first, and most decisions never
            reach the top of it. Config whitelist or blacklist — instant and certain.
            Then the profile&rsquo;s own rules. Then what the machine has learned from
            past fixes. Only a genuinely unknown case reaches a model.
          </p>
          <p>
            When it does, the cheap model goes first. A triage answer below{' '}
            {settings.confidence_threshold} confidence escalates; a stored fix within{' '}
            {settings.similarity_threshold} cosine similarity is replayed instead of
            asking at all.
          </p>
          <Quoted q={quotes.triage} />

          <Box kind="model" title="Spend the cheap oracle first">
            <p>
              Triage with the small model, escalate on low confidence. The ledger says
              this is not theoretical: across {cost.days} days of recorded spend the total
              is {usd(cost.total)}, and the most expensive single day was{' '}
              {usd(cost.max[1])} on {longDate(cost.max[0])}.
            </p>
          </Box>

          <Box kind="war" title="897 wasted calls to diagnose a flaky Bluetooth mouse">
            <p>
              An earlier build escalated every Bluetooth event to the model. One twitchy
              device produced a flood — nearly 900 paid calls to be told, repeatedly, that
              a mouse had disconnected. The fix was not a better prompt. It was not calling
              the model: stricter event classification, and a cooldown.
            </p>
          </Box>

          <p>
            It is also allowed to conclude that there is nothing it can safely do, and
            say so rather than act:
          </p>
          <Quoted q={quotes.advisory} />
        </Clause>

        {/* ---- §3 --------------------------------------------------------- */}
        <Clause n="3" title="What stops it">
          <p>
            Every action carries a risk level, and the gate between deciding and acting
            is <b>fail-closed</b>: with no approval callback and no answer, nothing
            happens. Low risk acts on its own. Medium waits for a person. High is
            refused outright.
          </p>
          <Note>
            &ldquo;Fail-closed&rdquo; is only a claim until you can see it fail. The line
            below is the gate refusing a kill because nobody was at the console.
          </Note>
          <Quoted q={quotes.headless} />
          <p>
            That is the daemon&rsquo;s normal condition — it runs from a logon-triggered
            scheduled task, with no console. Headless, it denies every gated action.
            The cost of that choice is real and is stated in <a href="#s7">§7</a>.
          </p>

          <Box kind="war" title="The gate that was a decoration">
            <p>
              The gate had an ordering bug: it asked &ldquo;is this risk level
              auto-approvable?&rdquo; <i>before</i> it asked &ldquo;is this action
              inherently dangerous?&rdquo; Anything labelled low sailed through — and two
              other bugs forced risky actions to be labelled low. The three most dangerous
              actions never triggered the human prompt, while the documentation claimed
              they always required approval. Two independent controls failing in the same
              direction is not a typo; it is a design that fails open.
            </p>
          </Box>

          <Box kind="war" title="The allowlist with a loaded gun on it">
            <p>
              The command filter allowlisted executables — correct — but{' '}
              <code>powershell.exe</code> and <code>cmd.exe</code> were on the list, with a
              blocklist of frightening substrings behind them. PowerShell is a programming
              language; <code>Remove-Item -Recurse -Force</code> was never on the
              blocklist and never could be, because you cannot enumerate infinity. The fix
              was to take the interpreters off the allowlist.
            </p>
          </Box>

          <Box kind="gotcha" title="Allowlisting a shell is allowlisting everything">
            <p>
              Any general-purpose interpreter — <code>powershell</code>, <code>cmd</code>,{' '}
              <code>python</code>, <code>bash</code>, <code>wmic</code> — can express
              arbitrary behaviour. The only safe primitives are narrow and structured:
              &ldquo;kill this PID&rdquo;, not &ldquo;run this string&rdquo;.
            </p>
          </Box>

          <Box kind="war" title="Auto-disabling the antivirus to boost a framerate">
            <p>
              One profile action fired automatically on game launch and ran{' '}
              <code>Set-MpPreference -DisableRealtimeMonitoring $true</code> — silently
              turning off Defender&rsquo;s real-time protection. No prompt, no undo, no
              audit entry. It was deleted rather than gated. Some capabilities should not
              exist.
            </p>
          </Box>
        </Clause>

        {/* ---- §4 --------------------------------------------------------- */}
        <Clause n="4" title="What it has actually done">
          <p>
            Everything below is counted from the agent&rsquo;s own{' '}
            <code>data/actions.jsonl</code> — all {int(totals.records)} records of it.
          </p>

          <div className="figures">
            <div><b>{int(totals.records)}</b><span>actions recorded</span></div>
            <div><b>{span.activeDays}</b><span>days it did something</span></div>
            <div><b>{int(killLedger.attempted)}</b><span>attempts to kill a process</span></div>
            <div className="fig-hero"><b>{killLedger.allowed}</b><span>of them allowed through</span></div>
          </div>

          <p>
            That last pair is the whole project in two numbers. Of{' '}
            {killLedger.attempted} attempts to kill something,{' '}
            {killLedger.refusedByPolicy} were refused by the agent&rsquo;s own rules and{' '}
            {killLedger.refusedByWindows} were refused by Windows for want of
            administrator rights. These are counted apart on purpose: only the first kind
            is restraint. The second is an access check, and taking credit for it would be
            a lie about which mechanism held.
          </p>

          {oneKill && (
            <>
              <p>One got through, on {longDate(oneKill.ts.slice(0, 10))}:</p>
              <figure className="quote">
                <pre>{`${oneKill.ts.slice(0, 19).replace('T', ' ')}  ${oneKill.action}  risk=${oneKill.risk}
${oneKill.message}
trigger: ${oneKill.summary}   profile: ${oneKill.profile}   took: ${oneKill.ms} ms`}</pre>
                <figcaption>data/actions.jsonl · composed from one record&rsquo;s fields</figcaption>
              </figure>
            </>
          )}

          <p>
            The rest of the time it does the quiet thing instead:{' '}
            {int(priorityLedger.attempted)} priority changes, of which{' '}
            {int(priorityLedger.applied)} applied and {priorityLedger.deniedByWindows}{' '}
            were denied by the OS. Lowering a priority is reversible and kills nothing,
            which is why it is the action it reaches for.
          </p>

          <p>
            Everything it has ever said comes down to {ledgerRows.length} distinct
            outcomes. <a href="#appendix">Appendix&nbsp;A</a> prints all of them, each
            with the date it first happened.
          </p>

          <h3 className="sub">What it spends its time on</h3>
          <p>
            The project started with a game stuttering while a friend&rsquo;s machine ran
            the same game and a dozen tabs without blinking. That is still, by a wide
            margin, what the ledger is mostly about.
          </p>
          <table className="spec procs">
            <caption className="vh">Processes by how many ledger records name them</caption>
            <tbody>
              {processes.slice(0, 8).map((p) => (
                <tr key={p.name}>
                  <th>{p.name}</th>
                  <td className="p-bar"><span style={{ width: `${(p.n / processes[0].n) * 100}%` }} /></td>
                  <td className="p-n">{int(p.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Clause>

        {/* ---- §5 --------------------------------------------------------- */}
        <Clause n="5" title="How it learns, and how that went wrong">
          <p>
            Past fixes are stored as vectors so a recurring problem can be recognised
            when the wording differs, and handled without paying for a model. The saving
            is real. The first implementation of it was also the most dangerous code in
            the project.
          </p>

          <Box kind="war" title="The memory that replayed a rubber stamp">
            <p>
              Reuse looked clever and hid three sins: it <i>forced</i> the risk level to
              low, so the gate waved it through; it re-derived the action by keyword-matching
              stored prose; and it treated a {settings.similarity_threshold} text match as
              proof that two situations were identical. The most frequent path — the cache
              hit — was the least scrutinised one, which is exactly backwards.
            </p>
          </Box>

          <Box kind="war" title="The keyword-matcher that played charades with a shell">
            <p>
              The code took the model&rsquo;s prose and guessed the action by scanning for
              verbs. If the sentence contained none of &ldquo;kill&rdquo;,
              &ldquo;restart&rdquo; or &ldquo;priority&rdquo;, it put{' '}
              <i>the entire English sentence</i> into <code>run_command</code> as though it
              were a shell instruction. Structured output makes that unrepresentable: the
              model picks from a list and supplies a validated integer PID. There is no
              free-text channel left to abuse.
            </p>
          </Box>

          <Box kind="model" title="Give the model a form, not a microphone">
            <p>
              A microphone lets it say anything and leaves you to interpret. A form lets
              it tick boxes you pre-approved and fill fields you type-check.
            </p>
          </Box>

          <Box kind="gotcha" title="Learning bakes in whatever you did, including the mistakes">
            <p>
              A memory of past fixes is a memory of past judgement. If a bad fix is stored
              once, it is replayed every time the problem looks similar enough — and the
              replay path is the one least likely to be watched.
            </p>
          </Box>
        </Clause>

        {/* ---- §6 --------------------------------------------------------- */}
        <Clause n="6" title="The part that is meant to outlive the project">
          <p>
            The safety machinery lives in <code>agentkernel/</code> — risk scoring, the
            approval gate, the command sanitizer, the audit log, the cost ledger, the fix
            memory — as a package that knows nothing about Windows or about this
            application. That is not a convention politely observed. A test walks the
            kernel&rsquo;s imports and fails the build if any of them reach back into the
            app, which is the only version of that promise worth making.
          </p>
          <Note>
            {int(tests)} tests, counted by asking <code>pytest --collect-only</code>, not
            by grepping for <code>def&nbsp;test_</code>.
          </Note>
          <Figure1 />
          <p>
            It was extracted so a second consumer could use it unchanged. That second
            consumer exists and is not wired in yet; see <a href="#s7">§7</a>.
          </p>
        </Clause>

        {/* ---- §7 --------------------------------------------------------- */}
        <Clause n="7" title="What it cannot do">
          <p>
            This section is the point of the document. A manual that only lists
            capabilities is a brochure.
          </p>
          <ul className="limits">
            <li>
              <b>It is one machine, and that machine runs Windows.</b> There is no fleet,
              no server, no second install. The kernel is platform-agnostic; nothing
              above it is.
            </li>
            <li>
              <b>Headless, it approves nothing.</b> Fail-closed is the correct default and
              it is also a real limitation: in its normal running condition every medium-
              and high-risk action is refused, so the gated capabilities are effectively
              unavailable unless you are sitting at a console.
            </li>
            <li>
              <b>It watches the GPU but has never acted on it.</b> The threshold is live —
              <code> gpu_high</code> anomalies are raised and reach the loop — but no GPU
              action appears anywhere in {int(totals.records)} ledger records, and the
              ledger is the only evidence that counts.
            </li>
            <li>
              <b>Every recorded action came from one trigger.</b> All {int(totals.records)}{' '}
              entries are <code>ram_high</code>. The CPU, disk and memory-leak thresholds
              in <a href="#s1">§1</a> are configured and tested; they have not yet fired
              in anger on this machine.
            </li>
            <li>
              <b>Its vocabulary is small.</b> {Object.keys(totals.byAction).length} action
              types appear in the ledger: {Object.keys(totals.byAction).join(' and ')}.
              Restarting a service and editing the registry are implemented and gated, and
              have never run outside tests.
            </li>
            <li>
              <b>The second kernel consumer is not wired in.</b> The boundary was built so
              a separate assistant project could sit on the same substrate. It does not
              yet.
            </li>
            <li>
              <b>Known rough edges, unfixed:</b> a non-recursive glob in the boundary
              check, a non-POSIX <code>basename</code>, a shallow copy of history.
            </li>
          </ul>
        </Clause>

        {/* ---- appendix --------------------------------------------------- */}
        <section className="clause" id="appendix">
          <h2><span className="clause-n">App.&nbsp;A</span><a href="#appendix">The ledger</a></h2>
          <p>
            The {int(totals.records)} records in <code>data/actions.jsonl</code> collapse
            to {ledgerRows.length} distinct outcomes. This is all {ledgerRows.length} of
            them, oldest first, each one the real record of the first time it happened
            and how often it has recurred since. Nothing the agent has ever done is
            missing from this table — only the repetitions are, and those are counted in
            the last column. The whole file is <a href={LINKS.ledger}>one click away</a>.
          </p>
          <p>
            No line is paraphrased. {redactionsShown === 1 ? 'One row reads' : `${redactionsShown} rows read`}{' '}
            <code>[a private app]</code> where a process name is withheld —{' '}
            {redactions} of the {int(totals.records)} records across the whole file. The
            cut is marked so you can see exactly what was taken out, and that nothing
            else was.
          </p>
          <Note>
            Tick a box to filter. The {ledgerRows.length} rows are the complete set of
            outcomes, not a selection I made: group the file by message with the PID
            masked and you get exactly these.
          </Note>
          <Ledger />
        </section>

        {/* ---- colophon --------------------------------------------------- */}
        <section className="colophon" id="colophon">
          <h2>Colophon</h2>
          <p>
            Every line in Appendix A is real and was written by the agent. The
            arrangement is mine: nothing on the owner&rsquo;s own machine prints this
            ledger as a table, or next to the manual — that is this page&rsquo;s doing.
          </p>
          <p>
            Every figure here is computed from that data at build time by{' '}
            <code>src/data/derive.js</code>, so adding a record moves the numbers without
            anyone editing a sentence. The test count comes from{' '}
            <code>pytest --collect-only</code>. The thresholds in §1 are read from{' '}
            <code>config/settings.yaml</code>. Quoted log lines carry the line number they
            came from, and the build fails if a quoted line stops matching the file.
          </p>
          <p>
            Set in Source Serif 4 and IBM Plex Mono. Anything in mono was said by the
            machine; anything in serif was written by a person. Figures last derived{' '}
            {longDate(generated)}.
          </p>
          <p className="links">
            <a href={LINKS.github}>Source (MIT)</a>
            <a href={LINKS.ledger}>data/actions.jsonl</a>
            <a href={LINKS.guide}>docs/OS_Agent_Field_Guide.tex</a>
          </p>
          <p className="sign">Akshit Kartik</p>
        </section>
      </main>
    </>
  )
}
