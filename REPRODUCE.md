# Reproduction Guide

This guide assumes a clean machine and no pre-existing project files.

## 1. Environment

Tested project versions:

- Node.js: 22.13+
- pnpm: 11.19.0
- Next.js: 16.2.6
- React: 19.2.6

Check the environment:

```bash
node --version
pnpm --version
```

## 2. Install

```bash
git clone <submission-repository-url> faultline
cd faultline
pnpm install --frozen-lockfile
```

Expected result: dependencies install without modifying `pnpm-lock.yaml`.

## 3. Verify contracts

```bash
pnpm test
```

Expected result: all tests pass. The suite checks that:

- at least ten evaluation cases are present;
- the challenging regional packet-loss case is included;
- recovery proposals never leave the allowlist;
- the advanced workflow retains all seven trajectory stages;
- the advanced replay improves over the simple baseline;
- the product surface contains the required workflow and no starter content.

Approximate runtime: under five seconds after installation. API cost: $0.

## 4. Reproduce the baseline comparison

```bash
pnpm evaluate:replay
```

Expected console result:

```text
Faultline deterministic replay (12 cases)
Baseline root-cause accuracy:  33.3%
Faultline root-cause accuracy: 91.7%
Faultline recovery validity:   91.7%
```

Expected artifacts:

- `artifacts/evaluation/replay-summary.json`
- `artifacts/trajectories/featured-replay.jsonl`

Approximate runtime: under one second. API cost: $0.

## 5. Run the interactive incident room

```bash
pnpm dev
```

Open the local URL printed by the server. The intended execution is:

1. Click **Run investigation**.
2. Wait for all six visible evidence events.
3. Inspect the leading diagnosis and rejected alternatives.
4. Open **Agent trajectory** and inspect individual decisions.
5. Return to **Investigation**.
6. Click **Approve sandbox replay**.
7. Confirm the status becomes **Resolved** and success becomes 99.97%.
8. Open **Baseline comparison**.

The displayed incident is synthetic and the recovery is a simulation. No production service is contacted.

## 6. Run a live tool-using agent

Live execution is optional for interface inspection but required to regenerate live-model trajectories.

```bash
cp .env.example .env.local
```

Add an API key to `.env.local` locally. Do not paste it into documentation or commit it.

```bash
set -a
source .env.local
set +a
pnpm agent:live
```

Expected output: a JSON diagnosis followed by the trajectory artifact path.

Expected artifact:

- `artifacts/trajectories/inc-2481-live.jsonl`

Runtime and cost depend on the selected model and number of tool turns. Record actual values from the API usage fields before final submission; do not substitute estimates for measured usage.

## 7. Production build

```bash
pnpm build
```

Expected result: a Cloudflare Worker-compatible ESM build in `dist/`.

## Troubleshooting

- `OPENAI_API_KEY is required`: use replay mode or configure `.env.local`.
- A live call returns an unavailable-model error: set `OPENAI_MODEL` to a tool-capable Responses API model available to the account, and use the same model for baseline and advanced runs.
- The local Cloudflare runtime rejects an older macOS version: use `next dev --webpack` for local inspection or build in Linux/macOS 13.5+. This does not change the production target.
- Results differ after editing scenarios or scoring: restore the committed cases and rerun with a clean worktree. Evaluation inputs are versioned deliberately.

