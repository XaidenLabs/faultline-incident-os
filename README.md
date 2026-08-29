# Faultline

> Don’t guess the root cause. Prove it.

Faultline is a counterfactual incident laboratory for on-call engineers. It reconstructs candidate causal chains from telemetry, then changes one suspected cause at a time in an isolated incident snapshot and replays the failure. A diagnosis is promoted only when that single intervention clears the symptom without creating another regression.

The laboratory is the proof engine inside a larger incident-response operating system:

```text
Observe → Investigate → Prove → Rehearse → Approve → Learn
```

- **Incident intake** normalizes fragmented telemetry into one bounded fault surface and blast radius.
- **Counterfactual investigation** competes hypotheses and runs one-variable experiments.
- **Recovery Lab** turns the proven intervention into a scoped plan with risk and rollback gates.
- **Health-gated rehearsal** measures the recovery against the original symptom, service health, regressions, and production isolation.
- **Evidence-backed postmortem** writes the causal proof and rejected alternatives from the trajectory rather than inventing a retrospective story.
- **Runbook Memory** compiles every successful recovery into a machine-readable regression guard for the next incident.
- **Evaluation Lab** compares the simple baseline, advanced workflow, proof rate, action validity, and experiment efficiency across fixed cases.

## The user and the bottleneck

Site reliability engineers and software engineers on call must diagnose production incidents while evidence is fragmented across metrics, logs, traces, deploy history, service topology, and runbooks. The component with the loudest error is often only a downstream victim. Under time pressure, both people and general-purpose assistants can collapse too quickly on the first plausible explanation.

That failure matters because a confident but weakly grounded diagnosis can waste the recovery window or turn one incident into two. Google’s SRE guidance explicitly identifies automated analysis, root-cause assistance, and mitigation suggestions as valuable parts of incident response while retaining human review for critical operations. Recent trajectory-level RCA research also reports that endpoint correctness can hide unsupported or incomplete diagnostic reasoning.

Faultline’s product promise is narrow:

> Given an approved incident bundle, turn a plausible diagnosis into an executable before/after proof and a constrained recovery proposal an on-call engineer can verify before acting.

## What makes the workflow agentic

The advanced workflow does more than summarize supplied telemetry:

1. **Grounding:** inventory the observable fault surface and service topology.
2. **Hypothesis competition:** keep multiple explanations alive rather than anchoring on the first anomaly.
3. **Selective tool use:** query metrics, logs, traces, changes, and the action catalog separately.
4. **Falsification:** ask which observation would most strongly contradict the leading diagnosis.
5. **Counterfactual experiment:** apply one allowed intervention to a fresh isolated snapshot.
6. **Causal verification:** require symptom clearance, a measurable health gain, and zero unrelated regressions.
7. **Action validation:** reject targets and actions absent from the incident’s allowed catalog.
8. **Human checkpoint:** never execute a consequential production recovery automatically.
9. **Trajectory capture:** preserve every query, experiment, rejected explanation, and decision.

Purposeful choices matter more than agent count. Faultline uses one investigator role and a skeptical verification stage; the verifier exists because unsupported inference is the failure mode being addressed.

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

Open the printed local URL. Select **Run investigation**, inspect the causal chain and trajectory, approve the sandbox replay, and open **Baseline comparison**.

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
tests/                       Safety, trajectory, data and UI contracts
```

## Safety and data

- All bundled incidents and telemetry are synthetic.
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
- [Pre-existing work disclosure](docs/PREEXISTING_WORK.md)

## Research grounding

- Google SRE, *Incident management guide*: https://sre.google/resources/practices-and-processes/incident-management-guide/
- Google SRE, *AI Engineering for Reliable Operations*: https://sre.google/resources/practices-and-processes/ai-engineering-reliable-operations/
- Lu et al., *Beyond Fault Localization: A Trajectory-Level Study of LLM Agents for Microservice Root Cause Analysis* (2026): https://arxiv.org/abs/2608.21310
- RCAEval public benchmark: https://github.com/phamquiluan/RCAEval

These sources motivate the problem and evaluation design. Faultline’s synthetic dataset, implementation, interface, prompts, and artifacts were created for this hackathon.
