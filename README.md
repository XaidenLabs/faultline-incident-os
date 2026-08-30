# Faultline

> Do not stop at the most likely explanation. Test it.

Faultline helps teams investigate broken digital services. It watches real public status signals, saves what it saw, and turns a signal into a case that can be inspected later. When a safe test environment is available, Faultline changes one suspected cause at a time and measures what happens. It only calls something the cause when the original failure clears and no new failure appears.

The product follows one clear path:

```text
Observe → Investigate → Prove → Rehearse → Approve → Learn
```

- **Observe:** collect and save a real signal with its source and time.
- **Investigate:** keep the evidence and possible explanations in one case.
- **Prove:** test one explanation in a safe copy of the system when one is connected.
- **Rehearse:** check that the proposed recovery fixes the problem without creating another one.
- **Approve:** leave any real-world change for a person to approve.
- **Learn:** save the result as a postmortem and reusable runbook.

## Why this matters

When an online service breaks, the evidence is spread across alerts, logs, service maps, recent changes, and old runbooks. The loudest alert may come from a service that is suffering, not the service that caused the problem. Under pressure, a person or an AI assistant can settle on the first believable answer too quickly.

That failure matters because a confident but weakly grounded diagnosis can waste the recovery window or turn one incident into two. Google’s SRE guidance explicitly identifies automated analysis, root-cause assistance, and mitigation suggestions as valuable parts of incident response while retaining human review for critical operations. Recent trajectory-level RCA research also reports that endpoint correctness can hide unsupported or incomplete diagnostic reasoning.

Faultline makes one careful promise:

> Save what happened, test the leading explanation safely, and show the before-and-after evidence before anyone changes production.

## What the agent does

The full workflow does more than summarize the data it receives:

1. Collect the available evidence and service relationships.
2. Keep more than one possible cause open.
3. Choose which evidence to inspect next.
4. Look for evidence that could prove its leading idea wrong.
5. Change one allowed variable in a fresh, isolated test.
6. Check whether the original failure clears and the rest of the system stays healthy.
7. Reject actions that are not on the approved list.
8. Keep a person in control of any production change.
9. Save every test, failed idea, and decision so another person can review it.

Purposeful choices matter more than agent count. Faultline uses one investigator role and a skeptical verification stage; the verifier exists because unsupported inference is the failure mode being addressed.

## Live data versus proof data

The dashboard opens in **Live Pulse**. Every two minutes, a scheduled collector reads the official GitHub Status, Cloudflare Status, and npm Status feeds. It saves each result with its source, time, and fingerprint. New records appear in the dashboard in real time, with a 30-second refresh as a fallback.

Clicking **Investigate** turns a live signal into a durable case. The case keeps the source evidence and clearly says that causal proof is unavailable until a safe test environment is connected. Faultline does not claim access to private GitHub, Cloudflare, or npm data, and it never changes those systems.

The **Counterfactual Lab** uses twelve fixed test incidents. These cases are separate because Faultline can safely replay them, make one controlled change, and compare the result with a known answer. The fixed lab is proof of the method, not a claim of perfect production accuracy.

An optional protected endpoint can receive incidents from another monitoring tool. Imported cases stay private by default. The endpoint remains closed until an operator configures `FAULTLINE_INGEST_TOKEN`; see [External incident intake](docs/INGESTION.md).

Model enrichment is optional. When `OPENAI_API_KEY` is configured as a Supabase Edge Function secret, the live observer uses the Responses API to produce an evidence-bounded triage summary. Without the key—or when the model is unavailable—collection continues and the deterministic summary is stored instead.

## Baseline

The credential-free baseline is a reasonable basic response to an alert: inspect the supplied telemetry summary once and select the component with the largest visible error rate. It has the same twelve incident bundles but no selective tools, hypothesis competition, falsification, topology-aware reasoning, or action validation.

The live baseline uses the same model family as Faultline and provides the full incident bundle in one direct prompt. Live results are stored separately from deterministic replay results.

## Current evaluation

The repository includes twelve fixed, synthetic incident bundles. They cover configuration regression, CPU saturation, certificate expiry, cache eviction, DNS delay, schema incompatibility, memory leak, queue partition failure, retry storms, connection exhaustion, clock skew, and regional packet loss.

Primary metric: **top-1 root-cause service accuracy**.

| Replay metric | Simple baseline | Faultline | Change |
|---|---:|---:|---:|
| Top-1 root-cause accuracy | 33.3% | 100.0% | +66.7 points |
| Recovery validity | 33.3% | 100.0% | +66.7 points |
| Executable causal proof | 0.0% | 100.0% | +100.0 points |
| Action containment | Not enforced | 100% | All proposals catalog-bound |
| Mean isolated experiments | 0 | 1.1 | Failed hypotheses remain visible |

Run the evaluator yourself:

```bash
pnpm evaluate:replay
```

The hard case is regional packet loss. A temporally adjacent checkout canary creates an attractive but false local explanation. Faultline tests that explanation first: rolling back checkout leaves packet loss unchanged, so it rejects the local-change story. Rerouting the affected zone then clears the cross-service failures, producing the causal proof. The agent reaches the answer by learning from a failed experiment, not by reading a hidden label.

Replay metrics validate the orchestration and safety contracts; they are **not** presented as live-model benchmark results. Live-model evidence must be generated with `pnpm agent:live` and is written to a separate trajectory artifact.

## Quick start

Requirements:

- Node.js 22.13 or newer
- pnpm 11.19.0
- An OpenAI API key only for live model runs

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm evaluate:replay
pnpm demo:full
pnpm dev
```

Open the printed local URL. Start in **Live Pulse**, choose a real captured signal, and click **Investigate** to open its saved case. Then open the **Counterfactual Lab** to run a safe, reproducible proof case and inspect the before-and-after evidence.

For a live representative run:

```bash
cp .env.example .env.local
# Add OPENAI_API_KEY locally. Never commit it.
set -a && source .env.local && set +a
pnpm agent:live
```

The default live model is `gpt-5.6-luna`; override it with `OPENAI_MODEL`. Both workflows should use the same explicit model when producing the final comparison.

## Repository map

```text
app/                         Interactive incident room
app/dashboard/LivePulse.tsx  Realtime live-operations surface
app/api/live-signals/        Read-only live memory API
core/scenarios.mjs           Versioned synthetic incident bundles
core/replay-agent.mjs        Credential-free baseline and advanced replay
core/sandbox.mjs             Isolated counterfactual experiment engine
core/incident-os.mjs         Full observe-to-learn incident lifecycle
core/run-full-demo.mjs       Reproducible incident-package generator
core/live-agent.mjs          Responses API tool loop and trace recorder
core/prompts.mjs             Complete agent instructions
core/evaluate.mjs            Repeatable evaluation runner
artifacts/evaluation/        Raw evaluation output
artifacts/trajectories/      Representative JSONL trajectories
artifacts/incident-packages/ Recovery, postmortem and runbook artifacts
docs/                        Architecture and evaluation detail
supabase/migrations/         Live-memory schema and two-minute scheduler
supabase/functions/          Live collector, case promotion, and protected incident intake
tests/                       Safety, trajectory, data and UI contracts
```

## Safety and data

- All bundled incidents and telemetry are synthetic.
- Live Pulse uses only public status APIs and is clearly separated from the synthetic proof cases.
- Every experiment starts from a fresh synthetic snapshot and cannot perform external actions.
- Live mode exposes only incident-scoped read tools.
- Recovery is selected from an explicit allowlist.
- Every recovery remains a sandbox proposal requiring human approval.
- API credentials stay in ignored local environment files.
- A production deployment must use a qualified on-call engineer as reviewer.

## Main failure mode and hot take

Main observed failure in the prior iteration: a recent change dominated the score even when cross-service evidence pointed to shared infrastructure. The regional packet-loss case made the weakness measurable and motivated the counterfactual laboratory.

**Hot take:** correlation may propose the cause; only an intervention can prove it. Incident agents should be scored on whether the failure disappears under a controlled change, not on how convincing their postmortem sounds.

## Documentation

- [Reproduction guide](REPRODUCE.md)
- [Improvement changelog](IMPROVEMENT_CHANGELOG.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Evaluation contract](docs/EVALUATION.md)
- [Agent trajectory guide](docs/AGENT_TRAJECTORIES.md)
- [Five-minute demo pitch and visual direction](docs/DEMO_PITCH.md)
- [Live data architecture and operations](docs/LIVE_DATA.md)
- [External incident intake](docs/INGESTION.md)
- [Pre-existing work disclosure](docs/PREEXISTING_WORK.md)

## Research grounding

- Google SRE, *Incident management guide*: https://sre.google/resources/practices-and-processes/incident-management-guide/
- Google SRE, *AI Engineering for Reliable Operations*: https://sre.google/resources/practices-and-processes/ai-engineering-reliable-operations/
- Lu et al., *Beyond Fault Localization: A Trajectory-Level Study of LLM Agents for Microservice Root Cause Analysis* (2026): https://arxiv.org/abs/2608.21310
- RCAEval public benchmark: https://github.com/phamquiluan/RCAEval

These sources motivate the problem and evaluation design. Faultline’s synthetic dataset, implementation, interface, prompts, and artifacts were created for this hackathon.
