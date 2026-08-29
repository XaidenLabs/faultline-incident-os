# Improvement Changelog

Each entry records the evidence that motivated the change. Replay evidence and live-model evidence remain explicitly separated.

| Stage | What changed and why | Evidence | Decision / learning |
|---|---|---|---|
| Baseline | Selected the component with the largest visible error rate. This represents a quick, reasonable reading of an alert summary. | `artifacts/evaluation/replay-summary.json` — 33.3% root-cause accuracy | Established the starting point. Loud downstream victims are often mistaken for causes. |
| Iteration 1 | Added temporal ordering, topology and recent-change evidence to rank candidate causes. | Replay improved across configuration, DNS, schema, queue and database cases. | Kept. Correlation becomes more useful when constrained by propagation order. |
| Iteration 2 | Added competing hypotheses and explicit contradicting-evidence penalties after observing early anchoring. | `core/replay-agent.mjs`; seven-stage trajectory test | Kept. The decision path became inspectable and less dependent on one anomaly. |
| Iteration 3 | Added a verifier that attempts to falsify the leading hypothesis before a diagnosis is promoted. | Featured trajectory contains `falsify_leading_hypothesis`; root-cause accuracy reached 91.7%. | Kept, but the hard case showed that evidence scoring still confuses correlation with cause. |
| Iteration 4 | Added incident-specific action catalogs and mandatory human approval. | Safety test confirms every recommendation stays inside the catalog; action containment 100%. | Kept. Correct diagnosis does not guarantee a valid recovery action. |
| Iteration 5 | Added an isolated counterfactual laboratory. Each allowed intervention runs on a fresh snapshot; the verifier requires symptom clearance, a health gain and no unrelated regression. | `INC-2492`: checkout rollback is rejected; network reroute clears the incident. Replay reaches 100% causal proof across 12 fixed cases. | Kept. Failed experiments are now evidence, and the answer key is never exposed to the agent. |
| Removed experiment | Considered automatic execution after confidence exceeded 0.9. | Ground rules require consequential actions to be simulated or approved; research also distinguishes diagnosis from safe actuation. | Removed. Confidence is not authority. |
| Final | Combined selective telemetry tools, hypothesis competition, executable counterfactuals, recovery validation, and trajectory capture. | 12-case replay: 33.3% → 100%; causal proof 100%; all experiments sandboxed. | The difficult case is solved through a visible failed experiment, not a stronger heuristic. |

## Largest contribution

The counterfactual laboratory produced the largest conceptual improvement: it changes the optimization target from “write the most plausible diagnosis” to “find the smallest intervention that makes the failure disappear.”

## Remaining failure

The current sandbox is deliberately synthetic and deterministic. It proves the workflow and makes every metric reproducible, but it does not yet model delayed effects, partial recoveries, or interacting faults. Those belong in the next evaluation tier and should remain separate from the fixed hackathon benchmark.
