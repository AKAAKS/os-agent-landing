# os-agent-landing

The landing page for [OS Agent](https://github.com/AKAAKS/OS_agent), built as
**a field guide**: a printed technical manual for a machine that has been given
authority over a computer, with that machine's own audit ledger bound in as
Appendix A.

```bash
npm install
npm run data      # rebuild src/data/ledger.json from ../OS_agent
npm run scan      # redaction scan — must pass before publishing
npm run dev
npm run build
npm run measure   # eight viewport sizes: overflow, contrast, centring, the filter
npm run og        # re-photograph the page for the social card
```

---

## What the page is

The conceit was not invented. The source repo contains
`docs/OS_Agent_Field_Guide.tex`, a 795-line LaTeX manual with exactly the
callout types this page uses — **Concept**, **Mental model**, **Gotcha**,
**War story**. The page renders that document's vocabulary. It also contains
`data/actions.jsonl`, an append-only audit trail; that file *is* Appendix A.

Three questions the conceit was not designed for, and the answers it gives:

### The measure is centred, not the block

The text column sits in the middle of the viewport; the marginal column hangs
off its left into the gutter. Centring the *block* (margin + measure) is the
obvious thing and it was wrong: there are four marginal notes in the whole
document, so that column is empty nearly everywhere and the measure read as
shoved to the right.

The marginal column can only exist *and* leave the measure centred when the
viewport is at least `--maxw + 2 x (--col + --gut)` = 624 + 2 x 292 = **1208px**.
Below that it folds inline — that is what the `75.5rem` breakpoint is, and it is
derived. `npm run measure` asserts the measure's centre is within 1px of the
viewport's at every size.

### The sheet

The ground was flat cream and read as unfinished. Everything added is real
furniture of a printed sheet and nothing else qualifies: the stock has **tooth**
(tiled `feTurbulence` at 5%), the marginal column is **ruled**, and the sheet
carries **trim marks** at its four corners. No gradient, no shadow, no glow —
those would be a photograph of paper rather than paper.

| Question | A manual answers |
|---|---|
| What is the hero? | A title page: the name, the issue date, and two facing columns — what it may do, what it may not. It carries content, so it is not a splash. |
| What is a card? | A boxed callout of one of exactly four types the source document defines. There is no fifth. |
| Dark mode? | A manual is printed. Light only, declared in `<meta name="color-scheme">`. |
| What does scroll do? | Turns pages. Nothing else — no hijack, no snap, no reveal. |

### Anti-goals

These mean the rebuild failed, **even if the page ships**:

- A number typed by hand instead of derived from the data.
- A log line paraphrased, or a cut that does not show.
- A colour whose role cannot be named — it is either one of the four callout
  rules the source document defines, or a verdict the agent itself recorded.
- Scroll hijacked, rate-limited, or made to reveal content.
- A reader who flicks to the bottom in four seconds getting nothing.
- Any claim about the agent's behaviour that is not checkable from a file in
  this repo or the source repo.

That third one is load-bearing. When this page looks flat, the lazy fix — add
an accent — is already forbidden, which forces the real diagnosis. The last
time that happened the answer was body-copy contrast, not the background.

---

## Numbers

**Nothing on the page types a count.** `src/data/derive.js` computes every
figure from `src/data/ledger.json`, which `scripts/extract.mjs` builds from the
agent's own files. Add a record to the agent's ledger, run `npm run data`, and
every number on the page moves by itself.

| Figure | Where it comes from |
|---|---|
| 564 actions, 81 active days, the date span | `data/actions.jsonl`, counted |
| 37 kill attempts / 1 allowed / 32 refused / 4 denied | same file, partitioned by `action`, `success` and the message prefix |
| The 20 distinct outcomes, their first dates and recurrence counts | messages with the PID masked, grouped |
| Thresholds in §1 | parsed from `config/settings.yaml` at build time |
| Test count | `python -m pytest --collect-only -q`, **asked of pytest** |
| Cost total and worst day | `data/cost_ledger.json` |

### Do not re-derive these the easy wrong way

- **Test count.** Do not grep for `def test_`. It counts helpers, parametrised
  cases and commented-out tests. Ask pytest.
- **Refusals.** "Refused" (the agent's own policy) and "Access denied"
  (Windows) are counted **separately** and must stay separate. Collapsing them
  credits the agent with restraint that was really an access check.
- **The date span.** The ledger covers 81 *separate* days across seven months.
  Rendering it as a continuous period would overstate how long the daemon has
  been running. `derive.js` emits dates and a day count, never a duration.

---

## Redaction

Real logs carry real process names. `scripts/extract.mjs` holds a **fail-closed
allowlist**: a process name not on `PUBLIC_PROCESSES` is replaced with
`[a private app]`. The cut is marked, never silent and never swapped for a
plausible substitute, so a reader can see exactly what was taken out and that
nothing else was.

Adding a name to that allowlist is a decision to publish it. The extractor
prints every name it withheld so the list can be reviewed.

**Re-run on every content change:**

```bash
npm run data && npm run build && npm run scan
```

`scripts/redact-scan.mjs` scans `src/`, `scripts/`, `index.html` **and
`dist/`** — the thing you publish is the build — and exits non-zero on a hit.
Currently withheld: `FindTheNeedle.exe`, `QmlRenderer.exe`. The appendix shows
the withheld count among its own rows separately from the whole-file figure —
quoting "7 lines" beside a table of twenty would be false.

### Two claims, both needed

The colophon says both of these, and dropping either makes the other a lie by
omission:

1. **The lines are real** — every record in Appendix A was written by the agent.
2. **The arrangement is mine** — nothing on the owner's machine prints that
   ledger as a table, or next to the manual. The merge is this page's doing.

---

## Things that will bite you

- **`margin:` shorthand silently un-indents the text column.** The column
  offset is one rule (`.clause > *, .colophon > *, .title > *`); any later rule
  using the `margin` shorthand resets `margin-left` to 0. Every rule after it
  sets `margin-top`/`margin-bottom` explicitly. This already shipped once —
  the §1 paragraphs sat 272px left of the §1 table.
- **A negative margin does not pull a float back from the text column.** A
  float is positioned from the *containing block's* content edge. `.note` had
  `margin-left: calc(-1 * var(--col))`, which put every margin note off-screen
  at any width where the section's own padding was under 272px — the entire
  992–1440px band, i.e. most laptops. It is `margin-left: 0` now; the marginal
  column already starts at the content edge. `npm run measure` checks this.
- **`position: sticky` on the appendix `<th>` wedges screenshot capture.**
  Across 564 rows it made Chrome's `Page.captureScreenshot` time out at 30s
  while the page itself stayed responsive to JavaScript. Contradictory
  measurements of a page that is clearly fine mean the instrument, not the
  code. It is also wrong for the conceit: a printed appendix has no floating
  header.
- **SVG geometry has to come from the viewBox.** Figure 1's kernel row used
  round numbers (`148 + 16` per box) and overflowed a 920-unit viewBox by 56
  units, clipping "FixMemory". The step is now `(SPAN - width) / 5`, derived.
- **The appendix wrapping on a phone doubled the page.** With `white-space:
  normal` the 564 records wrapped onto four lines each: 66,000px of scrolling,
  and two adjacent records became hard to tell apart. One record per row, and
  the wrapper pans sideways. The document never scrolls horizontally.
- **`background-position: 12px bottom 12px` is invalid and takes the whole
  declaration with it.** That is a *three*-value position; only one, two or
  four values are legal. One bad entry in the list silently dropped all four
  trim-mark positions to `0% 0%`, stacking every mark in the top-left corner —
  which looks like a rendering bug and is a CSS parse error. Write the
  four-value form (`left 12px bottom 12px`).
- **`mix-blend-mode` on a full-viewport fixed layer wedges screenshot
  capture.** The paper tooth used `multiply` at first; it forced the page into
  its own compositing pass and timed out `Page.captureScreenshot` at 30s while
  JavaScript still answered in 0ms — the same symptom the sticky appendix
  header gave. Plain opacity over flat cream is indistinguishable here.
- **The margin rule is a background LAYER, and it took three tries.** As one
  fixed line at `z-index: -1` it was painted over by any section with a
  background — it simply stopped at the appendix and the colophon. As a
  per-section absolutely positioned `::before` it painted *over* in-flow
  content and drew a hairline straight through Figure 1. Masking the figure
  with an opaque patch fixed that and left a visible rectangle of flat stock.
  It is now `background-image` on the section: under everything in the section,
  over nothing, and a banded section still draws its own.
- **Anything hanging into the marginal column must be opaque.** The rule is a
  background layer, so it shows *through* the transparent parts of an SVG —
  across the loop and the kernel box. Figure 1 is a framed plate on `--stock`
  and the ledger table takes the band's `--stock-2`; the border on the figure
  is what makes the rule's interruption read as a pasted-in plate rather than a
  missing length of rule.
- **Anything hanging into the marginal column needs `clear: left`.** A margin
  note is a left float in that column; the figure and the appendix table hang
  into the same space and overlapped it until they cleared.
- **The og:image is invalidated by any look change.** Regenerate it in the
  same commit (`npm run og`), or the card advertises the old page for weeks.
  `twitter:card` must stay `summary_large_image`; plain `summary` crops to a
  small square and throws the composition away.

## Claims that were wrong, and how they got caught

Found by checking the previous version of this page against the source repo:

| The page said | The truth | What settled it |
|---|---|---|
| `restart_service("wuauserv")`, as the approval-gate demo | Fabricated — the string appears nowhere in the agent | `grep -rc wuauserv logs/ data/` → `0 0` |
| "150+ tests" | 170 | `python -m pytest --collect-only -q` |
| A terminal dashboard captioned "the live dashboard", with a code comment claiming "real data from the running tool" | Sanitized sample data, and the source repo says so in `scripts/demo_dashboard.py` | `grep -c 7421 logs/agent.log data/actions.jsonl` → `0 0` |
| "Five daemon threads" and "threads: 5 + watchdog", on the same page | Two different numbers for one thing | `grep -n "Thread(" main.py` |
| GPU is "advisory — never auto-acts" | `gpu_high` anomalies are raised and do reach the loop; what is true is that **no GPU action appears in the ledger**, which is what §7 now says | `logs/agent.log`, and partitioning the ledger by `action` |

The lesson underneath all five: **a capability claim needs a mechanism, not an
observation.** Before adding any sentence about what the agent does, name the
command that checks it and run it.

## Things this rework decided that are easy to undo by accident

- **No `react-icons`.** A manual labels things with words. The dependency was
  removed, not merely unused.
- **No `framer-motion`.** It was ~100KB for one `useReducedMotion` call. There
  is no motion on this page at all, which is also why there is no
  `prefers-reduced-motion` block — nothing would change.
- **No shadow, gradient, blur or border-radius anywhere.** Paper does not glow.
  If a change wants depth it comes from rule weight or a change of stock.
- **Appendix A prints every DISTINCT OUTCOME, not every record.** The 564
  records collapse to 20 message shapes (same text, PID masked). The appendix
  prints all 20, oldest first, each as the real dated record of the first time
  it happened, with a `Times` column for how often it recurred. The claim is
  still complete — no event in the ledger is unrepresented — but it is bounded
  by how many *kinds* of thing the agent can do rather than how often it did
  them, so it cannot grow to 26,000px again.

  Two earlier versions were wrong in the same way. All 564 records: honest,
  26,000px, nobody was going to read it. Then a 64-row rule
  (`!r.ok || r.action === 'kill_process'`): the same problem one third as
  loudly. Completeness of instances was never the useful claim; the file is
  linked for that.

  Do not replace this with a slice, a head/tail sample or a "best of" — a
  selection a reader cannot reproduce is one they have to take on trust, which
  is the one thing this page cannot ask for. `npm run measure` re-groups
  `ledger.json` independently and fails if the DOM's row count disagrees.
- **The legend is the filter, and it has a test that can fail.** Ticking a
  verdict box hides those rows. `npm run measure` unticks "applied" and asserts
  the table loses *exactly* the applied rows (not merely that it re-rendered),
  that `aria-pressed` follows, and that unticking all three leaves the table
  non-empty. Every row stays in the DOM when nothing is filtered, so ctrl-F
  still finds any line.
- **No pagination, no virtualisation, no reveal.** Every row the rule selects
  is in the DOM at all times, so a reader who flicks to the footer has all of
  them and ctrl-F finds any line.
- **Two typefaces, and the boundary is load-bearing.** Source Serif 4 is the
  manual's own voice; IBM Plex Mono is anything the machine said. Setting a
  quoted line in serif erases the distinction the page is built on.

---

## Re-verify before every publish

Capability claims rot. Run these against the source repo and fix the page, not
the command, if one disagrees:

```bash
cd ../OS_agent
python -m pytest --collect-only -q | tail -1        # the test count
grep -c "Thread(" main.py                            # named background threads
git grep -c "ram_high" -- 'src/*.py'                 # the only trigger in the ledger
grep -n "threshold\|cooldown" config/settings.yaml   # every figure in §1
```

Known as of issue 2026-11-12: four named background threads (`profile-detect`,
`bt-monitor`, `audio-suggest`, `watchdog`), two of them conditional on their
feature being enabled. The observer is a loop, not one of those threads — the
previous page said "five daemon threads" and was wrong.
