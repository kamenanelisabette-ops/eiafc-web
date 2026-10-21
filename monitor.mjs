import fs from "node:fs/promises";

const baseUrl = process.env.EIAFC_BASE_URL || "https://eiafc-web.vercel.app";
const startedAt = new Date().toISOString();

async function checkUrl(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "EIAFC-Maintenance-Monitor/1.0"
      }
    });

    return {
      url,
      ok: response.ok,
      status: response.status,
      responseTimeMs: Date.now() - started
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      responseTimeMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

const checks = [
  await checkUrl(baseUrl)
];

const healthy = checks.every(check => check.ok);

const report = {
  application: "EIAFC",
  checkedAt: startedAt,
  baseUrl,
  healthy,
  checks
};

await fs.mkdir("maintenance", { recursive: true });
await fs.writeFile(
  "maintenance/last-report.json",
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log(JSON.stringify(report, null, 2));

if (!healthy) {
  process.exit(1);
}
