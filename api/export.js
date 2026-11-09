import { redis, k } from "../lib/db.js";

// GET /api/export?key=ADMIN_KEY  → CSV of every entry with its raffle entries.
export default async function handler(req, res) {
  const want = String(process.env.ADMIN_KEY || "").trim();
  const got = String(req.query.key || "").trim();
  if (!want) return res.status(500).send("ADMIN_KEY is not set on this deployment. Add it in Vercel → Settings → Environment Variables (Production), then Redeploy.");
  if (!got) return res.status(401).send("Missing key. Open /api/export?key=YOUR_ADMIN_KEY");
  if (got !== want) return res.status(401).send("Wrong key. It must match ADMIN_KEY exactly (case-sensitive).");
  try {
    const users = await redis.smembers(k.users);
    const rows = [["x", "wallet", "ref", "refs", "entries", "ts"]];
    for (let i = 0; i < users.length; i += 200) {
      const batch = users.slice(i, i + 200);
      const p = redis.pipeline();
      batch.forEach((u) => { p.hgetall(k.user(u)); p.scard(k.refs(u)); });
      const out = await p.exec();
      for (let j = 0; j < batch.length; j++) {
        const u = out[j * 2] || {};
        const refs = out[j * 2 + 1] || 0;
        rows.push([u.x || batch[j], u.wallet || "", u.ref || "", refs, 1 + refs, u.ts || ""]);
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="liqi-gtd.csv"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(csv);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}
