import { redis, k, X_RE } from "../lib/db.js";

export default async function handler(req, res) {
  const x = String(req.query.x || "").replace(/^@/, "");
  if (!X_RE.test(x)) return res.status(400).json({ refs: 0, entries: 1 });
  try {
    const refs = await redis.scard(k.refs(x.toLowerCase()));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ refs, entries: 1 + refs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ refs: 0, entries: 1 });
  }
}
