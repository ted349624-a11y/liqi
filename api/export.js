import { redis, k } from "../lib/db.js";

// GET /api/export?key=ADMIN_KEY                      → full CSV (x, wallet, tasks, ts)
// GET /api/export?key=ADMIN_KEY&format=wallets&limit=300 → wallets only, oldest first, one per line
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const want = String(process.env.ADMIN_KEY || "").trim();
  const got = String(req.query.key || "").trim();
  if (!want) return res.status(500).send("ADMIN_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.");
  if (!got || got !== want) return res.status(401).send("Unauthorized.");

  try {
    const users = await redis.smembers(k.users);
    const rows = [];
    for (let i = 0; i < users.length; i += 200) {
      const batch = users.slice(i, i + 200);
      const p = redis.pipeline();
      batch.forEach((u) => p.hgetall(k.user(u)));
      const out = await p.exec();
      out.forEach((u, j) => {
        u = u || {};
        rows.push({ x: u.x || batch[j], wallet: u.wallet || "", tasks: u.tasks || "", ts: u.ts || "" });
      });
    }
    rows.sort((a, b) => a.ts.localeCompare(b.ts));

    if (req.query.format === "wallets") {
      const limit = Math.max(1, Math.min(10000, parseInt(req.query.limit, 10) || 300));
      const seen = new Set();
      const list = rows
        .filter((r) => /^0x[a-fA-F0-9]{40}$/.test(r.wallet))
        .filter((r) => { const w = r.wallet.toLowerCase(); if (seen.has(w)) return false; seen.add(w); return true; })
        .slice(0, limit)
        .map((r) => r.wallet);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="liqi-wallets-${list.length}.txt"`);
      return res.status(200).send(list.join("\n") + "\n");
    }

    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [["x", "wallet", "tasks", "ts"].join(",")]
      .concat(rows.map((r) => [r.x, r.wallet, r.tasks, r.ts].map(esc).join(",")))
      .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="liqi-entries.csv"');
    return res.status(200).send(csv);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}
