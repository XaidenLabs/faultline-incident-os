# Architecture

## System boundary

Faultline consumes a bounded incident bundle and returns a diagnosis package. It does not connect to production infrastructure in this submission.

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
  contradiction → causal chain → confidence
          │
          ▼
  Action validator
  allowed target/action only → human approval
          │
          ▼
  Sandbox replay + evidence package
```

## Design decisions

### One investigator, one verification stage

The project does not multiply agents for appearance. The investigator owns evidence collection and diagnosis. Verification is separated because its objective conflicts with ordinary diagnosis: it is rewarded for finding the strongest contradiction, not for making the current answer sound coherent.

### Deterministic tools around model judgment

Telemetry retrieval and action validation are deterministic. A model can select tools and synthesize evidence, but it cannot invent a new recovery target or action. This keeps model judgment where it is useful while moving safety invariants into code.

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

## Consequential-action policy

1. Only catalog actions are eligible.
2. Live tools are read-only.
3. Recovery remains a proposal.
4. A qualified human approves the sandbox replay.
5. Production execution is out of scope.

