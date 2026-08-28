/**
 * Synthetic, shareable incident bundles. Each case is deliberately small enough
 * to inspect by hand and contains only evidence that a real telemetry tool could
 * return. The evaluator never exposes `gold` to either workflow.
 */
export const scenarios = [
  {
    id: "INC-2481",
    title: "Checkout failures after configuration rollout",
    symptom: "34.8% checkout failure rate in eu-west",
    topology: ["frontend>checkout", "checkout>payment", "checkout>currency", "checkout>email"],
    candidates: [
      candidate("checkout-service", 34.8, 0, 96, "PAYMENT_TIMEOUT_MS parsed as 0", 0),
      candidate("payment-service", 34.8, 2, null, "downstream deadline exceeded", 3),
      candidate("currency-service", 8.2, 4, null, "latency within SLO", 2),
    ],
    changes: ["checkout-service config v47: PAYMENT_TIMEOUT_MS 2500 -> '2.5s' at 14:05:36Z"],
    logs: ["checkout: invalid integer '2.5s'; using fallback 0", "payment: context deadline exceeded from checkout"],
    trace: ["frontend 502 @14:07:12", "checkout timeout @14:07:12", "payment cancelled @14:07:12.004"],
    allowedActions: ["checkout-service:revert-config-key", "checkout-service:rollback-v46"],
    gold: { service: "checkout-service", fault: "config_type", action: "checkout-service:revert-config-key" },
  },
  {
    id: "INC-2482", title: "Recommendation latency under load", symptom: "p99 recommendation latency 8.4s",
    topology: ["frontend>recommendation", "recommendation>catalog"],
    candidates: [candidate("recommendation-service", 61, 0, null, "CPU throttled at 99%", 0), candidate("frontend", 61, 3, null, "waiting on recommendation", 2), candidate("catalog", 4, 5, null, "healthy", 3)],
    changes: [], logs: ["recommendation: worker queue depth 894"], trace: ["recommendation self-time 8.1s"], allowedActions: ["recommendation-service:scale-out"],
    gold: { service: "recommendation-service", fault: "cpu_saturation", action: "recommendation-service:scale-out" },
  },
  {
    id: "INC-2483", title: "TLS failures at the edge", symptom: "handshake failures for 42% of new sessions",
    topology: ["client>gateway", "gateway>frontend"],
    candidates: [candidate("frontend", 42, 2, null, "no application requests received", 3), candidate("gateway", 8, 0, 400, "certificate expired at 00:00Z", 0), candidate("identity", 3, 5, null, "healthy", 3)],
    changes: ["gateway certificate bundle rotated 400s before incident"], logs: ["gateway: x509 certificate has expired"], trace: ["TLS terminates before frontend span"], allowedActions: ["gateway:activate-valid-certificate"],
    gold: { service: "gateway", fault: "expired_certificate", action: "gateway:activate-valid-certificate" },
  },
  {
    id: "INC-2484", title: "Cart state disappears between requests", symptom: "checkout reports empty carts",
    topology: ["frontend>cart", "checkout>cart", "cart>redis"],
    candidates: [candidate("checkout", 38, 3, null, "valid empty response", 2), candidate("cart", 12, 0, 180, "redis eviction rate 440/s", 0), candidate("frontend", 4, 6, null, "healthy", 3)],
    changes: ["cart redis maxmemory-policy changed to allkeys-lru"], logs: ["cart: key miss after write", "redis: evicted_keys +12840"], trace: ["cart SET 200 then GET nil"], allowedActions: ["cart:restore-cache-policy"],
    gold: { service: "cart", fault: "cache_eviction", action: "cart:restore-cache-policy" },
  },
  {
    id: "INC-2485", title: "Shipping quote timeouts", symptom: "shipping quote p95 exceeds 12s",
    topology: ["checkout>shipping", "shipping>dns", "shipping>carrier"],
    candidates: [candidate("shipping", 45, 3, null, "blocked in name resolution", 2), candidate("dns", 6, 0, 70, "SERVFAIL burst and 8s lookup", 0), candidate("carrier", 22, 5, null, "requests arrive late", 2)],
    changes: ["dns forwarding rule changed 70s before incident"], logs: ["shipping: lookup carrier.internal: SERVFAIL"], trace: ["dns span 8.02s before carrier connect"], allowedActions: ["dns:revert-forwarding-rule"],
    gold: { service: "dns", fault: "resolution_delay", action: "dns:revert-forwarding-rule" },
  },
  {
    id: "INC-2486", title: "Orders fail after catalog release", symptom: "order validation rejects existing products",
    topology: ["orders>catalog", "catalog>catalog-db"],
    candidates: [candidate("orders", 53, 2, null, "unknown enum from catalog", 1), candidate("catalog", 17, 0, 110, "response schema contains category_v2", 0), candidate("catalog-db", 2, 5, null, "healthy", 3)],
    changes: ["catalog v82 introduced category_v2 without compatibility flag"], logs: ["orders: unsupported category enum HOME_V2"], trace: ["catalog 200 response rejected by orders decoder"], allowedActions: ["catalog:enable-v1-compatibility"],
    gold: { service: "catalog", fault: "schema_incompatibility", action: "catalog:enable-v1-compatibility" },
  },
  {
    id: "INC-2487", title: "Email workers repeatedly restart", symptom: "confirmation queue lag 19 minutes",
    topology: ["checkout>queue", "queue>email"],
    candidates: [candidate("email", 72, 0, null, "RSS grows 40MB/min until OOM", 0), candidate("queue", 31, 3, null, "consumer disconnects", 2), candidate("checkout", 4, 6, null, "healthy", 3)],
    changes: [], logs: ["email: OOMKilled", "email: attachment buffer retained"], trace: ["queue delivery accepted; worker dies before ack"], allowedActions: ["email:rollback-worker", "email:scale-out"],
    gold: { service: "email", fault: "memory_leak", action: "email:rollback-worker" },
  },
  {
    id: "INC-2488", title: "Accounting events stop processing", symptom: "consumer lag increases across all accounting pods",
    topology: ["checkout>kafka", "kafka>accounting"],
    candidates: [candidate("accounting", 48, 2, null, "all consumers waiting", 2), candidate("kafka", 9, 0, 220, "partition 7 has no leader", 0), candidate("checkout", 3, 5, null, "producer acks healthy except p7", 2)],
    changes: ["kafka broker maintenance began 220s before incident"], logs: ["kafka: NOT_LEADER_OR_FOLLOWER p7"], trace: ["producer retries only for partition 7"], allowedActions: ["kafka:elect-partition-leader"],
    gold: { service: "kafka", fault: "partition_unavailable", action: "kafka:elect-partition-leader" },
  },
  {
    id: "INC-2489", title: "Currency provider rejects requests", symptom: "price conversion fails intermittently",
    topology: ["frontend>currency", "currency>rates-api"],
    candidates: [candidate("currency", 44, 0, 310, "429 responses after retry fanout", 0), candidate("rates-api", 44, 1, null, "rate limit operating as configured", 1), candidate("frontend", 31, 4, null, "retries amplify requests", 2)],
    changes: ["currency retry count changed 2 -> 12"], logs: ["currency: retrying 429 attempt=12"], trace: ["single conversion creates 13 provider calls"], allowedActions: ["currency:restore-retry-policy"],
    gold: { service: "currency", fault: "retry_storm", action: "currency:restore-retry-policy" },
  },
  {
    id: "INC-2490", title: "Orders database connections exhausted", symptom: "order writes time out while reads remain healthy",
    topology: ["frontend>orders", "orders>orders-db"],
    candidates: [candidate("frontend", 58, 3, null, "waiting on orders", 2), candidate("orders", 41, 1, null, "pool acquisition timeout", 1), candidate("orders-db", 7, 0, 150, "active connections pinned at max", 0)],
    changes: ["orders-db max_connections reduced 500 -> 50"], logs: ["orders: timeout acquiring connection", "orders-db: remaining slots reserved"], trace: ["orders self-time 14ms; db wait 5s"], allowedActions: ["orders-db:restore-connection-limit"],
    gold: { service: "orders-db", fault: "connection_exhaustion", action: "orders-db:restore-connection-limit" },
  },
  {
    id: "INC-2491", title: "Valid sessions rejected in one zone", symptom: "auth tokens report not-yet-valid",
    topology: ["gateway>identity", "identity>clock"],
    candidates: [candidate("auth", 37, 2, null, "token validation failure", 1), candidate("identity", 12, 0, 540, "node clock +184s", 0), candidate("gateway", 37, 4, null, "passes token unchanged", 2)],
    changes: ["identity node lost NTP sync 540s before incident"], logs: ["identity: token nbf is 181s in future"], trace: ["failures confined to identity pod az-b-17"], allowedActions: ["identity:resync-clock", "identity:drain-pod"],
    gold: { service: "identity", fault: "clock_skew", action: "identity:resync-clock" },
  },
  {
    id: "INC-2492", title: "Intermittent failures in eu-south", symptom: "multi-service packet loss around 7%",
    topology: ["gateway>checkout", "gateway>catalog", "gateway>shipping", "services>network"],
    candidates: [candidate("checkout", 19, 1, 80, "largest visible error count", 0), candidate("network", 7, 2, null, "loss shared across service boundaries", 1), candidate("gateway", 14, 3, null, "retries hide some loss", 1)],
    changes: ["checkout canary began 80s before alert; unrelated to dropped packets"], logs: ["multiple services: connection reset by peer"], trace: ["gaps occur on unrelated paths in same zone"], allowedActions: ["network:reroute-zone", "checkout:rollback-canary"],
    gold: { service: "network", fault: "regional_packet_loss", action: "network:reroute-zone" },
  },
];

function candidate(service, errorRate, anomalyOrder, changeAgeSeconds, signal, contradictions) {
  return { service, errorRate, anomalyOrder, changeAgeSeconds, signal, contradictions };
}

export function publicScenario(scenario) {
  const visible = { ...scenario };
  delete visible.gold;
  return visible;
}
