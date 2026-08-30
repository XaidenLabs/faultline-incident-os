# Faultline Demo Pitch

## One-line pitch

Faultline watches live incident signals, tests possible causes in a safe copy of the incident, and only calls something the root cause when changing it makes the failure disappear.

## Five-minute demo script

Aim for **4:40–4:55**. Record in 16:9 at 1440×900 or 1920×1080. Keep the browser at 100% zoom. Move the cursor only when you need to click something.

### 0:00–0:20 — Start with the problem

**Show:** Open the hard case in Proof Lab. Keep the 19% checkout signal, checkout canary, and four affected services on screen. Add this small caption: `Loudest signal ≠ proven cause.`

**Say:**

> An incident in eu-south is affecting four services. Checkout has the loudest error signal, and a checkout canary started eighty seconds before the alert. So checkout looks guilty. But the failures also cross service boundaries. Faultline does not guess which story is right. It tests both.

### 0:20–0:40 — Explain who it helps

**Show:** Cut to the landing page. Scroll to “From alert to reusable operational memory.”

**Say:**

> Faultline is for the engineer handling an incident while evidence is spread across logs, metrics, traces, deploys, and runbooks. A confident but wrong answer wastes valuable recovery time. Faultline turns a likely cause into proof before anyone changes production.

### 0:40–1:05 — Show the real live data

**Show:** Open Live Pulse. Show the GitHub, Cloudflare, and npm cards, the Realtime status, the observation stream, and Capture History.

**Say:**

> This dashboard is live. Every two minutes, Faultline reads the public GitHub, Cloudflare, and npm status feeds. It saves each snapshot in Supabase and updates the screen in real time. It also keeps a history, so we can always see exactly what the agent saw and when it saw it.

### 1:05–1:25 — Show the baseline

**Show:** Display the baseline comparison and highlight `33.3% top-1 accuracy`.

**Say:**

> First, I built a simple baseline and ran it on the same twelve test incidents. It chooses the component with the loudest visible error. That sounds reasonable, but it finds the correct root cause only 33.3 percent of the time. It can spot correlation, but it cannot prove cause and effect.

### 1:25–2:35 — Run the hard case

**Show:** Return to the hard case. Let the investigation play. Pause on the fault surface, competing ideas, failed checkout test, and successful network test.

**Say:**

> Faultline starts by looking at the full incident, not just the loudest alert. It checks the service map, recent changes, logs, and traces. Then it keeps more than one possible cause open.
>
> Checkout is the first suspect, so Faultline tests it in a fresh, isolated copy of the incident. It rolls back the checkout canary. Nothing improves. The error rate stays at nineteen percent, so checkout is rejected as the cause.
>
> Next, Faultline tests the shared network path. It reroutes the affected zone, and the error rate drops from nineteen percent to 0.8 percent. The failure clears across the affected services, and no new problem appears. Now we have proof that the network path caused the incident.

### 2:35–3:15 — Explain why it is agentic and safe

**Show:** Open Agent Trajectory, then Recovery. Show the tool calls, allowed actions, safety checks, production isolation, and human approval.

**Say:**

> This is agentic because Faultline chooses which evidence to inspect, keeps competing ideas, tests its own leading answer, and learns from a failed test. Every action and result is saved in the trajectory, so nothing is hidden.
>
> It also cannot take any random recovery action. Every action must be on the incident’s allowed list. Recovery is tested safely first, and a human still has to approve anything that could affect production.

### 3:15–3:50 — Show what the user gets

**Show:** Open Postmortem, then Runbook Memory. Highlight the rejected checkout theory and the saved verification rule.

**Say:**

> Faultline does not stop after finding the cause. It creates a recovery plan, writes a postmortem with the evidence, and records the ideas it rejected. It also turns the successful fix into a reusable runbook and a test for the next incident. Every solved incident makes the system more useful.

### 3:50–4:25 — Show the measured result

**Show:** Display the benchmark or a terminal recording of `pnpm test` and `pnpm evaluate:replay`. Add this caption: `12 fixed cases · under 1 second · $0 API cost`.

**Say:**

> I tested the baseline and Faultline on the same twelve fixed incidents. Root-cause accuracy improves from 33.3 percent to 100 percent. Valid recovery actions also improve from 33.3 percent to 100 percent. The baseline proves no causes. Faultline produces causal proof on all twelve test cases. These are reproducible synthetic results, not a claim about every real production incident.

### 4:25–4:45 — Close

**Show:** Return to the final landing-page section: `Stop narrating incidents. Start proving them.` End with the live product and GitHub links.

**Say:**

> My point is simple: correlation can suggest a cause, but a controlled test is what proves it. Incident agents should not win because their explanation sounds confident. They should win because the failure disappears when they change the right thing. That is Faultline.

## Visuals to prepare

1. The hard case before the investigation starts.
2. The Live Pulse page with three real sources and recent capture times.
3. The baseline result showing 33.3% accuracy.
4. The failed checkout test: `19.0% → 19.0%`.
5. The successful network test: `19.0% → 0.8%`.
6. The agent trajectory and its saved tool results.
7. The recovery safety checks and human approval state.
8. The postmortem and reusable runbook.
9. The passing tests and benchmark summary.
10. A final screen with the product URL and GitHub URL.

## Recording direction

- Use the existing off-white, black, and purple design.
- Use real screen recordings for important claims.
- Keep captions short and use the same caption style throughout.
- Use purple for the active idea, red for a failed test, and green for proof that passed.
- Stop scrolling before you say an important number.
- Leave every key result on screen for at least two seconds.
- Use simple cuts. Avoid distracting transitions.
- Record the hard-case flow twice so you have a backup take.

## Submission checklist

- Public GitHub repository with no private keys.
- Public product link with no sign-in gate.
- README explaining the user, problem, baseline, full workflow, results, and limitations.
- Improvement changelog linked to evidence.
- Exact setup and reproduction commands.
- Raw benchmark output and sample agent trajectories.
- Clear disclosure of any work that existed before the hackathon.
- Demo video under five minutes.

## Avoid these mistakes

- Do not spend the first minute touring the landing page.
- Do not say the 100% synthetic result guarantees production accuracy.
- Do not say Faultline changes production by itself.
- Do not hide the failed checkout test. It is one of the strongest parts of the demo.
- Do not call the public status feeds private production telemetry.
