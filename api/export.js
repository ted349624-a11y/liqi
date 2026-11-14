import { redis, keysFor, listOf, ROUND } from "../lib/db.js";

// GET /api/export?key=ADMIN_KEY                      → full CSV (x, wallet, pos, ref, refs, tasks, ts)
// GET /api/export?key=ADMIN_KEY&format=wallets&limit=300 → wallets only, oldest first, one per line
// Add &list=claim for the /claim page's list (default is the main page's).
// Add &round=1 (or any earlier round) to export a previous list; default is the current round.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const want = String(process.env.ADMIN_KEY || "").trim();
  const got = String(req.query.key || "").trim();
  if (!want) return res.status(500).send("ADMIN_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.");
  if (!got || got !== want) return res.status(401).send("Unauthorized.");

  const round = Math.max(1, Math.min(ROUND, parseInt(req.query.round, 10) || ROUND));
  const list = listOf(req.query.list);
  const k = keysFor(round, list);
  const tag = `r${round}${list === "claim" ? "-claim" : ""}`;

  try {
    const users = await redis.smembers(k.users);
    const rows = [];
    for (let i = 0; i < users.length; i += 200) {
      const batch = users.slice(i, i + 200);
      const p = redis.pipeline();
      batch.forEach((u) => { p.hgetall(k.user(u)); p.scard(k.refs(u)); });
      const out = await p.exec();
      batch.forEach((h, j) => {
        const u = out[j * 2] || {};
        rows.push({ x: u.x || h, wallet: u.wallet || "", ref: u.ref || "", pos: u.pos || "", refs: out[j * 2 + 1] || 0, tasks: u.tasks || "", ts: u.ts || "" });
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
      res.setHeader("Content-Disposition", `attachment; filename="liqi-${tag}-wallets-${list.length}.txt"`);
      return res.status(200).send(list.join("\n") + "\n");
    }

    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [["x", "wallet", "pos", "ref", "refs", "tasks", "ts"].join(",")]
      .concat(rows.map((r) => [r.x, r.wallet, r.pos, r.ref, r.refs, r.tasks, r.ts].map(esc).join(",")))
      .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="liqi-${tag}-entries.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}
