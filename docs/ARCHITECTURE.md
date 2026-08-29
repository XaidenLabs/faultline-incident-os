# Architecture

## System boundary

Faultline consumes a bounded incident bundle and returns a diagnosis package. It does not connect to production infrastructure in this submission.

The shipped product boundary is broader than diagnosis: `core/incident-os.mjs` orchestrates the complete observe-to-learn lifecycle and emits an auditable incident package containing intake, investigation, counterfactuals, recovery rehearsal, approval state, postmortem, and compiled runbook.

```text
Incident bundle
  ├─ topology
  ├─ metrics
  ├─ logs
  ├─ traces
  ├─ recent changes
  └─ allowed recovery actions
          │
          ▼
  Investigator
  inventory → hypotheses → selective queries
          │
          ▼
  Skeptical verifier
  contradiction → next discriminating experiment
          │
          ▼
  Counterfactual laboratory
  fresh snapshot → one changed variable → health diff
          │
          ▼
  Causal verifier + recovery proposal
  symptom cleared → no regressions → human approval
```

## Design decisions

### One investigator, one verification stage

The project does not multiply agents for appearance. The investigator owns evidence collection and diagnosis. Verification is separated because its objective conflicts with ordinary diagnosis: it is rewarded for finding the strongest contradiction, not for making the current answer sound coherent.

### Deterministic tools around model judgment

Telemetry retrieval and action validation are deterministic. A model can select tools and synthesize evidence, but it cannot invent a new recovery target or action. This keeps model judgment where it is useful while moving safety invariants into code.

### Counterfactuals instead of confidence theater

Evidence decides which hypothesis deserves the next test. It does not declare a winner. `run_counterfactual` applies one allowlisted action to a fresh synthetic snapshot and returns a before/after health diff. A claim is causal only when the original symptom clears and unrelated health checks remain stable. Failed experiments are retained as first-class evidence.

### Append-only trajectories

Every model input, function call, tool result, usage record and final output is captured as JSONL. Replay traces use the same readable event shape. Secrets are never included.

### Honest fallback mode

The interactive incident room replays a committed representative trajectory so judges can inspect the complete product without credentials. Live mode is separate and clearly labeled. Replay metrics are never described as live-model results.

## Live tool contract

- `inventory_telemetry`: services, topology and available sources
- `query_metrics`: anomaly ordering and per-service candidate signals
- `query_logs`: bounded incident-window search
- `inspect_trace`: representative failing trace path
- `inspect_changes`: changes near incident onset
- `get_allowed_actions`: sandbox actions and approval requirements
- `run_counterfactual`: isolated one-variable intervention with measured before/after health

## Consequential-action policy

1. Only catalog actions are eligible.
2. Counterfactual tools operate only on synthetic snapshots and expose `productionConnected: false`.
3. Recovery remains a proposal.
4. A qualified human approves any consequential recovery.
5. Production execution is out of scope.
