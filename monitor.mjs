#!/usr/bin/env node
/**
 * EIAFC Maintenance Monitor
 * No third-party dependencies.
 * Exit 0 when all critical checks pass, 1 otherwise.
 */
const fs = require("fs");
const path = require("path");

const base = process.env.EIAFC_BASE_URL || "https://eiafc-web.vercel.app";
const urls = [
  { name: "site", url: `${base}/` },
  { name: "health", url: `${base}/api/maintenance-health` }
];

async function fetchCheck(item) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(item.url, {
      redirect: "follow",
      headers: { "User-Agent": "EIAFC-Maintenance-Monitor/1.0" },
      signal: controller.signal
    });
    const text = await r.text();
    return {
      name: item.name,
      url: item.url,
      ok: r.ok,
      status: r.status,
      ms: Date.now() - started,
      contentLength: text.length,
      hasEiafc: /EIAFC/i.test(text),
      security: {
        nosniff: r.headers.get("x-content-type-options") === "nosniff",
        frameDeny: r.headers.get("x-frame-options") === "DENY"
      }
    };
  } catch (e) {
    return {
      name: item.name,
      url: item.url,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      error: String(e?.message || e)
    };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  const results = [];
  for (const item of urls) results.push(await fetchCheck(item));

  const health = results.find(x => x.name === "health");
  const site = results.find(x => x.name === "site");
  const criticalFailure =
    !site?.ok ||
    !health?.ok ||
    !site?.hasEiafc ||
    !health?.hasEiafc;

  const report = {
    service: "EIAFC automatic maintenance",
    checkedAt: new Date().toISOString(),
    baseUrl: base,
    status: criticalFailure ? "CRITICAL" : "OK",
    results
  };

  const out = process.env.MAINTENANCE_REPORT || path.join(process.cwd(), "maintenance", "last-report.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = criticalFailure ? 1 : 0;
})();
