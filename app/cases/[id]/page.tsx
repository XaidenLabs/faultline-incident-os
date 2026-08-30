import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCase } from "../../lib/case-store";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getPublicCase(id).catch(() => null);
  if (!record) notFound();

  const { investigationCase, events } = record;
  const sourceStatus = investigationCase.evidence.sourceStatus ?? {};

  return <main className="case-page">
    <nav className="case-nav"><Link href="/" className="wordmark"><span>✦</span> Faultline</Link><div><Link href="/dashboard">Live workspace</Link><Link href="/evidence">How it works</Link></div></nav>

    <header className="case-hero">
      <div><span className="case-eyebrow">LIVE EVIDENCE CASE</span><h1>{investigationCase.title}</h1><p>{investigationCase.summary}</p></div>
      <div className={`case-proof-state proof-${investigationCase.proof_status}`}><small>CAUSAL PROOF</small><strong>{investigationCase.proof_status === "unavailable" ? "Not available yet" : investigationCase.proof_status}</strong><span>{investigationCase.proof_status === "unavailable" ? "Evidence saved · adapter needed" : "Safe test environment connected"}</span></div>
    </header>

    <section className="case-trust-strip">
      <div><small>SOURCE</small><strong>{investigationCase.source_name}</strong></div>
      <div><small>CAPTURED</small><strong>{formatDate(investigationCase.captured_at)}</strong></div>
      <div><small>SNAPSHOT</small><strong>#{String(investigationCase.source_snapshot_id ?? "—")}</strong></div>
      <div><small>CONTENT HASH</small><strong>{investigationCase.content_hash.slice(0, 12)}</strong></div>
    </section>

    <section className="case-layout">
      <div className="case-evidence-panel">
        <header><span>01</span><div><small>WHAT WE KNOW</small><h2>Evidence, not a guessed cause</h2></div></header>
        <div className="case-evidence-grid">
          <article><small>REPORTED STATE</small><strong>{String(sourceStatus.description ?? "Captured from the source")}</strong><p>{String(sourceStatus.activeIncidents ?? 0)} active incident(s) and {String(sourceStatus.degradedComponents ?? 0)} degraded component(s) were present in this snapshot.</p></article>
          <article><small>PROVENANCE</small><strong>Source-linked and timestamped</strong><p>Faultline saved the original source, capture time, snapshot ID, and fingerprints so this record can be checked later.</p>{investigationCase.source_url && <a href={investigationCase.source_url} target="_blank" rel="noreferrer">Open original source ↗</a>}</article>
        </div>
      </div>

      <aside className="case-boundary">
        <span>SAFE BOUNDARY</span><h2>Why Faultline stops here</h2><p>{investigationCase.proof_reason}</p><ul><li>Public evidence preserved</li><li>No private system data claimed</li><li>No third-party system changed</li><li>No root cause invented</li></ul>
      </aside>
    </section>

    <section className="case-timeline">
      <header><span>02</span><div><small>CASE TIMELINE</small><h2>What Faultline did</h2></div></header>
      <div>{events.map((event, index) => <article key={event.id}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{event.title}</strong><p>{event.detail}</p></div><time>{formatTime(event.occurred_at)}</time></article>)}</div>
    </section>

    <section className="case-next-step">
      <div><span>03 / NEXT STEP</span><h2>Observation is real.<br />Proof needs a safe twin.</h2><p>Connect a staging environment, simulator, or digital-twin adapter that can replay this system. Faultline can then change one allowed variable and measure whether the failure disappears.</p></div>
      <div className="case-next-actions"><Link href="/dashboard?mode=proof-lab">See a reproducible proof case <span>→</span></Link><Link href="/evidence">Read the method <span>→</span></Link></div>
    </section>

    <footer className="case-footer"><span>Case {investigationCase.id.slice(0, 8)}</span><span>Public evidence only · no authentication gate</span></footer>
  </main>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
