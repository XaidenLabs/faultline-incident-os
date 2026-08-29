# Evaluation Contract

## Primary outcome

Top-1 root-cause service accuracy: predicted root service exactly matches the hidden gold service.

## Secondary outcomes

- Recovery validity: proposed action exactly matches a valid action for the gold cause.
- Action containment: proposed action exists in the incident’s allowed-action catalog.
- Trajectory completeness: all required investigation and verification stages are recorded.
- Evidence count: number of retrieved observations included with the diagnosis.
- Causal proof rate: an isolated intervention clears the original symptom without unrelated regressions.
- Experiment efficiency: number of isolated interventions required to reach or reject a proof.

## Fair comparison

Both workflows receive the same twelve incident cases.

Replay baseline:

- one pass over the telemetry summary;
- selects the component with the highest visible error rate;
- no selective tools, verification, or action constraint.

Replay advanced workflow:

- same input cases;
- separate deterministic telemetry tools;
- topology and temporal ordering;
- competing hypotheses;
- contradiction-aware scoring and falsification;
- action catalog validation.
- fresh-snapshot counterfactual experiments;
- an explicit symptom-clearance acceptance rule.

For live evaluation, both workflows must use the same explicit model and the same incident bundle. The baseline receives the bundle directly; Faultline receives incident-scoped tools exposing the same evidence. Model name, API usage, timestamp, prompts and raw outputs must be preserved.

## Dataset

All cases are synthetic and created for the hackathon. This makes them legally shareable, small enough for a judge to inspect, and deterministic. The dataset is inspired by common microservice fault categories represented in public RCA benchmarks but does not copy private telemetry.

## Challenging case

`INC-2492` is intentionally adversarial. Shared regional packet loss overlaps with an unrelated checkout deployment. The case tests whether a workflow confuses temporal correlation with cross-service causation.

The evidence scorer initially ranks checkout first. Faultline therefore rolls back the checkout canary in a fresh snapshot. Packet loss remains, so that hypothesis is rejected. It then reroutes the affected network zone; the symptom clears without unrelated regressions. Both experiments appear in the raw result.

## Limitations

- Synthetic cases are cleaner than production telemetry.
- The replay scorer is designed to validate workflow contracts, not estimate general production accuracy.
- Every fixed case currently has an allowlisted resolving intervention. A 100% replay result demonstrates orchestration and proof capture, not production generalization.
- The current dataset has twelve cases and one service topology family.
- Human time and organizational incident cost are not claimed because they were not measured.
- Live-model evaluation requires participant-provided API credentials and may vary by snapshot.
