import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  FiArrowRight, FiGithub, FiBookOpen, FiEye, FiCompass, FiCpu, FiShield, FiZap,
  FiCheckCircle, FiAlertTriangle, FiXCircle, FiLock, FiActivity, FiHardDrive,
} from 'react-icons/fi'

/* ============================================================================
 * OS AGENT — "The Signal Line".
 * One continuous telemetry trace runs the full height of the page and threads
 * every section together. Scroll = time across a live monitor; the narrative is
 * in the SHAPE of the line — calm baseline -> the RAM spike (the problem) ->
 * resolve and settle onto a solid floor (the solution: the trust engineering).
 * Controlled snap scroller + graphite/indigo. No panels, no HUD furniture.
 * ========================================================================== */

const WHEEL_THRESHOLD = 170
const COOLDOWN = 820
const GESTURE_GAP = 260
const TOUCH_THRESHOLD = 55

/* ---- signal geometry ---- */
const SEG = 1000
const LW = 340
const CX = 118
const SPIKE_INDEX = 3            // the "detect" beat — the RAM spike
const clamp01 = (v) => Math.max(0, Math.min(1, v))

function xAt(y, total) {
  // amplitude settles toward the end (the line calms after it's resolved)
  const settleStart = (SPIKE_INDEX + 1) * SEG
  const settleEnd = (total - 0.5) * SEG
  const settle = 1 - 0.62 * clamp01((y - settleStart) / (settleEnd - settleStart))
  const base = CX + (Math.sin(y * 0.009) * 13 + Math.sin(y * 0.031) * 6) * settle
  const sy = (SPIKE_INDEX + 0.5) * SEG
  const d = y - sy
  const spike = Math.exp(-(d * d) / (2 * 32 * 32)) * 184            // the jut
  const ripple = d > 0 ? Math.sin(d * 0.05) * 40 * Math.exp(-d / 240) : 0 // settling
  return base + spike + ripple
}

const LINKS = {
  github: 'https://github.com/AKAAKS/OS_agent',
  docs: 'https://github.com/AKAAKS/OS_agent#readme',
}

/* ---- CountUp ---- */
function CountUp({ value, suffix = '', decimals = 0, duration = 1.3, run }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)
  useEffect(() => {
    if (reduce) { setDisplay(value); return }
    if (!run) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      setDisplay(value * (1 - Math.pow(1 - t, 3)))
      if (t < 1) raf = requestAnimationFrame(tick); else setDisplay(value)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, reduce, value, duration])
  return <span>{display.toFixed(decimals)}{suffix}</span>
}

/* ---- the continuous signal line ---- */
function SignalLine({ active, total }) {
  const H = total * SEG
  const path = useMemo(() => {
    let d = ''
    for (let y = 0; y <= H; y += 18) d += `${y === 0 ? 'M' : 'L'}${xAt(y, total).toFixed(1)} ${y} `
    return d.trim()
  }, [H, total])
  const nodeY = (active + 0.5) * SEG
  const shift = SEG / 2 - nodeY
  const xfrac = xAt(nodeY, total) / LW // 0..1 across the lane width
  return (
    <div className="sig-lane" aria-hidden="true">
      <svg viewBox={`0 0 ${LW} ${SEG}`} preserveAspectRatio="none">
        <g style={{ transform: `translateY(${shift}px)`, transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)' }}>
          <path className="sig-base" d={path} />
          <path className="sig-flow" d={path} />
          {Array.from({ length: total }).map((_, i) => {
            const ny = (i + 0.5) * SEG
            return <circle key={i} className="sig-node" cx={xAt(ny, total)} cy={ny} r={3} />
          })}
        </g>
      </svg>
      {/* active marker — HTML overlay so it stays perfectly round (the SVG is stretched) */}
      <div className="sig-dot" style={{ left: `calc(var(--lane) * ${xfrac.toFixed(4)})` }} />
    </div>
  )
}

/* ---- data ---- */
const SENSES = [
  { k: 'CPU spike', v: '> 95%', n: 'sustained 120s' },
  { k: 'RAM high', v: '> 85%', n: 'of total' },
  { k: 'Disk pressure', v: '> 90%', n: 'usage' },
  { k: 'Memory leak', v: '> 500MB', n: 'growth / 30 min' },
  { k: 'GPU / thermal', v: 'advisory', n: 'it tells you — never auto-acts', adv: true },
  { k: 'Bluetooth', v: 'advisory', n: 'disconnect / pairing patterns', adv: true },
]
const GAUGES = [
  { k: 'CPU', Icon: FiCpu, v: 34 },
  { k: 'RAM', Icon: FiActivity, v: 61 },
  { k: 'DISK', Icon: FiHardDrive, v: 22 },
  { k: 'GPU', Icon: FiZap, v: 48, adv: true },
]
const PROFILES = ['Gaming', 'Coding', 'Streaming', 'Browsing', 'Media', 'Comms', 'Idle']
const DETECT = [
  { Icon: FiEye, k: 'Observe', d: 'RAM trips the threshold at 91.1% (14.01 / 15.37 GB) while the active profile is browsing.', tag: 'ram_high' },
  { Icon: FiCompass, k: 'Orient', d: 'Builds the context a model would see — the top memory consumers, led by firefox.exe (PID 7612).' },
  { Icon: FiCpu, k: 'Decide', d: 'Checks semantic memory before paying for an LLM call. ChromaDB returns a past fix at 0.992 — reuse it, skip gpt-5-mini.', tag: 'memory hit' },
]
const SOLID = [
  '150+ tests across the decision, safety and tooling layers',
  'The kernel’s platform-independence enforced by an AST boundary test',
  'A silently-bypassable gate, caught in review and closed',
  'A headless bug that killed Firefox — now fail-closed by default',
]
const GROWING = [
  'Single-machine, Windows-only for now',
  'Widen the anomaly surface it can act on',
  'Wire the personal assistant in as the kernel’s second consumer',
  'Still early — but what it does, it does carefully',
]

/* ---- right-side readouts ---- */
function IdentityReadout() {
  const rows = [['status', 'live · logon-triggered'], ['loop', 'OODA · LangGraph'], ['threads', '5 + watchdog'], ['language', 'Python 3.11'], ['model', 'gpt-5-mini → gpt-5']]
  return (
    <div className="sig-card">
      <div className="card-bar"><span>daemon</span><span className="live">◉ online</span></div>
      <dl className="sig-kv">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </div>
  )
}
function VitalsReadout({ run }) {
  return (
    <div className="sig-card">
      <div className="card-bar"><span>console</span><span className="muted">sample reading</span></div>
      <div className="sig-gauges">
        {GAUGES.map((g) => (
          <div key={g.k} className={`gauge ${g.adv ? 'adv' : ''}`}>
            <div className="g-top"><span className="g-k"><g.Icon /> {g.k}</span><span className="g-v"><CountUp value={g.v} suffix="%" run={run} /></span></div>
            <div className="g-track"><div className="g-fill" style={{ width: run ? `${g.v}%` : '0%' }} /></div>
          </div>
        ))}
      </div>
      <div className="card-note">GPU &amp; thermal are watched but advisory — reported, never auto-acted on.</div>
    </div>
  )
}
function ProfilesReadout() {
  return (
    <div className="sig-card">
      <div className="card-bar"><span>profile detector</span></div>
      <div className="sig-chips">
        {PROFILES.map((p, i) => <span key={p} className={`chip ${i === 1 ? 'on' : ''}`}>{p}</span>)}
      </div>
      <div className="sig-pipe">
        <span className="k">foreground</span><b>Code.exe</b><span className="arr">→</span>
        <span className="k">profile</span><b>Coding</b><span className="arr">→</span>
        <span className="k">power</span><b>High performance</b>
      </div>
    </div>
  )
}
/* Faithful vector rebuild of the OODA control-loop diagram (was a low-res PNG).
   Inline SVG so it stays crisp at any size. */
const CL_TOP = [
  { t: 'Observer', s: 'psutil + WMI' },
  { t: 'Observe', s: 'anomaly detect' },
  { t: 'Orient', s: 'build context' },
  { t: 'Decide', s: 'plan action' },
  { t: 'HITL', s: 'approve / deny', hex: true },
  { t: 'Act', s: 'execute' },
  { t: 'Verify', s: '→ fix memory' },
]
const CL_KERNEL = [
  { t: 'RiskLevel', s: ['severity model'] },
  { t: 'ApprovalGate', s: ['fail-closed', 'human-in-the-loop'], hi: true },
  { t: 'Command Sanitizer', s: ['allowlist + denylist'] },
  { t: 'Audit log', s: ['every action (JSONL)'] },
  { t: 'Cost ledger', s: ['daily USD cap'] },
  { t: 'Fix memory', s: ['replay past fixes'] },
]
function ControlLoop() {
  const NW = 150, NT = 112, NH = 62, CY = 143
  const nx = (i) => 27 + i * 167.5
  const kx = (i) => 40 + i * 189
  return (
    <figure className="sig-arch">
      <svg className="archsvg" viewBox="0 0 1200 580" role="img"
        aria-label="OS Agent OODA control loop: Observer, Observe, Orient, Decide, a human-in-the-loop approval gate, Act and Verify, looping and running on the agentkernel trust substrate — RiskLevel, ApprovalGate, Command Sanitizer, Audit log, Cost ledger and Fix memory.">
        <defs>
          <marker id="clah" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" className="a-ah" /></marker>
          <marker id="clahd" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" className="a-ahd" /></marker>
        </defs>

        <text x="24" y="22" className="a-title">OODA control loop</text>
        <text x="24" y="40" className="a-sub">Observe → Orient → Decide → Act → Verify · a LangGraph state machine</text>

        <path className="a-loop" markerEnd="url(#clahd)" d="M1107,108 C1107,76 500,66 269.5,90 L269.5,104" />
        <text x="760" y="62" className="a-sub" textAnchor="middle">re-samples every 5–30s</text>

        {CL_TOP.slice(0, -1).map((_, i) => (
          <line key={`c${i}`} className="a-arrow" markerEnd="url(#clah)" x1={nx(i) + NW} y1={CY} x2={nx(i + 1) - 5} y2={CY} />
        ))}

        {CL_TOP.map((n, i) => {
          const x = nx(i), cx = x + NW / 2
          if (n.hex) {
            const pts = `${x},${CY} ${x + 22},${NT} ${x + NW - 22},${NT} ${x + NW},${CY} ${x + NW - 22},${NT + NH} ${x + 22},${NT + NH}`
            return (
              <g key={i}>
                <polygon className="a-hex" points={pts} />
                <text x={cx} y={CY - 3} className="a-nt a-amber" textAnchor="middle">{n.t}</text>
                <text x={cx} y={CY + 13} className="a-ns a-amber" textAnchor="middle">{n.s}</text>
              </g>
            )
          }
          return (
            <g key={i}>
              <rect className="a-node" x={x} y={NT} width={NW} height={NH} rx="7" />
              <text x={cx} y={CY - 3} className="a-nt" textAnchor="middle">{n.t}</text>
              <text x={cx} y={CY + 13} className="a-ns" textAnchor="middle">{n.s}</text>
            </g>
          )
        })}

        <line className="a-arrow" markerEnd="url(#clah)" x1={nx(3) + 75} y1={NT + NH} x2={nx(3) + 75} y2="232" />
        <line className="a-arrow" markerEnd="url(#clah)" x1={nx(5) + 75} y1={NT + NH} x2={nx(5) + 75} y2="232" />

        <rect className="a-node" x="360" y="235" width="362" height="80" rx="7" />
        <text x="376" y="261" className="a-nt" textAnchor="start">Decision engine</text>
        <text x="376" y="283" className="a-ns" textAnchor="start">4-layer: whitelist → blacklist → learned votes → AI</text>
        <text x="376" y="300" className="a-ns" textAnchor="start">LLM triage gpt-5-mini → gpt-5 · ChromaDB memory reuse</text>

        <rect className="a-node" x="760" y="235" width="422" height="80" rx="7" />
        <text x="776" y="261" className="a-nt" textAnchor="start">AgentTools</text>
        <text x="776" y="283" className="a-ns" textAnchor="start">kill · priority · restart · powercfg</text>
        <text x="776" y="300" className="a-ns" textAnchor="start">sanitized run_command (allowlisted)</text>

        <text x="600" y="344" className="a-mid" textAnchor="middle">OS-domain policy (risk map · allowlist) binds to the kernel below</text>

        <rect className="a-kernel-box" x="20" y="362" width="1160" height="200" rx="10" />
        <text x="42" y="391" className="a-kernel">agentkernel</text>
        <text x="156" y="391" className="a-sub">reusable trust substrate — no src/ or platform imports (AST-enforced boundary)</text>

        {CL_KERNEL.map((b, i) => {
          const x = kx(i), cx = x + 87.5
          return (
            <g key={i}>
              <rect className={b.hi ? 'a-kbox-hi' : 'a-kbox'} x={x} y="410" width="175" height="132" rx="7" />
              <text x={cx} y={b.s.length > 1 ? 462 : 470} className={`a-kt${b.hi ? ' a-green' : ''}`} textAnchor="middle">{b.t}</text>
              {b.s.map((line, j) => (
                <text key={j} x={cx} y={(b.s.length > 1 ? 482 : 490) + j * 16} className="a-ks" textAnchor="middle">{line}</text>
              ))}
            </g>
          )
        })}
      </svg>
      <figcaption>built to be lifted into its own repo unchanged — JARVIS is lined up as its second consumer</figcaption>
    </figure>
  )
}

/* Faithful vector rebuild of the real `rich` terminal dashboard — crisp at any
   size, real data from the running tool. (The screenshot it replaces was a
   low-res raster.) */
const TD_METRICS = [
  { k: 'CPU', pct: 96, bar: 'red', pc: 'red' },
  { k: 'RAM', pct: 82, bar: 'warn', pc: 'warn', sub: '13.1 / 16.0 GB' },
  { gap: true },
  { k: 'Disk', pct: 74, bar: 'warn', pc: 'warn' },
  { k: 'GPU', pct: 45, bar: 'warn', pc: 'warn', sub: 'VRAM: 1536 MB' },
]
const TD_PROCS = [
  ['chrome.exe', 7421, 38.4, 2860], ['Code.exe', 10233, 21.7, 1740],
  ['python.exe', 15880, 12.1, 410], ['Discord.exe', 9044, 6.3, 690],
  ['Spotify.exe', 8120, 3.9, 520], ['dwm.exe', 1356, 2.4, 240],
  ['pythonw.exe', 15764, 1.8, 180], ['explorer.exe', 6012, 0.7, 330],
]
const TD_DIAG = [
  ['14:32:07', 'High CPU on chrome.exe', 'Set process priority…', '0.92', 'low', 'green'],
  ['14:21:50', 'RAM pressure at 86%', 'Trim working sets', '0.88', 'low', 'green'],
  ['13:58:12', 'Frequent Bluetooth disco…', 'Disable BT power mgmt', '0.80', 'medium', 'warn'],
  ['11:04:33', 'Unknown high-CPU process', 'Ask user (HITL gate)', '0.61', 'high', 'red'],
]
const cpuClass = (c) => (c >= 30 ? 'red' : c >= 15 ? 'warn' : 'green')
function TermDash() {
  return (
    <div className="sig-dashwrap">
      <div className="td" role="img" aria-label="OS Agent live terminal dashboard showing system metrics, top processes, status, Bluetooth devices and the agent's diagnosis log">
        <div className="td-head"><b>OS&nbsp;Agent</b> — Live Dashboard<span className="c-dim">   Press Ctrl+C to exit</span></div>
        <div className="td-grid">
          <section className="td-panel"><span className="p-title">System Metrics</span>
            {TD_METRICS.map((m, i) => m.gap ? <div key={i} className="m-gap" /> : (
              <div key={i}>
                <div className="m-row">
                  <span className="m-k">{m.k}</span>
                  <span className="m-bar"><span className={`m-fill c-bg-${m.bar}`} style={{ width: `${m.pct}%` }} /></span>
                  <span className={`m-pc c-${m.pc}`}>{m.pct}%</span>
                </div>
                {m.sub && <div className="m-sub">{m.sub}</div>}
              </div>
            ))}
          </section>
          <section className="td-panel"><span className="p-title">Status</span>
            <div className="s-row"><span className="s-k">Profile:</span><span><span className="c-green">●</span> <span className="c-green">Coding</span></span></div>
            <div className="s-sub">↳ Code.exe</div>
            <div className="s-row"><span className="s-k">Power:</span><span><span className="c-amber">⚡</span> <span className="c-amber">Balanced</span></span></div>
            <div className="s-spacer" />
            <div className="s-row"><span className="s-k">Agent:</span><span><span className="c-green">●</span> <span className="c-green">Running</span></span></div>
            <div className="s-row"><span className="s-k">Battery:</span><span className="c-dim">On AC</span></div>
            <div className="s-row"><span className="s-k">Polling:</span><span><span className="c-blue">AC (normal)</span> — every 5s</span></div>
            <div className="s-row"><span className="s-k">Cores:</span><span><span className="c-blue">16</span> logical</span></div>
          </section>
          <section className="td-panel"><span className="p-title">Top Processes</span>
            <div className="t-row t-head"><span>Process</span><span>PID</span><span>CPU%</span><span>RAM MB</span></div>
            {TD_PROCS.map((p) => (
              <div key={p[0]} className="t-row">
                <span>{p[0]}</span><span className="c-dim">{p[1]}</span>
                <span className={`c-${cpuClass(p[2])}`}>{p[2].toFixed(1)}</span><span className="c-dim">{p[3]}</span>
              </div>
            ))}
          </section>
          <section className="td-panel"><span className="p-title">Bluetooth</span>
            <div className="bt-row"><span className="c-green">●</span> Headphones</div>
            <div className="bt-row"><span className="c-green">●</span> Wireless Mouse</div>
            <div className="bt-row"><span className="c-green">●</span> Phone</div>
          </section>
        </div>
        <section className="td-panel td-diag"><span className="p-title">Agent Diagnosis</span>
          <div className="d-row d-head"><span>Time</span><span>Issue</span><span>Fix</span><span>Conf</span><span>Risk</span></div>
          {TD_DIAG.map((d) => (
            <div key={d[0]} className="d-row">
              <span className="c-dim">{d[0]}</span><span>{d[1]}</span><span className="c-dim">{d[2]}</span>
              <span>{d[3]}</span><span className={`c-${d[5]}`}>{d[4]}</span>
            </div>
          ))}
        </section>
        <div className="td-foot">next snapshot in 7m 3s │ high-risk = immediate</div>
      </div>
      <div className="sig-shotcap">the live dashboard · rich TUI</div>
    </div>
  )
}
function GateReadout() {
  const [decided, setDecided] = useState(null)
  return (
    <div className="sig-card gate">
      <div className="card-bar"><span>approval gate</span><span className="risk med">risk: medium</span></div>
      <pre className="gate-json">{`restart_service("wuauserv")
reason: wedged at 100% disk, 8 min
profile: coding · interrupts a download`}</pre>
      {!decided ? (
        <div className="gate-actions">
          <button className="g-btn ok" onClick={() => setDecided('approve')}><FiCheckCircle /> Approve</button>
          <button className="g-btn no" onClick={() => setDecided('deny')}><FiXCircle /> Deny</button>
        </div>
      ) : (
        <div className={`gate-out ${decided}`}>
          {decided === 'approve'
            ? <><FiCheckCircle /> Executed · logged to the audit trail · outcome stored to memory.</>
            : <><FiXCircle /> Denied · logged. In headless mode this is automatic — the gate is fail-closed.</>}
          <button className="relink" onClick={() => setDecided(null)}>reset</button>
        </div>
      )}
      <div className="gate-ladder">
        <span className="rl ok"><FiCheckCircle /> low · auto</span>
        <span className="rl med"><FiAlertTriangle /> medium · asks you</span>
        <span className="rl high"><FiLock /> high · denied</span>
      </div>
    </div>
  )
}

/* ---- section wrapper (drives active state) ---- */
function Section({ index, active, setActive, wide, contentClass = '', children }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio >= 0.55) setActive(index) }),
      { threshold: [0.55] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [index, setActive])
  return (
    <section ref={ref} className={`sig-sec ${index === active ? 'on' : ''}`}>
      <div className={`sig-content ${wide ? 'wide' : ''} ${contentClass}`}>{children}</div>
    </section>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const scrollerRef = useRef(null)
  const goToRef = useRef(null)

  const beats = useMemo(() => ([
    { label: 'ONLINE' }, { label: '01 · OBSERVE' }, { label: '02 · ADAPT' },
    { label: '03 · DETECT' }, { label: '04 · ACT, SAFELY' }, { label: '05 · THE KERNEL' },
    { label: 'STATE' }, { label: 'OPEN' },
  ]), [])
  const total = beats.length

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    let idx = 0, acc = 0, last = 0, cooling = false, cd
    const go = (next) => {
      const clamped = Math.max(0, Math.min(total - 1, next))
      acc = 0
      if (clamped === idx) return
      idx = clamped
      const secs = el.querySelectorAll('.sig-sec')
      const top = secs[idx] ? secs[idx].offsetTop : idx * window.innerHeight
      el.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
      cooling = true; clearTimeout(cd); cd = setTimeout(() => { cooling = false }, COOLDOWN)
    }
    goToRef.current = go
    const onKey = (e) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(idx + 1) }
      else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(idx - 1) }
      else if (e.key === 'Home') { e.preventDefault(); go(0) }
      else if (e.key === 'End') { e.preventDefault(); go(total - 1) }
    }
    window.addEventListener('keydown', onKey)
    let onWheel, onTS, onTE, touchY = 0, touchBody = null
    if (!reduce) {
      onWheel = (e) => {
        e.preventDefault()
        if (cooling) return
        const now = Date.now()
        if (now - last > GESTURE_GAP) acc = 0
        last = now
        if ((acc > 0 && e.deltaY < 0) || (acc < 0 && e.deltaY > 0)) acc = 0
        acc += e.deltaY
        if (acc > WHEEL_THRESHOLD) go(idx + 1)
        else if (acc < -WHEEL_THRESHOLD) go(idx - 1)
      }
      onTS = (e) => { touchY = e.touches[0].clientY; touchBody = e.target.closest ? e.target.closest('.sig-scrollable') : null }
      onTE = (e) => {
        if (cooling) return
        const dy = touchY - e.changedTouches[0].clientY
        if (Math.abs(dy) < TOUCH_THRESHOLD) return
        const b = touchBody
        if (b && b.scrollHeight > b.clientHeight + 2) {
          const atTop = b.scrollTop <= 2
          const atBottom = b.scrollTop + b.clientHeight >= b.scrollHeight - 2
          if (dy > 0 && !atBottom) return
          if (dy < 0 && !atTop) return
        }
        go(idx + (dy > 0 ? 1 : -1))
      }
      el.addEventListener('wheel', onWheel, { passive: false })
      el.addEventListener('touchstart', onTS, { passive: true })
      el.addEventListener('touchend', onTE, { passive: true })
    }
    return () => {
      window.removeEventListener('keydown', onKey)
      if (onWheel) { el.removeEventListener('wheel', onWheel); el.removeEventListener('touchstart', onTS); el.removeEventListener('touchend', onTE) }
      clearTimeout(cd); goToRef.current = null
    }
  }, [reduce, total])

  return (
    <div className="sig" ref={scrollerRef}>
      <div className="sig-field" aria-hidden="true" />
      <SignalLine active={active} total={total} />

      <header className="sig-top">
        <span className="brand">OS&nbsp;AGENT</span>
        <span className="sub">self-optimizing daemon</span>
        <a className="top-link" href={LINKS.github} target="_blank" rel="noreferrer"><FiGithub /> source</a>
      </header>

      {/* 00 — intro */}
      <Section index={0} active={active} setActive={setActive}>
        <div className="sig-main">
          <div className="sig-eyebrow">a Windows system agent</div>
          <h1 className="sig-h1">Your machine, watched by<br />something that <span className="g">asks first.</span></h1>
          <p>It started with Valorant stuttering while a friend's PC ran the same game, Spotify and a dozen tabs without blinking. Hardware aside, the real friction was <em>me</em> — hand-picking power presets and re-tuning them every time my usage shifted.</p>
          <p>OS Agent watches how I actually use the machine and adapts on its own. It can kill processes, restart services and touch the registry — so the harder half of the project is making sure it <span className="g">never acts without earning the right to.</span></p>
          <div className="sig-cta">
            <button className="sig-btn" onClick={() => goToRef.current?.(1)}>Follow the signal <FiArrowRight /></button>
            <a className="sig-btn ghost" href={LINKS.github} target="_blank" rel="noreferrer"><FiGithub /> View source</a>
          </div>
        </div>
        <div className="sig-aside"><IdentityReadout /></div>
      </Section>

      {/* 01 — watch */}
      <Section index={1} active={active} setActive={setActive}>
        <div className="sig-main">
          <div className="sig-eyebrow">01 · observe</div>
          <h2 className="sig-h2">It watches everything, all the time.</h2>
          <p>Five daemon threads sample the machine every 5s on AC, 30s on battery. Each signal has a trip threshold and a cooldown, so it reacts to real trouble — not noise.</p>
          <ul className="sig-senses">
            {SENSES.map((s) => (
              <li key={s.k} className={s.adv ? 'adv' : ''}>
                <span className="k">{s.k}</span><span className="v">{s.v}</span><span className="n">{s.n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="sig-aside"><VitalsReadout run={active === 1} /></div>
      </Section>

      {/* 02 — adapts */}
      <Section index={2} active={active} setActive={setActive}>
        <div className="sig-main">
          <div className="sig-eyebrow">02 · adapt</div>
          <h2 className="sig-h2">It adapts to how you're using it.</h2>
          <p>It reads the foreground app and picks a profile, then switches the Windows power plan to match — debounced so an alt-tab doesn't thrash it. <span className="g">No more hand-picking presets, no more stale ones.</span></p>
          <p>Gaming leans into performance; idle and battery wind things down. The profile it's in also shapes which processes it's even willing to touch.</p>
        </div>
        <div className="sig-aside"><ProfilesReadout /></div>
      </Section>

      {/* 03 — detect (the spike) */}
      <Section index={3} active={active} setActive={setActive}>
        <div className="sig-main">
          <div className="sig-eyebrow">03 · detect</div>
          <h2 className="sig-h2">Then RAM hits <span className="g"><CountUp value={91} suffix="%" run={active === 3} /></span>.</h2>
          <p>Pulled from the agent's own logs. It sees the spike, works out the cause, and checks what it already knows — before spending a cent on a model:</p>
          <ol className="sig-run">
            {DETECT.map((r) => (
              <li key={r.k}>
                <span className="st-ico"><r.Icon /></span>
                <div><div className="st-k">{r.k}{r.tag && <span className="st-tag">{r.tag}</span>}</div><p>{r.d}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="sig-aside"><TermDash /></div>
      </Section>

      {/* 04 — act, safely (the solution begins) */}
      <Section index={4} active={active} setActive={setActive}>
        <div className="sig-main">
          <div className="sig-eyebrow">04 · act, safely</div>
          <h2 className="sig-h2">Nothing risky happens without a <span className="g">yes</span>.</h2>
          <p>A daemon that can kill processes, restart services and touch the registry has to be trustworthy first. Every action carries a risk level and the gate is <b>fail-closed</b> — no callback, no approval, no action.</p>
          <p>This fix is low-risk, so it acts on its own: sets firefox.exe to low priority in 0 ms, never killing it (browsers are on a never-kill list). Then it writes the outcome to an append-only audit log and back to memory — so the next identical spike is handled instantly. Anything riskier waits for you.</p>
        </div>
        <div className="sig-aside"><GateReadout /></div>
      </Section>

      {/* 05 — the kernel */}
      <Section index={5} active={active} setActive={setActive} wide contentClass="sig-arch-sec">
        <div className="sig-arch-head">
          <div className="sig-eyebrow">05 · the kernel</div>
          <h2 className="sig-h2">The part I'm proudest of: a <span className="g">trust vault</span>.</h2>
          <p>The safety machinery lives in <code>agentkernel/</code> — a platform-agnostic trust substrate with zero dependency on the Windows code, enforced by an AST boundary test. The whole loop runs on top of it.</p>
        </div>
        <ControlLoop />
      </Section>

      {/* 06 — honest state */}
      <Section index={6} active={active} setActive={setActive} wide>
        <div className="sig-state-head">
          <div className="sig-eyebrow">the honest part</div>
          <h2 className="sig-h2">What's solid, and what's still growing.</h2>
        </div>
        <div className="sig-state">
          <div className="st-col solid">
            <div className="col-h"><FiCheckCircle /> solid</div>
            <ul>{SOLID.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div className="st-col growing">
            <div className="col-h"><FiArrowRight /> growing</div>
            <ul>{GROWING.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
      </Section>

      {/* 07 — open */}
      <Section index={7} active={active} setActive={setActive}>
        <div className="sig-main">
          <div className="sig-eyebrow">open the daemon</div>
          <h2 className="sig-h2">It runs on my machine right now.<br />The code's all <span className="g">here.</span></h2>
          <p>Public and MIT-licensed. Some actions need admin and fail gracefully without it — the agent never escalates on its own. Clone it and read every decision it's allowed to make.</p>
          <div className="sig-cta">
            <a className="sig-btn" href={LINKS.github} target="_blank" rel="noreferrer"><FiGithub /> View on GitHub</a>
            <a className="sig-btn ghost" href={LINKS.docs} target="_blank" rel="noreferrer"><FiBookOpen /> Architecture docs</a>
          </div>
          <div className="sig-sign">Akshit Kartik · {new Date().getFullYear()}</div>
        </div>
        <div className="sig-aside"><IdentityReadout /></div>
      </Section>

      <footer className="sig-bottom">
        <span className="live"><FiShield /> asks before acting</span>
        <span className="lbl">{beats[active].label}</span>
        <span className="r">{String(active + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      </footer>
      <div className="sig-hint">scroll · ↑ ↓</div>
    </div>
  )
}
