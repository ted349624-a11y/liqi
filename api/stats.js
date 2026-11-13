import { redis, keysFor, listOf, ROUND, X_RE } from "../lib/db.js";

// GET /api/stats?x=handle[&list=claim] → { refs }  (how many people joined through this handle's link)
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const x = String(req.query.x || "").trim().replace(/^@/, "");
  if (!X_RE.test(x)) return res.status(400).json({ refs: 0 });
  const k = keysFor(ROUND, listOf(req.query.list));
  try {
    const refs = await redis.scard(k.refs(x.toLowerCase()));
    return res.status(200).json({ refs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ refs: null });
  }
}
