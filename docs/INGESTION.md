# Bring an incident into Faultline

Faultline already watches three public status feeds. The external incident endpoint lets a monitoring tool, webhook, or small integration send its own incident to the same case system.

## What happens to the data

1. The endpoint checks a private token.
2. It checks the payload size and required fields.
3. It saves the incident as a private case in Supabase.
4. It records when the case arrived and whether it has enough information for a safe test.
5. It does not change production or invent a root cause.

Sending an incident more than once with the same `source` and `externalId` updates the same case instead of creating duplicates.

## Turn the endpoint on

Create a long random token and add it as the `FAULTLINE_INGEST_TOKEN` secret for the `ingest-incident` Supabase Edge Function. The endpoint returns `503` until that secret exists. Keep the token on the server that sends the webhook; never put it in browser code.

## Send an incident

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/ingest-incident" \
  -H "content-type: application/json" \
  -H "x-faultline-ingest-token: YOUR_PRIVATE_TOKEN" \
  -d '{
    "source": "your-monitoring-system",
    "externalId": "INC-1042",
    "title": "Checkout errors",
    "summary": "Failures are visible in two regions",
    "evidence": { "errorRate": 0.19 },
    "topology": ["gateway>checkout"],
    "allowedActions": ["checkout:rollback"],
    "safeAdapterId": "staging-checkout"
  }'
```

Only `source`, `externalId`, `title`, and `summary` are required. The whole request must be smaller than 20 KB.

## What “ready for proof” means

An imported case is marked ready only when it includes all three of these:

- a safe adapter ID;
- a service map in `topology`;
- a list of permitted changes in `allowedActions`.

“Ready” does not mean “proved.” It only means Faultline has enough information to begin an isolated test. The result must still clear the original failure without causing a new one.

## Privacy and safety

- Imported cases are private by default.
- Public visitors cannot read them through the database API.
- The endpoint uses its server-side service role only after the token check.
- The token comparison is timing-safe.
- No production action is executed by this endpoint.
- Rotate the token if it is ever exposed.
