import { redis, keysFor, ROUND } from "../lib/db.js";

// GET /api/health               → { db: "ok" | "limit_reached" | "not_connected" | "error" }
// GET /api/health?key=ADMIN_KEY → the same checks in detail, with the exact error text.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const want = String(process.env.ADMIN_KEY || "").trim();
  const got = String(req.query.key || "").trim();
  // Without the key: only a one-word verdict, nothing about the setup.
  if (!want || !got || got !== want) {
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30");
    try {
      await redis.set("liqi:health", Date.now(), { ex: 60 });
      return res.status(200).json({ db: "ok" });
    } catch (e) {
      const msg = String((e && e.message) || e);
      const db = /limit exceeded|max requests|quota/i.test(msg) ? "limit_reached"
        : /url|token|unauthor|WRONGPASS|NOPERM|fetch failed|ENOTFOUND/i.test(msg) ? "not_connected"
        : "error";
      return res.status(200).json({ db });
    }
  }

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
