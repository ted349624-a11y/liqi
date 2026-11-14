import { redis, keysFor, ROUND } from "../lib/db.js";

// GET /api/health?key=ADMIN_KEY → checks the database connection and reports the exact error, if any.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const want = String(process.env.ADMIN_KEY || "").trim();
  const got = String(req.query.key || "").trim();
  if (!want) return res.status(500).json({ ok: false, error: "ADMIN_KEY is not set" });
  if (!got || got !== want) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const env = Object.keys(process.env).filter((n) => /REST_(API_)?(URL|TOKEN)$/.test(n)).sort();
  const out = { ok: true, round: ROUND, env, steps: {} };
  const step = async (name, fn) => {
    try { out.steps[name] = await fn(); }
    catch (e) { out.ok = false; out.steps[name] = "ERROR: " + String((e && e.message) || e).slice(0, 400); }
  };
  const main = keysFor(ROUND, "main"), claim = keysFor(ROUND, "claim");
  await step("ping", () => redis.ping());
  await step("write", async () => { await redis.set("liqi:health", Date.now(), { ex: 60 }); return "ok"; });
  await step("main_count", () => redis.scard(main.users));
  await step("claim_count", () => redis.scard(claim.users));
  await step("claim_seq", () => redis.get(claim.seq));
  return res.status(out.ok ? 200 : 500).json(out);
}
