# Faultline Demo Pitch

## The one-line pitch

Faultline is an agentic incident-response system that does not stop at a plausible root cause: it changes one suspected cause in an isolated snapshot, replays the failure, and promotes a diagnosis only when the incident disappears without a new regression.

## Five-minute demo script

Target runtime: **4:40–4:55**. Record at 1440×900 or 1920×1080, 16:9, with the browser at 100% zoom. Keep the cursor still unless it is performing the next deliberate action.

### 0:00–0:20 — Cold open: the failure of plausible answers

**Visual:** Open directly on the hard-case incident in the dashboard. Keep the checkout canary marker and regional error signal visible. Add a small overlay: `A recent deploy is not necessarily the cause.`

**Say:**

> At 14:07, checkout changes. Seconds later, four services begin failing across eu-south. Every obvious signal points at checkout—but the obvious answer is wrong. Today, incident tools summarize correlation. Faultline tests causality.

### 0:20–0:40 — User, bottleneck, and value

**Visual:** Briefly cut to the landing hero, then scroll only far enough to show “From alert to reusable operational memory.”

**Say:**

> Faultline is built for the on-call engineer whose evidence is fragmented across metrics, logs, traces, deploys, topology, and runbooks. A confident wrong diagnosis wastes the recovery window. Faultline turns a plausible explanation into executable before-and-after proof—before recovery touches production.

### 0:40–1:05 — Live operational memory

**Visual:** Open Live Pulse. Show the three real source cards, Realtime connection state, current incidents, and capture-history hashes.

**Say:**

> This is not a frozen dashboard. Every two minutes, Faultline captures the official GitHub, Cloudflare, and npm status feeds. Each snapshot and changed observation is timestamped in Supabase and streamed into the interface. Live Pulse reports only what the public evidence says and preserves exactly what the agent saw.

### 1:05–1:25 — Baseline first

**Visual:** Show the baseline comparison. Highlight `33.3% top-1 accuracy`, then the baseline rule: it selects the loudest visible error. Keep the numbers large and readable.

**Say:**

> I built a fair baseline on the same twelve versioned synthetic incidents. It inspects the supplied summary once and chooses the loudest failing component. That is a reasonable first response—and it reaches only 33.3 percent top-one root-cause accuracy. It has no selective tools, hypothesis competition, action validation, or intervention.

### 1:25–2:35 — Full realistic agent execution

**Visual:** Return to the hard case. Start or replay the investigation. Let trajectory events populate. Pause briefly on each of these moments: fault-surface inventory, competing hypotheses, contradiction check, `CF-01 rejected`, and `CF-02 causal`.

**Say:**

> Faultline begins by inventorying the whole fault surface and topology. It keeps multiple explanations alive, then asks what observation would most strongly contradict its leading diagnosis. The recent checkout canary is plausible, so the agent tests it first in a fresh isolated snapshot.
>
> Rolling checkout back changes nothing: packet loss remains at nineteen percent. That failed experiment is not hidden; it becomes evidence, and the checkout hypothesis is rejected. The agent then tests the shared network path. Rerouting the affected zone drops the failure to 0.8 percent across all four services with no unrelated regression. That is the causal proof.

### 2:35–3:15 — Engineering and safety

**Visual:** Open Agent Trajectory and show the append-only event sequence and tool arguments. Then open Recovery Lab and show the action catalog, four rehearsal gates, production isolation, and human approval state.

**Say:**

> This is agentic because the model selects bounded tools, competes hypotheses, falsifies its own answer, performs isolated experiments, and passes the result to a skeptical verifier. Every query, tool argument, output, retry, and decision is preserved as an append-only trajectory.
>
> Consequential recovery is never autonomous. Proposed actions must exist in the incident’s allowlist, are rehearsed against symptom clearance, restored health, secondary regressions, and production isolation, and remain held for a qualified human approval.

### 3:15–3:50 — End-to-end outcome

**Visual:** Show Postmortem, then Runbook Memory. Highlight the rejected alternative in the postmortem and the machine-readable verification rule in the runbook.

**Say:**

> Faultline does not end at diagnosis. The proven intervention becomes a scoped recovery plan. The trajectory writes an evidence-backed postmortem that includes the rejected alternative and its limitations. The successful recovery becomes a machine-readable runbook and a regression guard for the next incident.

### 3:50–4:25 — Measured improvement and reproducibility

**Visual:** Show the benchmark table or terminal capture running `pnpm test` followed by `pnpm evaluate:replay`. Keep the full command and final summary visible. Overlay: `12 fixed inputs · <1 sec replay · $0 API cost`.

**Say:**

> On the same twelve cases, top-one accuracy improves from 33.3 to 100 percent, recovery validity from 33.3 to 100 percent, and executable causal proof from zero to 100 percent. The credential-free replay runs in under one second at zero API cost. The repository includes exact commands, expected output, raw evaluation artifacts, tests, an improvement changelog, and representative JSONL trajectories.

### 4:25–4:45 — Hot take and close

**Visual:** Return to the clean landing close: `Stop narrating incidents. Start proving them.` End on the product URL and GitHub repository for three seconds.

**Say:**

> My hot take is simple: correlation may propose the cause; only an intervention can prove it. Incident agents should be scored on whether the failure disappears under a controlled change—not on how convincing their postmortem sounds. This is Faultline.

## Required visual assets

1. **Dashboard cold-open capture:** hard case before investigation, with the checkout canary and four-service blast radius visible.
2. **Baseline card:** 33.3% baseline against the same twelve cases.
3. **Trajectory sequence:** a clean crop containing hypothesis generation, the failed checkout rollback, and successful network reroute.
4. **Before/after proof card:** `19.0% → 19.0%` rejected beside `19.0% → 0.8%` causal.
5. **Safety gates:** action allowlist, fresh snapshot, zero production connection, and human approval.
6. **Operational artifacts:** postmortem plus runbook memory in one split-screen or two fast cuts.
7. **Terminal proof:** tests passing and the replay evaluation summary.
8. **Final slate:** product URL, GitHub URL, one-command reproduction, and the one-line hot take.

## Visual direction

- Use the existing warm off-white and restrained violet system. Avoid neon glow overload, fake telemetry, or decorative 3D objects.
- Use direct screen capture for claims. Never replace evidence with a marketing animation.
- Reserve purple for the active hypothesis or causal proof; red for rejected/failed; green only for verified gates.
- Use one overlay style throughout: 12–16 px monospace, off-white on a 75% black rounded rectangle.
- Prefer hard cuts between proof stages. Use one 200–300 ms crossfade only when moving from landing page to dashboard.
- Keep each key result on screen for at least two seconds. Judges must be able to read the evidence without pausing.
- Do not scroll while speaking a critical number. Arrive at the number, stop, then deliver the line.
- Record a clean backup take of the full hard-case flow. Also export individual clips for baseline, trajectory, recovery, and benchmark so a failed take does not force a complete rerecord.

## Submission package checklist

- Public repository with complete code and no credentials.
- README naming the user, bottleneck, value, baseline, advanced workflow, main failure mode, and hot take.
- Improvement changelog connecting meaningful iterations to evidence.
- Reproduction guide with exact versions, commands, expected output, runtime, and API cost.
- Raw replay summary and representative agent trajectories.
- Pre-existing work disclosure.
- Five-minute-or-shorter solution video following the script above.
- Working public product link with no authentication gate.

## What not to do in the demo

- Do not spend the first minute touring the landing page.
- Do not call 100% replay accuracy a production benchmark.
- Do not imply that Faultline executes production recovery autonomously.
- Do not hide the failed checkout experiment; it is the strongest evidence of technical judgment.
- Do not list every feature. Demonstrate one hard case end to end, then show how the result becomes reusable memory.
