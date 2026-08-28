# Improvement Changelog

Each entry records the evidence that motivated the change. Replay evidence and live-model evidence remain explicitly separated.

| Stage | What changed and why | Evidence | Decision / learning |
|---|---|---|---|
| Baseline | Selected the component with the largest visible error rate. This represents a quick, reasonable reading of an alert summary. | `artifacts/evaluation/replay-summary.json` — 33.3% root-cause accuracy | Established the starting point. Loud downstream victims are often mistaken for causes. |
| Iteration 1 | Added temporal ordering, topology and recent-change evidence to rank candidate causes. | Replay improved across configuration, DNS, schema, queue and database cases. | Kept. Correlation becomes more useful when constrained by propagation order. |
| Iteration 2 | Added competing hypotheses and explicit contradicting-evidence penalties after observing early anchoring. | `core/replay-agent.mjs`; seven-stage trajectory test | Kept. The decision path became inspectable and less dependent on one anomaly. |
| Iteration 3 | Added a verifier that attempts to falsify the leading hypothesis before a diagnosis is promoted. | Featured trajectory contains `falsify_leading_hypothesis`; root-cause accuracy reached 91.7%. | Kept. This is the main contribution. |
| Iteration 4 | Added incident-specific action catalogs and mandatory human approval. | Safety test confirms every recommendation stays inside the catalog; action containment 100%. | Kept. Correct diagnosis does not guarantee a valid recovery action. |
| Removed experiment | Considered automatic execution after confidence exceeded 0.9. | Ground rules require consequential actions to be simulated or approved; research also distinguishes diagnosis from safe actuation. | Removed. Confidence is not authority. |
| Final | Combined selective telemetry tools, hypothesis competition, falsification, action validation, trajectory capture and a judge-facing incident room. | 12-case replay: 33.3% → 91.7%; all tests pass; browser flow verified. | Preserved the remaining regional packet-loss failure as the honest next target. |

## Largest contribution

The verifier produced the largest conceptual improvement: it changes the optimization target from “find supporting evidence” to “retrieve evidence that can distinguish the leading explanation from its strongest alternative.”

## Remaining failure

`INC-2492` contains regional packet loss and an unrelated checkout canary. The current deterministic score overweights the temporally adjacent change and predicts `checkout` rather than `network`. A future version should add cross-path anomaly intersection before treating a local deploy as causal.

