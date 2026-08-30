# Faultline demo pitch

## One sentence

Faultline saves what happened during an incident, tests likely causes in a safe copy of the system, and only says “this caused it” when the failure disappears.

## The story to tell

The demo should feel like one journey:

```text
real signal → saved case → honest limit → safe proof → measured result
```

Aim for 4 minutes 30 seconds to 4 minutes 50 seconds. Record at 1440×900 or 1920×1080 with the browser at 100% zoom.

## Five-minute script

### 0:00–0:25 — The problem

**Show:** Landing page. Keep the main headline and button visible.

**Say:**

> When an online service breaks, the loudest alert usually gets blamed first. But the loudest service may only be the one suffering. A confident wrong answer wastes recovery time and can make the incident worse. Faultline helps a team test the likely cause before acting on it.

### 0:25–1:05 — Show that the system is live

**Show:** Open **Live Pulse**. Pause on the real-time connection, GitHub, Cloudflare, and npm cards, then the capture history.

**Say:**

> This is live public data, not a hard-coded dashboard. Every two minutes, Faultline checks the public GitHub, Cloudflare, and npm status feeds. It saves what each source said, when it said it, and a fingerprint of the record. Supabase keeps that history, so we can return to what the system saw at any point in time.

### 1:05–1:35 — Turn a signal into a case

**Show:** Click **Investigate** on a source card or **Open case** on an observation. Let the saved case page open. Point to Source, Captured, Snapshot, and Content Hash.

**Say:**

> I can turn any captured signal into a saved investigation case. The case keeps the original source, time, snapshot, and history together. If I choose the same signal again, Faultline returns the same case instead of creating a duplicate.

### 1:35–1:55 — Be honest about the limit

**Show:** On the case page, point to **Causal proof: Not available yet** and the Safe Boundary card.

**Say:**

> This is where the product stays honest. Faultline can observe a public Cloudflare signal, but it cannot change Cloudflare to test a theory. Without a safe copy of the affected system, it saves the evidence and says “not proven yet.” It does not invent a root cause.

### 1:55–2:15 — Move into the safe lab

**Show:** Click **See a reproducible proof case**. The Counterfactual Lab should open on the fixed regional packet-loss case. Keep the fixed-case label visible.

**Say:**

> To show how proof works, I built twelve fixed test incidents. They give Faultline a safe place to replay a failure, change one thing, and measure the result. This is a controlled benchmark, not live production.

### 2:15–3:10 — Run the hard case

**Show:** Start the investigation. Pause on the competing causes, the failed checkout test, and the successful network test.

**Say:**

> In this hard case, a checkout canary starts eighty seconds before the alert. Four services in the same region begin failing, and checkout shows a nineteen percent error rate. The timing makes checkout look guilty, but the cross-service pattern also points to shared network infrastructure.
>
> Faultline tests checkout first in a fresh copy of the incident. It rolls back the canary. The error rate stays at nineteen percent, so checkout is rejected.
>
> It then tests the shared network path. Rerouting the affected zone drops the error rate from nineteen percent to 0.8 percent. The four services recover and no new failure appears. That before-and-after result is the causal proof.

### 3:10–3:40 — Show that it is agentic and safe

**Show:** Open the trajectory, then the recovery view. Point to the failed test, allowed action, isolation check, and human approval state.

**Say:**

> Faultline is agentic because it chooses what to inspect, keeps more than one cause open, tests its own leading answer, and changes direction when a test fails. Every step is saved. It can only use approved actions, every test runs in isolation, and a person still controls any real recovery.

### 3:40–4:10 — Show the useful output

**Show:** Open Postmortem and Runbook Memory. Highlight the rejected checkout idea and the saved verification rule.

**Say:**

> The result is more than a diagnosis. Faultline creates a recovery plan, records the idea it rejected, writes the postmortem from the evidence, and saves the successful check as a reusable runbook for the next incident.

### 4:10–4:35 — Show the measured improvement

**Show:** Open **Evidence & Method** or show a terminal recording of `pnpm test` and `pnpm evaluate:replay`.

**Say:**

> I compared Faultline with a simple baseline on the same twelve fixed incidents. The baseline chooses the loudest error and solves four of the twelve. Faultline solves all twelve and produces a valid causal test in all twelve. That is a real improvement on this controlled set. It is not a promise of perfect accuracy on every production incident.

### 4:35–4:50 — Close

**Show:** Return to the final landing-page section. End with the product and GitHub links.

**Say:**

> The idea is simple: an alert can suggest where to look, but a safe test tells us whether the answer is right. Faultline turns incident response from a convincing story into evidence a team can check.

## Visuals to prepare

1. Landing page with the main headline.
2. Live Pulse showing a recent capture and the real-time connection.
3. One click on **Investigate**.
4. The saved case with source, time, hash, and “not proven yet.”
5. The Counterfactual Lab fixed-case label.
6. Checkout test: `19.0% → 19.0%` and rejected.
7. Network test: `19.0% → 0.8%` and proved.
8. Agent trajectory with both tests visible.
9. Human approval and production-isolation checks.
10. Postmortem, runbook, and benchmark result.
11. Final screen with the live URL and GitHub URL.

## Recording direction

- Use the existing off-white, black, and purple interface.
- Record the actual product; do not replace important claims with slides.
- Keep captions to one short sentence.
- Use red only for a failed test and green only for a passed proof or healthy state.
- Stop scrolling before saying an important number.
- Leave every result on screen for at least two seconds.
- Use simple cuts and quiet transitions.
- Do one rehearsal with a timer before recording.
- Record the hard-case sequence twice so there is a backup.

## Short captions

- `Real public status data · captured every 2 minutes`
- `Same signal · same saved case`
- `Observed does not mean proved`
- `Checkout rollback · no change`
- `Network reroute · failure clears`
- `12 fixed cases · controlled benchmark`

## Words to avoid

Do not say:

- “Faultline found Cloudflare’s root cause.”
- “The live dashboard is private production telemetry.”
- “Faultline automatically repairs production.”
- “The 100% result means Faultline is always right.”
- “AI copilot,” unless model-powered triage is actually enabled during the recording.

Say instead:

- “Faultline saved the public signal.”
- “This live case is not proven yet.”
- “The controlled lab demonstrates the proof method.”
- “A person approves consequential recovery.”
- “The observer is deterministic unless model enrichment is configured.”

## Before submitting

- Product link opens without sign-in.
- GitHub repository is public and contains no private keys.
- Live Pulse shows a recent capture.
- Investigate opens a saved case with three timeline events.
- Counterfactual Lab is clearly marked as a fixed test case.
- Evidence page explains the 100% result honestly.
- Tests and replay evaluation pass.
- Video stays under five minutes.
