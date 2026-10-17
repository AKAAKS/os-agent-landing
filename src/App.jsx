import { useEffect, useRef, useState } from 'react'
import {
  FiGithub, FiBookOpen, FiActivity, FiCpu, FiShield, FiLayers,
  FiEye, FiCompass, FiZap, FiCheckCircle, FiArrowRight, FiArrowDown,
  FiDatabase, FiTerminal, FiAlertTriangle, FiXCircle, FiLock,
} from 'react-icons/fi'

/* -----------------------------------------------------------------------------
 *  EDIT ME. Copy and links. Repo/docs are private for now, so they point at '#'.
 *  Everything below is drawn from the agent's own logs/agent.log,
 *  data/actions.jsonl, ARCHITECTURE.md and CHANGELOG.md.
 * -------------------------------------------------------------------------- */
// NOTE: AKAAKS/OS_agent must be made public for these links to resolve.
const LINKS = {
  github: 'https://github.com/AKAAKS/OS_agent',
  docs: 'https://github.com/AKAAKS/OS_agent#readme',
}

/* ---- Live monitor replay (condensed from a real afternoon of agent.log) ---- */
const FEED = [
  { ram: 41, profile: 'idle', power: 'power_saver', line: 'profile idle · power plan → power_saver', kind: 'power' },
  { ram: 44, profile: 'idle', power: 'power_saver', line: 'watchdog: 5 worker threads healthy', kind: 'ok' },
  { ram: 58, profile: 'browsing', power: 'power_saver', line: 'profile switched: idle → browsing (stable 10s)', kind: 'profile' },
  { ram: 67, profile: 'browsing', power: 'balanced', line: 'power plan → balanced (browsing stable 120s)', kind: 'power' },
  { ram: 82, profile: 'browsing', power: 'balanced', line: 'observer: RAM 82% (12.6/15.37 GB)', kind: 'obs' },
  { ram: 91, profile: 'browsing', power: 'balanced', line: 'anomaly detected: ram_high · RAM 91.1%', kind: 'warn' },
  { ram: 91, profile: 'browsing', power: 'balanced', line: 'ChromaDB: found similar fix (similarity 1.000)', kind: 'mem' },
  { ram: 91, profile: 'browsing', power: 'balanced', line: 'memory hit → reuse action set_priority', kind: 'mem' },
  { ram: 74, profile: 'browsing', power: 'balanced', line: 'set firefox.exe (PID 7612) priority → low  ✓', kind: 'act' },
  { ram: 70, profile: 'browsing', power: 'balanced', line: 'verify ok · outcome stored to semantic memory', kind: 'ok' },
]

function LiveMonitor() {
  const [i, setI] = useState(0)
  const [log, setLog] = useState([FEED[0]])
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setLog(FEED.slice(-6)); setI(FEED.length - 1); return }
    const id = setInterval(() => {
      setI((p) => {
        const n = (p + 1) % FEED.length
        setLog((l) => [...l.slice(-5), FEED[n]])
        return n
      })
    }, 1500)
    return () => clearInterval(id)
  }, [])
  const cur = FEED[i]
  const ramClass = cur.ram >= 85 ? 'hot' : cur.ram >= 65 ? 'warm' : 'cool'
  return (
    <div className="monitor">
      <div className="mon-bar">
        <span className="mon-dot" /> os-agent · live
        <span className="mon-prof">profile: <b>{cur.profile}</b></span>
        <span className="mon-prof">power: <b>{cur.power}</b></span>
      </div>
      <div className="mon-gauges">
        <div className="gauge">
          <div className="gauge-top"><span>RAM</span><span className={`gauge-val ${ramClass}`}>{cur.ram}%</span></div>
          <div className="gauge-track"><div className={`gauge-fill ${ramClass}`} style={{ width: `${cur.ram}%` }} /></div>
        </div>
      </div>
      <div className="mon-feed">
        {log.map((e, idx) => (
          <div className={`feed-line ${e.kind}`} key={idx}>
            <span className="feed-k">{e.kind}</span> {e.line}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- Real optimization run (data/actions.jsonl @ 2026-10-17 14:46) ---- */
const RUN = [
  { Icon: FiEye, k: 'Observe', d: 'SystemObserver samples RAM via psutil and trips a threshold: RAM at 91.1% (14.01 / 15.37 GB), active profile browsing.', tag: 'ram_high' },
  { Icon: FiCompass, k: 'Orient', d: 'Builds the context the model would see: the top memory consumers, led by firefox.exe (PID 7612).' },
  { Icon: FiCpu, k: 'Decide', d: 'Before paying for an LLM call, it checks semantic memory. ChromaDB returns a past fix at similarity 0.992 → reuse the learned action instead of asking gpt-5-mini.', tag: 'memory hit' },
  { Icon: FiShield, k: 'Gate', d: 'Action risk = low → auto-approved by the ApprovalGate. (A medium or high-risk action would pause for you, or be denied outright in headless mode.)', tag: 'risk: low' },
  { Icon: FiZap, k: 'Act', d: 'Sets firefox.exe (PID 7612) priority to low in 0 ms. It never kills your browser; firefox is on the _NEVER_KILL_USER_APPS list, so it only deprioritizes.', tag: 'set_priority' },
  { Icon: FiCheckCircle, k: 'Verify', d: 'Success recorded to data/actions.jsonl and the outcome stored back to semantic memory, so the next spike is handled instantly.' },
]

/* ---- OODA architecture ---- */
const OODA = [
  { Icon: FiEye, k: 'Observe', d: 'psutil snapshots of CPU/RAM/disk/GPU every 5s (AC) or 30s (battery); emits an ObservationEvent on a threshold breach, with cooldown to suppress duplicates.' },
  { Icon: FiCompass, k: 'Orient', d: 'Compiles a dense, factual context block (active profile, top processes, memory consumers). That block is the only thing the model sees.' },
  { Icon: FiCpu, k: 'Decide', d: '4-layer precedence: decision engine (whitelist → blacklist → learned votes) → ChromaDB semantic reuse → LLM triage (gpt-5-mini, escalates to gpt-5) → rule-based.' },
  { Icon: FiZap, k: 'Act', d: 'Dispatches an allowlisted, sanitized tool: set priority, kill, restart a service, powercfg. --dry-run audits the intent without executing, and every action is appended to actions.jsonl.' },
  { Icon: FiCheckCircle, k: 'Verify', d: 'Success → store the fix to semantic memory for future reuse. Failure → log it and raise a Windows toast.' },
]

/* ---- Build log (from CHANGELOG.md + agent.log) ---- */
const BUILDLOG = [
  { s: '✓', c: 'kernel', t: 'extracted agentkernel/: fail-closed gate, sanitizer, audit, cost ledger, fix-memory; platform-free, AST-enforced boundary · 153 tests' },
  { s: '+', c: 'safety', t: '_NEVER_KILL_USER_APPS blocklist: stop killing firefox.exe unprompted (browsers, Office, editors, IDEs)' },
  { s: '~', c: 'noise', t: 'bluetooth LLM spam cut: 897 wasted calls → stricter classification + 30-min cooldown' },
  { s: '+', c: 'safety', t: '--dry-run mode: full OODA loop runs and audits, nothing executes' },
  { s: '+', c: 'cost', t: 'persistent daily cost ledger (data/cost_ledger.json) + session cap, model-aware pricing' },
  { s: '+', c: 'ui', t: 'PyQt6 system-tray GUI: status + 4-tab window (cost, actions, crashes, settings)' },
  { s: '~', c: 'tune', t: 'fixed profile flip-flop on alt-tab with asymmetric debounce (browsing 20→45s)' },
  { s: '~', c: 'model', t: 'complex_model upgraded gpt-5-mini → gpt-5; triage stays mini' },
  { s: '+', c: 'reliability', t: 'local crash reporter → logs/crashes/*.json, zero network egress; SIGTERM/SIGBREAK clean shutdown' },
]

function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const els = ref.current?.querySelectorAll('[data-reveal]') || []
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

function ApprovalCard() {
  const [decided, setDecided] = useState(null)
  return (
    <div className="approve">
      <div className="approve-head">
        <span className="approve-ico"><FiAlertTriangle /></span>
        <div>
          <div className="approve-title">Approval required</div>
          <div className="approve-sub">OODA · Decide → Gate</div>
        </div>
        <span className="risk-badge medium">risk: medium</span>
      </div>
      <pre className="approve-json">{`restart_service(name="wuauserv")   # Windows Update
reason: service wedged at 100% disk for 8 min
profile: coding · would interrupt an active download`}</pre>

      {!decided && (
        <div className="approve-actions">
          <button className="btn btn-accent" onClick={() => setDecided('approve')}><FiCheckCircle /> Approve</button>
          <button className="btn btn-ghost" onClick={() => setDecided('deny')}><FiXCircle /> Deny</button>
        </div>
      )}
      {decided === 'approve' && (
        <div className="approve-out ok">
          <FiCheckCircle /> Executed · appended to <code>data/actions.jsonl</code> · outcome stored to semantic memory.
        </div>
      )}
      {decided === 'deny' && (
        <div className="approve-out no">
          <FiXCircle /> Denied · logged. In headless/daemon mode this is <b>automatic</b>; the gate is fail-closed.
          <button className="relink" onClick={() => setDecided(null)}>reset</button>
        </div>
      )}
      {decided === 'approve' && <button className="relink" onClick={() => setDecided(null)}>reset</button>}

      <div className="risk-ladder">
        <span className="rl low"><FiCheckCircle /> low · auto-approved</span>
        <span className="rl med"><FiAlertTriangle /> medium · asks you</span>
        <span className="rl high"><FiLock /> high · always denied</span>
      </div>
    </div>
  )
}

export default function App() {
  const ref = useReveal()
  return (
    <div ref={ref}>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-scan" aria-hidden="true" />
      <header className="nav">
        <div className="container nav-inner">
          <a className="brand" href="#top"><span className="brand-mark"><FiTerminal /></span> OS&nbsp;Agent</a>
          <nav className="nav-links">
            <a href="#run">A real run</a>
            <a href="#arch">Architecture</a>
            <a href="#trust">Trust</a>
            <a href="#log">Build log</a>
          </nav>
          <a className="btn btn-dark" href={LINKS.github} target="_blank" rel="noreferrer"><FiGithub /> GitHub</a>
        </div>
      </header>

      {/* HERO (live monitor) */}
      <section className="hero" id="top">
        <div className="container hero-grid">
          <div data-reveal>
            <span className="pill"><FiActivity /> Running on this machine right now</span>
            <h1 className="hero-h1">Windows that<br /><span className="grad">watches itself.</span></h1>
            <p className="hero-sub">
              OS Agent is an OODA-loop daemon I run on my own PC. It samples the system every few
              seconds, shifts power plans to match what I’m doing, and when memory or CPU spikes it
              reuses a learned fix (or asks a model), then acts behind a fail-closed approval gate.
              The panel beside this is a replay of a real afternoon from its log.
            </p>
            <div className="cta-row">
              <a className="btn btn-accent" href="#run"><FiArrowDown /> See a real run</a>
              <a className="btn btn-ghost" href={LINKS.github} target="_blank" rel="noreferrer"><FiGithub /> View on GitHub</a>
            </div>
            <div className="stack">
              {['Python', 'LangGraph OODA', 'psutil', 'ChromaDB memory', 'PyQt6 tray', '163 tests'].map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          </div>
          <div className="hero-visual" data-reveal><LiveMonitor /></div>
        </div>
      </section>

      {/* REAL RUN */}
      <section className="section alt" id="run">
        <div className="container">
          <div className="section-head" data-reveal>
            <h2 className="section-title">A real optimization run</h2>
            <p className="section-sub">
              Pulled straight from <code>actions.jsonl</code> and <code>agent.log</code> on 2026-10-17.
              RAM hit 91% while browsing. Here’s every step the agent took.
            </p>
          </div>
          <div className="run">
            {RUN.map((r, i) => (
              <div className="run-step" data-reveal style={{ transitionDelay: `${i * 50}ms` }} key={r.k}>
                <div className="run-rail">
                  <span className="run-ico"><r.Icon /></span>
                  {i < RUN.length - 1 && <span className="run-line" />}
                </div>
                <div className="run-body">
                  <div className="run-k">{r.k}{r.tag && <span className="run-tag">{r.tag}</span>}</div>
                  <p>{r.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section className="section" id="arch">
        <div className="container">
          <div className="section-head" data-reveal>
            <h2 className="section-title">The OODA loop</h2>
            <p className="section-sub">
              Observe → Orient → Decide → Act → Verify, as a LangGraph state machine. Five daemon
              threads keep it alive; a watchdog restarts any that die.
            </p>
          </div>
          <div className="ooda">
            {OODA.map((o, i) => (
              <div className="ooda-node" data-reveal style={{ transitionDelay: `${i * 50}ms` }} key={o.k}>
                <div className="ooda-top"><span className="ooda-ico"><o.Icon /></span><span className="ooda-k">{o.k}</span></div>
                <p>{o.d}</p>
                {i < OODA.length - 1 && <span className="ooda-arrow"><FiArrowRight /></span>}
              </div>
            ))}
          </div>

          <div className="kernel" data-reveal>
            <span className="kernel-ico"><FiLayers /></span>
            <div>
              <div className="kernel-title"><code>agentkernel/</code> · the trust substrate</div>
              <p>
                Risk model, fail-closed <b>ApprovalGate</b>, <b>CommandSanitizer</b>, audit log, cost ledger
                and semantic fix-memory live in a package with <b>zero dependency on <code>src/</code> or any
                platform library</b> (enforced by an AST boundary test), so it can be reused by another agent
                or lifted into its own repo untouched.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / APPROVAL */}
      <section className="section alt" id="trust">
        <div className="container trust-grid">
          <div data-reveal>
            <h2 className="section-title">Nothing risky happens without a yes</h2>
            <p className="section-sub">
              A daemon that can kill processes, restart services and touch the registry has to be
              trustworthy first. Every action carries a risk level; the gate is <b>fail-closed</b>.
              Try it: approve or deny a real gated action.
            </p>
            <ul className="trust-list">
              <li><FiCheckCircle /> Low-risk fixes (like deprioritizing) auto-approve.</li>
              <li><FiAlertTriangle /> Medium-risk pauses for you; headless mode denies it.</li>
              <li><FiLock /> High-risk is always denied, with no override.</li>
              <li><FiShield /> Shell interpreters &amp; mutating admin tools are off the allowlist; a restore point precedes any registry change.</li>
            </ul>
          </div>
          <div data-reveal><ApprovalCard /></div>
        </div>
      </section>

      {/* BUILD LOG */}
      <section className="section" id="log">
        <div className="container">
          <div className="section-head" data-reveal>
            <h2 className="section-title">Build log</h2>
            <p className="section-sub">Real entries from the changelog and the agent’s own logs.</p>
          </div>
          <div className="buildlog" data-reveal>
            <div className="code-bar"><span /><span /><span /> CHANGELOG (tail)</div>
            <div className="bl-body">
              {BUILDLOG.map((b, i) => (
                <div className="bl-line" key={i}>
                  <span className={`bl-s s-${b.s === '+' ? 'add' : b.s === '-' ? 'del' : b.s === '✓' ? 'done' : 'chg'}`}>{b.s}</span>
                  <span className="bl-c">{b.c}</span>
                  <span className="bl-t">{b.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="cta-row" style={{ justifyContent: 'center', marginTop: 28 }} data-reveal>
            <a className="btn btn-accent" href={LINKS.github} target="_blank" rel="noreferrer"><FiGithub /> View on GitHub</a>
            <a className="btn btn-ghost" href={LINKS.docs} target="_blank" rel="noreferrer"><FiBookOpen /> Architecture docs</a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <span><FiTerminal /> OS Agent</span>
          <span>Built by Akshit Kartik · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
