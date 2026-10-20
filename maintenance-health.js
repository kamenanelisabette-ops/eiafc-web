/**
 * EIAFC Maintenance Health Endpoint
 * Safe public diagnostics: never returns secrets or database contents.
 */
const APP_VERSION = "11.26.1";
const BUILD = "2026-10-19-v11-26-1-student-save-fix";
const SUPABASE_URL = String(process.env.SUPABASE_URL || "https://opypgilifxnrwqmpsnzp.supabase.co").replace(/\/+$/,"");
const SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY || "");

async function timedFetch(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return { ok: response.ok, status: response.status, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  const checks = {};
  let overall = "ok";

  try {
    checks.app = { ok: true, version: APP_VERSION, build: BUILD };
    const app = await timedFetch(`${SUPABASE_URL}/functions/v1/eiafc-app`, {
      headers: SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}
    });
    checks.cloud = { ok: app.ok, status: app.status, ms: app.ms };
    if (!app.ok) overall = "degraded";
  } catch (e) {
    checks.cloud = { ok: false, error: String(e?.message || e) };
    overall = "degraded";
  }

  checks.runtime = {
    node: process.version,
    checkedAt: new Date().toISOString()
  };

  res.statusCode = overall === "ok" ? 200 : 503;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify({ service: "EIAFC Maintenance", status: overall, checks }));
};
