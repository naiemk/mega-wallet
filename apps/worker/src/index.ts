const API_URL = process.env.API_URL ?? "http://localhost:8080";
const WORKER_TOKEN = process.env.INTERNAL_WORKER_TOKEN ?? "dev-worker-token";
const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 15_000);

async function poll() {
  try {
    const res = await fetch(`${API_URL}/api/internal/jobs/poll-deposits`, {
      method: "POST",
      headers: { "x-worker-token": WORKER_TOKEN },
    });
    const data = await res.json();
    console.log(`[worker] polled deposits:`, data);
  } catch (err) {
    console.error("[worker] poll failed", err);
  }
}

console.log(`[worker] starting, interval=${INTERVAL_MS}ms api=${API_URL}`);
void poll();
setInterval(poll, INTERVAL_MS);
