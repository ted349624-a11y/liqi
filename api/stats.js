import { redis, keysFor, listOf, ROUND, X_RE, ensurePos } from "../lib/db.js";

// GET /api/stats?x=handle[&list=claim] → { refs, pos }
// refs: how many people joined through this handle's link. pos: its place in line (registration order).
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const x = String(req.query.x || "").trim().replace(/^@/, "");
  if (!X_RE.test(x)) return res.status(400).json({ refs: 0 });
  const k = keysFor(ROUND, listOf(req.query.list));
  try {
    const refs = await redis.scard(k.refs(x.toLowerCase()));
    const u = await redis.hgetall(k.user(x.toLowerCase()));
    const pos = u && u.wallet ? await ensurePos(k, x.toLowerCase(), u.pos) : null; // only registered handles have a place
    return res.status(200).json({ refs, pos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ refs: null });
  }
}
