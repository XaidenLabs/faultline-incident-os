import Link from "next/link";
import { getPublicCases } from "../lib/case-store";
import { getLiveSignalMemory } from "../lib/live-store";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const [memory, cases] = await Promise.all([getLiveSignalMemory(), getPublicCases(6)]);

  return <main className="evidence-page">
    <nav className="case-nav"><Link href="/" className="wordmark"><span>✦</span> Faultline</Link><div><Link href="/dashboard">Live workspace</Link><a href="#method">Method</a><a href="#limits">Limits</a></div></nav>

    <header className="evidence-hero"><span>HOW FAULTLINE WORKS</span><h1>Real evidence in.<br /><em>Honest proof out.</em></h1><p>This page separates what Faultline observed, what it tested, and what it still cannot claim.</p></header>

    <section className="evidence-live-proof">
      <article><small>LIVE INPUT</small><strong>{memory.run?.sources_succeeded ?? 0}/{memory.run?.sources_attempted ?? 3} sources captured</strong><p>GitHub, Cloudflare, and npm public status data is collected every two minutes and saved with timestamps and fingerprints.</p></article>
      <article><small>PUBLIC CASES</small><strong>{cases.length} recent case{cases.length === 1 ? "" : "s"}</strong><p>A live record can become a durable investigation case without pretending Faultline can change the source system.</p></article>
      <article><small>PROOF BENCHMARK</small><strong>12 fixed test incidents</strong><p>Controlled synthetic cases let the same failure be replayed safely and scored against known answers.</p></article>
    </section>

    <section id="method" className="evidence-method">
      <div><span>01 / THE METHOD</span><h2>One workflow, with a clear line between observation and proof.</h2></div>
      <ol><li><b>Capture</b><p>Save the source, time, status, and exact content fingerprint.</p></li><li><b>Build a case</b><p>Put the evidence into one investigation record that another person can inspect.</p></li><li><b>Check readiness</b><p>Ask whether a safe replay environment and allowed actions are available.</p></li><li><b>Test one cause</b><p>Change one suspected variable in an isolated copy of the incident.</p></li><li><b>Verify the result</b><p>Call it causal only when the original failure clears and no new failure appears.</p></li><li><b>Keep the learning</b><p>Save the failed ideas, successful recovery, postmortem, and runbook.</p></li></ol>
    </section>

    <section className="evidence-comparison">
      <div><span>02 / WHAT THE NUMBERS MEAN</span><h2>A controlled test, not a production promise.</h2><p>Both systems receive the same twelve fixed incident bundles. The simple baseline chooses the loudest visible error. Faultline checks topology, tests competing causes, and validates recovery.</p></div>
      <div className="evidence-score-table"><div><span>MEASURE</span><span>BASELINE</span><span>FAULTLINE</span></div><div><strong>Correct root cause</strong><b>33.3%</b><b>100%</b></div><div><strong>Valid recovery</strong><b>33.3%</b><b>100%</b></div><div><strong>Causal proof</strong><b>0%</b><b>100%</b></div><footer>These are reproducible synthetic benchmark results. They do not guarantee 100% accuracy on real production incidents.</footer></div>
    </section>

    <section className="evidence-api">
      <div><span>03 / BRING YOUR OWN INCIDENT</span><h2>Faultline can accept data from your own tools.</h2><p>A protected endpoint is included for monitoring tools and webhooks. Once its private token is configured, it accepts an incident summary, evidence, service map, allowed actions, and an optional safe test adapter. Imported cases stay private by default.</p><Link href="/docs">Read the plain-language guide →</Link></div>
      <pre><code>{`POST /functions/v1/ingest-incident
x-faultline-ingest-token: ••••••••

{
  "source": "your-monitoring-system",
  "externalId": "INC-1042",
  "title": "Checkout errors",
  "summary": "Failures across two regions",
  "topology": ["gateway>checkout"],
  "allowedActions": ["checkout:rollback"],
  "safeAdapterId": "staging-checkout"
}`}</code></pre>
    </section>

    <section id="limits" className="evidence-limits"><div><span>04 / LIMITS</span><h2>What Faultline will not pretend to know.</h2></div><div><article><strong>Public status is not private system data</strong><p>Live Pulse only reports what the public source publishes.</p></article><article><strong>No safe test system means no causal proof</strong><p>Without a safe place to replay the incident, the case stays marked unproven.</p></article><article><strong>No automatic production recovery</strong><p>Important actions remain limited, tested safely, and approved by a person.</p></article><article><strong>The benchmark uses fixed test cases</strong><p>It validates the workflow under controlled conditions, not every real system.</p></article></div></section>

    <footer className="evidence-footer"><Link href="/dashboard">Open the live workspace →</Link><a href="https://github.com/XaidenLabs/faultline-incident-os" target="_blank" rel="noreferrer">Inspect the repository ↗</a></footer>
  </main>;
}
