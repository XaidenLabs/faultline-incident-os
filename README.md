# Faultline

> Don’t guess the root cause. Prove it.

Faultline is an evidence-first incident investigator for on-call engineers. It reconstructs a causal chain from telemetry, maintains competing hypotheses, actively tries to disprove its leading diagnosis, recommends only recovery actions permitted by an incident-specific catalog, and requires human approval before a sandbox replay.

## The user and the bottleneck

Site reliability engineers and software engineers on call must diagnose production incidents while evidence is fragmented across metrics, logs, traces, deploy history, service topology, and runbooks. The component with the loudest error is often only a downstream victim. Under time pressure, both people and general-purpose assistants can collapse too quickly on the first plausible explanation.

That failure matters because a confident but weakly grounded diagnosis can waste the recovery window or turn one incident into two. Google’s SRE guidance explicitly identifies automated analysis, root-cause assistance, and mitigation suggestions as valuable parts of incident response while retaining human review for critical operations. Recent trajectory-level RCA research also reports that endpoint correctness can hide unsupported or incomplete diagnostic reasoning.

Faultline’s product promise is narrow:

> Given an approved incident bundle, produce an inspectable root-cause diagnosis and a constrained recovery proposal that an on-call engineer can verify before acting.

## What makes the workflow agentic

The advanced workflow does more than summarize supplied telemetry:

1. **Grounding:** inventory the observable fault surface and service topology.
2. **Hypothesis competition:** keep multiple explanations alive rather than anchoring on the first anomaly.
3. **Selective tool use:** query metrics, logs, traces, changes, and the action catalog separately.
4. **Falsification:** ask which observation would most strongly contradict the leading diagnosis.
5. **Causal verification:** check temporal precedence and propagation across service boundaries.
6. **Action validation:** reject targets and actions absent from the incident’s allowed catalog.
7. **Human checkpoint:** never execute a consequential recovery automatically.
8. **Trajectory capture:** preserve the instructions, tool calls, outputs, feedback, and decision path.

Purposeful choices matter more than agent count. Faultline uses one investigator role and a skeptical verification stage; the verifier exists because unsupported inference is the failure mode being addressed.

## Baseline

The credential-free baseline is a reasonable basic response to an alert: inspect the supplied telemetry summary once and select the component with the largest visible error rate. It has the same twelve incident bundles but no selective tools, hypothesis competition, falsification, topology-aware reasoning, or action validation.

The live baseline uses the same model family as Faultline and provides the full incident bundle in one direct prompt. Live results are stored separately from deterministic replay results.

## Current evaluation

The repository includes twelve fixed, synthetic incident bundles. They cover configuration regression, CPU saturation, certificate expiry, cache eviction, DNS delay, schema incompatibility, memory leak, queue partition failure, retry storms, connection exhaustion, clock skew, and regional packet loss.

Primary metric: **top-1 root-cause service accuracy**.

| Replay metric | Simple baseline | Faultline | Change |
|---|---:|---:|---:|
| Top-1 root-cause accuracy | 33.3% | 91.7% | +58.4 points |
| Recovery validity | 25.0% | 91.7% | +66.7 points |
| Action containment | Not enforced | 100% | All proposals catalog-bound |
| Inspectable decision stages | 1 | 7 | Full diagnostic trajectory |

Run the evaluator yourself:

```bash
pnpm evaluate:replay
```

The hard case is regional packet loss. A temporally adjacent checkout canary creates an attractive but false local explanation. The current deterministic scorer still anchors on that change. This failure is preserved rather than hidden.

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
core/live-agent.mjs          Responses API tool loop and trace recorder
core/prompts.mjs             Complete agent instructions
core/evaluate.mjs            Repeatable evaluation runner
artifacts/evaluation/        Raw evaluation output
artifacts/trajectories/      Representative JSONL trajectories
docs/                        Architecture and evaluation detail
tests/                       Safety, trajectory, data and UI contracts
```

## Safety and data

- All bundled incidents and telemetry are synthetic.
- Replay mode cannot perform external actions.
- Live mode exposes only incident-scoped read tools.
- Recovery is selected from an explicit allowlist.
- Every recovery remains a sandbox proposal requiring human approval.
- API credentials stay in ignored local environment files.
- A production deployment must use a qualified on-call engineer as reviewer.

## Main failure mode and hot take

Main observed failure: a recent change can dominate the score even when cross-service evidence points to shared infrastructure. The regional packet-loss case exposes this anchoring behavior.

**Hot take:** incident agents do not mainly fail because they lack hypotheses. They fail because they stop trying to disprove the first coherent story. Reliability improves when the workflow rewards discriminating queries and preserved uncertainty, not more confident prose.

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

